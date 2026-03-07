import express from 'express';
import { AdminController } from '../../controllers/admin/adminController.js';

const router = express.Router();

/**
 * 🔒 IMPORTANT : En production, vous devriez protéger cette route
 * avec un middleware AuthAdmin (qui vérifie un password ou un email Admin spécifique)
 * Pour l'instant, c'est l'interface de contrôle directe.
 */
router.get('/dashboard', AdminController.renderDashboard);
router.get('/api/stats', AdminController.getStatsAPI);
router.get('/api/export', AdminController.exportDataAPI);
router.post('/api/licenses/generate', AdminController.generateLicensesAPI);
router.post('/api/settings', AdminController.updateSettingsAPI);
router.post('/api/payouts/process', AdminController.processPayoutAPI);

export default router;
