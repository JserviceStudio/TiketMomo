import { supabaseAdmin } from '../../../config/supabase.js';

export const ResellerDashboardRepository = {
    async findResellerById(resellerId) {
        const { data, error } = await supabaseAdmin
            .from('resellers')
            .select('*')
            .eq('id', resellerId)
            .single();

        if (error) throw error;
        return data;
    },

    async listCommissionLogsByReseller(resellerId, limit = 25) {
        const { data, error } = await supabaseAdmin
            .from('commission_logs')
            .select('id, reseller_id, transaction_id, amount, created_at')
            .eq('reseller_id', resellerId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    },

    async listPayoutRequestsByReseller(resellerId, limit = 25) {
        const { data, error } = await supabaseAdmin
            .from('payout_requests')
            .select('id, amount, phone_number, operator, status, error_message, created_at, updated_at')
            .eq('reseller_id', resellerId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    },

    async listTransactionsByIds(transactionIds = []) {
        if (!transactionIds.length) return [];

        const { data, error } = await supabaseAdmin
            .from('transactions')
            .select('id, manager_id, app_id, amount, status, type, source_system, voucher_id, metadata, created_at, updated_at')
            .in('id', transactionIds);

        if (error) throw error;
        return data || [];
    },

    async listLicensesBySourceTransactionIds(transactionIds = []) {
        if (!transactionIds.length) return [];

        const { data, error } = await supabaseAdmin
            .from('licenses')
            .select('id, manager_id, plan_code, status, expires_at, source_tx_id, created_at')
            .in('source_tx_id', transactionIds);

        if (error) throw error;
        return data || [];
    }
};
