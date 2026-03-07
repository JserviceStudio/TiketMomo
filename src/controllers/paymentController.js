import { VoucherModel } from '../models/voucherModel.js';
import { FedaPayService } from '../services/fedapayService.js';
import { supabaseAdmin } from '../config/supabase.js';
import crypto from 'crypto';

export const PaymentController = {
  /**
   * GET /pay
   * Page de Checkout Hébergée par notre Backend (Server-Side Rendering minimaliste)
   */
  async renderCheckoutPage(req, res, next) {
    try {
      const { manager: managerId, amount, profile, mac, ip, pub_key } = req.query;

      // 🛡️ HELPER Anti-XSS : échappe tous les caractères HTML dangereux
      const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');

      const sManagerId = esc(managerId);
      const sAmount = esc(amount);
      const sProfile = esc(profile);
      const sMac = esc(mac);
      const sIp = esc(ip);
      const sPubKey = esc(pub_key);

      // 1. Validation de l'entrée (Zero-Trust)
      if (!managerId || !amount || !profile || !pub_key) {
        return res.status(400).send("Paramètres manquants ou invalides (pub_key requise).");
      }

      // 1.5 APPRENTISSAGE AUTOMATIQUE (Auto-Configuration SaaS)
      // On sauvegarde ou on met à jour la Clé FedaPay du Gérant "A la volée"
      await supabaseAdmin
        .from('managers')
        .update({ fedapay_p_key: sPubKey })
        .eq('id', sManagerId);

      // 2. Vérification de la disponibilité du stock AVANT d'afficher le paiement
      const stock = await VoucherModel.getAvailableVoucherCode(sManagerId, sProfile);
      if (!stock) {
        return res.status(200).send(`
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
                  <p style="font-size: 0.9rem; color: #999;">Le gérant a été automatiquement notifié pour le réapprovisionnement.</p>
                  <button onclick="window.location.reload()" style="margin-top: 30px; background: #673AB7; color: white; border: none; padding: 12px 30px; border-radius: 12px; font-weight: 600; cursor: pointer;">Réessayer</button>
              </div>
            </body>
          </html>
        `);
      }

      // 3. Rendu de la page de paiement FedaPay
      const internalTxId = `TX_${crypto.randomUUID()}`;

      const htmlContent = `
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
                    manager_id: ${JSON.stringify(sManagerId)},
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
      `;

      res.status(200).send(htmlContent);

    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /success
   * Page de retour post-paiement (Délivre le code + Auto-Login)
   */
  async renderSuccessPage(req, res, next) {
    try {
      const { tx, mac, ip } = req.query;

      // 1. Chercher la transaction validée et le code associé dans Supabase (JOIN Relationnel)
      const { data: transactions, error } = await supabaseAdmin
        .from('transactions')
        .select('id, amount, vouchers(code)')
        .eq('id', tx)
        .eq('status', 'SUCCESS')
        .limit(1);

      if (error || !transactions || transactions.length === 0) {
        return res.status(200).send(`
            <html>
              <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h2>Traitement en cours...</h2>
                <p>Votre paiement est en file d'attente (Délai réseau). Veuillez rafraîchir cette page d'ici 10 secondes.</p>
                <button onclick="window.location.reload()">Rafraîchir</button>
              </body>
            </html>
         `);
      }

      const code = transactions[0].vouchers?.code || 'ERR_NO_CODE';

      // 2. Rendu de la page de Succès + Script Auto-Login
      const htmlContent = `
         <!DOCTYPE html>
         <html>
         <head>
           <meta name="viewport" content="width=device-width, initial-scale=1">
           <title>Connexion Réussie</title>
         </head>
         <body style="font-family: sans-serif; text-align: center; padding: 20px; background: #f8f7fa;">
           
           <h2 style="color: #10B981;">Paiement Confirmé ! ✅</h2>
           <p>Votre code d'accès personnel :</p>
           
           <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px auto; max-width: 300px; border: 2px dashed #10B981;">
              <h1 style="letter-spacing: 2px; color: #333; margin: 0;">${code}</h1>
           </div>

           <p style="color: #666;">Connexion automatique en cours au réseau WiFi...</p>

           <form id="auto-login-form" action="http://logout.net/login" method="post" style="display:none;">
              <input type="hidden" name="username" value="${code}">
              <input type="hidden" name="password" value="${code}"> 
              <input type="hidden" name="dst" value="https://google.com">
           </form>

           <script>
             setTimeout(() => {
                document.getElementById('auto-login-form').submit();
             }, 3000);
           </script>
         </body>
         </html>
       `;

      res.status(200).send(htmlContent);

    } catch (err) {
      next(err);
    }
  }
};
