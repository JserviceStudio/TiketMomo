import pool from '../config/db.js';

export const VoucherModel = {
    /**
     * 🛡️ Multi-Tenant Bulk Insert
     * Insère un lot de vouchers de manière atomique pour des performances NVMe optimales
     */
    async bulkInsert(managerId, siteId, vouchers) {
        if (!vouchers || vouchers.length === 0) return 0;

        // Préparation de la requête pour insertion multiple
        // 🌟 FIX : Insertion de la colonne 'profile'
        const sql = `
      INSERT IGNORE INTO vouchers 
      (id, manager_id, site_id, profile, code, price, duration_minutes, used, created_at) 
      VALUES ?
    `;

        // Transformation des données (Mapping)
        const values = vouchers.map((v) => [
            `${managerId}_${siteId}_${v.username}`, // Génération ID Composite
            managerId, // 🛡️ ISOLATION STRICTE
            siteId,
            v.profile || 'default', // 🔔 Correction : Récupération du profil envoyé par l'app
            v.username, // Le code du voucher affiché
            v.price,
            v.duration || 0, // duration_minutes
            false, // used: non utilisé
            new Date(v.generatedAt)
        ]);

        // Exécution optimisée via le Pool
        const [result] = await pool.query(sql, [values]);
        return result.affectedRows; // Nombre de tickets réellement insérés (les doublons sont ignorés)
    },

    /**
     * Vérifie le stock disponible (0ms via Index NVMe)
     * Utilisé avant d'afficher la page de paiement FedaPay.
     */
    async getAvailableVoucherCode(managerId, profile) {
        // 🌟 FIX : Recherche filtrée strictement par profil
        const [rows] = await pool.execute(
            `SELECT id, code FROM vouchers WHERE manager_id = ? AND profile = ? AND used = 0 LIMIT 1`,
            [managerId, profile]
        );
        return rows.length > 0 ? rows[0] : null;
    }
};
