import { TransactionModel } from '../models/transactionModel.js';
import { NotificationService } from '../services/notificationService.js';

export const SalesController = {
    /**
     * GET /api/v1/sales/stats
     * Retourne l'historique et les statistiques CA + Stocks au Mobile/Dashboard
     */
    async getDashboardStats(req, res, next) {
        try {
            const managerId = req.user.manager_id;

            const stats = await TransactionModel.getSalesStats(managerId);
            const stockLevels = await TransactionModel.getStockLevels(managerId);
            const recentTransactions = await TransactionModel.getTransactionsByManager(managerId, 20, 0);

            res.status(200).json({
                success: true,
                data: {
                    stats,
                    stock: stockLevels,
                    transactions: recentTransactions
                }
            });
        } catch (err) {
            next(err);
        }
    },

    /**
     * Logique métier "Alerte Automatique"
     * Doit être appelée par le WebHook APRÈS un succès d'achat
     */
    async checkStockThresholdAndNotify(managerId, profile) {
        try {
            // 1. Quel est notre stock actuel ?
            const stockLevels = await TransactionModel.getStockLevels(managerId);
            const currentProfileStock = stockLevels.find(s => s.profile === profile);

            const remaining = currentProfileStock ? currentProfileStock.remaining_stock : 0;

            // 2. Le seuil de déclenchement (Hardcodé à 10 pour l'instant, pourrait être dyn. depuis config manager)
            const CRITICAL_THRESHOLD = 10;

            if (remaining <= CRITICAL_THRESHOLD) {
                // ALERTE CRITIQUE : Il faut que Moailte IA de l'app Mobile bosse.
                await NotificationService.sendPushToManager(
                    managerId,
                    '⚠️ Stock Faible !',
                    `Il ne vous reste que ${remaining} tickets pour le forfait ${profile}.`,
                    {
                        type: 'STOCK_CRITICAL',
                        action: 'TRIGGER_MOAILTE_GENERATOR',
                        target_profile: profile,
                        recommended_quantity: "50" // Indice donné à l'IA Mobile
                    }
                );
            }
        } catch (error) {
            console.error("[SalesController] Erreur de vérification du stock critique :", error);
            // Ne doit pas interrompre la requête utilisateur, c'est du background.
        }
    }
};
