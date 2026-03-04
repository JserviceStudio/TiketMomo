import express from 'express';
import { WebhookController } from '../controllers/webhookController.js';

const router = express.Router();

// 🔔 Webhook FedaPay
// POST: /api/v1/webhooks/fedapay
router.post('/fedapay', WebhookController.handleFedapay);

export default router;
