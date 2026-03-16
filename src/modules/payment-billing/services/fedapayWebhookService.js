import { supabaseAdmin } from '../../../config/supabase.js';
import { FedaPayService } from '../../../services/fedapayService.js';
import { MonitoringService } from '../../../services/monitoring/monitoringService.js';
import { LicenseActivationService } from '../../license-saas/services/licenseActivationService.js';
import { VoucherRepository } from '../../voucher-operations/repositories/voucherRepository.js';

export const FedaPayWebhookService = {
    async processLicensePurchase(transaction, metadata, req) {
        const clientId = metadata.user_id;
        const domain = metadata.domain;
        const internalTxId = metadata.internal_tx_id;
        const plan = metadata.plan || 'PRO';
        const durationStr = metadata.duration || '1';

        if (!clientId || !internalTxId) {
            return { status: 200, body: 'Missing internal license parameters.' };
        }

        const { error: insertError } = await supabaseAdmin.from('transactions').insert([{
            id: internalTxId,
            manager_id: clientId,
            app_id: 'license-saas',
            amount: transaction.amount,
            status: 'PROCESSING',
            type: 'LIC_PURCHASE',
            metadata: { plan, duration: durationStr }
        }]);

        if (insertError) {
            if (insertError.code === '23505') {
                return { status: 200, body: 'License already provided (Idempotent)' };
            }
            throw insertError;
        }

        await LicenseActivationService.generateAndActivateLicense(
            clientId,
            domain || 'jservice.cloud',
            internalTxId,
            transaction.amount,
            plan,
            parseInt(durationStr, 10)
        );

        await MonitoringService.logAudit({
            clientId,
            actionType: 'LICENSE_ACTIVATION',
            resourceId: internalTxId,
            severity: 'MEDIUM',
            details: { plan, duration: durationStr, amount: transaction.amount },
            req
        });

        return { status: 200, body: { success: true, message: 'License Delivery Processed' } };
    },

    async processVoucherPurchase(transaction, metadata, req) {
        const clientId = metadata.client_id || metadata.manager_id;
        const profile = metadata.profile;
        const internalTxId = metadata.internal_tx_id;

        if (!clientId || !profile || !internalTxId) {
            return { status: 200, body: 'Missing mandatory metadata. Ignored.' };
        }

        const { error: reserveError } = await supabaseAdmin.from('transactions').insert([{
            id: internalTxId,
            manager_id: clientId,
            app_id: 'wifi-core',
            amount: transaction.amount,
            status: 'PROCESSING',
            type: 'VOUCHER_SALE',
            metadata: { phone: 'hidden', mikrotik_status: 'PENDING' }
        }]);

        if (reserveError) {
            if (reserveError.code === '23505') {
                return { status: 200, body: 'Already processed' };
            }
            throw reserveError;
        }

        const { data: freeVouchers, error: rpcError } = await VoucherRepository.reserveNextVoucher(clientId, transaction.amount);
        if (rpcError) throw rpcError;

        if (!freeVouchers || freeVouchers.length === 0) {
            await supabaseAdmin
                .from('transactions')
                .update({ status: 'FAILED' })
                .eq('id', internalTxId);

            await MonitoringService.logError('PAYMENT_STOCK', `Rupture critique pour prix ${transaction.amount}`, {
                client_id: clientId,
                tx_id: internalTxId,
                severity: 'CRITICAL'
            });

            return { status: 200, body: 'Stock depleted, failed.' };
        }

        const ticketId = freeVouchers[0].id;

        const { error: saleIdError } = await VoucherRepository.markVoucherSold(ticketId, internalTxId);
        if (saleIdError) throw saleIdError;

        const { error: updateError } = await supabaseAdmin
            .from('transactions')
            .update({
                status: 'SUCCESS',
                voucher_id: ticketId,
                metadata: { phone: 'hidden', mikrotik_status: 'PENDING' }
            })
            .eq('id', internalTxId);
        if (updateError) throw updateError;

        await MonitoringService.logAudit({
            clientId,
            actionType: 'VOUCHER_PURCHASE',
            resourceId: internalTxId,
            severity: 'LOW',
            details: { profile, voucher_id: ticketId, amount: transaction.amount },
            req
        });

        return { status: 200, body: { success: true, message: 'Webhook Processed' } };
    },

    async handleFedapay(req) {
        if (MonitoringService.isCircuitOpen('FEDAPAY')) {
            return { status: 503, body: 'Service Temporarily Overloaded (Circuit Open). Try again later.' };
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
            return { status: 401, body: 'Invalid webhook signature' };
        }

        const event = req.body;
        if (event.name !== 'transaction.approved') {
            return { status: 200, body: 'Event Ignored' };
        }

        const transaction = event.entity;
        const metadata = transaction.custom_metadata;
        if (!metadata) {
            return { status: 200, body: 'No metadata. Ignored.' };
        }

        if (!metadata.client_id && metadata.manager_id) {
            metadata.client_id = metadata.manager_id;
        }

        if (metadata.type === 'LICENSE_PURCHASE') {
            return this.processLicensePurchase(transaction, metadata, req);
        }

        return this.processVoucherPurchase(transaction, metadata, req);
    }
};
