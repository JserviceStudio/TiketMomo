import admin from 'firebase-admin';
import crypto from 'crypto';
import pool from '../config/db.js';

export const LicenseService = {
    /**
     * Générateur de Clé Enterprise-Grade (Microsoft/AWS Style)
     * Format: TKMO-PLAN-XXXXX-XXXXX-XXXXX
     */
    generateEnterpriseKey(plan) {
        const generateBlock = () => crypto.randomBytes(2).toString('hex').toUpperCase().padStart(5, '0');
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

        // 2. Écriture dans Firebase Firestore pour l'App Mobile
        // 🛡️ FIX : On utilise l'ID Firebase de l'utilisateur comme nom de document.
        // Cela garantit qu'un gérant aura TOUJOURS un seul document de licence (le dernier acheté/renouvelé).
        try {
            const db = admin.firestore();
            await db.collection('saas_licenses').doc(userId).set({
                key: licenseKey,
                partnerDomain: domain,
                plan: plan,
                duration: durationMonths,
                features: features, // 🔐 Débloque les sections de l'App
                expiryDate: expiryDate,
                status: 'USED',
                usedBy: userId,
                activatedAt: Date.now(),
                // Flags pour les alertes d'expiration
                notifiedAlmostExpired: false,
                notifiedCriticalExpired: false
            });
            console.log(`[License Service] 🚀 Licence ${plan} (${durationMonths} Mois) activée pour l'UID: ${userId}`);
        } catch (firebaseErr) {
            console.error("[License Service] ❌ Erreur écriture Firestore:", firebaseErr.message);
        }

        // 3. Mise à jour de notre base SQL Locale (Table managers & transactions)
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const [existing] = await connection.execute('SELECT id FROM managers WHERE id = ? FOR UPDATE', [userId]);
            let apiKeyToReturn = 'sk_live_' + crypto.randomBytes(32).toString('hex');

            if (existing.length === 0) {
                // Optionnel : Lier provisoirement un email "pending"
                await connection.execute(
                    'INSERT INTO managers (id, email, api_key, license_key) VALUES (?, ?, ?, ?)',
                    [userId, `user_${crypto.randomBytes(2).toString('hex')}@pending.com`, apiKeyToReturn, licenseKey]
                );
            } else {
                await connection.execute('UPDATE managers SET license_key = ? WHERE id = ?', [licenseKey, userId]);
            }

            // Logguer la transaction D'ACHAT DE LICENCE dans le backend
            await connection.execute(`
        INSERT INTO transactions (id, manager_id, amount, phone_number, status, voucher_id, mikrotik_status) 
        VALUES (?, ?, ?, ?, 'SUCCESS', NULL, 'ACTIVATED')
      `, [internalTxId, userId, amount, 'hidden']);

            await connection.commit();

            console.log(`[License Service] ✅ Transaction (${plan}) consignée en DB MySQL (${internalTxId})`);

        } catch (dbError) {
            await connection.rollback();
            throw dbError;
        } finally {
            connection.release();
        }

        return licenseKey;
    }
};
