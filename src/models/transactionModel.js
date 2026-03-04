import pool from '../config/db.js';

export const TransactionModel = {
    /**
     * Récupère la liste des transactions d'un gérant (Historique des ventes / Dashboard)
     */
    async getTransactionsByManager(managerId, limit = 50, offset = 0) {
        const [rows] = await pool.execute(`
      SELECT t.id, t.amount, t.status, t.created_at, v.profile, v.code 
      FROM transactions t
      LEFT JOIN vouchers v ON t.voucher_id = v.id
      WHERE t.manager_id = ? 
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `, [managerId, limit.toString(), offset.toString()]); // toString évite un bug mysql2 avec les limites dynamiques

        return rows;
    },

    /**
     * Calcul des statistiques financières pour l'application mobile (CA, Nbre ventes)
     */
    async getSalesStats(managerId) {
        const [rows] = await pool.execute(`
      SELECT 
        COUNT(id) as total_sales,
        SUM(amount) as total_revenue
      FROM transactions 
      WHERE manager_id = ? AND status = 'SUCCESS'
    `, [managerId]);

        return {
            totalVentes: rows[0].total_sales || 0,
            chiffreAffaires: rows[0].total_revenue || 0
        };
    },

    /**
     * Vérifie le niveau de stock (tickets restants) pour CHAQUE profil de ce gérant
     * Permet de détecter le Seuil Critique (ex: < 10)
     */
    async getStockLevels(managerId) {
        const [rows] = await pool.execute(`
       SELECT profile, COUNT(id) as remaining_stock
       FROM vouchers
       WHERE manager_id = ? AND used = 0
       GROUP BY profile
     `, [managerId]);

        return rows; // Tableau : [{ profile: '100F-6H', remaining_stock: 45 }, ...]
    }
};
