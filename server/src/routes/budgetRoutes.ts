import { Router } from 'express';
import * as budgetController from '../controllers/budgetController';
import { authenticateToken, isAdmin } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authenticateToken, budgetController.createBudget);
router.get('/', authenticateToken, budgetController.getAllBudgets);
router.get('/:id', authenticateToken, budgetController.getBudgetDetails);
router.delete('/:id', authenticateToken, isAdmin, budgetController.deleteBudget);
router.put('/:id/status', authenticateToken, budgetController.updateBudgetStatus);

export default router;
