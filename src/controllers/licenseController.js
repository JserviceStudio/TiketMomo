import crypto from 'crypto';

export const LicenseController = {
  /**
   * GET /api/v1/licenses/buy
   * Page de Checkout pour l'achat de la Licence.
   * Redirigé depuis l'application avec : /api/v1/licenses/buy?uid=USER_ID&domain=partner.com&plan=VIP&duration=12
   */
  async renderLicenseCheckout(req, res, next) {
    try {
      const { uid, domain, plan, duration } = req.query;

      if (!uid || !domain || !plan || !duration) {
        return res.status(400).send("Paramètres manquants : uid, domain, plan et duration requis.");
      }

      const validDurations = ['1', '12', '24'];
      if (!validDurations.includes(duration)) {
        return res.status(400).send("Durée invalide. Choisissez : 1 (Mensuel), 12 (Annuel), 24 (Bi-Annuel).");
      }

      // 💳 Tarification Dynamique (Prix de base pour 1 MOIS)
      const BASE_PRICES = {
        'PRO': 2000,
        'VENTE': 3000,
        'VPN': 5000,
        'VIP': 8000
      };

      const selectedPlan = plan.toUpperCase();
      const basePrice = BASE_PRICES[selectedPlan];

      if (!basePrice) {
        return res.status(400).send("Plan invalide. Choisissez parmi : PRO, VENTE, VPN, VIP.");
      }

      // Calcul du montant final (avec réduction possible sur la durée)
      let licensePrice = basePrice * parseInt(duration);
      if (duration === '12') licensePrice = Math.floor(licensePrice * 0.9); // 10% de réduction annuelle
      if (duration === '24') licensePrice = Math.floor(licensePrice * 0.8); // 20% de réduction bi-annuelle

      // La Clé Publique FedaPay du PROPRIÉTAIRE (JserviceStudio)
      const adminPublicKey = process.env.SAAS_FEDAPAY_PUBLIC_KEY || 'pk_sandbox_XXXXXXXXXXXXXXXXX';

      const internalTxId = `LIC_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Redirection FedaPay - Achat de Licence</title>
          <script src="https://checkout.fedapay.com/js/checkout.js"></script>
          <style>
             body { font-family: sans-serif; text-align: center; padding: 50px; background: #f8f7fa; color: #333; }
             .loader { border: 4px solid #f3f3f3; border-top: 4px solid #e91e63; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto; }
             @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <h2>Connexion à la passerelle de paiement...</h2>
          <div class="loader"></div>
          <p>Préparation de l'achat de votre licence <strong>${selectedPlan} (${duration} Mois)</strong>.</p>

          <script>
            window.onload = function() {
              let widget = FedaPay.init({
                public_key: '${adminPublicKey}',
                transaction: {
                  amount: ${licensePrice},
                  description: "Achat Licence SaaS TiketMomo - Plan ${selectedPlan} (${duration} Mois)",
                  custom_metadata: {
                    type: "LICENSE_PURCHASE", // 🛡️ Permet au Webhook de le distinguer
                    user_id: "${uid}",
                    domain: "${domain}",
                    plan: "${selectedPlan}",
                    duration: "${duration}", // 🚀 Transmission de la durée au Webhook
                    internal_tx_id: "${internalTxId}"
                  }
                },
                onComplete: function(response) {
                  if(response.reason === 'SUCCESS' || response.status === 'approved') {
                     window.location.href = '/api/v1/licenses/success';
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

  async renderSuccessPage(req, res, next) {
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1 style="color: #4CAF50;">Paiement Réussi !</h1>
        <p>Votre licence a été générée et activée automatiquement avec succès.</p>
        <p>Veuillez redémarrer votre application mobile pour profiter de toutes les fonctionnalités SaaS.</p>
      </body>
      </html>
    `);
  }
};
