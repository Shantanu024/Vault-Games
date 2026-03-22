import { Server, Socket } from 'socket.io';
import { prisma } from '../config/prisma';
import { redis, redisKeys } from '../config/redis';
import {
  WordJumbleState,
  createWordJumbleState, startNewRound, submitAnswer,
} from '../services/wordJumbleEngine';

const gameStates = new Map<string, WordJumbleState>();
const roundTimers = new Map<string, NodeJS.Timeout>();
const usedWordsMap = new Map<string, Set<string>>();

function generateRoomCode(): string {
  return 'WJ' + Math.random().toString(36).substring(2, 7).toUpperCase();
}

async function persistGameResult(state: WordJumbleState): Promise<void> {
  try {
    await prisma.gameSession.update({
      where: { roomCode: state.roomCode },
      data: { status: 'COMPLETED', winnerId: state.winnerId, endedAt: new Date() },
    });

    for (const player of state.players) {
      await prisma.gameParticipant.updateMany({
        where: { sessionId: state.sessionId, userId: player.userId },
        data: { score: player.score },
      });
    }

    if (state.winnerId) {
      const prize = state.players.length * 30;
      await prisma.user.update({
        where: { id: state.winnerId },
        data: { coins: { increment: prize } },
      });
    }
  } catch (err) {
    console.error('[WordJumble] Persist error:', err);
  }
}

export function registerWordJumbleHandlers(io: Server, socket: Socket, user: any): void {

  socket.on('wordjumble:create', async (data: {
    totalRounds: number;
    timePerRound: number;
    maxPlayers: number;
  }) => {
    try {
      const { totalRounds = 5, timePerRound = 30, maxPlayers = 6 } = data;
      const roomCode = generateRoomCode();

      const session = await prisma.gameSession.create({
        data: {
          gameType: 'WORD_JUMBLE',
          status: 'WAITING',
          roomCode,
          hostId: user.id,
          maxPlayers,
          settings: { totalRounds, timePerRound },
        },
      });

      await prisma.gameParticipant.create({
        data: { sessionId: session.id, userId: user.id },
      });

      const roomData = {
        roomCode,
        sessionId: session.id,
        hostId: user.id,
        totalRounds,
        timePerRound,
        maxPlayers,
        players: [{
          userId: user.id,
          username: user.username,
          avatarUrl: user.avatarUrl,
          score: 0,
          roundsWon: 0,
          isConnected: true,
        }],
      };

      await redis.setex(redisKeys.gameRoom(roomCode), 3600, JSON.stringify(roomData));
      socket.join(`wordjumble:${roomCode}`);
      socket.emit('wordjumble:created', { roomCode, sessionId: session.id });
    } catch (err) {
      console.error('[WordJumble] Create error:', err);
      socket.emit('error', { message: 'Failed to create room' });
    }
  });

  socket.on('wordjumble:join', async (data: { roomCode: string }) => {
    try {
      const { roomCode } = data;
      const roomDataRaw = await redis.get(redisKeys.gameRoom(roomCode));
      if (!roomDataRaw) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      const roomData = JSON.parse(roomDataRaw);
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
          roundsWon: 0,
          isConnected: true,
        });

        await prisma.gameParticipant.upsert({
          where: { sessionId_userId: { sessionId: roomData.sessionId, userId: user.id } },
          create: { sessionId: roomData.sessionId, userId: user.id },
          update: {},
        });

        await redis.setex(redisKeys.gameRoom(roomCode), 3600, JSON.stringify(roomData));
      }

      socket.join(`wordjumble:${roomCode}`);
      io.to(`wordjumble:${roomCode}`).emit('wordjumble:player_joined', {
        player: { userId: user.id, username: user.username, avatarUrl: user.avatarUrl },
        players: roomData.players,
      });
      socket.emit('wordjumble:room_state', roomData);
    } catch (err) {
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  socket.on('wordjumble:start', async (data: { roomCode: string }) => {
    try {
      const { roomCode } = data;
      const roomDataRaw = await redis.get(redisKeys.gameRoom(roomCode));
      if (!roomDataRaw) { socket.emit('error', { message: 'Room not found' }); return; }

      const roomData = JSON.parse(roomDataRaw);
      if (roomData.hostId !== user.id) {
        socket.emit('error', { message: 'Only host can start' }); return;
      }
      if (roomData.players.length < 2) {
        socket.emit('error', { message: 'Need at least 2 players' }); return;
      }

      const state = createWordJumbleState(
        roomCode, roomData.sessionId, roomData.hostId,
        roomData.players, roomData.totalRounds, roomData.timePerRound
      );

      gameStates.set(roomCode, state);
      usedWordsMap.set(roomCode, new Set());

      await prisma.gameSession.update({
        where: { roomCode },
        data: { status: 'IN_PROGRESS', startedAt: new Date() },
      });

      io.to(`wordjumble:${roomCode}`).emit('wordjumble:started', {
        players: state.players,
        totalRounds: state.totalRounds,
      });

      // Start first round after 2 seconds
      setTimeout(() => beginRound(io, roomCode), 2000);
    } catch (err) {
      socket.emit('error', { message: 'Failed to start' });
    }
  });

  socket.on('wordjumble:answer', (data: { roomCode: string; answer: string }) => {
    try {
      const { roomCode, answer } = data;
      const state = gameStates.get(roomCode);
      if (!state || state.status !== 'in_progress') return;

      const result = submitAnswer(state, user.id, answer);

      if (!result.correct) {
        socket.emit('wordjumble:wrong_answer', { answer });
        return;
      }

      if (result.firstCorrect) {
        clearRoundTimer(roomCode);

        io.to(`wordjumble:${roomCode}`).emit('wordjumble:round_won', {
          winnerId: user.id,
          winnerUsername: user.username,
          word: state.rounds[state.rounds.length - 1].word,
          pointsAwarded: result.pointsAwarded,
          players: state.players,
        });

        if ((state.status as string) === 'completed') {
          io.to(`wordjumble:${roomCode}`).emit('wordjumble:game_over', {
            winnerId: state.winnerId,
            players: state.players,
            rounds: state.rounds.map((r) => ({
              roundNumber: r.roundNumber,
              word: r.word,
              winnerId: r.winnerId,
              winnerTime: r.winnerTime,
            })),
          });
          persistGameResult(state);
          gameStates.delete(roomCode);
          usedWordsMap.delete(roomCode);
        } else {
          setTimeout(() => beginRound(io, roomCode), 3000);
        }
      }
    } catch (err) {
      console.error('[WordJumble] Answer error:', err);
    }
  });
}

