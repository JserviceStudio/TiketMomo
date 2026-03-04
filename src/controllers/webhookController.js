import { VoucherModel } from '../models/voucherModel.js';
import { FedaPayService } from '../services/fedapayService.js';
import { LicenseService } from '../services/licenseService.js';
import { MonitoringService } from '../services/monitoring/monitoringService.js';
import pool from '../config/db.js';

export const WebhookController = {
    /**
     * POST /api/v1/webhooks/fedapay
     * Écoute les confirmations de FedaPay (Notification asynchrone server-to-server)
     * Idempotence garantie : Si FedaPay renvoie le succès 2 fois, on ignore la 2ème.
     */
    async handleFedapay(req, res, next) {
        try {
            // 🛡️ CIRCUIT BREAKER GUARD (Google/Meta Style)
            if (MonitoringService.isCircuitOpen('FEDAPAY')) {
                return res.status(503).send('Service Temporarily Overloaded (Circuit Open). Try again later.');
            }

            const event = req.body;

            // On ne traite que les paiements validés
            if (event.name === 'transaction.approved') {
                const transaction = event.entity;
                const metadata = transaction.custom_metadata;

                if (!metadata) return res.status(200).send('No metadata. Ignored.');

                // 🌟 BIFURCATION MÉTIER : EST-CE UN ACHAT DE LICENCE SAAS ?
                if (metadata.type === 'LICENSE_PURCHASE') {
                    const userId = metadata.user_id;
                    const domain = metadata.domain;
                    const internalTxId = metadata.internal_tx_id;
                    const plan = metadata.plan || 'PRO'; // Par défaut PRO si non spécifié
                    const durationStr = metadata.duration || '1'; // Durée par défaut 1 mois

                    if (!userId || !internalTxId) return res.status(200).send('Missing internal license parameters.');

                    // On vérifie (Idempotence) si cette transaction FedaPay est déjà exécutée
                    const [existing] = await pool.execute('SELECT id FROM transactions WHERE id = ?', [internalTxId]);
                    if (existing.length > 0) return res.status(200).send('License already provided (Idempotent)');

                    // L'admin a payé: Génération, écriture sur Firestore (avec le Plan) et mise à jour MySQL
                    await LicenseService.generateAndActivateLicense(userId, domain || 'tiketmomo.app', internalTxId, transaction.amount, plan, parseInt(durationStr));

                    // 🛡️ AUDIT LOG IMMUTABLE (Stripe Style)
                    await MonitoringService.logAudit(pool, {
                        managerId: userId,
                        actionType: 'LICENSE_ACTIVATION',
                        resourceId: internalTxId,
                        severity: 'MEDIUM',
                        details: { plan, duration: durationStr, amount: transaction.amount },
                        req
                    });

                    return res.status(200).json({ success: true, message: 'License Delivery Processed' });
                }

                // 🛒 SINON : C'EST UN ACHAT STANDARD DE TICKET WIFI
                const managerId = metadata.manager_id;
                const profile = metadata.profile;
                const internalTxId = metadata.internal_tx_id; // tx_1414... généré par renderCheckoutPage

                if (!managerId || !profile || !internalTxId) return res.status(200).send('Missing mandatory metadata. Ignored.');

                // 2. Transaction SQL (ACID) : Réserver un ticket & valider le paiement (Asynchronisme)
                const connection = await pool.getConnection();
                try {
                    // Lock de ligne (FOR UPDATE SKIP LOCKED) sur un "voucher" libre pour ce manager et ce profil.
                    // On empêche les conflits si 2 personnes achètent le même profil à la même nano-seconde.
                    await connection.beginTransaction();

                    // A- Vérifie d'abord si on l'a pas déjà traité (Idempotence)
                    const [existingTx] = await connection.execute('SELECT id FROM transactions WHERE id = ? FOR UPDATE', [internalTxId]);

                    if (existingTx.length > 0) {
                        // Déjà traité, FedaPay a juste refait un ping
                        await connection.rollback();
                        return res.status(200).send('Already processed');
                    }

                    // B- Trouver un ticket Libre (Règle 4: Indexation NVMe Striée)
                    // On utilise l'index 'idx_manager_profile_used' pour une réponse < 5ms
                    let findVoucherSql = 'SELECT id, code FROM vouchers WHERE manager_id = ? AND profile = ? AND used = 0';
                    let queryParams = [managerId, profile];

                    // Si on a un site_id spécifique dans les métadonnées, on affine la recherche
                    if (metadata.site_id) {
                        findVoucherSql += ' AND site_id = ?';
                        queryParams.push(metadata.site_id);
                    }

                    findVoucherSql += ' LIMIT 1 FOR UPDATE SKIP LOCKED';

                    const [freeVouchers] = await connection.execute(findVoucherSql, queryParams);

                    if (freeVouchers.length === 0) {
                        // Rupture de stock critique ! 
                        await connection.execute(`
                INSERT INTO transactions (id, manager_id, amount, phone_number, status, voucher_id, mikrotik_status) 
                VALUES (?, ?, ?, ?, 'FAILED', NULL, 'PENDING')
             `, [internalTxId, managerId, transaction.amount, 'hidden']);
                        await connection.commit();

                        // 🚩 LOG ET ALERTE ADMIN
                        await MonitoringService.logError('PAYMENT_STOCK', `Rupture critique pour profil ${profile}`, {
                            manager_id: managerId,
                            tx_id: internalTxId,
                            severity: 'CRITICAL'
                        });

                        return res.status(200).send('Stock depleted, failed.');
                    }

                    const ticketId = freeVouchers[0].id;

                    // C- Marquer le ticket comme utilisé
                    await connection.execute('UPDATE vouchers SET used = 1, transaction_id = ? WHERE id = ?', [internalTxId, ticketId]);

                    // D- Insérer la transaction comme SUCCESS
                    await connection.execute(`
            INSERT INTO transactions (id, manager_id, amount, phone_number, status, voucher_id, mikrotik_status) 
            VALUES (?, ?, ?, ?, 'SUCCESS', ?, 'PENDING')
          `, [internalTxId, managerId, transaction.amount, 'hidden', ticketId]);

                    await connection.commit(); // Fin ACID sécurisée

                    // 🛡️ AUDIT LOG IMMUTABLE (Stripe Style)
                    await MonitoringService.logAudit(pool, {
                        managerId,
                        actionType: 'VOUCHER_PURCHASE',
                        resourceId: internalTxId,
                        severity: 'LOW',
                        details: { profile, voucher_id: ticketId, amount: transaction.amount },
                        req
                    });

                    // 🤖 DÉCLENCHEUR INTELLIGENCE ARTIFICIELLE (Background Task)
                    // Importation dynamique propre pour éviter les dépendances circulaires
                    import('./salesController.js')
                        .then(module => {
                            const sc = module.SalesController || module.default?.SalesController;
                            if (sc) sc.checkStockThresholdAndNotify(managerId, profile).catch(e => console.error("FCM Error:", e));
                        })
                        .catch(err => console.error("SalesController Import Error:", err));

                    return res.status(200).json({ success: true, message: 'Webhook Processed' });

                } catch (dbError) {
                    await connection.rollback();
                    throw dbError; // Transmission à catch englobant
                } finally {
                    connection.release();
                }
            }

            // Si l'event n'est pas "transaction.approved", on dit OK à FedaPay mais on ne fait rien
            return res.status(200).send('Event Ignored');

        } catch (err) {
            // 🛡️ RÉGISTRE D'ÉCHEC POUR LE CIRCUIT BREAKER
            MonitoringService.registerFailure('FEDAPAY');

            // 🚩 LOG ERREUR WEBHOOK GÉNÉRALE
            await MonitoringService.logError('FEDAPAY_WEBHOOK', err, { severity: 'CRITICAL' });

            // Il faut renvoyer une erreur 500 pour que FedaPay réessaie plus tard (Retry Logic)
            res.status(500).send('Webhook Processing Failed');
        }
    }
};
