import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
    getLearningModules,
    startModule,
    updateModuleProgress,
    getUserProgress,
} from '../controllers/learningController';

const router = Router();

router.use(authMiddleware);

router.get('/modules', getLearningModules);
router.get('/progress', getUserProgress);
router.post('/modules/:moduleId/start', startModule);
router.post('/modules/:moduleId/progress', updateModuleProgress);

export default router;
