import crypto from 'crypto';
import { supabaseAdmin } from '../../../config/supabase.js';
import { logger } from '../../../config/logger.js';

const ONE_MONTH_MS = 30.44 * 24 * 60 * 60 * 1000;

export const LicenseActivationService = {
    generateEnterpriseKey(plan) {
        const generateBlock = () => crypto.randomBytes(10)
            .toString('base64')
            .replace(/[^A-Z0-9]/g, '')
            .substring(0, 5);

        const planPrefix = plan === 'VENTE' ? 'VTE' : plan;
        return `TKMO-${planPrefix}-${generateBlock()}-${generateBlock()}-${generateBlock()}`;
    },

    getFeaturesForPlan(plan) {
        const baseFeatures = { isPro: false, hasVpn: false, hasWebStore: false, isVip: false };

        switch (plan) {
            case 'PRO':
                return { ...baseFeatures, isPro: true };
            case 'VENTE':
                return { ...baseFeatures, hasWebStore: true };
            case 'VPN':
                return { ...baseFeatures, hasVpn: true };
            case 'VIP':
                return { isPro: true, hasVpn: true, hasWebStore: true, isVip: true };
            default:
                return baseFeatures;
        }
    },

    async ensureClientForLicense(clientId, licenseKey, expiryDate) {
        const { data: existingClient, error: clientErr } = await supabaseAdmin
            .from('managers')
            .select('id')
            .eq('id', clientId)
            .limit(1);

        if (clientErr) throw clientErr;

        if (!existingClient || existingClient.length === 0) {
            const apiKey = `sk_live_${crypto.randomBytes(32).toString('hex')}`;
            const { error } = await supabaseAdmin.from('managers').insert([{
                id: clientId,
                email: `user_${crypto.randomBytes(2).toString('hex')}@pending.com`,
                api_key: apiKey,
                license_key: licenseKey,
                license_expiry_date: expiryDate
            }]);
            if (error) throw error;
            return;
        }

        const { error } = await supabaseAdmin
            .from('managers')
            .update({
                license_key: licenseKey,
                license_expiry_date: expiryDate,
                notified_almost_expired: false,
                notified_critical_expired: false
            })
            .eq('id', clientId);

        if (error) throw error;
    },

    async generateAndActivateLicense(clientId, domain, internalTxId, amount, plan = 'PRO', durationMonths = 1) {
        const licenseKey = this.generateEnterpriseKey(plan);
        const features = this.getFeaturesForPlan(plan);
        const expiryDate = new Date(Date.now() + (ONE_MONTH_MS * durationMonths)).toISOString();

        logger.info({ plan, durationMonths, internalTxId }, 'License generated');

        try {
            await this.ensureClientForLicense(clientId, licenseKey, expiryDate);

            const { error: clientAppError } = await supabaseAdmin
                .from('manager_apps')
                .upsert({
                    manager_id: clientId,
                    app_id: 'license-saas',
                    status: 'ACTIVE'
                }, { onConflict: 'manager_id,app_id' });
            if (clientAppError) throw clientAppError;

            const { error: licenseError } = await supabaseAdmin
                .from('licenses')
                .upsert({
                    id: internalTxId,
                    manager_id: clientId,
                    app_id: 'license-saas',
                    plan_code: plan,
                    status: 'ACTIVE',
                    license_key: licenseKey,
                    starts_at: new Date().toISOString(),
                    expires_at: expiryDate,
                    source_tx_id: internalTxId,
                    metadata: {
                        domain,
                        duration_months: durationMonths
                    }
                }, { onConflict: 'id' });
            if (licenseError) throw licenseError;

            const entitlements = Object.entries(features).map(([featureCode, enabled]) => ({
                license_id: internalTxId,
                feature_code: featureCode,
                value_json: { enabled }
            }));

            const { error: entitlementError } = await supabaseAdmin
                .from('license_entitlements')
                .upsert(entitlements, { onConflict: 'license_id,feature_code' });
            if (entitlementError) throw entitlementError;

            const { error: txError } = await supabaseAdmin
                .from('transactions')
                .update({
                    app_id: 'license-saas',
                    amount,
                    status: 'SUCCESS',
                    type: 'LIC_PURCHASE',
                    metadata: {
                        phone: 'hidden',
                        mikrotik_status: 'ACTIVATED',
                        plan,
                        duration: durationMonths,
                        domain
                    }
                })
                .eq('id', internalTxId);
            if (txError) throw txError;

            logger.info({ plan, internalTxId, clientId }, 'License activation persisted');
            return licenseKey;
        } catch (error) {
            logger.error({ err: error, internalTxId, clientId, plan }, 'License activation failed');
            throw error;
        }
    }
};

LicenseActivationService.ensureManagerForLicense = LicenseActivationService.ensureClientForLicense;
