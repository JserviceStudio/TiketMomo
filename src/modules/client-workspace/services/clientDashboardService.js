import { ManagerRepository } from '../../identity-access/repositories/managerRepository.js';
import { VoucherRepository } from '../../voucher-operations/repositories/voucherRepository.js';

const formatVoucherRow = (voucher) => ({
    id: voucher.id,
    profile: voucher.profile,
    price: Number(voucher.price || 0),
    code: voucher.code,
    used: Boolean(voucher.used),
    site_id: voucher.site_id || null,
    sale_id: voucher.sale_id || null,
    password: voucher.metadata?.password || '',
    duration_minutes: voucher.metadata?.duration_minutes || 0,
    created_at: voucher.created_at
});

const buildProfileBreakdown = (rows) => {
    const breakdown = new Map();

    for (const row of rows) {
        const current = breakdown.get(row.profile) || {
            profile: row.profile,
            total: 0,
            available: 0,
            used: 0
        };

        current.total += 1;
        current.available += row.used ? 0 : 1;
        current.used += row.used ? 1 : 0;
        breakdown.set(row.profile, current);
    }

    return Array.from(breakdown.values()).sort((left, right) => right.total - left.total);
};

const LOW_STOCK_THRESHOLD = 10;
const LICENSE_WARNING_DAYS = 10;

const buildLicenseStatus = (expiryDate) => {
    if (!expiryDate) {
        return {
            state: 'NO_EXPIRY',
            label: 'Aucune expiration',
            severity: 'neutral',
            days_remaining: null
        };
    }

    const now = new Date();
    const expiry = new Date(expiryDate);

    if (Number.isNaN(expiry.getTime())) {
        return {
            state: 'INVALID_DATE',
            label: 'Date invalide',
            severity: 'warning',
            days_remaining: null
        };
    }

    const diffMs = expiry.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
        return {
            state: 'EXPIRED',
            label: 'Expiree',
            severity: 'danger',
            days_remaining: daysRemaining
        };
    }

    if (daysRemaining <= LICENSE_WARNING_DAYS) {
        return {
            state: 'EXPIRING_SOON',
            label: 'Proche expiration',
            severity: 'warning',
            days_remaining: daysRemaining
        };
    }

    return {
        state: 'ACTIVE',
        label: 'Active',
        severity: 'success',
        days_remaining: daysRemaining
    };
};

export const ClientDashboardService = {
    async getDashboard(managerId) {
        const [
            { data: client, error: clientError },
            { data: recentVouchers, error: vouchersError },
            counts,
            { data: syncJobs, error: syncJobsError }
        ] = await Promise.all([
            ManagerRepository.findManagerWorkspaceProfile(managerId),
            VoucherRepository.listRecentVouchers(managerId, 12),
            VoucherRepository.countVoucherInventory(managerId),
            VoucherRepository.listRecentSyncJobs(managerId, 8)
        ]);

        if (clientError) throw clientError;
        if (vouchersError) throw vouchersError;
        if (syncJobsError) throw syncJobsError;

        const [totalRes, availableRes, usedRes] = counts;
        if (totalRes.error) throw totalRes.error;
        if (availableRes.error) throw availableRes.error;
        if (usedRes.error) throw usedRes.error;

        const vouchers = (recentVouchers || []).map(formatVoucherRow);
        const profiles = buildProfileBreakdown(vouchers);
        const licenseStatus = buildLicenseStatus(client.license_expiry_date);
        const normalizedSyncJobs = (syncJobs || []).map((job) => ({
            id: job.id,
            job_type: job.job_type,
            status: job.status,
            attempt_count: job.attempt_count,
            last_error: job.last_error,
            source: job.payload?.source || 'Mikhmo AI',
            batch_size: Number(job.payload?.batch_size || 0),
            inserted: Number(job.payload?.inserted || 0),
            ignored: Number(job.payload?.ignored || 0),
            site_id: job.payload?.site_id || null,
            processed_at: job.processed_at,
            created_at: job.created_at
        }));
        const lastSync = normalizedSyncJobs[0] || null;
        const criticalProfiles = profiles.filter((profile) => profile.available <= LOW_STOCK_THRESHOLD);

        return {
            client: {
                id: client.id,
                email: client.email,
                display_name: client.display_name || null,
                status: client.status || 'ACTIVE',
                license_type: client.license_type || 'FREE',
                license_key: client.license_key || null,
                license_expiry_date: client.license_expiry_date || null,
                license_status: licenseStatus
            },
            inventory: {
                total: totalRes.count || 0,
                available: availableRes.count || 0,
                used: usedRes.count || 0,
                profiles,
                alerts: {
                    low_stock: (availableRes.count || 0) <= LOW_STOCK_THRESHOLD,
                    low_stock_threshold: LOW_STOCK_THRESHOLD,
                    critical_profiles: criticalProfiles
                }
            },
            vouchers,
            sync_jobs: normalizedSyncJobs,
            sync_summary: {
                source: lastSync?.source || 'Mikhmo AI',
                last_status: lastSync?.status || 'UNKNOWN',
                last_received_at: lastSync?.created_at || null,
                last_batch_size: lastSync?.batch_size || 0,
                last_inserted: lastSync?.inserted || 0,
                last_error: lastSync?.last_error || null
            }
        };
    }
};
