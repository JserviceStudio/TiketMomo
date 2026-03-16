import crypto from 'crypto';
import { Parser } from 'json2csv';
import { supabaseAdmin } from '../../../config/supabase.js';
import { AdminMarketingService } from './adminMarketingService.js';

const parseSettings = (rows = []) => {
    const settings = {};
    rows.forEach((row) => {
        try {
            settings[row.setting_key] = JSON.parse(row.setting_value);
        } catch {
            settings[row.setting_key] = row.setting_value;
        }
    });
    return settings;
};

const indexBy = (rows, key) => new Map((rows || []).map((row) => [row[key], row]));

const buildDailySeries = (rows = [], valueSelector = () => 1) => {
    const days = Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - (6 - index));
        return date;
    });

    const buckets = new Map(days.map((date) => [date.toISOString().slice(0, 10), 0]));

    (rows || []).forEach((row) => {
        if (!row?.created_at) return;
        const bucketKey = new Date(row.created_at).toISOString().slice(0, 10);
        if (!buckets.has(bucketKey)) return;
        buckets.set(bucketKey, buckets.get(bucketKey) + Number(valueSelector(row) || 0));
    });

    return days.map((date) => ({
        date: date.toISOString(),
        total: buckets.get(date.toISOString().slice(0, 10)) || 0
    }));
};