function beginRound(io: Server, roomCode: string): void {
  const state = gameStates.get(roomCode);
  if (!state) return;

  const usedWords = usedWordsMap.get(roomCode) || new Set();
  const round = startNewRound(state, usedWords);

  io.to(`wordjumble:${roomCode}`).emit('wordjumble:round_start', {
    roundNumber: round.roundNumber,
    totalRounds: state.totalRounds,
    jumbledWord: round.jumbledWord,
    timeLimit: round.timeLimit,
    players: state.players,
  });

  // Auto-end round if no one answers in time
  const timer = setTimeout(() => {
    const currentState = gameStates.get(roomCode);
    if (!currentState) return;

    const currentRound = currentState.rounds[currentState.rounds.length - 1];
    if (!currentRound?.winnerId) {
      io.to(`wordjumble:${roomCode}`).emit('wordjumble:round_timeout', {
        word: currentRound.word,
        players: currentState.players,
      });

      if (currentState.currentRound >= currentState.totalRounds) {
        const winner = [...currentState.players].sort((a, b) => b.score - a.score)[0];
        currentState.status = 'completed';
        currentState.winnerId = winner?.userId;

        io.to(`wordjumble:${roomCode}`).emit('wordjumble:game_over', {
          winnerId: currentState.winnerId,
          players: currentState.players,
        });
        persistGameResult(currentState);
        gameStates.delete(roomCode);
        usedWordsMap.delete(roomCode);
      } else {
        setTimeout(() => beginRound(io, roomCode), 2000);
      }
    }
  }, round.timeLimit * 1000);

  roundTimers.set(roomCode, timer);
}

function clearRoundTimer(roomCode: string): void {
  const timer = roundTimers.get(roomCode);
  if (timer) { clearTimeout(timer); roundTimers.delete(roomCode); }
}
