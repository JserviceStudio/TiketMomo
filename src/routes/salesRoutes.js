import express from 'express';
import { SalesController } from '../controllers/salesController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

// 📈 Routes Statistiques & Historique (API pour l'application Mobile/Dashboard)
// Sécurisées par le Firebase JWT (Isolation totale manager)
router.get('/stats', requireAuth, SalesController.getDashboardStats);

export default router;
