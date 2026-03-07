import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase.js';

export const ManagerController = {
    /**
     * POST /api/v1/managers/onboard
     * Appelé automatiquement par l'Application Mobile (en arrière-plan).
     */
    async onboardManager(req, res, next) {
        try {
            const { manager_id, email } = req.user;
            const { license_key } = req.body;

            // 1. On récupère ou on prépare les données
            const { data: existing, error: selectError } = await supabaseAdmin
                .from('managers')
                .select('id, api_key')
                .eq('id', manager_id)
                .single();

            let apiKeyToReturn;

            if (existing) {
                apiKeyToReturn = existing.api_key;
                if (license_key) {
                    await supabaseAdmin
                        .from('managers')
                        .update({ license_key })
                        .eq('id', manager_id);
                }
            } else {
                // Nouveau Gérant
                apiKeyToReturn = 'sk_live_' + crypto.randomBytes(32).toString('hex');

                const { error: insertError } = await supabaseAdmin
                    .from('managers')
                    .insert([{
                        id: manager_id,
                        email,
                        api_key: apiKeyToReturn,
                        license_key: license_key || null
                    }]);

                if (insertError) throw insertError;
            }

            return res.status(200).json({
                success: true,
                message: 'Processus de configuration terminé.',
                data: {
                    api_key: apiKeyToReturn,
                    email: email
                }
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
            const { manager_id } = req.user;
            const { logo_url } = req.body;

            const { error } = await supabaseAdmin
                .from('managers')
                .update({ logo_url })
                .eq('id', manager_id);

            if (error) throw error;

            res.json({ success: true, message: 'Branding mis à jour.' });
        } catch (error) {
            next(error);
        }
    }
};
