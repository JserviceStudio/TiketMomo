import express from 'express';
import { PartnerController } from '../../controllers/partner/partnerController.js';
import { requirePartnerAuth } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// 🔓 ROUTES PUBLIQUES (Auth)
router.get('/auth', PartnerController.renderAuth);
router.post('/auth/register', PartnerController.register);
router.post('/auth/login', PartnerController.login);
router.get('/auth/logout', (req, res) => {
    res.clearCookie('partner_token');
    res.redirect('/partners/auth');
});

// 🛡️ ROUTES SÉCURISÉES (Dashboard & API)
router.get('/dashboard', requirePartnerAuth, PartnerController.getDashboard);
router.post('/api/payout', requirePartnerAuth, PartnerController.requestPayout);
router.post('/api/profile/promo-code', requirePartnerAuth, PartnerController.updatePromoCode);

// Aliases pour faciliter l'intégration Web App si besoin
router.post('/api/v1/partners/profile/promo-code', requirePartnerAuth, PartnerController.updatePromoCode);
router.post('/api/v1/partners/payout', requirePartnerAuth, PartnerController.requestPayout);

export default router;
