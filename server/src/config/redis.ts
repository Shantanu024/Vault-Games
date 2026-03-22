import Redis from 'ioredis';

export let redis: Redis;

export async function connectRedis(): Promise<void> {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy: (times) => {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
  });

  redis.on('connect', () => console.log('✅ Redis connected'));
  redis.on('error', (err) => console.error('❌ Redis error:', err));

  await new Promise<void>((resolve, reject) => {
    redis.once('ready', resolve);
    redis.once('error', reject);
  });
}

// Redis key helpers
export const redisKeys = {
  otp: (email: string) => `otp:${email}`,
  otpAttempts: (email: string) => `otp_attempts:${email}`,
  refreshToken: (userId: string, tokenId: string) => `rt:${userId}:${tokenId}`,
  userSocket: (userId: string) => `socket:${userId}`,
  gameRoom: (roomCode: string) => `game:${roomCode}`,
  gameRoomPlayers: (roomCode: string) => `game:${roomCode}:players`,
  rateLimitAuth: (ip: string) => `rate:auth:${ip}`,
  onlineUsers: () => 'online_users',
};
