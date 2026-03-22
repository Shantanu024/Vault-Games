import { Router } from 'express';
import { body } from 'express-validator';
import { rateLimit } from 'express-rate-limit';
import {
  register, login, requestOTP, verifyOTP,
  refreshToken, logout, getMe, suggestUsername,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Strict rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts. Try again in 15 minutes.' },
});

// Validation rules
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be 3–20 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase and a number'),
];

const loginValidation = [
  body('username').trim().notEmpty().withMessage('Username or email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

router.get('/suggest-username', suggestUsername);
router.post('/register', authLimiter, registerValidation, register);
router.post('/login', authLimiter, loginValidation, login);
router.post('/request-otp', authLimiter, requestOTP);
router.post('/verify-otp', authLimiter, verifyOTP);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);

export default router;
