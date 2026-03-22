import { v4 as uuidv4 } from 'uuid';

export interface MinesTile {
  id: number;
  revealed: boolean;
  isMine: boolean;
}

export interface MinesPlayer {
  userId: string;
  username: string;
  avatarUrl?: string;
  score: number;
  isEliminated: boolean;
  isConnected: boolean;
}

export interface MinesGameState {
  roomCode: string;
  sessionId: string;
  status: 'waiting' | 'in_progress' | 'completed';
  gridSize: number;          // default 25 (5x5)
  mineCount: number;
  board: MinesTile[];        // hidden from clients (server-only)
  revealedTiles: number[];   // tile IDs that have been revealed (safe)
  mineTiles: number[];       // only revealed after game over
  players: MinesPlayer[];
  currentTurnIndex: number;
  turnTimeLimit: number;     // seconds
  turnStartedAt: number | null;
  hostId: string;
  winnerId?: string;
  createdAt: number;
}

export function createMinesBoard(gridSize: number, mineCount: number): MinesTile[] {
  const tiles: MinesTile[] = Array.from({ length: gridSize }, (_, i) => ({
    id: i,
    revealed: false,
    isMine: false,
  }));

  // Fisher-Yates shuffle to place mines
  const minePositions = new Set<number>();
  while (minePositions.size < mineCount) {
    minePositions.add(Math.floor(Math.random() * gridSize));
  }

  minePositions.forEach((pos) => {
    tiles[pos].isMine = true;
  });

  return tiles;
}

export function getClientBoard(state: MinesGameState): Array<{
  id: number;
  revealed: boolean;
  isMine?: boolean;
}> {
  return state.board.map((tile) => ({
    id: tile.id,
    revealed: tile.revealed,
    // Only expose mine if game over or tile is revealed as mine
    ...(state.status === 'completed' || (tile.revealed && tile.isMine)
      ? { isMine: tile.isMine }
      : {}),
  }));
}

export function revealTile(
  state: MinesGameState,
  tileId: number,
  playerId: string
): {
  success: boolean;
  hitMine: boolean;
  gameOver: boolean;
  eliminatedPlayerId?: string;
  winnerId?: string;
  nextPlayerId?: string;
} {
  const tile = state.board[tileId];

  if (!tile || tile.revealed) {
    return { success: false, hitMine: false, gameOver: false };
  }

  // Check it's the player's turn
  const currentPlayer = state.players[state.currentTurnIndex];
  if (currentPlayer.userId !== playerId) {
    return { success: false, hitMine: false, gameOver: false };
  }

  tile.revealed = true;

  if (tile.isMine) {
    // Eliminate the player
    currentPlayer.isEliminated = true;
    state.revealedTiles.push(tileId);

    const activePlayers = state.players.filter((p) => !p.isEliminated && p.isConnected);

    if (activePlayers.length <= 1) {
      // Game over — last player standing wins
      const winner = activePlayers[0] || state.players.find((p) => !p.isEliminated);
      state.status = 'completed';
      state.winnerId = winner?.userId;

      // Reveal all mines
      state.mineTiles = state.board
        .filter((t) => t.isMine)
        .map((t) => t.id);

      return {
        success: true,
        hitMine: true,
        gameOver: true,
        eliminatedPlayerId: playerId,
        winnerId: winner?.userId,
      };
    }

    // Advance to next active player
    advanceTurn(state);

    return {
      success: true,
      hitMine: true,
      gameOver: false,
      eliminatedPlayerId: playerId,
      nextPlayerId: state.players[state.currentTurnIndex].userId,
    };
  }

  // Safe tile — increment score and stay on same player (or advance based on rules)
  currentPlayer.score += 10;
  state.revealedTiles.push(tileId);

  // Check if all safe tiles revealed
  const safeTiles = state.board.filter((t) => !t.isMine);
  const allSafeRevealed = safeTiles.every((t) => t.revealed);

  if (allSafeRevealed) {
    state.status = 'completed';
    // Winner is highest scorer
    const winner = [...state.players].sort((a, b) => b.score - a.score)[0];
    state.winnerId = winner.userId;
    return {
      success: true,
      hitMine: false,
      gameOver: true,
      winnerId: winner.userId,
    };
  }

  // Advance turn after safe reveal
  advanceTurn(state);

  return {
    success: true,
    hitMine: false,
    gameOver: false,
    nextPlayerId: state.players[state.currentTurnIndex].userId,
  };
}

function advanceTurn(state: MinesGameState): void {
  const totalPlayers = state.players.length;
  let next = (state.currentTurnIndex + 1) % totalPlayers;
  let tries = 0;

  while (
    tries < totalPlayers &&
    (state.players[next].isEliminated || !state.players[next].isConnected)
  ) {
    next = (next + 1) % totalPlayers;
    tries++;
  }

  state.currentTurnIndex = next;
  state.turnStartedAt = Date.now();
}

export function createInitialGameState(
  roomCode: string,
  sessionId: string,
  hostId: string,
  players: MinesPlayer[],
  mineCount: number = 5,
  gridSize: number = 25,
  turnTimeLimit: number = 30
): MinesGameState {
  return {
    roomCode,
    sessionId,
    status: 'in_progress',
    gridSize,
    mineCount,
    board: createMinesBoard(gridSize, mineCount),
    revealedTiles: [],
    mineTiles: [],
    players,
    currentTurnIndex: 0,
    turnTimeLimit,
    turnStartedAt: Date.now(),
    hostId,
    createdAt: Date.now(),
  };
}
