import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { updateAvatar } from '../controllers/userController';
import { uploadAvatar as multerUpload } from '../config/cloudinary';

const router = Router();

router.post('/avatar', authenticate, multerUpload.single('avatar'), updateAvatar as any);

export default router;
