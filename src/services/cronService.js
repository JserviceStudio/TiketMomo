import cron from 'node-cron';
import pool from '../config/db.js';

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
    }
};
