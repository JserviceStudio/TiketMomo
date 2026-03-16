import { supabaseAdmin } from '../../../config/supabase.js';
import { ResellerDashboardRepository } from '../../partner-marketing/repositories/resellerDashboardRepository.js';

const toMap = (rows = [], key) => new Map((rows || []).map((row) => [row[key], row]));

export const AdminMarketingService = {
    async fetchMarketingSnapshot() {
        const [
            { data: topResellers, error: topResellersError },
            { data: payoutRequests, error: payoutRequestsError },
            { data: totalCommissionRows, error: commissionError },
            { count: totalResellers, error: totalResellersError }
        ] = await Promise.all([
            supabaseAdmin
                .from('resellers')
                .select('id, name, email, promo_code, balance, commission_rate, created_at')
                .order('balance', { ascending: false })
                .limit(5),
            supabaseAdmin
                .from('payout_requests')
                .select('id, reseller_id, amount, status, phone_number, operator, error_message, created_at, resellers(name)')
                .order('created_at', { ascending: false })
                .limit(10),
            supabaseAdmin.rpc('get_total_commissions_30d'),
            supabaseAdmin.from('resellers').select('*', { count: 'exact', head: true })
        ]);

        if (topResellersError) throw topResellersError;
        if (payoutRequestsError) throw payoutRequestsError;
        if (commissionError) throw commissionError;
        if (totalResellersError) throw totalResellersError;

        const resellerIds = (topResellers || []).map((reseller) => reseller.id);
        const [commissionLogs, resellerProfiles] = await Promise.all([
            resellerIds.length
                ? Promise.all(
                    resellerIds.map((resellerId) =>
                        ResellerDashboardRepository.listCommissionLogsByReseller(resellerId, 100)
                    )
                )
                : Promise.resolve([]),
            resellerIds.length
                ? Promise.all(
                    resellerIds.map((resellerId) =>
                        ResellerDashboardRepository.findResellerById(resellerId)
                    )
                )
                : Promise.resolve([])
        ]);

        const commissionRows = commissionLogs.flat();
        const resellerById = toMap(resellerProfiles, 'id');
        const salesCountByReseller = commissionRows.reduce((accumulator, row) => {
            accumulator[row.reseller_id] = (accumulator[row.reseller_id] || 0) + 1;
            return accumulator;
        }, {});
        const commissionsByReseller = commissionRows.reduce((accumulator, row) => {
            accumulator[row.reseller_id] = (accumulator[row.reseller_id] || 0) + Number(row.amount || 0);
            return accumulator;
        }, {});
        const payoutBreakdown = (payoutRequests || []).reduce((accumulator, payout) => {
            const normalizedStatus = String(payout.status || 'PENDING').toUpperCase();
            if (normalizedStatus === 'SUCCESS') {
                accumulator.success += 1;
                return accumulator;
            }
            if (normalizedStatus === 'FAILED' || normalizedStatus === 'REJECTED' || normalizedStatus === 'CANCELLED') {
                accumulator.failed += 1;
                return accumulator;
            }

            accumulator.pending += 1;
            return accumulator;
        }, { pending: 0, success: 0, failed: 0 });

        return {
            totalCommissions: (totalCommissionRows && totalCommissionRows[0]?.total) || 0,
            totalResellers: totalResellers || 0,
            payoutBreakdown,
            topResellers: (topResellers || []).map((reseller) => ({
                ...reseller,
                sales_count: salesCountByReseller[reseller.id] || 0,
                commission_volume: commissionsByReseller[reseller.id] || 0,
                health: (salesCountByReseller[reseller.id] || 0) > 0 ? 'ACTIVE' : 'IDLE',
                reseller: resellerById.get(reseller.id) || reseller
            })),
            payouts: (payoutRequests || []).map((payout) => ({
                ...payout,
                reseller_name: payout.resellers?.name,
                payout_status: String(payout.status || 'PENDING').toUpperCase()
            }))
        };
    }
};
