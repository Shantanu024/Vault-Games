import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import { prisma } from '../config/prisma';
import { redis, redisKeys } from '../config/redis';
import { createTokenPair, rotateRefreshToken, revokeRefreshToken } from '../utils/jwt';
import { generateUniqueUsername, generateOTP } from '../utils/generators';
import { sendOTPEmail, sendWelcomeEmail } from '../services/emailService';
import { AppError, sendSuccess, sendError } from '../middleware/errorHandler';

const SALT_ROUNDS = 12;
const OTP_EXPIRY = parseInt(process.env.OTP_EXPIRY_MINUTES || '10') * 60;
const MAX_OTP_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '3');

// POST /api/auth/suggest-username
export async function suggestUsername(_req: Request, res: Response, next: NextFunction) {
  try {
    const username = await generateUniqueUsername();
    sendSuccess(res, 200, { username });
  } catch (err) { next(err); }
}

// POST /api/auth/register
export async function register(req: Request, res: Response, next: NextFunction) {
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

    const { username, email, password } = req.body;

    // Check existing
    const [existingEmail, existingUsername] = await Promise.all([
      prisma.user.findUnique({ where: { email: email.toLowerCase() } }),
      prisma.user.findUnique({ where: { username } }),
    ]);

    if (existingEmail) {
      sendError(res, 409, 'An account with this email already exists', 'EMAIL_ALREADY_EXISTS');
      return;
    }
    if (existingUsername) {
      sendError(res, 409, 'This username is already taken', 'USERNAME_TAKEN');
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username,
        email: email.toLowerCase(),
        passwordHash,
        displayName: username,
      },
      select: {
        id: true, username: true, email: true,
        avatarUrl: true, displayName: true, coins: true,
        isProfileComplete: true, createdAt: true,
      },
    });

    const tokens = await createTokenPair({
      userId: user.id,
      username: user.username,
      email: user.email,
    });

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    // Send welcome email (don't await — fire and forget)
    sendWelcomeEmail(user.email, user.username).catch(console.error);

    sendSuccess(res, 201, {
      user,
      accessToken: tokens.accessToken,
    });
  } catch (err) { next(err); }
}

// POST /api/auth/login
export async function login(req: Request, res: Response, next: NextFunction) {
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

    const { username, password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email: username.toLowerCase() },
        ],
      },
    });

    if (!user) {
      sendError(res, 401, 'Invalid username or password', 'INVALID_CREDENTIALS');
      return;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      sendError(res, 401, 'Invalid username or password', 'INVALID_CREDENTIALS');
      return;
    }

    // Update online status
    await prisma.user.update({
      where: { id: user.id },
      data: { isOnline: true, lastSeen: new Date() },
    });

    const tokens = await createTokenPair({
      userId: user.id,
      username: user.username,
      email: user.email,
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    sendSuccess(res, 200, {
      user: {
        id: user.id, username: user.username, email: user.email,
        avatarUrl: user.avatarUrl, displayName: user.displayName,
        coins: user.coins, isProfileComplete: user.isProfileComplete,
      },
      accessToken: tokens.accessToken,
    });
  } catch (err) { next(err); }
}

// POST /api/auth/request-otp
export async function requestOTP(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    if (!email) {
      sendError(res, 400, 'Email is required', 'MISSING_EMAIL');
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, username: true, email: true },
    });

    if (!user) {
      // Don't reveal if email exists
      sendSuccess(res, 200, { message: 'If this email is registered, you will receive an OTP shortly' });
      return;
    }

    // Rate limit: max 3 OTPs per hour
    const attemptsKey = redisKeys.otpAttempts(email);
    const attempts = await redis.incr(attemptsKey);
    if (attempts === 1) await redis.expire(attemptsKey, 3600);
    if (attempts > MAX_OTP_ATTEMPTS) {
      sendError(res, 429, 'Too many OTP requests. Try again in an hour.', 'OTP_RATE_LIMITED');
      return;
    }

    const otp = generateOTP();
    await redis.setex(redisKeys.otp(email), OTP_EXPIRY, otp);

    await sendOTPEmail(user.email, otp, user.username);

    sendSuccess(res, 200, { message: 'If this email is registered, you will receive an OTP shortly' });
  } catch (err) { next(err); }
}

// POST /api/auth/verify-otp
export async function verifyOTP(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      sendError(res, 400, 'Email and OTP are required', 'MISSING_FIELDS');
      return;
    }

    const storedOtp = await redis.get(redisKeys.otp(email.toLowerCase()));
    if (!storedOtp || storedOtp !== otp) {
      sendError(res, 401, 'Invalid or expired OTP', 'INVALID_OTP');
      return;
    }

    // Delete OTP after successful verification
    await redis.del(redisKeys.otp(email.toLowerCase()));

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isOnline: true, lastSeen: new Date() },
    });

    const tokens = await createTokenPair({
      userId: user.id,
      username: user.username,
      email: user.email,
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    sendSuccess(res, 200, {
      user: {
        id: user.id, username: user.username, email: user.email,
        avatarUrl: user.avatarUrl, displayName: user.displayName,
        coins: user.coins, isProfileComplete: user.isProfileComplete,
      },
      accessToken: tokens.accessToken,
    });
  } catch (err) { next(err); }
}

// POST /api/auth/refresh
export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      sendError(res, 401, 'No refresh token provided', 'NO_REFRESH_TOKEN');
      return;
    }

    const tokens = await rotateRefreshToken(token);
    if (!tokens) {
      res.clearCookie('refreshToken', { path: '/' });
      sendError(res, 401, 'Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
      return;
    }

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    sendSuccess(res, 200, { accessToken: tokens.accessToken });
  } catch (err) { next(err); }
}

// POST /api/auth/logout
export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies.refreshToken;
    if (token) {
      await revokeRefreshToken(token);
    }
    res.clearCookie('refreshToken', { path: '/' });
    sendSuccess(res, 200, { message: 'Logged out successfully' });
  } catch (err) { next(err); }
}

// GET /api/auth/me
export async function getMe(req: any, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true, username: true, email: true, avatarUrl: true,
        displayName: true, bio: true, country: true, coins: true,
        isProfileComplete: true, isOnline: true, createdAt: true,
      },
    });
    if (!user) {
      sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
      return;
    }
    sendSuccess(res, 200, { user });
  } catch (err) { next(err); }
}
