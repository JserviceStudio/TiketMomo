import { supabase } from '../../../config/supabase.js';
import jwt from 'jsonwebtoken';
import { AuthIdentityRepository } from '../repositories/authIdentityRepository.js';
import { AppError, unauthorized } from '../../../utils/appError.js';

const JWT_SECRET = process.env.JWT_SECRET;
const CLIENT_SESSION_COOKIE_NAMES = ['client_session', 'manager_session'];

const toClientIdentity = (identity) => ({
    client_id: identity.manager_id,
    manager_id: identity.manager_id,
    email: identity.email,
    role: 'client',
    method: identity.method,
    provider: identity.provider,
    provider_user_id: identity.provider_user_id
});

const resolveClientSessionIdentity = (req) => {
    const sessionToken = CLIENT_SESSION_COOKIE_NAMES
        .map((cookieName) => req.cookies?.[cookieName])
        .find(Boolean);

    if (!sessionToken || !JWT_SECRET) {
        return null;
    }

    try {
        const decoded = jwt.verify(sessionToken, JWT_SECRET);

        if (
            typeof decoded !== 'object'
            || !['client', 'manager'].includes(decoded.role)
            || !decoded.manager_id
        ) {
            return null;
        }

        return {
            client_id: decoded.manager_id,
            manager_id: decoded.manager_id,
            email: decoded.email,
            role: 'client',
            method: 'client_session',
            provider: 'internal_client_session'
        };
    } catch (error) {
        return null;
    }
};

export const IdentityResolver = {
    async resolveRequestIdentity(req) {
        const clientSessionIdentity = resolveClientSessionIdentity(req);
        if (clientSessionIdentity) {
            return toClientIdentity(clientSessionIdentity);
        }

        const authHeader = req.headers.authorization;
        const apiKeyHeader = req.headers['x-api-key'] || req.headers['x-license-key'];

        if (apiKeyHeader) {
            const { data: client, error } = await AuthIdentityRepository.findClientByApiKey(apiKeyHeader);

            if (error || !client) {
                throw unauthorized('API Key invalide.');
            }

            return toClientIdentity({
                manager_id: client.id,
                email: client.email,
                role: 'client',
                method: 'api_key',
                provider: 'internal_api_key'
            });
        }

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError('Token d\'authentification ou Clé API manquante.', {
                statusCode: 401,
                code: 'UNAUTHORIZED_MISSING_TOKEN'
            });
        }

        const token = authHeader.split('Bearer ')[1];
        const {
            data: { user },
            error: authError
        } = await supabase.auth.getUser(token);

        if (authError || !user) {
            throw unauthorized('Token invalide ou expiré.');
        }

        const { data: linkedIdentity } = await AuthIdentityRepository.findIdentityByProvider('supabase', user.id);

        if (!linkedIdentity?.manager_id) {
            throw unauthorized('Aucun client n’est lié à cette identité Supabase.');
        }

        return toClientIdentity({
            manager_id: linkedIdentity.manager_id,
            email: linkedIdentity.email || user.email,
            role: 'client',
            method: 'jwt',
            provider: 'supabase',
            provider_user_id: user.id
        });
    }
};
