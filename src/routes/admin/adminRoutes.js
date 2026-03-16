import express from 'express';
import crypto from 'crypto';
import { AdminController } from '../../controllers/admin/adminController.js';
import { issueAdminSession, requireAdminAuth, requireAdminRole } from '../../middlewares/authMiddleware.js';

const router = express.Router();

const safeCompare = (left, right) => {
    if (typeof left !== 'string' || typeof right !== 'string') return false;
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    if (leftBuffer.length !== rightBuffer.length) return false;
    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const renderAdminAuthPage = () => `
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Connexion Admin</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f5f7fb; min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; }
    .card { width: min(420px, 92vw); background: #fff; border-radius: 18px; padding: 32px; box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12); }
    h1 { margin: 0 0 8px; font-size: 1.6rem; }
    p { margin: 0 0 24px; color: #475569; }
    label { display: block; margin-bottom: 8px; font-weight: 600; color: #0f172a; }
    input { width: 100%; box-sizing: border-box; padding: 14px 16px; border: 1px solid #cbd5e1; border-radius: 12px; font-size: 1rem; }
    button { width: 100%; margin-top: 16px; padding: 14px 16px; border: 0; border-radius: 12px; background: #2563eb; color: #fff; font-size: 1rem; font-weight: 700; cursor: pointer; }
    .error { display: none; margin-top: 12px; color: #b91c1c; font-size: 0.95rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Accès Admin</h1>
    <p>Saisis ton identifiant admin et ton mot de passe pour ouvrir le panel backend.</p>
    <form id="admin-auth-form">
      <label for="admin-username">Identifiant admin</label>
      <input id="admin-username" name="username" type="text" autocomplete="username" required>
      <label for="admin-password" style="margin-top:16px;">Mot de passe</label>
      <input id="admin-password" name="password" type="password" autocomplete="current-password" required>
      <button type="submit">Ouvrir le panel</button>
      <div class="error" id="auth-error">Identifiants invalides.</div>
    </form>
  </div>
  <script>
    document.getElementById('admin-auth-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const errorNode = document.getElementById('auth-error');
      errorNode.style.display = 'none';
      const username = document.getElementById('admin-username').value;
      const password = document.getElementById('admin-password').value;

      const response = await fetch('/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        errorNode.style.display = 'block';
        return;
      }

      window.location.href = '/admin/dashboard';
    });
  </script>
</body>
</html>
`;

router.get('/auth', (req, res) => {
    res.send(renderAdminAuthPage());
});

router.get('/dev-login', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).send('Not found');
    }

    const configuredUsername = process.env.ADMIN_DASHBOARD_USERNAME || 'admin';
    const configuredPassword = process.env.ADMIN_DASHBOARD_PASSWORD || process.env.ADMIN_DASHBOARD_TOKEN;
    if (!configuredUsername || !configuredPassword) {
        return res.status(500).send('ADMIN_DASHBOARD_USERNAME ou ADMIN_DASHBOARD_PASSWORD manquant.');
    }

    issueAdminSession(res, configuredUsername, { secure: false });

    return res.redirect('/admin/dashboard');
});

router.post('/auth', express.json(), (req, res) => {
    const configuredUsername = process.env.ADMIN_DASHBOARD_USERNAME || 'admin';
    const configuredPassword = process.env.ADMIN_DASHBOARD_PASSWORD || process.env.ADMIN_DASHBOARD_TOKEN;
    const providedUsername = req.body?.username;
    const providedPassword = req.body?.password;

    const isValid =
        configuredUsername &&
        configuredPassword &&
        typeof providedUsername === 'string' &&
        typeof providedPassword === 'string' &&
        safeCompare(providedUsername, configuredUsername) &&
        safeCompare(providedPassword, configuredPassword);

    if (!isValid) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED_ADMIN',
                message: 'Accès admin refusé.'
            }
        });
    }

    issueAdminSession(res, configuredUsername);

    return res.json({ success: true });
});

router.get('/auth/logout', (req, res) => {
    res.clearCookie('admin_session');
    res.redirect('/admin/auth');
});

router.use(requireAdminAuth);
router.use(requireAdminRole);

/**
 * 🔒 IMPORTANT : En production, vous devriez protéger cette route
 * avec un middleware AuthAdmin (qui vérifie un password ou un email Admin spécifique)
 * Pour l'instant, c'est l'interface de contrôle directe.
 */
router.get('/dashboard', AdminController.renderDashboard);
router.get('/api/stats', AdminController.getStatsAPI);
router.get('/api/accounts', AdminController.getAccountsAPI);
router.post('/api/accounts/clients', AdminController.createClientAccountAPI);
router.patch('/api/accounts/clients/:clientId/status', AdminController.updateClientStatusAPI);
router.post('/api/accounts/managers', AdminController.createManagerAccountAPI);
router.patch('/api/accounts/managers/:managerId/status', AdminController.updateManagerStatusAPI);
router.post('/api/accounts/resellers', AdminController.createResellerAccountAPI);
router.get('/api/export', AdminController.exportDataAPI);
router.post('/api/licenses/generate', AdminController.generateLicensesAPI);
router.post('/api/settings', AdminController.updateSettingsAPI);
router.post('/api/payouts/process', AdminController.processPayoutAPI);

export default router;
