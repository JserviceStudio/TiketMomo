import { supabaseAdmin } from '../config/supabase.js';

export const VoucherModel = {
    /**
     * 🛡️ Multi-Tenant Bulk Insert
     * Insère un lot de vouchers de manière atomique pour des performances NVMe optimales
     */
    async bulkInsert(managerId, siteId, vouchers) {
        if (!vouchers || vouchers.length === 0) return 0;

        // Transformation des données (Mapping) pour Supabase
        const values = vouchers.map((v) => ({
            manager_id: managerId,
            profile: v.profile || 'default',
            code: v.username,
            price: v.price || 0,
            used: false,
            metadata: {
                site_id: siteId || 'default',
                password: v.password || '',
                duration_minutes: v.duration || 0
            },
            created_at: new Date(v.generatedAt || Date.now()).toISOString()
        }));

        // Exécution optimisée via le SDK Supabase avec onConflict pour imiter INSERT IGNORE
        try {
            const { data, error } = await supabaseAdmin
                .from('vouchers')
                .upsert(values, { onConflict: 'code,manager_id', ignoreDuplicates: true })
                .select();

            if (error) throw error;
            return data ? data.length : 0;
        } catch (err) {
            console.error('[VoucherModel] BulkInsert Error:', err.message);
            return 0;
        }
    },

    /**
     * Vérifie le stock disponible (0ms via Index NVMe)
     * Utilisé avant d'afficher la page de paiement FedaPay.
     */
    async getAvailableVoucherCode(managerId, profile) {
        // Recherche filtrée strictement par profil via Supabase
        const { data, error } = await supabaseAdmin
            .from('vouchers')
            .select('id, code')
            .eq('manager_id', managerId)
            .eq('profile', profile)
            .eq('used', false)
            .limit(1);

        if (error) {
            console.error('[VoucherModel] Error Fetching Available Codes:', error.message);
            return null;
        }

        return data && data.length > 0 ? data[0] : null;
    }
};
