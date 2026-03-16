import crypto from 'crypto';
import { supabaseAdmin } from '../../../config/supabase.js';
import { VoucherInventoryService } from '../../voucher-operations/services/voucherInventoryService.js';

const esc = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

export const FedaPayCheckoutService = {
    async prepareCheckoutPage(query) {
        const { client: queryClientId, manager: queryManagerId, amount, profile, mac, ip, pub_key: pubKey } = query;
        const clientId = queryClientId || queryManagerId;

        if (!clientId || !amount || !profile || !pubKey) {
            return {
                status: 400,
                html: 'Paramètres manquants ou invalides (pub_key requise).'
            };
        }

        const sClientId = esc(clientId);
        const sAmount = esc(amount);
        const sProfile = esc(profile);
        const sMac = esc(mac);
        const sIp = esc(ip);
        const sPubKey = esc(pubKey);

        await supabaseAdmin
            .from('managers')
            .update({ fedapay_p_key: sPubKey })
            .eq('id', sClientId);

        const stock = await VoucherInventoryService.getAvailableVoucherCode(sClientId, sProfile);
        if (!stock) {
            return {
                status: 200,
                html: `
          <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600&display=swap" rel="stylesheet">
            </head>
            <body style="font-family: 'Outfit', sans-serif; text-align: center; padding: 50px; background: #f8f7fa; color: #333;">
              <div style="max-width: 400px; margin: 0 auto; background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.05);">
                  <h1 style="color: #EF4444; font-size: 4rem; margin: 0;">📦</h1>
                  <h2 style="margin-top: 20px;">Rupture de Stock</h2>
                <p style="color: #666; line-height: 1.6;">Désolé, il n'y a plus de tickets <strong>"${sProfile}"</strong> disponibles pour le moment.</p>
                  <p style="font-size: 0.9rem; color: #999;">Le client a été automatiquement notifié pour le réapprovisionnement.</p>
                  <button onclick="window.location.reload()" style="margin-top: 30px; background: #673AB7; color: white; border: none; padding: 12px 30px; border-radius: 12px; font-weight: 600; cursor: pointer;">Réessayer</button>
              </div>
            </body>
          </html>
        `
            };
        }

        const internalTxId = `TX_${crypto.randomUUID()}`;
        return {
            status: 200,
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Redirection en cours...</title>
          <script src="https://checkout.fedapay.com/js/checkout.js"></script>
          <style>
             body { font-family: sans-serif; text-align: center; padding: 50px; background: #f8f7fa; color: #333; }
             .loader { border: 4px solid #f3f3f3; border-top: 4px solid #673AB7; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto; }
             @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <h2>Connexion sécurisée à FedaPay...</h2>
          <div class="loader"></div>
          <p>Veuillez patienter, vous allez être redirigé vers la page de paiement.</p>
          <script>
            const publicKey = ${JSON.stringify(sPubKey)};
            window.onload = function() {
              let widget = FedaPay.init({
                public_key: publicKey,
                transaction: {
                  amount: ${parseInt(sAmount, 10) || 0},
                  description: "Achat ticket WiFi - ${sProfile}",
                  custom_metadata: {
                    client_id: ${JSON.stringify(sClientId)},
                    manager_id: ${JSON.stringify(sClientId)},
                    profile: ${JSON.stringify(sProfile)},
                    internal_tx_id: ${JSON.stringify(internalTxId)},
                    client_mac: ${JSON.stringify(sMac || 'unknown')},
                    client_ip: ${JSON.stringify(sIp || 'unknown')}
                  }
                },
                onComplete: function(response) {
                  if(response.reason === 'SUCCESS' || response.status === 'approved') {
                    window.location.href = '/api/v1/payments/success?tx=' + encodeURIComponent(${JSON.stringify(internalTxId)}) + '&mac=' + encodeURIComponent(${JSON.stringify(sMac || '')}) + '&ip=' + encodeURIComponent(${JSON.stringify(sIp || '')});
                  }
                }
              });
              widget.open();
            };
          </script>
        </body>
        </html>
      `
        };
    },

    async findSuccessfulTransaction(txId) {
        return supabaseAdmin
            .from('transactions')
            .select('id, amount, vouchers(code)')
            .eq('id', txId)
            .eq('status', 'SUCCESS')
            .limit(1);
    }
};
