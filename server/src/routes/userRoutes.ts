import { Router } from 'express';
import * as userController from '../controllers/userController';
import { authenticateToken, isAdmin } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticateToken, isAdmin, userController.getAllUsers);
router.post('/', authenticateToken, isAdmin, userController.upload.single('photo'), userController.createUser);
router.put('/:id', authenticateToken, isAdmin, userController.upload.single('photo'), userController.updateUser);
router.delete('/:id', authenticateToken, isAdmin, userController.deleteUser);
router.post('/profile/photo', authenticateToken, userController.upload.single('photo'), userController.updateProfile);

export default router;
