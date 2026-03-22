import { Server, Socket } from 'socket.io';
import { prisma } from '../config/prisma';
import { redis, redisKeys } from '../config/redis';
import {
  MinesGameState, MinesPlayer,
  createInitialGameState, revealTile, getClientBoard,
} from '../services/minesEngine';
import { v4 as uuidv4 } from 'uuid';

// In-memory game states (use Redis for multi-server)
const gameStates = new Map<string, MinesGameState>();
const turnTimers = new Map<string, NodeJS.Timeout>();

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function persistGameResult(state: MinesGameState): Promise<void> {
  try {
    await prisma.gameSession.update({
      where: { roomCode: state.roomCode },
      data: {
        status: 'COMPLETED',
        winnerId: state.winnerId,
        endedAt: new Date(),
      },
    });

    for (const player of state.players) {
      await prisma.gameParticipant.updateMany({
        where: { sessionId: state.sessionId, userId: player.userId },
        data: { score: player.score, isEliminated: player.isEliminated },
      });
    }

    // Award coins to winner
    if (state.winnerId) {
      const prize = state.players.length * 50;
      await prisma.user.update({
        where: { id: state.winnerId },
        data: { coins: { increment: prize } },
      });
    }
  } catch (err) {
    console.error('[Mines] Persist error:', err);
  }
}

