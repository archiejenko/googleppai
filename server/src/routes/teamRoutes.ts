import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
    getTeam,
    getTeamAnalytics,
    createTeam,
    assignUserToTeam,
} from '../controllers/teamController';

const router = Router();

router.use(authMiddleware);

router.get('/', getTeam);
router.get('/analytics', getTeamAnalytics);
router.post('/', createTeam);
router.post('/assign', assignUserToTeam);

export default router;
