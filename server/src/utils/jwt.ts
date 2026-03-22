import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/prisma';
import { redis, redisKeys } from '../config/redis';

export interface JwtPayload {
  userId: string;
  username: string;
  email: string;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    issuer: 'vaultgames',
    audience: 'vaultgames-client',
  } as jwt.SignOptions);
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: 'vaultgames',
    audience: 'vaultgames-client',
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET!, {
    issuer: 'vaultgames',
    audience: 'vaultgames-client',
  }) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!, {
    issuer: 'vaultgames',
    audience: 'vaultgames-client',
  }) as JwtPayload;
}

export async function createTokenPair(payload: JwtPayload): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  // Store refresh token in DB
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: payload.userId, expiresAt },
  });

  return { accessToken, refreshToken };
}

export async function rotateRefreshToken(oldToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  try {
    const payload = verifyRefreshToken(oldToken);

    // Check DB
    const stored = await prisma.refreshToken.findUnique({ where: { token: oldToken } });
    if (!stored || stored.expiresAt < new Date()) {
      // Token reuse detected — invalidate all tokens for this user
      await prisma.refreshToken.deleteMany({ where: { userId: payload.userId } });
      return null;
    }

    // Delete old, issue new
    await prisma.refreshToken.delete({ where: { token: oldToken } });

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return null;

    return createTokenPair({
      userId: user.id,
      username: user.username,
      email: user.email,
    });
  } catch {
    return null;
  }
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { token } });
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { userId } });
}
