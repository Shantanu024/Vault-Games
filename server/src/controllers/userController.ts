import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { cloudinary } from '../config/cloudinary';
import { sendSuccess, sendError } from '../middleware/errorHandler';
import { getUserGameStats } from '../services/gameStatsService';

// GET /api/users/:username
export async function getUserProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { username } = req.params as { username: string };
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true, username: true, displayName: true,
        avatarUrl: true, bio: true, country: true,
        coins: true, isOnline: true, lastSeen: true, createdAt: true,
        _count: {
          select: {
            sentRequests: { where: { status: 'ACCEPTED' } },
          },
        },
      },
    });

    if (!user) {
      sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
      return;
    }

    // Get game stats
    const stats = await getUserGameStats(user.id);

    sendSuccess(res, 200, {
      user: {
        ...user,
        friendCount: user._count.sentRequests,
        stats,
      },
    });
  } catch (err) { next(err); }
}

// PATCH /api/users/profile
export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const details = errors.array().map((e: any) => ({ 
        field: e.param, 
        message: e.msg 
      }));
      sendError(res, 400, 'Validation failed', 'VALIDATION_ERROR', { fields: details });
      return;
    }

    const { displayName, bio, country } = req.body as {
      displayName?: string;
      bio?: string;
      country?: string;
    };
    const userId = req.user!.userId;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        displayName: displayName?.trim() || undefined,
        bio: bio?.trim() || undefined,
        country: country?.trim() || undefined,
        isProfileComplete: true,
      },
      select: {
        id: true, username: true, displayName: true,
        avatarUrl: true, bio: true, country: true,
        coins: true, isProfileComplete: true,
      },
    });

    sendSuccess(res, 200, { user: updated });
  } catch (err) { next(err); }
}

// POST /api/users/avatar
export async function updateAvatar(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      sendError(res, 400, 'No image uploaded', 'NO_IMAGE');
      return;
    }

    const userId = req.user!.userId;
    const avatarUrl = ((req.file as any).path as string);

    // Delete old avatar from Cloudinary if exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    if (user?.avatarUrl) {
      const publicId = user.avatarUrl.split('/').slice(-1)[0].split('.')[0];
      await cloudinary.uploader.destroy(`vaultgames/avatars/${publicId}`).catch(() => {});
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: { avatarUrl: true },
    });

    sendSuccess(res, 200, { avatarUrl: updated.avatarUrl });
  } catch (err) { next(err); }
}

// GET /api/users/search?q=username
export async function searchUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const q = ((req.query as Record<string, string>)?.q)?.trim();
    if (!q || q.length < 2) {
      sendError(res, 400, 'Search query must be at least 2 characters', 'INVALID_SEARCH');
      return;
    }

    const users = await prisma.user.findMany({
      where: {
        username: { contains: q, mode: 'insensitive' },
        NOT: { id: req.user!.userId },
      },
      select: {
        id: true, username: true, displayName: true,
        avatarUrl: true, isOnline: true,
      },
      take: 20,
    });

    sendSuccess(res, 200, { users });
  } catch (err) { next(err); }
}

// GET /api/users/leaderboard
export async function getLeaderboard(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const gameType = (req.query as Record<string, string>)?.gameType;

    const topWinners = await prisma.gameSession.groupBy({
      by: ['winnerId'],
      where: {
        status: 'COMPLETED',
        winnerId: { not: null },
        ...(gameType ? { gameType: gameType as any } : {}),
      },
      _count: { winnerId: true },
      orderBy: { _count: { winnerId: 'desc' } },
      take: 10,
    });

    const userIds = topWinners
      .filter((w: { winnerId: string | null; _count: { winnerId: number } }) => w.winnerId)
      .map((w: { winnerId: string | null }) => w.winnerId as string);

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true, username: true, displayName: true,
        avatarUrl: true, coins: true,
      },
    });

    const leaderboard = topWinners
      .filter((w: { winnerId: string | null; _count: { winnerId: number } }) => w.winnerId)
      .map((w: { winnerId: string | null; _count: { winnerId: number } }, i: number) => ({
        rank: i + 1,
        wins: w._count.winnerId,
        user: users.find((u: { id: string }) => u.id === w.winnerId),
      }));

    sendSuccess(res, 200, { leaderboard });
  } catch (err) { next(err); }
}
