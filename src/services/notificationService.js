import admin from 'firebase-admin';

export const NotificationService = {
    /**
     * Envoie une notification Push (FCM) à l'Application Mobile 'MoailteAI' du Gérant
     * @param {string} managerId - L'ID Firebase UID du gérant (Sert de Topic unique)
     * @param {string} title - Titre de la notif
     * @param {string} body - Corps de la notif
     * @param {object} data - (Optionnel) Données cachées pour que le Moailte IA lance la génération Auto
     */
    async sendPushToManager(managerId, title, body, dataPayload = {}) {
        try {
            // Pour une architecture Multi-Appareils sans gérer les tokens d'appareils, on utilise la messagerie "Topic".
            // L'App Mobile doit s'enregistrer (subscribeToTopic) au topic égal à son `uid` Firebase lors de sa connexion.
            const topic = `manager_${managerId}`;

            const message = {
                notification: {
                    title: title,
                    body: body
                },
                data: {
                    ...dataPayload, // ex: action: 'AUTO_REFILL', profile: '100F-6H'
                    timestamp: new Date().toISOString()
                },
                topic: topic
            };

            // Si l'application Firebase Admin n'a pas été bien configurée avec de vrais credentials, 
            // le SDK enverra une erreur, mais ça passera ce bloc Try sans planter l'application Express.
            const response = await admin.messaging().send(message);
            console.log(`[Push Notification] Envoyée avec succès au topic ${topic}. Firebase ID:`, response);
            return true;
        } catch (error) {
            console.error(`[Push Notification] Échec vers ${managerId}:`, error.message);
            return false; // Échec non bloquant. Le client aura sa page de rupture, et le mail pourra faire relais plus tard.
        }
    }
};
