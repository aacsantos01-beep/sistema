import { Router } from 'express';
import * as trashController from '../controllers/trashController';
import { authenticateToken, isAdmin } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticateToken, isAdmin, trashController.getTrashItems);
router.post('/restore', authenticateToken, isAdmin, trashController.restoreItem);
router.post('/delete-permanent', authenticateToken, isAdmin, trashController.permanentlyDeleteItem);

export default router;
