import crypto from 'crypto';
import { supabaseAdmin } from '../../../config/supabase.js';
import { badRequest } from '../../../utils/appError.js';
import { ManagerRepository } from '../../identity-access/repositories/managerRepository.js';
import { PartnerPortalService } from '../../partner-marketing/services/partnerPortalService.js';
import { MonitoringService } from '../../../services/monitoring/monitoringService.js';

const MANAGER_STATUSES = new Set(['ACTIVE', 'SUSPENDED']);

const buildClientId = () => `mgr_${crypto.randomBytes(8).toString('hex')}`;

const normalizeClientStatus = (status) => String(status || '').trim().toUpperCase();

export const AdminAccountService = {
    async listAccounts() {
        const [managersRes, resellersRes] = await Promise.all([
            supabaseAdmin
                .from('managers')
                .select('id, email, display_name, status, license_type, created_at')
                .order('created_at', { ascending: false })
                .limit(20),
            supabaseAdmin
                .from('resellers')
                .select('id, name, email, phone, promo_code, commission_rate, balance, created_at')
                .order('created_at', { ascending: false })
                .limit(20)
        ]);

        if (managersRes.error) throw managersRes.error;
        if (resellersRes.error) throw resellersRes.error;

        const clients = managersRes.data || [];

        return {
            clients,
            managers: clients,
            resellers: resellersRes.data || []
        };
    },

    async createClientAccount({ email, displayName, licenseKey }) {
        if (!email) {
            throw badRequest('Email client requis.', 'CLIENT_EMAIL_REQUIRED');
        }

        const clientId = buildClientId();
        const apiKey = `sk_live_${crypto.randomBytes(32).toString('hex')}`;

        const { error: createError } = await ManagerRepository.createManager({
            id: clientId,
            email,
            display_name: displayName || null,
            status: 'ACTIVE',
            api_key: apiKey,
            license_key: licenseKey || null
        });

        if (createError) throw createError;

        const { error: appError } = await ManagerRepository.ensureManagerApp(clientId, 'wifi-core');
        if (appError) throw appError;

        const { error: siteError } = await ManagerRepository.ensureDefaultSite(clientId, 'wifi-core');
        if (siteError) throw siteError;

        await MonitoringService.logAudit({
            clientId: 'admin',
            actionType: 'ADMIN_CLIENT_CREATED',
            resourceId: clientId,
            severity: 'MEDIUM',
            details: { email }
        });

        return {
            id: clientId,
            email,
            display_name: displayName || null,
            status: 'ACTIVE',
            api_key: apiKey
        };
    },

    async createResellerAccount({ name, email, password, phone, promoCode, commissionRate }) {
        await PartnerPortalService.registerPartner({
            name,
            email,
            password,
            phone,
            promoCode,
            commissionRate
        });

        const { data: reseller, error } = await supabaseAdmin
            .from('resellers')
            .select('id, name, email, phone, promo_code, commission_rate, balance, created_at')
            .eq('email', email)
            .single();

        if (error) throw error;

        await MonitoringService.logAudit({
            clientId: 'admin',
            actionType: 'ADMIN_RESELLER_CREATED',
            resourceId: reseller.id,
            severity: 'MEDIUM',
            details: { email }
        });

        return reseller;
    },

    async updateClientStatus({ clientId, status }) {
        const normalizedStatus = normalizeClientStatus(status);

        if (!MANAGER_STATUSES.has(normalizedStatus)) {
            throw badRequest('Statut client invalide.', 'CLIENT_STATUS_INVALID');
        }

        const { error } = await ManagerRepository.updateManager(clientId, { status: normalizedStatus });
        if (error) throw error;

        await MonitoringService.logAudit({
            clientId: 'admin',
            actionType: 'ADMIN_CLIENT_STATUS_UPDATED',
            resourceId: clientId,
            severity: 'MEDIUM',
            details: { status: normalizedStatus }
        });

        return {
            id: clientId,
            status: normalizedStatus
        };
    }
};

AdminAccountService.createManagerAccount = AdminAccountService.createClientAccount;
AdminAccountService.updateManagerStatus = ({ managerId, status }) =>
    AdminAccountService.updateClientStatus({ clientId: managerId, status });
