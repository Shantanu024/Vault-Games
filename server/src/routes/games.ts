import { Router, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../middleware/errorHandler';
import { recordGameResult, getUserGameStats, getLeaderboard } from '../services/gameStatsService';
import { GameType, GameResult } from '@prisma/client';

const router = Router();

// GET /api/games/active — get games with live player counts
router.get('/active', async (_req, res: Response, next: NextFunction) => {
  try {
    const [minesActive, wordActive] = await Promise.all([
      prisma.gameSession.count({ where: { gameType: 'MINES', status: 'IN_PROGRESS' } }),
      prisma.gameSession.count({ where: { gameType: 'WORD_JUMBLE', status: 'IN_PROGRESS' } }),
    ]);

    const [minesWaiting, wordWaiting] = await Promise.all([
      prisma.gameSession.findMany({
        where: { gameType: 'MINES', status: 'WAITING' },
        select: { roomCode: true, settings: true, _count: { select: { participants: true } } },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.gameSession.findMany({
        where: { gameType: 'WORD_JUMBLE', status: 'WAITING' },
        select: { roomCode: true, settings: true, _count: { select: { participants: true } } },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    sendSuccess(res, 200, {
      games: [
        {
          id: 'mines',
          name: 'Mines',
          description: 'Avoid the mines — last player standing wins',
          activePlayers: minesActive,
          waitingRooms: minesWaiting,
          thumbnail: '/games/mines.svg',
          minPlayers: 2,
          maxPlayers: 6,
        },
        {
          id: 'word_jumble',
          name: 'Word Jumble',
          description: 'Unscramble the word fastest to score',
          activePlayers: wordActive,
          waitingRooms: wordWaiting,
          thumbnail: '/games/wordjumble.svg',
          minPlayers: 2,
          maxPlayers: 8,
        },
      ],
    });
  } catch (err) { next(err); }
});

// POST /api/games/record-result — record game result and update stats
router.post('/record-result', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { gameType, score, result, durationSeconds, coinsEarned } = req.body;

    if (!gameType || !['MINES', 'WORD_JUMBLE'].includes(gameType)) {
      sendError(res, 400, 'Valid gameType is required (MINES or WORD_JUMBLE)', 'INVALID_GAME_TYPE');
      return;
    }

    if (typeof score !== 'number' || score < 0) {
      sendError(res, 400, 'Score must be a non-negative number', 'INVALID_SCORE');
      return;
    }

    if (!['WIN', 'LOSE', 'DRAW'].includes(result)) {
      sendError(res, 400, 'Result must be WIN, LOSE, or DRAW', 'INVALID_RESULT');
      return;
    }

    if (typeof durationSeconds !== 'number' || durationSeconds < 0) {
      sendError(res, 400, 'Duration must be a non-negative number', 'INVALID_DURATION');
      return;
    }

    if (typeof coinsEarned !== 'number' || coinsEarned < 0) {
      sendError(res, 400, 'Coins earned must be a non-negative number', 'INVALID_COINS');
      return;
    }

    const gameHistory = await recordGameResult({
      userId: req.user!.userId,
      gameType: gameType as GameType,
      score,
      result: result as GameResult,
      durationSeconds,
      coinsEarned,
    });

    sendSuccess(res, 201, { gameHistory });
  } catch (err) { next(err); }
});

// GET /api/games/stats — get user game statistics
router.get('/stats', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stats = await getUserGameStats(req.user!.userId);
    sendSuccess(res, 200, stats);
  } catch (err) { next(err); }
});

// GET /api/games/leaderboard — top 10 players globally
router.get('/leaderboard', async (_req, res: Response, next: NextFunction) => {
  try {
    const leaderboard = await getLeaderboard(undefined, 10);
    sendSuccess(res, 200, { leaderboard });
  } catch (err) { next(err); }
});

// GET /api/games/history — user's game history
router.get('/history', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 20;

    const [total, participants] = await Promise.all([
      prisma.gameParticipant.count({ where: { userId: req.user!.userId } }),
      prisma.gameParticipant.findMany({
        where: { userId: req.user!.userId },
        include: {
          session: {
            select: {
              gameType: true, status: true, roomCode: true,
              winnerId: true, startedAt: true, endedAt: true,
              _count: { select: { participants: true } },
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    // Safely process game history with proper typing
    const games = participants.map((p) => ({
      id: p.id,
      sessionId: p.sessionId,
      userId: p.userId,
      score: p.score,
      isEliminated: p.isEliminated,
      rank: p.rank,
      joinedAt: p.joinedAt,
      session: p.session,
      won: p.session.winnerId === req.user!.userId,
    }));

    sendSuccess(res, 200, {
      games,
      pagination: { total, page, pages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
});

export default router;
