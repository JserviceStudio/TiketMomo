import { supabase, supabaseAdmin } from '../config/supabase.js';

/**
 * 🛡️ RÈGLE 1 : Middleware d'Isolation "Multi-Tenant"
 * Supporte 2 méthodes : Supabase JWT (Dashboard Web) OU Clé API (Mobile/SaaS Sync)
 */
export const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const apiKeyHeader = req.headers['x-api-key'] || req.headers['x-license-key'];

        // 1. Authentification par Clé API (Si fournie par le mobile)
        if (apiKeyHeader) {
            const { data: manager, error } = await supabaseAdmin
                .from('managers')
                .select('id, email')
                .eq('api_key', apiKeyHeader)
                .single();

            if (error || !manager) throw new Error('API Key invalide.');

            req.user = { manager_id: manager.id, email: manager.email, method: 'api_key' };
            return next();
        }

        // 2. Authentification par JWT Supabase
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

        // Vérification du token directement avec Supabase
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            throw new Error('Token invalide ou expiré.');
        }

        // Injection du Pivot de Sécurité Multi-Tenant
        req.user = {
            manager_id: user.id, // Supabase UID pour les politiques RLS
            email: user.email,
            method: 'jwt'
        };

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED_INVALID_CREDENTIALS',
                message: error.message || 'Accès refusé. Token invalide ou expiré.'
            }
        });
    }
};
import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'jservice_partner_secret_2026';

/**
 * 🛡️ RÈGLE 2 : Middleware Partenaires (JWT Interne)
 */
export const requirePartnerAuth = async (req, res, next) => {
    try {
        const token = req.cookies?.partner_token || (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);

        if (!token) {
            return res.status(401).send('<script>window.location.href="/partners/auth";</script>');
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = { id: decoded.id };
        next();
    } catch (error) {
        return res.status(401).send('<script>window.location.href="/partners/auth";</script>');
    }
};
