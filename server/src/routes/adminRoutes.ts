import { Router } from 'express';
import { authenticate, requireAdmin, requireManager } from '../middleware/authMiddleware';
import * as adminController from '../controllers/adminController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Admin-only routes
router.get('/users', requireAdmin, adminController.getAllUsers);
router.patch('/users/:id/role', requireAdmin, adminController.updateUserRole);
router.delete('/users/:id', requireAdmin, adminController.deleteUser);
router.get('/analytics', requireAdmin, adminController.getPlatformAnalytics);

// Admin and Manager routes
router.get('/teams', requireManager, adminController.getAllTeams);
router.post('/users/assign-team', requireManager, adminController.assignUserToTeam);

export default router;
