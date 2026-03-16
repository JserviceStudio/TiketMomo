import { VoucherRepository } from '../repositories/voucherRepository.js';

const buildDefaultSiteId = (managerId) => `default_site_${managerId}`;

export const VoucherInventoryService = {
    buildDefaultSiteId,

    async ensureDefaultSite(managerId, siteId, appId = 'wifi-core') {
        const resolvedSiteId = String(siteId || buildDefaultSiteId(managerId));
        const { error } = await VoucherRepository.upsertSite({
            id: resolvedSiteId,
            manager_id: managerId,
            app_id: appId,
            name: resolvedSiteId === buildDefaultSiteId(managerId) ? 'Default Site' : resolvedSiteId
        });

        if (error) throw error;
        return resolvedSiteId;
    },

    async bulkInsert(managerId, siteId, vouchers) {
        if (!vouchers || vouchers.length === 0) return 0;

        const resolvedSiteId = await this.ensureDefaultSite(managerId, siteId);
        const values = vouchers.map((voucher) => ({
            manager_id: managerId,
            site_id: resolvedSiteId,
            app_id: 'wifi-core',
            profile: voucher.profile || 'default',
            code: voucher.username,
            price: voucher.price || 0,
            used: false,
            metadata: {
                password: voucher.password || '',
                duration_minutes: voucher.duration || 0
            },
            created_at: new Date(voucher.generatedAt || Date.now()).toISOString()
        }));

        const { data, error } = await VoucherRepository.upsertVouchers(values);
        if (error) {
            console.error('[VoucherInventoryService] bulkInsert:', error.message);
            return 0;
        }

        return data ? data.length : 0;
    },

    async getAvailableVoucherCode(managerId, profile) {
        const { data, error } = await VoucherRepository.findAvailableVoucher(managerId, profile);
        if (error) {
            console.error('[VoucherInventoryService] getAvailableVoucherCode:', error.message);
            return null;
        }

        return data && data.length > 0 ? data[0] : null;
    }
};
