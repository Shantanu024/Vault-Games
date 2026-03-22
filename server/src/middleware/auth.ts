import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { prisma } from '../config/prisma';

export interface AuthRequest extends Request {
  user?: JwtPayload & { id: string };
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true, email: true },
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = { ...payload, id: user.id };
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    } else if (error.name === 'JsonWebTokenError') {
      res.status(401).json({ error: 'Invalid token' });
    } else {
      next(error);
    }
  }
}

export function optionalAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = verifyAccessToken(token);
      req.user = { ...payload, id: payload.userId };
    }
  } catch {
    // Ignore errors for optional auth
  }
  next();
}
