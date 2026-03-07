import { supabaseAdmin } from '../config/supabase.js';

export const NotificationService = {
    /**
     * Envoie une notification (Supabase Realtime / DB Center) à l'Application Mobile du Gérant
     * @param {string} managerId - L'ID du gérant
     * @param {string} title - Titre de la notif
     * @param {string} body - Corps de la notif
     * @param {object} dataPayload - Données asynchrones
     */
    async sendPushToManager(managerId, title, body, dataPayload = {}) {
        try {
            // Dans l'écosystème Supabase, on utilise une table 'notifications'.
            // L'App Mobile s'abonne en Realtime à cette table filtrée par son manager_id.
            const { error } = await supabaseAdmin
                .from('notifications')
                .insert([{
                    manager_id: managerId,
                    title: title,
                    message: body,
                    type: dataPayload.type || 'SYSTEM',
                    metadata: dataPayload,
                    is_read: false
                }]);

            if (error) throw error;

            console.log(`[Notification Service] Notification consignée en DB pour ${managerId}.`);
            return true;
        } catch (error) {
            console.error(`[Notification Service] Échec insertion DB pour ${managerId}:`, error.message);
            return false;
        }
    }
};
