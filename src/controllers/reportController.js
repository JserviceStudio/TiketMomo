import { supabaseAdmin } from '../config/supabase.js';

export const ReportController = {
    /**
     * POST /api/v1/reports/submit
     * Permet aux apps (WiFi ou Salle de Jeux) d'envoyer un rapport de vente à l'admin
     */
    async submitReport(req, res, next) {
        try {
            const { app_id, total_sales, total_transactions, raw_data, report_date } = req.body;
            const clientId = req.user.client_id || req.user.manager_id;

            if (!app_id || total_sales === undefined) {
                return res.status(400).json({ success: false, message: "Données de rapport incomplètes." });
            }

            const { error } = await supabaseAdmin
                .from('sales_reports')
                .insert([{
                    manager_id: clientId,
                    app_id,
                    report_date: report_date || new Date().toISOString().split('T')[0],
                    total_sales,
                    total_transactions: total_transactions || 0,
                    raw_data: raw_data || {}
                }]);

            if (error) throw error;

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
     * Le client consulte ses propres rapports envoyés
     */
    async getMyReports(req, res, next) {
        try {
            const clientId = req.user.client_id || req.user.manager_id;
            const { app_id } = req.query;

            let query = supabaseAdmin
                .from('sales_reports')
                .select('*')
                .eq('manager_id', clientId)
                .order('report_date', { ascending: false })
                .limit(50);

            if (app_id) {
                query = query.eq('app_id', app_id);
            }

            const { data, error } = await query;
            if (error) throw error;

            res.status(200).json({ success: true, data });
        } catch (error) {
            next(error);
        }
    }
};
