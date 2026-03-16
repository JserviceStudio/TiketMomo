import express from 'express';
import { ManagerController } from '../controllers/managerController.js';
import { requireAuth, requireClientRole, requireManagerRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

// 👤 Routes Gérants (Tableau de bord Web)
router.post('/auth/login', ManagerController.login);
router.post('/auth/logout', ManagerController.logout);
router.get('/dashboard', requireAuth, requireClientRole, ManagerController.getDashboard);
// POST: /api/v1/managers/onboard (DOIT être appelé avec le JWT Firebase)
router.post('/onboard', requireAuth, requireManagerRole, ManagerController.onboardManager);
router.post('/branding', requireAuth, requireManagerRole, ManagerController.updateBranding);

export default router;
