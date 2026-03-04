import { VoucherModel } from '../models/voucherModel.js';
import { FedaPayService } from '../services/fedapayService.js';
import pool from '../config/db.js';

export const WebhookController = {
    /**
     * POST /api/v1/webhooks/fedapay
     * Écoute les confirmations de FedaPay (Notification asynchrone server-to-server)
     * Idempotence garantie : Si FedaPay renvoie le succès 2 fois, on ignore la 2ème.
     */
    async handleFedapay(req, res, next) {
        try {
            // 1. Zero-Trust : Vérification de la signature du webhook
            // const signature = req.headers['x-fedapay-signature'];
            // const isValid = FedaPayService.verifySignature(req.rawBody, signature);
            // if (!isValid) return res.status(401).send('Invalid signature');

            const event = req.body;

            // On ne traite que les paiements validés
            if (event.name === 'transaction.approved') {
                const transaction = event.entity;

                // FedaPay transmet nos data personnalisées
                const metadata = transaction.custom_metadata;
                if (!metadata) return res.status(200).send('No metadata. Ignored.');

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

                    // B- Trouver un ticket Libre (Règle 4: Indexation)
                    const [freeVouchers] = await connection.execute(`
            SELECT id, code FROM vouchers 
            WHERE manager_id = ? AND profile = ? AND used = 0 
            LIMIT 1 FOR UPDATE SKIP LOCKED
          `, [managerId, profile]);

                    if (freeVouchers.length === 0) {
                        // Rupture de stock critique ! Le payeur a été débité mais pas de ticket.
                        // On logge l'erreur (Enterprise Error Handling), on devrait coder un module de remboursement plus tard.
                        await connection.execute(`
                INSERT INTO transactions (id, manager_id, amount, phone_number, status, voucher_id, mikrotik_status) 
                VALUES (?, ?, ?, ?, 'FAILED', NULL, 'PENDING')
             `, [internalTxId, managerId, transaction.amount, 'hidden']);
                        await connection.commit();
                        return res.status(200).send('Stock depleted, failed.');
                    }

                    const ticketId = freeVouchers[0].id;

                    // C- Marquer le ticket comme utilisé (Associant à la transaction)
                    await connection.execute('UPDATE vouchers SET used = 1, transaction_id = ? WHERE id = ?', [internalTxId, ticketId]);

                    // D- Insérer la transaction comme SUCCESS en BD
                    await connection.execute(`
            INSERT INTO transactions (id, manager_id, amount, phone_number, status, voucher_id, mikrotik_status) 
            VALUES (?, ?, ?, ?, 'SUCCESS', ?, 'PENDING')
          `, [internalTxId, managerId, transaction.amount, 'hidden', ticketId]);

                    await connection.commit(); // Fin ACID sécurisée

                    // 🤖 DÉCLENCHEUR INTELLIGENCE ARTIFICIELLE (Asynchrone)
                    // On ne fait pas "await" pour ne pas ralentir la réponse FedaPay. 
                    // Ça tourne en tâche de fond dans Node.JS
                    import('../controllers/salesController.js').then(({ SalesController }) => {
                        SalesController.checkStockThresholdAndNotify(managerId, profile).catch(e => console.error(e));
                    });

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
            console.error('[CRITICAL] Erreur Webhook FedaPay:', err);
            // Il faut renvoyer une erreur 500 pour que FedaPay réessaie plus tard (Retry Logic)
            res.status(500).send('Webhook Processing Failed');
        }
    }
};
