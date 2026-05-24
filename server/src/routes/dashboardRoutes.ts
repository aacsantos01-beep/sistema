import { Router } from 'express';
import * as dashboardController from '../controllers/dashboardController';
import { authenticateToken, isAdmin } from '../middleware/authMiddleware';

const router = Router();

router.get('/stats', authenticateToken, isAdmin, dashboardController.getStats);
router.get('/report', authenticateToken, isAdmin, dashboardController.getMonthlyReport);

export default router;
