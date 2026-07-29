import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/authController';

const router = Router();

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per IP per window
    message: { message: 'Muitas tentativas de login. Tente novamente mais tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/login', loginLimiter, authController.login);

export default router;
