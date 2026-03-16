import { supabaseAdmin } from '../../../config/supabase.js';

export const AuthIdentityRepository = {
    async findClientByApiKey(apiKey) {
        const { data, error } = await supabaseAdmin
            .from('managers')
            .select('id, email')
            .eq('api_key', apiKey)
            .single();

        return { data, error };
    },

    async findClientByEmailAndApiKey(email, apiKey) {
        const { data, error } = await supabaseAdmin
            .from('managers')
            .select('id, email, display_name, status, api_key')
            .eq('email', email)
            .eq('api_key', apiKey)
            .maybeSingle();

        return { data, error };
    },

    async findIdentityByProvider(provider, providerUserId) {
        const { data, error } = await supabaseAdmin
            .from('auth_identities')
            .select('manager_id, email, provider, provider_user_id, is_primary')
            .eq('provider', provider)
            .eq('provider_user_id', providerUserId)
            .limit(1)
            .maybeSingle();

        return { data, error };
    },

    async upsertIdentity(identity) {
        const { error } = await supabaseAdmin
            .from('auth_identities')
            .upsert(identity, { onConflict: 'provider,provider_user_id' });

        return { error };
    }
};

AuthIdentityRepository.findManagerByApiKey = AuthIdentityRepository.findClientByApiKey;
AuthIdentityRepository.findManagerByEmailAndApiKey = AuthIdentityRepository.findClientByEmailAndApiKey;
