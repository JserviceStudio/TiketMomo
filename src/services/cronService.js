import cron from 'node-cron';
import admin from 'firebase-admin';
import pool from '../config/db.js';
import { NotificationService } from './notificationService.js';

export const CronService = {
    /**
     * 🧹 Nettoyage Automatique de la Base de Données (Règle 4 : Performance NVMe)
     * L'application Mobile supprime les tickets du routeur après 3 jours.
     * Le Backend doit s'aligner et vider sa table 'vouchers' des tickets vendus (+ de 3 jours)
     * pour que les recherches restent en-dessous de 5 millisecondes pour l'éternité.
     */
    startCleanupTask() {
        // S'exécute tous les jours à 03:00 du matin
        cron.schedule('0 3 * * *', async () => {
            console.log('🧹 [CRON] Début du nettoyage des tickets expirés...');
            try {
                // Supprime les tickets vendus (used = 1) dont la dernière mise à jour
                // (date d'achat) remonte à plus de 3 jours.
                const [result] = await pool.execute(`
          DELETE FROM vouchers 
          WHERE used = 1 
          AND updated_at < DATE_SUB(NOW(), INTERVAL 3 DAY)
        `);

                console.log(`🧹 [CRON] Nettoyage terminé. ${result.affectedRows} tickets obsolètes supprimés selon la règle des 3 jours.`);

                // Note: La Data Financière est préservée grâce à la clause 
                // FOREIGN KEY (voucher_id) ON DELETE SET NULL dans la table `transactions`.
            } catch (error) {
                console.error('❌ [CRON] Erreur pendant le nettoyage MySQL:', error);
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
                const db = admin.firestore();
                const now = Date.now();
                const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;
                const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

                // On récupère toutes les licences actives
                const snapshot = await db.collection('saas_licenses').where('status', '==', 'USED').get();

                for (const doc of snapshot.docs) {
                    const data = doc.data();
                    const timeLeft = data.expiryDate - now;

                    // Ignorer les licences déjà expirées (seront gérées par un autre process)
                    if (timeLeft <= 0) continue;

                    // Si c'est une licence de 12 mois ou plus -> Alerte à 30 Jours
                    if (data.duration >= 12 && timeLeft <= THIRTY_DAYS_MS && !data.notifiedAlmostExpired) {
                        await NotificationService.sendPushToManager(
                            data.usedBy,
                            '⚠️ Votre licence approche de sa fin',
                            'Votre licence actuelle expirera dans moins de 30 jours. Pensez à la renouveler.',
                            { type: 'LICENSE_EXPIRING_30', action: 'OPEN_LICENSE_TAB' }
                        );
                        // Marquer comme notifié
                        await doc.ref.update({ notifiedAlmostExpired: true });
                        continue;
                    }

                    // Pour TOUTES les licences (Même 1 mois) -> Alerte Critique à 10 Jours
                    if (timeLeft <= TEN_DAYS_MS && !data.notifiedCriticalExpired) {
                        await NotificationService.sendPushToManager(
                            data.usedBy,
                            '🚨 Licence bientôt expirée !',
                            'Il vous reste moins de 10 jours avant la coupure de vos services SaaS. Renouvelez maintenant.',
                            { type: 'LICENSE_CRITICAL_10', action: 'OPEN_LICENSE_TAB' }
                        );
                        // Marquer comme notifié urgemment
                        await doc.ref.update({ notifiedCriticalExpired: true });
                    }
                }
                console.log('🔔 [CRON] Notifications d\'expiration traitées avec succès.');
            } catch (error) {
                console.error('❌ [CRON] Erreur vérification licences:', error);
            }
        });
        console.log('⏱️ [CRON] Moniteur de Licence planifié (Tous les jours à 9h00).');
    }
};
