import express from 'express';
import { LicenseController } from '../controllers/licenseController.js';

const router = express.Router();

// 🛒 Routes des Licences SaaS
// GET: /api/v1/licenses/buy
router.get('/buy', LicenseController.renderLicenseCheckout);

// GET: /api/v1/licenses/success
router.get('/success', LicenseController.renderSuccessPage);

export default router;
