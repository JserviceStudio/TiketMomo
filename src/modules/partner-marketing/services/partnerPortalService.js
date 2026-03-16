import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../../../config/supabase.js';
import { PromoCodePolicy } from '../utils/promoCodePolicy.js';
import { ResellerDashboardRepository } from '../repositories/resellerDashboardRepository.js';
import { badRequest } from '../../../utils/appError.js';
import { logger } from '../../../config/logger.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    logger.fatal('JWT_SECRET est manquant dans le fichier .env. Arrêt du serveur.');
    process.exit(1);
}

const invalidCredentialsError = () => new Error('Identifiants invalides.');
const toMap = (rows = [], key) => new Map(rows.map((row) => [row[key], row]));

const normalizePayoutStatus = (status) => {
    const normalized = String(status || 'PENDING').toUpperCase();

    if (normalized === 'SUCCESS') return 'SUCCESS';
    if (normalized === 'FAILED' || normalized === 'REJECTED' || normalized === 'CANCELLED') return 'FAILED';
    return 'PENDING';
};

const inferSaleKind = (transaction, license) => {
    if (license?.plan_code) return 'LICENSE';

    const rawType = String(transaction?.type || '').toUpperCase();
    if (rawType.includes('LICENSE')) return 'LICENSE';
    if (rawType.includes('PROMO')) return 'PROMO';
    if (rawType.includes('VOUCHER')) return 'VOUCHER';
    return 'SALE';
};

