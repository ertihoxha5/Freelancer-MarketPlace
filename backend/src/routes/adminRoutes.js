import { Router } from 'express';
import * as authMiddleware from '../middleware/authMiddleware.js';
import * as adminController from '../controllers/adminController.js';

const router = Router();

router.get('/users', authMiddleware.authenticateToken, adminController.getUsers);
router.patch('/users/:id', authMiddleware.authenticateToken, adminController.updateUser);
router.delete('/users/:id', authMiddleware.authenticateToken, adminController.deleteUser);

export default router;