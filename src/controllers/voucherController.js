import { VoucherModel } from '../models/voucherModel.js';
import { syncVouchersValidator } from '../middlewares/validators/voucherValidator.js';
import { VoucherRepository } from '../modules/voucher-operations/repositories/voucherRepository.js';

export const VoucherController = {
    /**
     * Endpoint pour recevoir les vouchers depuis l'app Mobile
     * POST /api/v1/vouchers/sync
     */
    async syncBatch(req, res, next) {
        const clientId = req.user?.client_id || req.user?.manager_id;
        const siteId = req.headers['x-site-id'];

        try {
            // 1. Validation Zero-Trust du payload entrant
            const { error, value } = syncVouchersValidator.validate(req.body);
            if (error) {
                if (clientId) {
                    await VoucherRepository.createSyncJob({
                        manager_id: clientId,
                        app_id: 'wifi-core',
                        job_type: 'VOUCHER_SYNC',
                        status: 'FAILED',
                        attempt_count: 1,
                        last_error: 'VALIDATION_ERROR',
                        payload: {
                            source: 'Mikhmo AI',
                            batch_size: Array.isArray(req.body?.batch) ? req.body.batch.length : 0,
                            inserted: 0,
                            ignored: 0,
                            site_id: siteId || null
                        },
                        scheduled_for: new Date().toISOString(),
                        processed_at: new Date().toISOString()
                    });
                }

                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Format des données invalide',
                        details: error.details.map(e => e.message)
                    }
                });
            }

            // 🛡️ Isolation : l'identité client est récupérée du middleware d'Auth, jamais du payload.
            // FIXME: Pour l'instant, on a besoin de l'ID du Site associé au MikroTik.
            // L'app mobile n'envoie pas le "Site ID" dans le payload.
            // Soit le backend déduit un site par défaut pour ce client, soit on demande au mobile de l'envoyer plus tard.
            // En attendant, on va créer un site "Défaut" ou accepter un site via Header.
            // 2. Traitement des données et Bulk Insert (Performance NVMe)
            // La requête base de données écrira 100 tickets d'un coup.
            const insertedCount = await VoucherModel.bulkInsert(clientId, siteId, value.batch);

            await VoucherRepository.createSyncJob({
                manager_id: clientId,
                app_id: 'wifi-core',
                job_type: 'VOUCHER_SYNC',
                status: 'COMPLETED',
                attempt_count: 1,
                payload: {
                    source: 'Mikhmo AI',
                    batch_size: value.batch.length,
                    inserted: insertedCount,
                    ignored: value.batch.length - insertedCount,
                    site_id: siteId || null
                },
                scheduled_for: new Date().toISOString(),
                processed_at: new Date().toISOString()
            });

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
            if (clientId) {
                try {
                    await VoucherRepository.createSyncJob({
                        manager_id: clientId,
                        app_id: 'wifi-core',
                        job_type: 'VOUCHER_SYNC',
                        status: 'FAILED',
                        attempt_count: 1,
                        last_error: err.message || 'SYNC_FAILED',
                        payload: {
                            source: 'Mikhmo AI',
                            batch_size: Array.isArray(req.body?.batch) ? req.body.batch.length : 0,
                            inserted: 0,
                            ignored: 0,
                            site_id: siteId || null
                        },
                        scheduled_for: new Date().toISOString(),
                        processed_at: new Date().toISOString()
                    });
                } catch (loggingError) {
                    console.error('[VoucherController] failed to write sync_jobs failure log:', loggingError.message);
                }
            }

            next(err); // Renvoi vers le gestionnaire d'erreurs global (Enterprise Error Handling)
        }
    }
};