export const ResellerPortalService = {
    async listExistingPromoCodes(excludedPartnerId) {
        let query = supabaseAdmin.from('resellers').select('promo_code');

        if (excludedPartnerId) {
            query = query.neq('id', excludedPartnerId);
        }

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map((row) => row.promo_code);
    },

    async ensurePromoCodeIsAvailable(candidateCode, excludedPartnerId) {
        const existingCodes = await this.listExistingPromoCodes(excludedPartnerId);
        const conflict = PromoCodePolicy.findConflict(candidateCode, existingCodes);

        if (!conflict) return;

        if (conflict.type === 'duplicate') {
            throw new Error('Ce code promo est déjà pris.');
        }

        throw new Error('Ce code est trop similaire à un code existant.');
    },

    async registerReseller({ name, email, password, phone, promoCode, commissionRate }) {
        if (!name || !email || !password || !phone) {
            throw badRequest('Champs obligatoires manquants.', 'PARTNER_MISSING_FIELDS');
        }

        const { data: existingPartner, error: existingPartnerError } = await supabaseAdmin
            .from('resellers')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        if (existingPartnerError) throw existingPartnerError;
        if (existingPartner) {
            throw badRequest('Cet email est déjà utilisé.', 'PARTNER_EMAIL_TAKEN');
        }

        const finalPromoCode = PromoCodePolicy.normalize(
            promoCode || PromoCodePolicy.generateFallbackCode()
        );

        await this.ensurePromoCodeIsAvailable(finalPromoCode);

        const partnerId = `res_${crypto.randomBytes(8).toString('hex')}`;
        const hashedPassword = await bcrypt.hash(password, 10);

        const { error } = await supabaseAdmin
            .from('resellers')
            .insert([{
                id: partnerId,
                name,
                email,
                password: hashedPassword,
                phone,
                promo_code: finalPromoCode,
                commission_rate: Number(commissionRate ?? 10.00),
                balance: 0.00
            }]);

        if (error) throw error;
    },

    async authenticateReseller({ email, password }) {
        const { data: partner, error } = await supabaseAdmin
            .from('resellers')
            .select('id, name, email, password, phone, promo_code, commission_rate, balance')
            .eq('email', email)
            .maybeSingle();

        if (error) throw error;
        if (!partner) throw invalidCredentialsError();

        const isMatch = await bcrypt.compare(password, partner.password);
        if (!isMatch) throw invalidCredentialsError();

        const token = jwt.sign({ id: partner.id, role: 'partner' }, JWT_SECRET, { expiresIn: '7d' });
        return { partner, token };
    },

    async getResellerDashboard(partnerId) {
        const [partner, commissionLogs, payoutsRaw] = await Promise.all([
            ResellerDashboardRepository.findResellerById(partnerId),
            ResellerDashboardRepository.listCommissionLogsByReseller(partnerId, 25),
            ResellerDashboardRepository.listPayoutRequestsByReseller(partnerId, 25)
        ]);

        const transactionIds = commissionLogs
            .map((sale) => sale.transaction_id)
            .filter(Boolean);

        const [transactions, licenses] = await Promise.all([
            ResellerDashboardRepository.listTransactionsByIds(transactionIds),
            ResellerDashboardRepository.listLicensesBySourceTransactionIds(transactionIds)
        ]);

        const transactionsById = toMap(transactions, 'id');
        const licensesByTransactionId = toMap(licenses, 'source_tx_id');

        const sales = commissionLogs.map((sale) => {
            const transaction = sale.transaction_id ? transactionsById.get(sale.transaction_id) : null;
            const license = sale.transaction_id ? licensesByTransactionId.get(sale.transaction_id) : null;
            const saleDate = transaction?.created_at || sale.created_at;
            const saleKind = inferSaleKind(transaction, license);

            return {
                id: sale.id,
                commission_id: sale.id,
                transaction_id: sale.transaction_id || null,
                reference: sale.transaction_id || sale.id,
                amount: Number(sale.amount || 0),
                sale_date: saleDate,
                commission_date: sale.created_at,
                transaction_status: transaction?.status || 'UNKNOWN',
                transaction_type: transaction?.type || null,
                sale_kind: saleKind,
                source_system: transaction?.source_system || 'BACKEND',
                manager_id: transaction?.manager_id || license?.manager_id || null,
                app_id: transaction?.app_id || null,
                license: license ? {
                    id: license.id,
                    plan_code: license.plan_code,
                    status: license.status,
                    expires_at: license.expires_at
                } : null
            };
        });

        const payouts = payoutsRaw.map((payout) => ({
            ...payout,
            payout_status: normalizePayoutStatus(payout.status)
        }));
        const totalCommissions = sales.reduce((sum, sale) => sum + Number(sale.amount || 0), 0);
        const now = Date.now();
        const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const salesLast7d = sales.filter((sale) => {
            const saleDate = new Date(sale.sale_date || sale.created_at || 0).getTime();
            return saleDate >= sevenDaysAgo;
        });
        const salesThisMonth = sales.filter((sale) => {
            const saleDate = new Date(sale.sale_date || sale.created_at || 0).getTime();
            return saleDate >= monthStart.getTime();
        });
        const payoutStatusBreakdown = payouts.reduce((acc, payout) => {
            if (payout.payout_status === 'SUCCESS') {
                acc.success += 1;
                return acc;
            }
            if (payout.payout_status === 'FAILED') {
                acc.failed += 1;
                return acc;
            }

            acc.pending += 1;
            return acc;
        }, { pending: 0, success: 0, failed: 0 });

        const commissionsLast7d = salesLast7d
            .reduce((sum, sale) => sum + Number(sale.amount || 0), 0);

        const commissionsThisMonth = salesThisMonth
            .reduce((sum, sale) => sum + Number(sale.amount || 0), 0);

        const averageCommission = sales.length > 0 ? totalCommissions / sales.length : 0;
        const activity = [
            ...sales.map((sale) => ({
                id: `sale-${sale.id}`,
                event_type: 'SALE',
                date: sale.sale_date,
                amount: sale.amount,
                status: sale.transaction_status,
                title: `${sale.sale_kind} ${sale.license?.plan_code || ''}`.trim(),
                reference: sale.reference
            })),
            ...payouts.map((payout) => ({
                id: `payout-${payout.id}`,
                event_type: 'PAYOUT',
                date: payout.created_at,
                amount: Number(payout.amount || 0),
                status: payout.payout_status,
                title: `Retrait ${payout.operator || ''}`.trim(),
                reference: payout.id
            }))
        ]
            .sort((left, right) => new Date(right.date || 0).getTime() - new Date(left.date || 0).getTime())
            .slice(0, 20);

        return {
            partner,
            reseller: partner,
            summary: {
                total_commissions: totalCommissions,
                sales_count: sales.length,
                pending_payouts: payoutStatusBreakdown.pending,
                successful_payouts: payoutStatusBreakdown.success,
                commissions_last_7d: commissionsLast7d,
                commissions_this_month: commissionsThisMonth,
                sales_last_7d: salesLast7d.length,
                sales_this_month: salesThisMonth.length,
                average_commission: averageCommission,
                payout_breakdown: payoutStatusBreakdown
            },
            sales,
            payouts,
            activity
        };
    },

    async updatePromoCode(partnerId, newCode) {
        const normalizedCode = PromoCodePolicy.normalize(newCode);

        if (!normalizedCode || normalizedCode.length < 3) {
            throw badRequest('Code trop court.', 'PROMO_CODE_TOO_SHORT');
        }

        await this.ensurePromoCodeIsAvailable(normalizedCode, partnerId);

        const { error } = await supabaseAdmin
            .from('resellers')
            .update({ promo_code: normalizedCode })
            .eq('id', partnerId);

        if (error) throw error;
    },

    async requestPayout(partnerId, { amount, phone, operator }) {
        const { data: partner, error: fetchError } = await supabaseAdmin
            .from('resellers')
            .select('balance')
            .eq('id', partnerId)
            .single();

        if (fetchError) throw fetchError;
        if (!partner || Number(partner.balance) < Number(amount)) {
            throw badRequest('Solde insuffisant.', 'PAYOUT_INSUFFICIENT_BALANCE');
        }

        const payoutId = `PAY-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        const { error: rpcError } = await supabaseAdmin.rpc('request_payout', {
            p_id: payoutId,
            p_reseller_id: partnerId,
            p_amount: amount,
            p_phone: phone,
            p_operator: operator
        });

        if (rpcError) throw rpcError;
    }
};

export const PartnerPortalService = ResellerPortalService;
