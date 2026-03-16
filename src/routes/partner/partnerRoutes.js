import express from 'express';
import { ResellerController } from '../../controllers/partner/partnerController.js';
import { requirePartnerAuth, requireResellerRole } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// 🔓 ROUTES PUBLIQUES (Auth)
router.get('/auth', ResellerController.renderAuth);
router.post('/auth/register', ResellerController.register);
router.post('/auth/login', ResellerController.login);
router.get('/auth/logout', (req, res) => {
    res.clearCookie('partner_token');
    res.redirect('/auth/reseller');
});

// 🛡️ ROUTES SÉCURISÉES (Dashboard & API)
router.get('/dashboard', requirePartnerAuth, requireResellerRole, ResellerController.getDashboard);
router.get('/api/dashboard', requirePartnerAuth, requireResellerRole, ResellerController.getDashboardAPI);
router.post('/api/payout', requirePartnerAuth, requireResellerRole, ResellerController.requestPayout);
router.post('/api/profile/promo-code', requirePartnerAuth, requireResellerRole, ResellerController.updatePromoCode);

// Aliases pour faciliter l'intégration Web App si besoin
router.post('/api/v1/partners/profile/promo-code', requirePartnerAuth, requireResellerRole, ResellerController.updatePromoCode);
router.post('/api/v1/partners/payout', requirePartnerAuth, requireResellerRole, ResellerController.requestPayout);

export default router;
