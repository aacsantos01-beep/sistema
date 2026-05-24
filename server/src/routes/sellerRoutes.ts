import { Router } from 'express';
import * as sellerController from '../controllers/sellerController';
import { authenticateToken, isAdmin } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticateToken, sellerController.getAllSellers);
router.post('/', authenticateToken, isAdmin, sellerController.createSeller);
router.put('/:id', authenticateToken, isAdmin, sellerController.updateSeller);
router.delete('/:id', authenticateToken, isAdmin, sellerController.deleteSeller);

export default router;
