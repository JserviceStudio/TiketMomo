import { supabaseAdmin } from '../../../config/supabase.js';

const buildDefaultSiteId = (clientId) => `default_site_${clientId}`;

export const ClientRepository = {
    async findClientById(clientId) {
        const { data, error } = await supabaseAdmin
            .from('managers')
            .select('id, email, api_key')
            .eq('id', clientId)
            .single();

        return { data, error };
    },

    async findClientWorkspaceProfile(clientId) {
        const { data, error } = await supabaseAdmin
            .from('managers')
            .select('id, email, display_name, status, license_type, license_key, license_expiry_date')
            .eq('id', clientId)
            .single();

        return { data, error };
    },

    async createClient(client) {
        const { error } = await supabaseAdmin
            .from('managers')
            .insert([client]);

        return { error };
    },

    async updateClient(clientId, payload) {
        const { error } = await supabaseAdmin
            .from('managers')
            .update(payload)
            .eq('id', clientId);

        return { error };
    },

    async ensureClientApp(clientId, appId) {
        const { error } = await supabaseAdmin
            .from('manager_apps')
            .upsert({
                manager_id: clientId,
                app_id: appId,
                status: 'ACTIVE'
            }, { onConflict: 'manager_id,app_id' });

        return { error };
    },

    async ensureDefaultSite(clientId, appId, siteId = buildDefaultSiteId(clientId)) {
        const resolvedSiteId = String(siteId || buildDefaultSiteId(clientId));
        const { error } = await supabaseAdmin
            .from('sites')
            .upsert({
                id: resolvedSiteId,
                manager_id: clientId,
                app_id: appId,
                name: resolvedSiteId === buildDefaultSiteId(clientId) ? 'Default Site' : resolvedSiteId
            }, { onConflict: 'id' });

        return { error, siteId: resolvedSiteId };
    }
};

export const ManagerRepository = ClientRepository;
ManagerRepository.findManagerById = ClientRepository.findClientById;
ManagerRepository.findManagerWorkspaceProfile = ClientRepository.findClientWorkspaceProfile;
ManagerRepository.createManager = ClientRepository.createClient;
ManagerRepository.updateManager = ClientRepository.updateClient;
ManagerRepository.ensureManagerApp = ClientRepository.ensureClientApp;
