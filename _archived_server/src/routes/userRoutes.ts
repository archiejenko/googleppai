import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import * as userController from '../controllers/userController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Profile routes
router.get('/profile', userController.getProfile);
router.patch('/profile', userController.updateProfile);
router.post('/change-password', userController.changePassword);
router.get('/stats', userController.getUserStats);
router.get('/simulate-role', userController.getSimulatedRole);

export default router;
