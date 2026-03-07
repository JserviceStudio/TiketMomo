import cron from 'node-cron';
import { supabaseAdmin } from '../config/supabase.js';
import { NotificationService } from './notificationService.js';

export const CronService = {
    /**
     * 🧹 Nettoyage Automatique de la Base de Données (Règle 4 : Performance NVMe)
     * Le Backend doit s'aligner et vider sa table 'vouchers' des tickets vendus (+ de 3 jours)
     * pour maintenir des performances optimales.
     */
    startCleanupTask() {
        // S'exécute tous les jours à 03:00 du matin
        cron.schedule('0 3 * * *', async () => {
            console.log('🧹 [CRON] Début du nettoyage des tickets expirés...');
            try {
                // Supprime les tickets vendus (used = true) dont le dernier achat 
                // remonte à plus de 3 jours.
                const threeDaysAgo = new Date();
                threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

                const { data, error, count } = await supabaseAdmin
                    .from('vouchers')
                    .delete({ count: 'exact' })
                    .eq('used', true)
                    .lt('updated_at', threeDaysAgo.toISOString());

                if (error) throw error;

                console.log(`🧹 [CRON] Nettoyage terminé. ${count || 0} tickets obsolètes supprimés selon la règle des 3 jours.`);
            } catch (error) {
                console.error('❌ [CRON] Erreur pendant le nettoyage Supabase:', error.message);
            }
        });

        console.log('⏱️ [CRON] Service de nettoyage planifié (Tous les jours à 3h00).');
    },

    /**
     * 🔔 Surveillance et Notification d'Expiration des Licences (SaaS B2B)
     * Tourne tous les jours pour prévenir les gérants à J-30 (Annuel) et J-10 (Tous)
     */
    startLicenseMonitorTask() {
        // S'exécute tous les jours à 09:00 du matin
        cron.schedule('0 9 * * *', async () => {
            console.log('🔔 [CRON] Vérification des licences expirant bientôt...');
            try {
                const now = new Date();
                const nowMs = now.getTime();
                const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;
                const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

                // On récupère les managers dont la licence approche
                // Note: Dans l'écosystème migré, on utilise 'managers' ou une table 'saas_licenses' dédiée.
                // Ici on assume que les données de licence sont dans 'managers' (au vu du schema.sql et LicenseService).
                const { data: managers, error } = await supabaseAdmin
                    .from('managers')
                    .select('id, email, license_key, license_expiry_date, notified_almost_expired, notified_critical_expired')
                    .not('license_key', 'is', null);

                if (error) throw error;

                for (const manager of managers) {
                    if (!manager.license_expiry_date) continue;

                    const expiryDate = new Date(manager.license_expiry_date).getTime();
                    const timeLeft = expiryDate - nowMs;

                    if (timeLeft <= 0) continue;

                    // ⚠️ Alerte Critique à 10 Jours - PRIORITÉ MAX (vérifiée EN PREMIER)
                    if (timeLeft <= TEN_DAYS_MS && !manager.notified_critical_expired) {
                        await NotificationService.sendPushToManager(
                            manager.id,
                            '🚨 Licence bientôt expirée !',
                            'Il vous reste moins de 10 jours avant la coupure de vos services SaaS. Renouvelez maintenant.',
                            { type: 'LICENSE_CRITICAL_10', action: 'OPEN_LICENSE_TAB' }
                        );
                        await supabaseAdmin.from('managers').update({ notified_critical_expired: true }).eq('id', manager.id);
                    }
                    // Alerte à 30 Jours (uniquement si pas encore en zone critique)
                    else if (timeLeft <= THIRTY_DAYS_MS && !manager.notified_almost_expired) {
                        await NotificationService.sendPushToManager(
                            manager.id,
                            '⚠️ Votre licence approche de sa fin',
                            'Votre licence actuelle expirera dans moins de 30 jours. Pensez à la renouveler.',
                            { type: 'LICENSE_EXPIRING_30', action: 'OPEN_LICENSE_TAB' }
                        );
                        await supabaseAdmin.from('managers').update({ notified_almost_expired: true }).eq('id', manager.id);
                    }
                }
                console.log('🔔 [CRON] Notifications d\'expiration traitées avec succès.');
            } catch (error) {
                console.error('❌ [CRON] Erreur vérification licences Supabase:', error.message);
            }
        });
        console.log('⏱️ [CRON] Moniteur de Licence planifié (Tous les jours à 9h00).');
    }
};
