import express from 'express';
import { PaymentController } from '../controllers/paymentController.js';
import { WebhookController } from '../controllers/webhookController.js';

const router = express.Router();

// 🛒 Routes de Paiement (HTML Vues)
// GET: /api/v1/payments/pay
router.get('/pay', PaymentController.renderCheckoutPage);

// GET: /api/v1/payments/success
router.get('/success', PaymentController.renderSuccessPage);

export default router;
