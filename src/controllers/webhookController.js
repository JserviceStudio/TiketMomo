import { FedaPayWebhookService } from '../modules/payment-billing/services/fedapayWebhookService.js';
import { MonitoringService } from '../services/monitoring/monitoringService.js';

export const WebhookController = {
    /**
     * POST /api/v1/webhooks/fedapay
     * Écoute les confirmations de FedaPay (Notification asynchrone server-to-server)
     * Idempotence garantie : Si FedaPay renvoie le succès 2 fois, on ignore la 2ème.
     */
    async handleFedapay(req, res, next) {
        try {
            const result = await FedaPayWebhookService.handleFedapay(req);
            if (typeof result.body === 'string') {
                return res.status(result.status).send(result.body);
            }
            return res.status(result.status).json(result.body);

        } catch (err) {
            // 🛡️ RÉGISTRE D'ÉCHEC POUR LE CIRCUIT BREAKER
            MonitoringService.registerFailure('FEDAPAY');

            // 🚩 LOG ERREUR WEBHOOK GÉNÉRALE
            await MonitoringService.logError('FEDAPAY_WEBHOOK', err, { severity: 'CRITICAL' });

            // Il faut renvoyer une erreur 500 pour que FedaPay réessaie plus tard (Retry Logic)
            res.status(500).send('Webhook Processing Failed');
        }
    }
};