export const AdminDashboardService = {
    async generateLicenseBatch({ type, quantity, prefix }) {
        const batchId = `LOT-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        const keys = [];

        for (let i = 0; i < quantity; i += 1) {
            const block1 = crypto.randomBytes(2).toString('hex').toUpperCase().padStart(5, '0');
            const block2 = crypto.randomBytes(2).toString('hex').toUpperCase().padStart(5, '0');
            keys.push(`JSVC-${prefix || 'STD'}-${block1}-${block2}`);
        }

        const { error } = await supabaseAdmin
            .from('license_batches')
            .insert([{
                id: batchId,
                batch_name: `Batch ${prefix || 'STD'}`,
                license_type: type.includes('WIFI') ? 'WIFI' : 'FULL',
                quantity,
                generated_by: 'ADMIN'
            }]);

        if (error) throw error;
        return { batchId, keys };
    },

    async fetchDashboardData() {
        const [
            { count: totalManagers },
            { data: txStats },
            { data: revenueHistory },
            { data: planStats },
            { data: lowStockData },
            { data: recentLicenses, error: recentLicensesError },
            { data: recentBatches },
            { data: settingsRows },
            marketingSnapshot,
            { data: auditLogs },
            { data: recentTransactions, error: recentTransactionsError },
            { data: recentLicenseSeries, error: recentLicenseSeriesError },
            { data: recentPayoutSeries, error: recentPayoutSeriesError }
        ] = await Promise.all([
            supabaseAdmin.from('managers').select('*', { count: 'exact', head: true }),
            supabaseAdmin.rpc('get_admin_tx_stats'),
            supabaseAdmin.rpc('get_revenue_history_7d'),
            supabaseAdmin.rpc('get_license_type_stats'),
            supabaseAdmin.rpc('get_low_stock_managers'),
            supabaseAdmin
                .from('licenses')
                .select('id, plan_code, status, created_at, expires_at, manager_id, source_tx_id, managers(email)')
                .order('created_at', { ascending: false })
                .limit(5),
            supabaseAdmin.from('license_batches').select('*').order('created_at', { ascending: false }).limit(5),
            supabaseAdmin.from('system_settings').select('setting_key, setting_value'),
            AdminMarketingService.fetchMarketingSnapshot(),
            supabaseAdmin.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(10),
            supabaseAdmin.from('transactions').select('created_at, amount').gte('created_at', new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)).toISOString()),
            supabaseAdmin.from('licenses').select('created_at').gte('created_at', new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)).toISOString()),
            supabaseAdmin.from('payout_requests').select('created_at, amount').gte('created_at', new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)).toISOString())
        ]);

        if (recentLicensesError) throw recentLicensesError;
        if (recentTransactionsError) throw recentTransactionsError;
        if (recentLicenseSeriesError) throw recentLicenseSeriesError;
        if (recentPayoutSeriesError) throw recentPayoutSeriesError;

        const licenseTxIds = (recentLicenses || []).map((license) => license.source_tx_id).filter(Boolean);

        const [{ data: licenseTransactions, error: licenseTxError }] = await Promise.all([
            licenseTxIds.length
                ? supabaseAdmin.from('transactions').select('id, amount').in('id', licenseTxIds)
                : Promise.resolve({ data: [], error: null })
        ]);

        if (licenseTxError) throw licenseTxError;

        const settings = parseSettings(settingsRows);
        const stats = txStats ? txStats[0] : { total_tx: 0, total_volume: 0, active_managers: 0 };
        const txById = indexBy(licenseTransactions, 'id');

        return {
            stats: {
                clients: totalManagers || 0,
                managers: totalManagers || 0,
                tx: stats.total_tx || 0,
                volume: stats.total_volume || 0,
                active_clients: stats.active_managers || 0,
                active: stats.active_managers || 0
            },
            charts: {
                revenue: revenueHistory || [],
                plans: planStats || [],
                transactions: buildDailySeries(recentTransactions),
                licenses: buildDailySeries(recentLicenseSeries),
                payouts: buildDailySeries(recentPayoutSeries, (row) => row.amount || 0)
            },
            lowStock: lowStockData || [],
            lowStockClients: lowStockData || [],
            licenses: (recentLicenses || []).map((license) => ({
                ...license,
                email: license.managers?.email,
                client_id: license.manager_id,
                license_type: license.plan_code,
                amount: txById.get(license.source_tx_id)?.amount || 0
            })),
            batches: recentBatches || [],
            marketing: marketingSnapshot,
            auditLogs: auditLogs || [],
            config: settings
        };
    },

    async processPayout({ payoutId, action }) {
        if (action === 'APPROVE') {
            const { error } = await supabaseAdmin
                .from('payout_requests')
                .update({ status: 'SUCCESS' })
                .eq('id', payoutId);

            if (error) throw error;
            return { message: 'Retrait approuvé !' };
        }

        const { data: payout, error: fetchError } = await supabaseAdmin
            .from('payout_requests')
            .select('reseller_id, amount')
            .eq('id', payoutId)
            .single();

        if (fetchError || !payout) {
            throw new Error('Demande introuvable.');
        }

        const { error: refundError } = await supabaseAdmin.rpc('refund_reseller_balance', {
            reseller_id: payout.reseller_id,
            amount_to_add: payout.amount
        });
        if (refundError) throw refundError;

        const { error: updateError } = await supabaseAdmin
            .from('payout_requests')
            .update({ status: 'FAILED', error_message: 'Rejeté par l\'admin' })
            .eq('id', payoutId);
        if (updateError) throw updateError;

        return { message: 'Retrait rejeté et fonds restitués.' };
    },

    async updateSetting({ key, value }) {
        const { error } = await supabaseAdmin
            .from('system_settings')
            .upsert({
                setting_key: key,
                setting_value: JSON.stringify(value),
                updated_at: new Date().toISOString()
            }, { onConflict: 'setting_key' });

        if (error) throw error;
    },

    async buildTransactionsCsv() {
        const { data: transactions, error } = await supabaseAdmin
            .from('transactions')
            .select('id, manager_id, amount, status, created_at, managers(email)')
            .order('created_at', { ascending: false })
            .limit(500);

        if (error) throw error;

        const formatted = (transactions || []).map((transaction) => ({
            id: transaction.id,
            manager: transaction.managers?.email,
            amount: transaction.amount,
            status: transaction.status,
            created_at: transaction.created_at
        }));

        const parser = new Parser();
        return parser.parse(formatted);
    }
};
