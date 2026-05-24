import { Router } from 'express';
import * as productController from '../controllers/productController';
import { authenticateToken, isAdmin } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticateToken, productController.getAllProducts);
router.get('/:id', authenticateToken, productController.getProductById);
router.post('/', authenticateToken, isAdmin, productController.upload.single('image'), productController.createProduct);
router.put('/:id', authenticateToken, isAdmin, productController.upload.single('image'), productController.updateProduct);
router.delete('/:id', authenticateToken, isAdmin, productController.deleteProduct);
router.post('/:id/adjust-stock', authenticateToken, isAdmin, productController.adjustStock);

export default router;
