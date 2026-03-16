import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { IdentityResolver } from '../modules/identity-access/services/identityResolver.js';

const ROLE_ALIASES = {
    admin: 'admin',
    client: 'client',
    manager: 'client',
    reseller: 'reseller',
    partner: 'reseller'
};

const normalizeRole = (role, fallbackRole = null) => {
    if (typeof role === 'string' && ROLE_ALIASES[role]) {
        return ROLE_ALIASES[role];
    }

    if (typeof fallbackRole === 'string' && ROLE_ALIASES[fallbackRole]) {
        return ROLE_ALIASES[fallbackRole];
    }

    return role || fallbackRole || null;
};

const buildRoleDeniedResponse = (req, res, requiredRoles) => {
    const acceptsHtml = req.headers.accept?.includes('text/html');
    const target = requiredRoles.includes('admin')
        ? '/auth/admin'
        : requiredRoles.includes('reseller')
            ? '/auth/reseller'
            : requiredRoles.includes('client')
                ? '/auth/client'
            : null;

    if (acceptsHtml && target) {
        return res.status(403).send(`<script>window.location.href="${target}";</script>`);
    }

    return res.status(403).json({
        success: false,
        error: {
            code: 'FORBIDDEN_ROLE',
            message: 'Votre rôle ne permet pas cet accès.'
        }
    });
};

export const requireRole = (...requiredRoles) => (req, res, next) => {
    const normalizedRequiredRoles = requiredRoles.map((role) => normalizeRole(role)).filter(Boolean);
    const userRole = normalizeRole(req.user?.role);

    if (!userRole || !normalizedRequiredRoles.includes(userRole)) {
        return buildRoleDeniedResponse(req, res, normalizedRequiredRoles);
    }

    return next();
};

/**
 * 🛡️ RÈGLE 1 : Middleware d'Isolation "Multi-Tenant"
 * Supporte 2 méthodes : Supabase JWT (Dashboard Web) OU Clé API (Mobile/SaaS Sync)
 */
export const requireAuth = async (req, res, next) => {
    try {
        const identity = await IdentityResolver.resolveRequestIdentity(req);
        req.user = {
            ...identity,
            role: normalizeRole(identity.role, 'client')
        };
        return next();
    } catch (error) {
        return res.status(error.statusCode || 401).json({
            success: false,
            error: {
                code: error.code || 'UNAUTHORIZED_INVALID_CREDENTIALS',
                message: error.message || 'Accès refusé. Token invalide ou expiré.'
            }
        });
    }
};

const safeCompare = (left, right) => {
    if (typeof left !== 'string' || typeof right !== 'string') return false;
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    if (leftBuffer.length !== rightBuffer.length) return false;
    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('❌ ERREUR FATALE : JWT_SECRET est manquant dans le fichier .env. Arrêt du serveur.');
    process.exit(1);
}

/**
 * 🛡️ RÈGLE 2 : Middleware Partenaires (JWT Interne)
 */
export const requirePartnerAuth = async (req, res, next) => {
    try {
        const token = req.cookies?.partner_token || (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);

        if (!token) {
            return res.status(401).send('<script>window.location.href="/auth/reseller";</script>');
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = {
            id: decoded.id,
            role: normalizeRole(decoded.role, 'reseller')
        };
        next();
    } catch (error) {
        return res.status(401).send('<script>window.location.href="/auth/reseller";</script>');
    }
};

const ADMIN_SESSION_COOKIE = 'admin_session';

const createAdminSessionToken = (username) => jwt.sign(
    {
        sub: username,
        role: 'admin'
    },
    JWT_SECRET,
    { expiresIn: '12h' }
);

export const issueAdminSession = (res, username, { secure = process.env.NODE_ENV === 'production' } = {}) => {
    const sessionToken = createAdminSessionToken(username);

    res.cookie(ADMIN_SESSION_COOKIE, sessionToken, {
        httpOnly: true,
        secure,
        sameSite: 'Lax',
        maxAge: 12 * 60 * 60 * 1000
    });
};

/**
 * 🔒 Middleware d'authentification Admin (session username/password)
 */
export const requireAdminAuth = (req, res, next) => {
    const configuredUsername = process.env.ADMIN_DASHBOARD_USERNAME || 'admin';
    const configuredPassword = process.env.ADMIN_DASHBOARD_PASSWORD || process.env.ADMIN_DASHBOARD_TOKEN;

    if (!configuredUsername || !configuredPassword) {
        return res.status(500).json({
            success: false,
            error: {
                code: 'ADMIN_AUTH_NOT_CONFIGURED',
                message: 'ADMIN_DASHBOARD_USERNAME ou ADMIN_DASHBOARD_PASSWORD est manquant côté serveur.'
            }
        });
    }

    const authHeader = req.headers.authorization;
    const bearerSession = authHeader?.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : null;
    const cookieSession = req.cookies?.[ADMIN_SESSION_COOKIE];
    const providedSession = cookieSession || bearerSession;

    if (!providedSession) {
        const acceptsHtml = req.headers.accept?.includes('text/html');
        if (acceptsHtml) {
            return res.status(401).send('<script>window.location.href="/admin/auth";</script>');
        }

        return res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED_ADMIN',
                message: 'Accès admin refusé.'
            }
        });
    }

    try {
        const decoded = jwt.verify(providedSession, JWT_SECRET);
        const sessionUsername = typeof decoded === 'object' ? decoded.sub : null;
        const sessionRole = typeof decoded === 'object' ? decoded.role : null;

        if (!safeCompare(sessionUsername, configuredUsername) || sessionRole !== 'admin') {
            throw new Error('INVALID_ADMIN_SESSION');
        }

        req.user = {
            ...(req.user || {}),
            email: configuredUsername,
            role: normalizeRole('admin', 'admin')
        };

        return next();
    } catch (error) {
        const acceptsHtml = req.headers.accept?.includes('text/html');
        if (acceptsHtml) {
            return res.status(401).send('<script>window.location.href="/admin/auth";</script>');
        }

        return res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED_ADMIN',
                message: 'Session admin invalide ou expirée.'
            }
        });
    }
};

export const requireAdminRole = requireRole('admin');
export const requireClientRole = requireRole('client', 'admin');
export const requireManagerRole = requireClientRole;
export const requireResellerRole = requireRole('reseller', 'admin');
