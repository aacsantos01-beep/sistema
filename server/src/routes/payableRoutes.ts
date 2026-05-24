import { Router } from 'express';
import * as payableController from '../controllers/payableController';
import { authenticateToken, isAdmin } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticateToken, isAdmin, payableController.getAllPayables);
router.get('/:id', authenticateToken, isAdmin, payableController.getPayableById);
router.post('/', authenticateToken, isAdmin, payableController.createPayable);
router.put('/:id', authenticateToken, isAdmin, payableController.updatePayable);
router.patch('/:id/status', authenticateToken, isAdmin, payableController.updatePayableStatus);
router.delete('/:id', authenticateToken, isAdmin, payableController.deletePayable);

export default router;
