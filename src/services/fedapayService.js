import crypto from 'crypto';

export const FedaPayService = {
    /**
     * Signature HMAC (Security First)
     * Valide que le Webhook provient bien de FedaPay
     */
    verifySignature(payload, signatureHeader) {
        if (process.env.NODE_ENV === 'development') return true;

        const secret = process.env.FEDAPAY_WEBHOOK_SECRET;
        if (!secret || !signatureHeader) return false;

        // FedaPay peut envoyer v1=hash,v0=hash... On cherche v1
        const parts = signatureHeader.split(',');
        const v1 = parts.find(p => p.startsWith('v1='))?.split('=')[1];

        // Si le header est brut (sans v1=), on prend la valeur entière comme signature
        const signature = v1 || signatureHeader;

        const hash = crypto.createHmac('sha256', secret)
            .update(payload)
            .digest('hex');

        return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
    },

    /**
     * Création d'une transaction FedaPay
     * Appel API externe asynchrone (Non-Blocking IO)
     */
    async createTransaction(transactionPayload, apiKey) {
        // Note: FedaPay n'est pas encore implémenté complètement pour la création depuis Node,
        // car le widget front-end le fait souvent pour lui-même dans ce workflow, ou on redirige.
        // Mais si le backend DOIT créer le lien, on utilise fetch ici.
        const url = 'https://api.fedapay.com/v1/transactions';

        // Règle 2 : Timeout Strict de 5000ms
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(transactionPayload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            throw new Error(`Erreur réseau FedaPay: ${error.message}`);
        }
    }
};
