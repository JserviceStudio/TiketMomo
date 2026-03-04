import { VoucherModel } from '../models/voucherModel.js';
import { syncVouchersValidator } from '../middlewares/validators/voucherValidator.js';

export const VoucherController = {
    /**
     * Endpoint pour recevoir les vouchers depuis l'app Mobile
     * POST /api/v1/vouchers/sync
     */
    async syncBatch(req, res, next) {
        try {
            // 1. Validation Zero-Trust du payload entrant
            const { error, value } = syncVouchersValidator.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Format des données invalide',
                        details: error.details.map(e => e.message)
                    }
                });
            }

            // 🛡️ Isolation : manager_id est récupéré du middleware d'Auth, JAMAIS du client
            const managerId = req.user.manager_id;

            // FIXME: Pour l'instant, on a besoin de l'ID du Site associé au MikroTik.
            // L'app mobile n'envoie pas le "Site ID" dans le payload.
            // Soit le backend déduit un site par défaut pour ce manager, soit on demande au mobile de l'envoyer plus tard.
            // En attendant, on va créer un site "Défaut" ou accepter un site via Header.
            const siteId = req.headers['x-site-id'] || 'default_site';

            // 2. Traitement des données et Bulk Insert (Performance NVMe)
            // La requête base de données écrira 100 tickets d'un coup.
            const insertedCount = await VoucherModel.bulkInsert(managerId, siteId, value.batch);

            // 3. Réponse Standardisée (JSend)
            return res.status(200).json({
                success: true,
                data: {
                    inserted: insertedCount,
                    ignored: value.batch.length - insertedCount,
                    message: `${insertedCount} tickets synchronisés avec succès.`
                }
            });
        } catch (err) {
            next(err); // Renvoi vers le gestionnaire d'erreurs global (Enterprise Error Handling)
        }
    }
};
