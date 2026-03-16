import { VoucherInventoryService } from '../modules/voucher-operations/services/voucherInventoryService.js';

export const VoucherModel = {
    async ensureDefaultSite(managerId, siteId) {
        return VoucherInventoryService.ensureDefaultSite(managerId, siteId);
    },

    /**
     * 🛡️ Multi-Tenant Bulk Insert
     * Insère un lot de vouchers de manière atomique pour des performances NVMe optimales
     */
    async bulkInsert(managerId, siteId, vouchers) {
        return VoucherInventoryService.bulkInsert(managerId, siteId, vouchers);
    },

    /**
     * Vérifie le stock disponible (0ms via Index NVMe)
     * Utilisé avant d'afficher la page de paiement FedaPay.
     */
    async getAvailableVoucherCode(managerId, profile) {
        return VoucherInventoryService.getAvailableVoucherCode(managerId, profile);
    }
};
