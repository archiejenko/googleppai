import { Router } from 'express';
import { register, login } from '../controllers/authController';
import { authLimiter } from '../middleware/rateLimiter';
import { validateRegister, validateLogin } from '../middleware/validation';

const router = Router();

router.post('/register', authLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);

export default router;
