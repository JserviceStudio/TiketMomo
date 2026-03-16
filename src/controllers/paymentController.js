import { FedaPayCheckoutService } from '../modules/payment-billing/services/fedapayCheckoutService.js';

export const PaymentController = {
  /**
   * GET /pay
   * Page de Checkout Hébergée par notre Backend (Server-Side Rendering minimaliste)
   */
  async renderCheckoutPage(req, res, next) {
    try {
      const result = await FedaPayCheckoutService.prepareCheckoutPage(req.query);
      res.status(result.status).send(result.html);
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
      const { data: transactions, error } = await FedaPayCheckoutService.findSuccessfulTransaction(tx);

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
