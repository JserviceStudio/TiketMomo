import { VoucherModel } from '../models/voucherModel.js';
import { FedaPayService } from '../services/fedapayService.js';
import pool from '../config/db.js';

export const PaymentController = {
  /**
   * GET /pay
   * Page de Checkout Hébergée par notre Backend (Server-Side Rendering minimaliste)
   * Le routeur redirige ici : /pay?manager=GERANT_UID&amount=100&profile=100F-6H&mac=XX&ip=YY&pub_key=pk_live_XXX
   */
  async renderCheckoutPage(req, res, next) {
    try {
      const { manager: managerId, amount, profile, mac, ip, pub_key } = req.query;

      // 1. Validation de l'entrée (Zero-Trust)
      if (!managerId || !amount || !profile || !pub_key) {
        return res.status(400).send("Paramètres manquants ou invalides (pub_key requise).");
      }

      // 1.5 APPRENTISSAGE AUTOMATIQUE (Auto-Configuration SaaS)
      // On sauvegarde ou on met à jour la Clé FedaPay du Gérant "A la volée"
      await pool.execute(
        `UPDATE managers SET fedapay_public_key = ? WHERE id = ? AND (fedapay_public_key IS NULL OR fedapay_public_key != ?)`,
        [pub_key, managerId, pub_key]
      );

      // 2. Vérification de la disponibilité du stock AVANT d'afficher le paiement
      // (Performance NVMe : lecture ultra-rapide avec l'index composite)
      const stock = await VoucherModel.getAvailableVoucherCode(managerId, profile);
      if (!stock) {
        return res.status(404).send(`
          <html>
            <body style="font-family: sans-serif; text-align: center; padding: 50px;">
              <h1 style="color: #EF4444;">Rupture de Stock</h1>
              <p>Désolé, il n'y a plus de tickets "${profile}" disponibles pour le moment.</p>
              <p>Veuillez contacter l'administrateur.</p>
            </body>
          </html>
        `);
      }

      // 3. Rendu de la page de paiement FedaPay (Redirection/Ouverture Automatique)
      // On génère un identifiant de transaction interne (Idempotence - Règle 2)
      const internalTxId = `TX_${Date.now()}_${Math.random().toString(36).substring(7)}`;

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
          <p style="font-size: 11px; color: #888;">Si rien ne se passe, vérifiez que les pop-ups sont autorisés.</p>

          <script>
            // 🔑 Injection de la clé publique envoyée par le lien du portail captif
            const publicKey = '${pub_key}'; 

            // Configuration et lancement immédiat de FedaPay
            window.onload = function() {
              let widget = FedaPay.init({
                public_key: publicKey,
                transaction: {
                  amount: ${amount},
                  description: "Achat ticket WiFi - ${profile}",
                  custom_metadata: {
                    manager_id: "${managerId}",
                    profile: "${profile}",
                    internal_tx_id: "${internalTxId}",
                    client_mac: "${mac || 'unknown'}",
                    client_ip: "${ip || 'unknown'}"
                  }
                },
                onComplete: function(response) {
                  // Si le paiement réussit côté front, on redirige vers /success
                  if(response.reason === 'SUCCESS' || response.status === 'approved') {
                    window.location.href = '/api/v1/payments/success?tx=' + "${internalTxId}" + "&mac=${mac || ''}&ip=${ip || ''}";
                  }
                }
              });

              // Redirection/Ouverture automatique sans action de l'utilisateur
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
   * Le frontend FedaPay redirige vers ici.
   */
  async renderSuccessPage(req, res, next) {
    try {
      const { tx, mac, ip } = req.query;

      // 1. Chercher la transaction validée et le code associé dans notre Base de Données
      // (Le webhook a dû la traiter en arrière-plan)
      const [rows] = await pool.execute(`
          SELECT v.code, v.profile
          FROM transactions t
          JOIN vouchers v ON t.voucher_id = v.id
          WHERE t.id = ? AND t.status = 'SUCCESS'
          LIMIT 1
       `, [tx]);

      if (rows.length === 0) {
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

      const code = rows[0].code;

      // 2. Rendu de la page de Succès + Script Auto-Login
      // Exigence: Redirection DIRECTE. Le script Javascript post-formulaire MikroTik accomplit cela.
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

           <!-- Formulaire invisible de soumission au routeur MikroTik -->
           <!-- URL générique MikroTik Hotspot Login: http://router.local/login -->
           <form id="auto-login-form" action="http://logout.net/login" method="post" style="display:none;">
              <input type="hidden" name="username" value="${code}">
              <input type="hidden" name="password" value="${code}"> <!-- Si mode VC, mdp = user -->
              <input type="hidden" name="dst" value="https://google.com">
           </form>

           <script>
             // Exécution immédiate
             setTimeout(() => {
                document.getElementById('auto-login-form').submit();
             }, 3000); // 3 secondes d'attente pour que le client voie son code
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
