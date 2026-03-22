import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { uploadAvatar } from '../config/cloudinary';
import {
  getUserProfile, updateProfile, updateAvatar,
  searchUsers, getLeaderboard,
} from '../controllers/userController';

const router = Router();

// Validation for profile updates
const profileValidation = [
  body('displayName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Display name must be 1-50 characters'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must be under 500 characters'),
  body('country')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Country must be 2-50 characters'),
];

router.get('/search', authenticate, searchUsers);
router.get('/leaderboard', getLeaderboard);
router.get('/:username', getUserProfile);
router.patch('/profile', authenticate, profileValidation, updateProfile);
router.post('/avatar', authenticate, uploadAvatar.single('avatar'), updateAvatar);

export default router;
