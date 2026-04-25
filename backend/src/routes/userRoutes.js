import { Router } from 'express';
import * as userController from '../controllers/userController.js';
import * as authMiddleware from '../middleware/authMiddleware.js';

const router = Router();

router.post('/auth/login', userController.login);
router.post('/auth/refresh', userController.refresh);
router.post('/auth/logout', userController.logout);
router.get('/auth/me', authMiddleware.authenticateToken, userController.me);
router.post('/auth/register', userController.register);
router.post('/auth/changePassword', authMiddleware.authenticateToken, userController.changePassword);

export default router;
