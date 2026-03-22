import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { io } from '../index';
import { redis, redisKeys } from '../config/redis';

// GET /api/friends
export async function getFriends(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: userId, status: 'ACCEPTED' },
          { addresseeId: userId, status: 'ACCEPTED' },
        ],
      },
      include: {
        requester: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, isOnline: true, lastSeen: true },
        },
        addressee: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, isOnline: true, lastSeen: true },
        },
      },
    });

    const friends = friendships.map((f: typeof friendships[number]) => ({
      friendshipId: f.id,
      friend: f.requesterId === userId ? f.addressee : f.requester,
    }));

    res.json({ friends });
  } catch (err) { next(err); }
}

// GET /api/friends/requests
export async function getFriendRequests(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    const [incoming, outgoing] = await Promise.all([
      prisma.friendship.findMany({
        where: { addresseeId: userId, status: 'PENDING' },
        include: {
          requester: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.friendship.findMany({
        where: { requesterId: userId, status: 'PENDING' },
        include: {
          addressee: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    res.json({ incoming, outgoing });
  } catch (err) { next(err); }
}

// POST /api/friends/request/:userId
export async function sendFriendRequest(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const requesterId = req.user!.userId;
    const addresseeId = req.params.userId;

    if (requesterId === addresseeId) {
      res.status(400).json({ error: 'You cannot send a friend request to yourself' });
      return;
    }

    const addressee = await prisma.user.findUnique({ where: { id: addresseeId } });
    if (!addressee) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check existing friendship in either direction
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        res.status(409).json({ error: 'Already friends' });
      } else if (existing.status === 'PENDING') {
        res.status(409).json({ error: 'Friend request already sent' });
      } else {
        res.status(409).json({ error: 'This action is not allowed' });
      }
      return;
    }

    const friendship = await prisma.friendship.create({
      data: { requesterId, addresseeId, status: 'PENDING' },
      include: {
        requester: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    // Real-time notification to addressee
    const socketId = await redis.get(redisKeys.userSocket(addresseeId));
    if (socketId) {
      io.to(socketId).emit('friend:request', {
        friendshipId: friendship.id,
        from: friendship.requester,
      });
    }

    res.status(201).json({ friendship, message: 'Friend request sent' });
  } catch (err) { next(err); }
}

// PATCH /api/friends/accept/:friendshipId
export async function acceptFriendRequest(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { friendshipId } = req.params;

    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
      include: {
        requester: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        addressee: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    if (!friendship) {
      res.status(404).json({ error: 'Friend request not found' });
      return;
    }

    if (friendship.addresseeId !== userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    if (friendship.status !== 'PENDING') {
      res.status(400).json({ error: 'Request is not pending' });
      return;
    }

    const updated = await prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: 'ACCEPTED' },
    });

    // Notify requester
    const socketId = await redis.get(redisKeys.userSocket(friendship.requesterId));
    if (socketId) {
      io.to(socketId).emit('friend:accepted', {
        friendshipId: updated.id,
        friend: friendship.addressee,
      });
    }

    res.json({ friendship: updated, message: 'Friend request accepted' });
  } catch (err) { next(err); }
}

// DELETE /api/friends/:friendshipId
export async function removeFriend(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { friendshipId } = req.params;

    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      res.status(404).json({ error: 'Friendship not found' });
      return;
    }

    if (friendship.requesterId !== userId && friendship.addresseeId !== userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    await prisma.friendship.delete({ where: { id: friendshipId } });

    // Notify the other party
    const otherId = friendship.requesterId === userId
      ? friendship.addresseeId
      : friendship.requesterId;
    const socketId = await redis.get(redisKeys.userSocket(otherId));
    if (socketId) {
      io.to(socketId).emit('friend:removed', { friendshipId });
    }

    res.json({ message: 'Friendship removed' });
  } catch (err) { next(err); }
}

// DELETE /api/friends/request/:friendshipId - cancel outgoing request
export async function cancelFriendRequest(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { friendshipId } = req.params;

    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    if (friendship.requesterId !== userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    if (friendship.status !== 'PENDING') {
      res.status(400).json({ error: 'Request is not pending' });
      return;
    }

    await prisma.friendship.delete({ where: { id: friendshipId } });
    res.json({ message: 'Friend request cancelled' });
  } catch (err) { next(err); }
}
