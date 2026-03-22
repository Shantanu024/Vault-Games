import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { prisma } from '../config/prisma';
import { redis, redisKeys } from '../config/redis';
import { registerMinesHandlers } from './minesSocket';
import { registerWordJumbleHandlers } from './wordJumbleSocket';

export function registerSocketHandlers(io: Server): void {
  // Auth middleware for all sockets
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      });

      if (!user) return next(new Error('User not found'));

      (socket as any).user = user;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const user = (socket as any).user;
    console.log(`[Socket] ${user.username} connected: ${socket.id}`);

    // Store socket ID in Redis
    await redis.set(redisKeys.userSocket(user.id), socket.id, 'EX', 3600);
    await redis.sadd(redisKeys.onlineUsers(), user.id);

    // Update DB online status
    await prisma.user.update({
      where: { id: user.id },
      data: { isOnline: true },
    });

    // Broadcast online status to friends
    await broadcastPresence(io, user.id, true);

    // Register game-specific handlers
    registerMinesHandlers(io, socket, user);
    registerWordJumbleHandlers(io, socket, user);

    // General handlers
    socket.on('ping', () => socket.emit('pong', { timestamp: Date.now() }));

    socket.on('disconnect', async (reason) => {
      console.log(`[Socket] ${user.username} disconnected: ${reason}`);

      await redis.del(redisKeys.userSocket(user.id));
      await redis.srem(redisKeys.onlineUsers(), user.id);

      await prisma.user.update({
        where: { id: user.id },
        data: { isOnline: false, lastSeen: new Date() },
      });

      await broadcastPresence(io, user.id, false);
    });
  });
}

async function broadcastPresence(
  io: Server,
  userId: string,
  isOnline: boolean
): Promise<void> {
  try {
    // Get friends to notify
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ requesterId: userId }, { addresseeId: userId }],
        status: 'ACCEPTED',
      },
    });

    for (const friendship of friendships) {
      const friendId = friendship.requesterId === userId
        ? friendship.addresseeId
        : friendship.requesterId;

      const friendSocketId = await redis.get(redisKeys.userSocket(friendId));
      if (friendSocketId) {
        io.to(friendSocketId).emit('friend:presence', { userId, isOnline });
      }
    }
  } catch (err) {
    console.error('[Socket] Presence broadcast error:', err);
  }
}
