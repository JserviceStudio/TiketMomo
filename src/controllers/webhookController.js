import { VoucherModel } from '../models/voucherModel.js';
import { FedaPayService } from '../services/fedapayService.js';
import { LicenseService } from '../services/licenseService.js';
import { MonitoringService } from '../services/monitoring/monitoringService.js';
import { supabaseAdmin } from '../config/supabase.js';

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

            const rawSignatureHeader =
                req.headers['x-fedapay-signature'] ||
                req.headers['x-signature'] ||
                req.headers.signature;
            const signatureHeader = Array.isArray(rawSignatureHeader)
                ? rawSignatureHeader[0]
                : rawSignatureHeader;
            const rawPayload = req.rawBody || JSON.stringify(req.body || {});

            if (!FedaPayService.verifySignature(rawPayload, signatureHeader)) {
                await MonitoringService.logError('FEDAPAY_SIGNATURE_INVALID', 'Signature webhook invalide.', {
                    severity: 'HIGH'
                });
                return res.status(401).send('Invalid webhook signature');
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

                    // L'admin a payé: Génération, écriture et mise à jour Supabase
                    // 🛡️ IDÉMPOTENCE ATOMIQUE : on tente d'insérer la transaction d'abord.
                    // Si FedaPay rejoue le webhook, la contrainte UNIQUE sur 'id'
                    // rejettera le doublon avec le code d'erreur PostgreSQL 23505.
                    const { error: licTxError } = await supabaseAdmin.from('transactions').insert([{
                        id: internalTxId,
                        manager_id: userId,
                        amount: transaction.amount,
                        status: 'PROCESSING',
                        type: 'LIC_PURCHASE',
                        metadata: { plan, duration: durationStr }
                    }]);

                    if (licTxError) {
                        // Code 23505 = violation contrainte unique PostgreSQL→ déjà traité
                        if (licTxError.code === '23505') {
                            return res.status(200).send('License already provided (Idempotent)');
                        }
                        throw licTxError;
                    }

                    await LicenseService.generateAndActivateLicense(userId, domain || 'jservice.cloud', internalTxId, transaction.amount, plan, parseInt(durationStr));

                    // 🛡️ AUDIT LOG IMMUTABLE (Stripe Style)
                    await MonitoringService.logAudit({
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

                // 2. Transaction Supabase : Réserver un ticket & valider le paiement via RPC
                try {
                    // 🛡️ IDÉMPOTENCE ATOMIQUE : On tente d'insérer une transaction à l'état PROCESSING.
                    // Si deux webhooks arrivent simultanément, la contrainte UNIQUE sur 'id'
                    // garantit qu'un seul passera. Le second recevra le code 23505 et s'arrêtera.
                    const { error: reserveError } = await supabaseAdmin.from('transactions').insert([{
                        id: internalTxId,
                        manager_id: managerId,
                        amount: transaction.amount,
                        status: 'PROCESSING',
                        type: 'VOUCHER_SALE',
                        metadata: { phone: 'hidden', mikrotik_status: 'PENDING' }
                    }]);

                    // Code 23505 = violation contrainte unique PostgreSQL → déjà traité
                    if (reserveError) {
                        if (reserveError.code === '23505') return res.status(200).send('Already processed');
                        throw reserveError;
                    }

                    // B- Trouver et verrouiller un ticket Libre (RPC PostgreSQL SKIP LOCKED)
                    const { data: freeVouchers, error: rpcError } = await supabaseAdmin.rpc('get_next_voucher', {
                        m_id: managerId,
                        p_val: parseFloat(transaction.amount)
                    });

                    if (rpcError) throw rpcError;

                    if (!freeVouchers || freeVouchers.length === 0) {
                        // Rupture de stock critique ! On met à jour la transaction (déjà insérée à l'état PROCESSING)
                        await supabaseAdmin
                            .from('transactions')
                            .update({ status: 'FAILED' })
                            .eq('id', internalTxId);

                        // 🚩 LOG ET ALERTE ADMIN
                        await MonitoringService.logError('PAYMENT_STOCK', `Rupture critique pour prix ${transaction.amount}`, {
                            manager_id: managerId,
                            tx_id: internalTxId,
                            severity: 'CRITICAL'
                        });

                        return res.status(200).send('Stock depleted, failed.');
                    }

                    const ticketId = freeVouchers[0].id;

                    // C- Mettre à jour le ticket avec l'ID de transaction (le 'used = true' est déjà fait par RPC)
                    await supabaseAdmin
                        .from('vouchers')
                        .update({ sale_id: internalTxId }) // sale_id dans le schéma
                        .eq('id', ticketId);

                    // D- Mettre la transaction à jour en SUCCESS (déjà insérée à l'état PROCESSING)
                    const { error: updateError } = await supabaseAdmin
                        .from('transactions')
                        .update({
                            status: 'SUCCESS',
                            voucher_id: ticketId,
                            metadata: { phone: 'hidden', mikrotik_status: 'PENDING' }
                        })
                        .eq('id', internalTxId);

                    if (updateError) throw updateError;

                    // 🛡️ AUDIT LOG IMMUTABLE (Stripe Style)
                    await MonitoringService.logAudit({
                        managerId,
                        actionType: 'VOUCHER_PURCHASE',
                        resourceId: internalTxId,
                        severity: 'LOW',
                        details: { profile, voucher_id: ticketId, amount: transaction.amount },
                        req
                    });

                    // Note: Le trigger PG tr_check_low_stock s'occupe de la notification de stock automatiquement.

                    return res.status(200).json({ success: true, message: 'Webhook Processed' });

                } catch (dbError) {
                    throw dbError; // Transmission à catch englobant
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
