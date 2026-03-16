import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../config/supabase.js';
import { ClientOnboardingService } from '../modules/tenant-management/services/managerOnboardingService.js';
import { AuthIdentityRepository } from '../modules/identity-access/repositories/authIdentityRepository.js';
import { ClientDashboardService } from '../modules/client-workspace/services/clientDashboardService.js';

const JWT_SECRET = process.env.JWT_SECRET;

export const ManagerController = {
    async login(req, res, next) {
        try {
            const { email, api_key } = req.body;

            if (!email || !api_key) {
                return res.status(400).json({
                    success: false,
                    error: 'Email et API key client requis.'
                });
            }

            const { data: client, error } = await AuthIdentityRepository.findManagerByEmailAndApiKey(email, api_key);
            if (error) throw error;

            if (!client) {
                return res.status(401).json({
                    success: false,
                    error: 'Identifiants client invalides.'
                });
            }

            if (client.status && client.status !== 'ACTIVE') {
                return res.status(403).json({
                    success: false,
                    error: 'Ce compte client est suspendu.'
                });
            }

            const token = jwt.sign({
                manager_id: client.id,
                email: client.email,
                role: 'client'
            }, JWT_SECRET, { expiresIn: '12h' });

            const sessionCookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Lax',
                maxAge: 12 * 60 * 60 * 1000
            };

            res.cookie('client_session', token, sessionCookieOptions);
            res.cookie('manager_session', token, sessionCookieOptions);

            return res.json({
                success: true,
                data: {
                    id: client.id,
                    email: client.email,
                    display_name: client.display_name || null
                }
            });
        } catch (error) {
            next(error);
        }
    },

    logout(req, res) {
        res.clearCookie('client_session');
        res.clearCookie('manager_session');
        return res.json({ success: true });
    },

    async getDashboard(req, res, next) {
        try {
            const clientId = req.user.manager_id;
            const data = await ClientDashboardService.getDashboard(clientId);
            return res.json({ success: true, data });
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/v1/managers/onboard
     * Appelé automatiquement par l'Application Mobile (en arrière-plan).
     */
    async onboardClient(req, res, next) {
        try {
            const clientId = req.user.manager_id;
            const { email, method, provider, provider_user_id } = req.user;
            const { license_key } = req.body;
            const data = await ClientOnboardingService.onboardClient({
                clientId,
                email,
                method,
                provider,
                providerUserId: provider_user_id,
                licenseKey: license_key
            });

            return res.status(200).json({
                success: true,
                message: 'Processus de configuration terminé.',
                data
            });

        } catch (err) {
            next(err);
        }
    },

    /**
     * POST /api/v1/managers/branding
     */
    async updateBranding(req, res, next) {
        try {
            const clientId = req.user.manager_id;
            const { logo_url } = req.body;

            const { error } = await supabaseAdmin
                .from('managers')
                .update({ logo_url })
                .eq('id', clientId);

            if (error) throw error;

            res.json({ success: true, message: 'Branding mis à jour.' });
        } catch (error) {
            next(error);
        }
    }
};

ManagerController.onboardManager = ManagerController.onboardClient;
