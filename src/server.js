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

// Middlewares Globaux (Sécurité & Performances)
app.use(helmet()); // Protège les headers HTTP
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
import pool from './config/db.js';

const server = app.listen(PORT, () => {
  logger.info(`🚀 Serveur TiketMomo démarré sur le port ${PORT}`);
});

const shutdown = async () => {
  logger.info('🛑 Signal reçu: Fermeture du serveur...');
  server.close(async () => {
    logger.info('📡 Serveur HTTP fermé.');
    try {
      await pool.end();
      logger.info('🗄️ Pool de connexion MySQL fermé.');
      process.exit(0);
    } catch (err) {
      logger.error('❌ Erreur lors de la fermeture du pool MySQL:', err);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { app, logger };
