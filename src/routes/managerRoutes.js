import express from 'express';
import { ManagerController } from '../controllers/managerController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

// 👤 Routes Gérants (Tableau de bord Web)
// POST: /api/v1/managers/onboard (DOIT être appelé avec le JWT Firebase)
router.post('/onboard', requireAuth, ManagerController.onboardManager);

export default router;
