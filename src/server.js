import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { logger } from './config/logger.js';

// Importation des routes
import voucherRoutes from './routes/voucherRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import salesRoutes from './routes/salesRoutes.js';
import licenseRoutes from './routes/licenseRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import adminRoutes from './routes/admin/adminRoutes.js';
import resellerRoutes from './routes/resellerRoutes.js';

// Services
import { CronService } from './services/cronService.js';

// Variables d'environnement
dotenv.config();

const app = express();

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
// CORS — Origines autorisées uniquement (Zero-Trust)
// Définir ALLOWED_ORIGINS dans .env : "https://monsite.com,https://app.monsite.com"
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Autorise les requêtes sans Origin (ex: curl, Postman, webhooks server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origine non autorisée - ${origin}`));
    }
  },
  credentials: true
}));
app.use(express.json({
  verify: (req, res, buf) => {
    // Nécessaire pour la vérification de signature HMAC des webhooks
    if (req.originalUrl?.startsWith('/api/v1/webhooks/')) {
      req.rawBody = buf.toString('utf8');
    }
  }
})); // Parsing du JSON entrant (Stateless)
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

// 🔌 Branchement des routes métiers avec versionnement (Google API Design)
app.use('/admin', adminRoutes); // Interface de gestion Administrative
app.use('/api/v1/licenses', licenseRoutes); // Vente de licences SaaS
app.use('/api/v1/reports', reportRoutes);   // 🚩 Rapports Multi-Apps (Jeux, WiFi, etc.)
app.use('/api/v1/clients', clientRoutes); // Route canonique client
app.use('/api/v1/managers', clientRoutes); // Compatibilité legacy
app.use('/api/v1/vouchers', voucherRoutes);
app.use('/api/v1/sales', salesRoutes); // Routes VENTES & STATS
app.use('/api/v1/payments', paymentRoutes); // Routes PAIEMENT (HTML)
app.use('/api/v1/webhooks', webhookRoutes); // Routes WEBHOOK (API Server-to-Server)
app.use('/resellers', resellerRoutes); // Route canonique reseller
app.use('/partners', resellerRoutes); // Compatibilité legacy

// Catch 404 (Route non trouvée)
app.use(notFoundHandler);

// Handler d'erreur global (Enterprise Error Handling)
app.use(errorHandler);

// 🧹 Lancement des tâches planifiées en arrière-plan
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
