import { supabaseAdmin } from '../../../config/supabase.js';

export const VoucherRepository = {
    async upsertSite(site) {
        return supabaseAdmin
            .from('sites')
            .upsert(site, { onConflict: 'id' });
    },

    async upsertVouchers(vouchers) {
        return supabaseAdmin
            .from('vouchers')
            .upsert(vouchers, { onConflict: 'code,manager_id', ignoreDuplicates: true })
            .select();
    },

    async findAvailableVoucher(managerId, profile) {
        return supabaseAdmin
            .from('vouchers')
            .select('id, code')
            .eq('manager_id', managerId)
            .eq('profile', profile)
            .eq('used', false)
            .limit(1);
    },

    async reserveNextVoucher(managerId, amount) {
        return supabaseAdmin.rpc('get_next_voucher', {
            m_id: managerId,
            p_val: parseFloat(amount)
        });
    },

    async markVoucherSold(voucherId, saleId) {
        return supabaseAdmin
            .from('vouchers')
            .update({ sale_id: saleId })
            .eq('id', voucherId);
    },

    async listRecentVouchers(managerId, limit = 12) {
        return supabaseAdmin
            .from('vouchers')
            .select('id, profile, price, code, used, sale_id, metadata, created_at, site_id')
            .eq('manager_id', managerId)
            .order('created_at', { ascending: false })
            .limit(limit);
    },

    async countVoucherInventory(managerId) {
        return Promise.all([
            supabaseAdmin.from('vouchers').select('*', { count: 'exact', head: true }).eq('manager_id', managerId),
            supabaseAdmin.from('vouchers').select('*', { count: 'exact', head: true }).eq('manager_id', managerId).eq('used', false),
            supabaseAdmin.from('vouchers').select('*', { count: 'exact', head: true }).eq('manager_id', managerId).eq('used', true)
        ]);
    },

    async createSyncJob(job) {
        return supabaseAdmin
            .from('sync_jobs')
            .insert([job]);
    },

    async listRecentSyncJobs(managerId, limit = 8) {
        return supabaseAdmin
            .from('sync_jobs')
            .select('id, job_type, status, attempt_count, last_error, payload, scheduled_for, processed_at, created_at')
            .eq('manager_id', managerId)
            .order('created_at', { ascending: false })
            .limit(limit);
    }
};
