import crypto from 'crypto';
import { AuthIdentityRepository } from '../../identity-access/repositories/authIdentityRepository.js';
import { ClientRepository } from '../../identity-access/repositories/managerRepository.js';

export const ClientOnboardingService = {
    async onboardClient({ clientId, email, method, provider, providerUserId, licenseKey }) {
        const { data: existingClient, error: selectError } = await ClientRepository.findClientById(clientId);

        if (selectError && selectError.code !== 'PGRST116') {
            throw selectError;
        }

        let apiKeyToReturn = existingClient?.api_key;

        if (existingClient) {
            if (licenseKey) {
                const { error } = await ClientRepository.updateClient(clientId, { license_key: licenseKey });
                if (error) throw error;
            }
        } else {
            apiKeyToReturn = 'sk_live_' + crypto.randomBytes(32).toString('hex');

            const { error } = await ClientRepository.createClient({
                id: clientId,
                email,
                api_key: apiKeyToReturn,
                license_key: licenseKey || null
            });

            if (error) throw error;
        }

        const { error: identityError } = await AuthIdentityRepository.upsertIdentity({
            manager_id: clientId,
            provider: provider || method || 'unknown',
            provider_user_id: providerUserId || clientId,
            email,
            is_primary: true
        });

        if (identityError) throw identityError;

        const { error: appError } = await ClientRepository.ensureClientApp(clientId, 'wifi-core');
        if (appError) throw appError;

        const { error: siteError } = await ClientRepository.ensureDefaultSite(clientId, 'wifi-core');
        if (siteError) throw siteError;

        return {
            api_key: apiKeyToReturn,
            email
        };
    }
};

export const ManagerOnboardingService = ClientOnboardingService;
ManagerOnboardingService.onboardManager = ({ managerId, ...rest }) =>
    ClientOnboardingService.onboardClient({ clientId: managerId, ...rest });
