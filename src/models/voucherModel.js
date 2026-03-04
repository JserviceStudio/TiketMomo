import pool from '../config/db.js';

export const VoucherModel = {
    /**
     * 🛡️ Multi-Tenant Bulk Insert
     * Insère un lot de vouchers de manière atomique pour des performances NVMe optimales
     */
    async bulkInsert(managerId, siteId, vouchers) {
        if (!vouchers || vouchers.length === 0) return 0;

        // Préparation de la requête pour insertion multiple
        const sql = `
      INSERT IGNORE INTO vouchers 
      (id, manager_id, site_id, code, price, duration_minutes, used, created_at) 
      VALUES ?
    `;

        // Transformation des données (Mapping)
        const values = vouchers.map((v) => [
            // Utilisation du username comme ID unique s'il est fort, ou génération d'un UUID si nécessaire.
            // Le mobile envoie username = code du ticket (ex: Ac3041)
            `${managerId}_${siteId}_${v.username}`, // Génération ID Composite
            managerId, // 🛡️ ISOLATION STRICTE
            siteId,
            v.username, // Le code du voucher affiché
            v.price,
            0, // duration_minutes: L'app ne le fournit pas directement dans ce payload, on mettra 0 par défaut pour l'instant
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
        // En prod, vous pourriez ajouter "AND profile = ?" si vous stockiez le tarif/durée exact dans `vouchers`.
        // Ici on check juste si y a un ticket libre pour ce manager
        const [rows] = await pool.execute(
            `SELECT id, code FROM vouchers WHERE manager_id = ? AND used = 0 LIMIT 1`,
            [managerId]
        );
        return rows.length > 0 ? rows[0] : null;
    }
};
