import { Router } from 'express';
import * as settingsController from '../controllers/settingsController';
import { authenticateToken, isAdmin } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticateToken, settingsController.getSettings);
router.post('/logo', authenticateToken, isAdmin, settingsController.upload.single('logo'), settingsController.updateLogo);
router.post('/company-name', authenticateToken, isAdmin, settingsController.updateCompanyName);

export default router;