export function registerMinesHandlers(io: Server, socket: Socket, user: any): void {

  // Create a new game room
  socket.on('mines:create', async (data: {
    mineCount: number;
    maxPlayers: number;
    turnTimeLimit: number;
  }) => {
    try {
      const { mineCount = 5, maxPlayers = 4, turnTimeLimit = 30 } = data;

      if (mineCount < 1 || mineCount > 15) {
        socket.emit('error', { message: 'Mine count must be between 1 and 15' });
        return;
      }

      const roomCode = generateRoomCode();

      const session = await prisma.gameSession.create({
        data: {
          gameType: 'MINES',
          status: 'WAITING',
          roomCode,
          hostId: user.id,
          maxPlayers,
          settings: { mineCount, turnTimeLimit },
        },
      });

      await prisma.gameParticipant.create({
        data: { sessionId: session.id, userId: user.id },
      });

      socket.join(`mines:${roomCode}`);

      const roomData = {
        roomCode,
        sessionId: session.id,
        hostId: user.id,
        mineCount,
        maxPlayers,
        turnTimeLimit,
        players: [{
          userId: user.id,
          username: user.username,
          avatarUrl: user.avatarUrl,
          score: 0,
          isEliminated: false,
          isConnected: true,
        }],
      };

      await redis.setex(
        redisKeys.gameRoom(roomCode),
        3600,
        JSON.stringify(roomData)
      );

      socket.emit('mines:created', { roomCode, sessionId: session.id });
    } catch (err) {
      console.error('[Mines] Create error:', err);
      socket.emit('error', { message: 'Failed to create game room' });
    }
  });

  // Join existing room
  socket.on('mines:join', async (data: { roomCode: string }) => {
    try {
      const { roomCode } = data;
      const roomDataRaw = await redis.get(redisKeys.gameRoom(roomCode));

      if (!roomDataRaw) {
        socket.emit('error', { message: 'Room not found or expired' });
        return;
      }

      const roomData = JSON.parse(roomDataRaw);

      // Check if game already started
      const state = gameStates.get(roomCode);
      if (state?.status === 'in_progress') {
        socket.emit('error', { message: 'Game already in progress' });
        return;
      }

      if (roomData.players.length >= roomData.maxPlayers) {
        socket.emit('error', { message: 'Room is full' });
        return;
      }

      const alreadyIn = roomData.players.some((p: any) => p.userId === user.id);
      if (!alreadyIn) {
        roomData.players.push({
          userId: user.id,
          username: user.username,
          avatarUrl: user.avatarUrl,
          score: 0,
          isEliminated: false,
          isConnected: true,
        });

        await prisma.gameParticipant.upsert({
          where: {
            sessionId_userId: { sessionId: roomData.sessionId, userId: user.id },
          },
          create: { sessionId: roomData.sessionId, userId: user.id },
          update: {},
        });

        await redis.setex(
          redisKeys.gameRoom(roomCode),
          3600,
          JSON.stringify(roomData)
        );
      }

      socket.join(`mines:${roomCode}`);

      io.to(`mines:${roomCode}`).emit('mines:player_joined', {
        player: { userId: user.id, username: user.username, avatarUrl: user.avatarUrl },
        players: roomData.players,
      });

      socket.emit('mines:room_state', roomData);
    } catch (err) {
      console.error('[Mines] Join error:', err);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Start the game (host only)
  socket.on('mines:start', async (data: { roomCode: string }) => {
    try {
      const { roomCode } = data;
      const roomDataRaw = await redis.get(redisKeys.gameRoom(roomCode));
      if (!roomDataRaw) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      const roomData = JSON.parse(roomDataRaw);

      if (roomData.hostId !== user.id) {
        socket.emit('error', { message: 'Only the host can start the game' });
        return;
      }

      if (roomData.players.length < 2) {
        socket.emit('error', { message: 'Need at least 2 players to start' });
        return;
      }

      const state = createInitialGameState(
        roomCode,
        roomData.sessionId,
        roomData.hostId,
        roomData.players,
        roomData.mineCount,
        25,
        roomData.turnTimeLimit
      );

      gameStates.set(roomCode, state);

      await prisma.gameSession.update({
        where: { roomCode },
        data: { status: 'IN_PROGRESS', startedAt: new Date() },
      });

      io.to(`mines:${roomCode}`).emit('mines:started', {
        board: getClientBoard(state),
        players: state.players,
        currentTurn: state.players[state.currentTurnIndex].userId,
        gridSize: state.gridSize,
        mineCount: state.mineCount,
        turnTimeLimit: state.turnTimeLimit,
      });

      startTurnTimer(io, roomCode, state);
    } catch (err) {
      console.error('[Mines] Start error:', err);
      socket.emit('error', { message: 'Failed to start game' });
    }
  });

  // Reveal a tile
  socket.on('mines:reveal', async (data: { roomCode: string; tileId: number }) => {
    try {
      const { roomCode, tileId } = data;
      const state = gameStates.get(roomCode);

      if (!state || state.status !== 'in_progress') {
        socket.emit('error', { message: 'No active game in this room' });
        return;
      }

      clearTurnTimer(roomCode);

      const result = revealTile(state, tileId, user.id);

      if (!result.success) {
        socket.emit('error', { message: 'Invalid move' });
        return;
      }

      const payload: any = {
        tileId,
        hitMine: result.hitMine,
        players: state.players,
        board: getClientBoard(state),
      };

      if (result.hitMine) {
        payload.eliminatedPlayerId = result.eliminatedPlayerId;
      }

      if (result.gameOver) {
        payload.gameOver = true;
        payload.winnerId = result.winnerId;
        payload.finalBoard = state.board.map((t) => ({ id: t.id, isMine: t.isMine }));

        io.to(`mines:${roomCode}`).emit('mines:tile_revealed', payload);
        io.to(`mines:${roomCode}`).emit('mines:game_over', {
          winnerId: result.winnerId,
          players: state.players,
          finalBoard: payload.finalBoard,
        });

        await persistGameResult(state);
        gameStates.delete(roomCode);
        await redis.del(redisKeys.gameRoom(roomCode));
      } else {
        payload.nextTurn = result.nextPlayerId;
        io.to(`mines:${roomCode}`).emit('mines:tile_revealed', payload);
        startTurnTimer(io, roomCode, state);
      }
    } catch (err) {
      console.error('[Mines] Reveal error:', err);
      socket.emit('error', { message: 'Failed to reveal tile' });
    }
  });

  // Leave room
  socket.on('mines:leave', async (data: { roomCode: string }) => {
    const { roomCode } = data;
    socket.leave(`mines:${roomCode}`);

    const state = gameStates.get(roomCode);
    if (state) {
      const player = state.players.find((p) => p.userId === user.id);
      if (player) {
        player.isConnected = false;
        io.to(`mines:${roomCode}`).emit('mines:player_disconnected', {
          userId: user.id,
          players: state.players,
        });
      }
    }
  });
}

function startTurnTimer(io: Server, roomCode: string, state: MinesGameState): void {
  const timer = setTimeout(async () => {
    const currentPlayer = state.players[state.currentTurnIndex];
    if (!currentPlayer) return;

    // Auto-skip the current player's turn (pick a random safe tile for them? or just skip)
    io.to(`mines:${roomCode}`).emit('mines:turn_timeout', {
      timedOutPlayerId: currentPlayer.userId,
    });

    // Advance turn manually
    const activePlayers = state.players.filter((p) => !p.isEliminated && p.isConnected);
    if (activePlayers.length <= 1) {
      // Game over
      state.status = 'completed';
      state.winnerId = activePlayers[0]?.userId;
      io.to(`mines:${roomCode}`).emit('mines:game_over', {
        winnerId: state.winnerId,
        players: state.players,
        reason: 'timeout',
      });
      gameStates.delete(roomCode);
    } else {
      // Advance to next player
      const totalPlayers = state.players.length;
      let next = (state.currentTurnIndex + 1) % totalPlayers;
      while (state.players[next].isEliminated || !state.players[next].isConnected) {
        next = (next + 1) % totalPlayers;
      }
      state.currentTurnIndex = next;
      state.turnStartedAt = Date.now();

      io.to(`mines:${roomCode}`).emit('mines:next_turn', {
        currentTurn: state.players[next].userId,
        players: state.players,
      });

      startTurnTimer(io, roomCode, state);
    }
  }, state.turnTimeLimit * 1000);

  turnTimers.set(roomCode, timer);
}

function clearTurnTimer(roomCode: string): void {
  const timer = turnTimers.get(roomCode);
  if (timer) {
    clearTimeout(timer);
    turnTimers.delete(roomCode);
  }
}
