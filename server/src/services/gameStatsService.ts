import { prisma } from '../config/prisma';
import { GameType, GameResult } from '@prisma/client';

export interface GameResultData {
  userId: string;
  gameType: GameType;
  score: number;
  result: GameResult;
  durationSeconds: number;
  coinsEarned: number;
}

/**
 * Record a completed game result
 */
export async function recordGameResult(data: GameResultData) {
  const history = await prisma.gameHistory.create({
    data: {
      userId: data.userId,
      gameType: data.gameType,
      score: data.score,
      result: data.result,
      durationSeconds: data.durationSeconds,
      coinsEarned: data.coinsEarned,
    },
  });

  // Update user coins
  await prisma.user.update({
    where: { id: data.userId },
    data: { coins: { increment: data.coinsEarned } },
  });

  return history;
}

/**
 * Get user's game statistics
 */
export async function getUserGameStats(userId: string) {
  const games = await prisma.gameHistory.findMany({
    where: { userId },
  });

  if (games.length === 0) {
    return {
      totalGames: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      totalCoinsEarned: 0,
      averageScore: 0,
      totalDuration: 0,
      byGameType: {},
    };
  }

  const wins = games.filter(g => g.result === 'WIN').length;
  const losses = games.filter(g => g.result === 'LOSE').length;
  const totalCoins = games.reduce((sum, g) => sum + g.coinsEarned, 0);
  const avgScore = Math.round(games.reduce((sum, g) => sum + g.score, 0) / games.length);
  const totalDuration = games.reduce((sum, g) => sum + g.durationSeconds, 0);

  // Group by game type
  const byGameType: Record<string, any> = {};
  for (const gameType of ['MINES', 'WORD_JUMBLE'] as const) {
    const typeGames = games.filter(g => g.gameType === gameType);
    if (typeGames.length > 0) {
      const typeWins = typeGames.filter(g => g.result === 'WIN').length;
      byGameType[gameType] = {
        played: typeGames.length,
        wins: typeWins,
        winRate: Math.round((typeWins / typeGames.length) * 100 * 10) / 10, // Returns number
        averageScore: Math.round(typeGames.reduce((sum, g) => sum + g.score, 0) / typeGames.length),
      };
    }
  }

  return {
    totalGames: games.length,
    wins,
    losses,
    winRate: Math.round((wins / games.length) * 100 * 10) / 10, // Returns number, not string
    totalCoinsEarned: totalCoins,
    averageScore: avgScore,
    totalDuration,
    byGameType,
  };
}

/**
 * Get top players leaderboard
 */
export async function getLeaderboard(gameType?: string, limit = 10) {
  const topPlayers = await prisma.gameHistory.groupBy({
    by: ['userId'],
    where: gameType ? { gameType: gameType as GameType } : undefined,
    _count: { userId: true },
    _sum: { coinsEarned: true, score: true },
    orderBy: { _sum: { coinsEarned: 'desc' } },
    take: limit,
  });

  const userIds = topPlayers.map(p => p.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
    },
  });

  // Filter out entries where user was deleted (user not found)
  return topPlayers
    .map((entry, index) => {
      const user = users.find(u => u.id === entry.userId);
      return user ? { // Only include if user still exists
        rank: index + 1,
        user,
        totalCoins: entry._sum.coinsEarned || 0,
        totalScore: entry._sum.score || 0,
        gamesPlayed: entry._count.userId,
      } : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}
