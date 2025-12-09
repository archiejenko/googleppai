import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
    createTrainingSession,
    getTrainingSessions,
    getTrainingSession,
    completeTrainingSession,
} from '../controllers/trainingController';

const router = Router();

router.use(authMiddleware);

router.post('/', createTrainingSession);
router.get('/', getTrainingSessions);
router.get('/:id', getTrainingSession);
router.post('/:id/complete', completeTrainingSession);

export default router;
