import { Router } from 'express';
import * as authMiddleware from '../middleware/authMiddleware.js';
import * as chatController from '../controllers/chatController.js';

const router = Router();

router.use(authMiddleware.authenticateToken);

router.get('/users', chatController.searchUsers);
router.get('/conversations', chatController.getMyConversations);
router.post('/conversations', chatController.createOrGetConversation);
router.post('/conversations/direct', chatController.createOrGetDirectConversation);
router.get('/conversations/:id/messages', chatController.getMessages);
router.patch('/conversations/:id/read', chatController.markConversationRead);

export default router;
