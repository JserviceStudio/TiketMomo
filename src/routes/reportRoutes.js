import express from 'express';
import { ReportController } from '../controllers/reportController.js';
import { requireAuth, requireManagerRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

// 🚩 Toutes ces routes sont protégées et isolées par Manager
router.use(requireAuth);
router.use(requireManagerRole);

// POST: Soumission d'un rapport de fin de journée
router.post('/submit', ReportController.submitReport);

// GET: Historique des rapports pour le gérant
router.get('/history', ReportController.getMyReports);

export default router;
