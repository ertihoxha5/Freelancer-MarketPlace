import { Router } from 'express';
import * as authMiddleware from '../middleware/authMiddleware.js';
import * as chatController from '../controllers/chatController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  chatSchemas,
  paramSchemas,
  querySchemas,
} from '../validation/schemas.js';

const router = Router();

router.use(authMiddleware.authenticateToken);

router.get(
  '/users',
  validateRequest({ query: querySchemas.chatSearch }),
  chatController.searchUsers,
);
router.get('/conversations', chatController.getMyConversations);
router.post(
  '/conversations',
  validateRequest({ body: chatSchemas.projectConversation }),
  chatController.createOrGetConversation,
);
router.post(
  '/conversations/direct',
  validateRequest({ body: chatSchemas.directConversation }),
  chatController.createOrGetDirectConversation,
);
router.get(
  '/conversations/:id/messages',
  validateRequest({
    params: paramSchemas.conversationId,
    query: querySchemas.chatMessages,
  }),
  chatController.getMessages,
);
router.patch(
  '/conversations/:id/read',
  validateRequest({ params: paramSchemas.conversationId }),
  chatController.markConversationRead,
);

export default router;
