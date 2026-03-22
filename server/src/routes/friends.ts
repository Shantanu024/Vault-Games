import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getFriends, getFriendRequests, sendFriendRequest,
  acceptFriendRequest, removeFriend, cancelFriendRequest,
} from '../controllers/friendController';

const router = Router();

router.use(authenticate);

router.get('/', getFriends);
router.get('/requests', getFriendRequests);
router.post('/request/:userId', sendFriendRequest);
router.patch('/accept/:friendshipId', acceptFriendRequest);
router.delete('/request/:friendshipId', cancelFriendRequest);
router.delete('/:friendshipId', removeFriend);

export default router;
