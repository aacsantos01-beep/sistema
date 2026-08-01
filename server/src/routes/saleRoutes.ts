import { Router } from 'express';
import * as saleController from '../controllers/saleController';
import { authenticateToken, isAdmin } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authenticateToken, saleController.createSale);
router.get('/', authenticateToken, saleController.getAllSales);
router.get('/:id', authenticateToken, saleController.getSaleDetails);
router.delete('/:id', authenticateToken, isAdmin, saleController.deleteSale);

export default router;
