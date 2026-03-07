import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase.js';

export const LicenseService = {
    /**
     * Générateur de Clé Enterprise-Grade (Microsoft/AWS Style)
     * Format: TKMO-PLAN-XXXXX-XXXXX-XXXXX
     */
    generateEnterpriseKey(plan) {
        // Bloc de 5 caractères majuscules aléatoires (Alphanumérique safe)
        const generateBlock = () => crypto.randomBytes(10)
            .toString('base64')
            .replace(/[^A-Z0-9]/g, '')
            .substring(0, 5);
        // Raccourci de plan pour la clé (ex: VENTE -> VTE)
        const planPrefix = plan === 'VENTE' ? 'VTE' : plan;
        return `TKMO-${planPrefix}-${generateBlock()}-${generateBlock()}-${generateBlock()}`;
    },

    /**
     * Détermine les fonctionnalités débloquées selon le plan
     */
    getFeaturesForPlan(plan) {
        const baseFeatures = { isPro: false, hasVpn: false, hasWebStore: false, isVip: false };

        switch (plan) {
            case 'PRO':
                return { ...baseFeatures, isPro: true };
            case 'VENTE':
                return { ...baseFeatures, hasWebStore: true };
            case 'VPN':
                return { ...baseFeatures, hasVpn: true };
            case 'VIP':
                return { isPro: true, hasVpn: true, hasWebStore: true, isVip: true };
            default:
                return baseFeatures;
        }
    },

    /**
     * Génère, enregistre en Base de Données et Pousse vers Firebase Firestore
     */
    async generateAndActivateLicense(userId, domain, internalTxId, amount, plan = 'PRO', durationMonths = 1) {
        // 1. Génération de Code Entreprise
        const licenseKey = this.generateEnterpriseKey(plan);
        const features = this.getFeaturesForPlan(plan);

        // Validité : Ajout dynamique des mois (1, 12 ou 24)
        // 1 mois = environ 30.44 jours en millisecondes * durationMonths
        const ONE_MONTH_MS = 30.44 * 24 * 60 * 60 * 1000;
        const expiryDate = Date.now() + (ONE_MONTH_MS * durationMonths);

        // With Supabase, licenses are managed directly in the 'managers' table.
        console.log(`[License Service] 🚀 Licence ${plan} (${durationMonths} Mois) générée.`);

        // 3. Mise à jour de notre base locale (Table managers & transactions) avec Supabase
        try {
            // A - Vérifier si le manager existe
            const { data: existingManager, error: managerErr } = await supabaseAdmin
                .from('managers')
                .select('id')
                .eq('id', userId)
                .limit(1);

            if (managerErr) throw managerErr;

            let apiKeyToReturn = 'sk_live_' + crypto.randomBytes(32).toString('hex');

            if (!existingManager || existingManager.length === 0) {
                // Créer le manager s'il n'existe pas
                await supabaseAdmin.from('managers').insert([{
                    id: userId,
                    email: `user_${crypto.randomBytes(2).toString('hex')}@pending.com`,
                    api_key: apiKeyToReturn,
                    license_key: licenseKey,
                    license_expiry_date: new Date(expiryDate).toISOString()
                }]);
            } else {
                // Mettre à jour sa clé s'il existe
                await supabaseAdmin
                    .from('managers')
                    .update({
                        license_key: licenseKey,
                        license_expiry_date: new Date(expiryDate).toISOString(),
                        notified_almost_expired: false,
                        notified_critical_expired: false
                    })
                    .eq('id', userId);
            }

            // B - Logguer la transaction D'ACHAT DE LICENCE dans le backend
            await supabaseAdmin.from('transactions').insert([{
                id: internalTxId,
                manager_id: userId,
                amount: amount,
                status: 'SUCCESS',
                type: 'LIC_PURCHASE',
                metadata: {
                    phone: 'hidden',
                    mikrotik_status: 'ACTIVATED',
                    plan: plan,
                    duration: durationMonths
                }
            }]);

            console.log(`[License Service] ✅ Transaction (${plan}) consignée dans Supabase (${internalTxId})`);

        } catch (dbError) {
            console.error("[License Service] ❌ Erreur écriture Supabase:", dbError.message);
            throw dbError;
        }

        return licenseKey;
    }
};
