import pool from '../config/db.js';

export const ReportController = {
    /**
     * POST /api/v1/reports/submit
     * Permet aux apps (WiFi ou Salle de Jeux) d'envoyer un rapport de vente à l'admin
     */
    async submitReport(req, res, next) {
        try {
            const { app_id, total_sales, total_transactions, raw_data, report_date } = req.body;
            const managerId = req.user.manager_id;

            if (!app_id || total_sales === undefined) {
                return res.status(400).json({ success: false, message: "Données de rapport incomplètes." });
            }

            const sql = `
                INSERT INTO sales_reports (manager_id, app_id, report_date, total_sales, total_transactions, raw_data)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            await pool.execute(sql, [
                managerId,
                app_id,
                report_date || new Date().toISOString().split('T')[0],
                total_sales,
                total_transactions || 0,
                JSON.stringify(raw_data || {})
            ]);

            res.status(201).json({
                success: true,
                message: "Rapport de ventes transmis avec succès à l'administration."
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/v1/reports/my-history
     * Le manager consulte ses propres rapports envoyés
     */
    async getMyReports(req, res, next) {
        try {
            const managerId = req.user.manager_id;
            const { app_id } = req.query;

            let sql = "SELECT * FROM sales_reports WHERE manager_id = ? ";
            const params = [managerId];

            if (app_id) {
                sql += " AND app_id = ? ";
                params.push(app_id);
            }

            sql += " ORDER BY report_date DESC LIMIT 50";

            const [rows] = await pool.execute(sql, params);
            res.status(200).json({ success: true, data: rows });
        } catch (error) {
            next(error);
        }
    }
};
