import { supabaseAdmin } from '../config/supabase.js';

export const NotificationService = {
    /**
     * Envoie une notification (Supabase Realtime / DB Center) à l'application du client.
     * Compatibilité legacy conservée: la table utilise encore `manager_id`.
     * @param {string} clientId - L'ID du client
     * @param {string} title - Titre de la notif
     * @param {string} body - Corps de la notif
     * @param {object} dataPayload - Données asynchrones
     */
    async sendPushToClient(clientId, title, body, dataPayload = {}) {
        try {
            // Dans l'écosystème Supabase, l'app mobile filtre encore par `manager_id`.
            const { error } = await supabaseAdmin
                .from('notifications')
                .insert([{
                    manager_id: clientId,
                    title: title,
                    message: body,
                    type: dataPayload.type || 'SYSTEM',
                    metadata: dataPayload,
                    is_read: false
                }]);

            if (error) throw error;

            console.log(`[Notification Service] Notification consignée en DB pour ${clientId}.`);
            return true;
        } catch (error) {
            console.error(`[Notification Service] Échec insertion DB pour ${clientId}:`, error.message);
            return false;
        }
    }
};

NotificationService.sendPushToManager = NotificationService.sendPushToClient;
