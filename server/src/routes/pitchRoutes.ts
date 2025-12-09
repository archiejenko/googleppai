import { Router } from 'express';
import { createPitch, getPitches, getPitch } from '../controllers/pitchController';
import { authenticate } from '../middleware/authMiddleware';
import { upload } from '../utils/storage';
import { pitchLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(authenticate);

router.post('/', pitchLimiter, upload.single('audio'), createPitch);
router.get('/', getPitches);
router.get('/:id', getPitch);

export default router;
