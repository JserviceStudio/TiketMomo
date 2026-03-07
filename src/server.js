import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import pino from 'pino';
import rateLimit from 'express-rate-limit';

// Variables d'environnement
dotenv.config();

// Initialisation Logger (Observabilité Enterprise Grade)
const logger = pino({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: { colorize: true }
  } : undefined
});

const app = express();

import cookieParser from 'cookie-parser';
import partnerRoutes from './routes/partner/partnerRoutes.js';

// Configuration des fichiers statiques
app.use(express.static('public'));
app.use(cookieParser());

// Middlewares Globaux (Sécurité & Performances)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "cdn.jsdelivr.net", "https://www.googletagmanager.com"],
      "script-src-attr": ["'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "fonts.googleapis.com", "rsms.me"],
      "font-src": ["'self'", "cdn.jsdelivr.net", "fonts.gstatic.com", "rsms.me", "data:"],
      "img-src": ["'self'", "data:", "https:", "blob:"]
    },
  },
})); // Protège les headers HTTP avec une CSP adaptée aux CDNs
app.use(cors()); // Configure CORS
app.use(express.json()); // Parsing du JSON entrant (Stateless)
app.use(morgan('combined')); // Logging HTTP structuré

// Rate Limiting (API Throttling - Sécurité Zero-Trust)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // Limite de TPS par adresse IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Trop de requêtes depuis cette IP (Throttling actif).'
    }
  }
});
app.use('/api/', apiLimiter); // Protection ciblée sur les endpoints API

// Endpoint de santé (Health Check pour AWS/Docker)
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'API is running' });
});

// Endpoint de configuration publique (clés non-sensibles pour le frontend)
// Ne jamais exposer SUPABASE_SERVICE_ROLE_KEY ici.
app.get('/api/config/public', (req, res) => {
  res.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY
  });
});

// Importation des gestionnaires de routes et d'erreur
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import voucherRoutes from './routes/voucherRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import managerRoutes from './routes/managerRoutes.js';
import salesRoutes from './routes/salesRoutes.js';
import licenseRoutes from './routes/licenseRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import adminRoutes from './routes/admin/adminRoutes.js';

// 🔌 Branchement des routes métiers avec versionnement (Google API Design)
app.use('/admin', adminRoutes); // Interface de gestion Administrative
app.use('/api/v1/licenses', licenseRoutes); // Vente de licences SaaS
app.use('/api/v1/reports', reportRoutes);   // 🚩 Rapports Multi-Apps (Jeux, WiFi, etc.)
app.use('/api/v1/managers', managerRoutes); // Routes GERANT (Onboarding/Config)
app.use('/api/v1/vouchers', voucherRoutes);
app.use('/api/v1/sales', salesRoutes); // Routes VENTES & STATS
app.use('/api/v1/payments', paymentRoutes); // Routes PAIEMENT (HTML)
app.use('/api/v1/webhooks', webhookRoutes); // Routes WEBHOOK (API Server-to-Server)
app.use('/partners', partnerRoutes); // 🆕 ESPACE PARTENAIRES J+SERVICE

// Catch 404 (Route non trouvée)
app.use(notFoundHandler);

// Handler d'erreur global (Enterprise Error Handling)
app.use(errorHandler);

// 🧹 Lancement des tâches planifiées en arrière-plan
import { CronService } from './services/cronService.js';
if (process.env.NODE_ENV !== 'test') { // Ne pas lancer pendant les tests unitaires
  CronService.startCleanupTask();
  CronService.startLicenseMonitorTask(); // 🔔 Push Monitor SaaS
}

const PORT = process.env.PORT || 3000;

// 🏗️ GESTION DU CYCLE DE VIE (Graceful Shutdown - Norme Google)

const server = app.listen(PORT, () => {
  logger.info(`🚀 Serveur J+SERVICE démarré sur le port ${PORT}`);
});

const shutdown = async () => {
  logger.info('🛑 Signal reçu: Fermeture du serveur...');
  server.close(() => {
    logger.info('📡 Serveur HTTP fermé.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { app, logger };
