import express from 'express';
import { VoucherController } from '../controllers/voucherController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

// 🛡️ Route protégée par Firebase Auth ou API Key (Multi-Tenant garanti par le middleware)
// Cette route recoit le POST du `GenericSaaSService.ts` du mobile (Push Sync)
router.post('/sync', requireAuth, VoucherController.syncBatch);

export default router;
