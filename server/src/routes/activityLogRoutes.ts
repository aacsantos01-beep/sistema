import { Router } from 'express';
import * as activityLogController from '../controllers/activityLogController';
import { authenticateToken, isAdmin } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticateToken, isAdmin, activityLogController.getActivityLogs);

export default router;
