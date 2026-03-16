import express from 'express';
import { SalesController } from '../controllers/salesController.js';
import { requireAuth, requireManagerRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

// 📈 Routes Statistiques & Historique (API pour l'application Mobile/Dashboard)
// Sécurisées par le Firebase JWT (Isolation totale manager)
router.get('/stats', requireAuth, requireManagerRole, SalesController.getDashboardStats);

export default router;
