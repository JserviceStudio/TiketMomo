import admin from 'firebase-admin';
import pool from '../config/db.js';

// Initialisation de Firebase Admin SDK
try {
    if (admin.apps.length === 0) {
        admin.initializeApp();
    }
} catch (error) {
    console.error("Firebase Admin SDK error:", error.message);
}

/**
 * 🛡️ RÈGLE 1 : Middleware d'Isolation "Multi-Tenant"
 * Supporte 2 méthodes : Firebase JWT (Dashboard Web) OU Clé API (Mobile/SaaS Sync)
 */
export const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const apiKeyHeader = req.headers['x-api-key'] || req.headers['x-license-key'];

        // 1. Authentification par Clé API (Si fournie par le mobile)
        if (apiKeyHeader) {
            const [rows] = await pool.execute('SELECT id, email FROM managers WHERE api_key = ? LIMIT 1', [apiKeyHeader]);
            if (rows.length === 0) throw new Error('API Key invalide.');

            req.user = { manager_id: rows[0].id, email: rows[0].email, method: 'api_key' };
            return next();
        }

        // 2. Authentification par JWT Firebase
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED_MISSING_TOKEN',
                    message: 'Token d\'authentification ou Clé API manquante.'
                }
            });
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);

        // Injection du Pivot de Sécurité Multi-Tenant
        req.user = {
            manager_id: decodedToken.uid, // C'est LA clé pour toutes les requêtes SQL
            email: decodedToken.email,
            method: 'jwt'
        };

        next(); // Poursuite vers le contrôleur sécurisé
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED_INVALID_CREDENTIALS',
                message: 'Accès refusé. Token invalide ou expiré.'
            }
        });
    }
};
