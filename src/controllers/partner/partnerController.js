import { ResellerPortalService } from '../../modules/partner-marketing/services/partnerPortalService.js';

export const ResellerController = {
    /**
     * 🚪 RENDER LOGIN/REGISTER PAGE
     */
    renderAuth(req, res) {
        res.send(ResellerController._generateAuthHTML());
    },

    /**
     * 📝 REGISTER RESELLER
     */
    async register(req, res) {
        try {
            const { name, email, password, phone, promo_code } = req.body;
            await ResellerPortalService.registerReseller({
                name,
                email,
                password,
                phone,
                promoCode: promo_code
            });
            res.json({ success: true, message: 'Inscription réussie ! Connectez-vous.' });
        } catch (error) {
            res.status(error.statusCode || 500).json({ success: false, error: error.message });
        }
    },

    /**
     * 🔑 LOGIN RESELLER
     */
    async login(req, res) {
        try {
            const { email, password } = req.body;
            const { token } = await ResellerPortalService.authenticateReseller({ email, password });
            res.cookie('partner_token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'Lax',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });
            res.json({ success: true });
        } catch (error) {
            const statusCode = error.message === 'Identifiants invalides.' ? 401 : (error.statusCode || 500);
            res.status(statusCode).json({ success: false, error: error.message });
        }
    },

    /**
     * 📊 DASHBOARD REVENDEUR
     */
    async getDashboard(req, res) {
        try {
            const resellerId = req.user.id;
            const data = await ResellerPortalService.getResellerDashboard(resellerId);
            res.send(ResellerController._generateDashboardHTML(data));
        } catch (error) {
            res.status(500).send('Erreur: ' + error.message);
        }
    },

    async getDashboardAPI(req, res) {
        try {
            const resellerId = req.user.id;
            const data = await ResellerPortalService.getResellerDashboard(resellerId);
            res.json({ success: true, data });
        } catch (error) {
            res.status(error.statusCode || 500).json({
                success: false,
                error: error.message
            });
        }
    },

    /**
     * 🔄 UPDATE PROMO CODE
     */
    async updatePromoCode(req, res) {
        try {
            const { newCode } = req.body;
            const resellerId = req.user.id;
            await ResellerPortalService.updatePromoCode(resellerId, newCode);
            res.json({ success: true, message: 'Code promo mis à jour !' });
        } catch (error) {
            res.status(error.statusCode || 500).json({ success: false, error: error.message });
        }
    },

    /**
     * 💸 REQUEST PAYOUT
     */
    async requestPayout(req, res) {
        try {
            const { amount, phone, operator } = req.body;
            const resellerId = req.user.id;
            await ResellerPortalService.requestPayout(resellerId, { amount, phone, operator });
            res.json({ success: true, message: 'Demande de retrait envoyée !' });
        } catch (error) {
            res.status(error.statusCode || 500).json({ success: false, error: error.message });
        }
    },

    _generateAuthHTML() {
        return `
        <!doctype html>
        <html lang="fr">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>J+SERVICE | Espace Reseller</title>
            <link rel="stylesheet" href="/admin/assets/css/hope-ui.min.css">
            <style>
                body { background: #f4f7fa; min-height: 100vh; display: flex; align-items: center; }
                .auth-card { max-width: 450px; width: 100%; margin: auto; border-radius: 15px; border: none; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
                .logo-circle { width: 60px; height: 60px; background: var(--bs-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; margin: -30px auto 20px; font-weight: bold; font-size: 24px; box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
            </style>
        </head>
        <body>
            <div class="card auth-card">
                <div class="card-body p-5">
                    <div class="logo-circle">J+</div>
                    <div class="text-center mb-4">
                        <h3 class="fw-bold">Espace Reseller</h3>
                        <p class="text-muted">Rejoignez J+SERVICE et gagnez des commissions</p>
                    </div>

                    <!-- TABS -->
                    <ul class="nav nav-pills mb-4 justify-content-center" id="pills-tab" role="tablist">
                        <li class="nav-item">
                            <button class="nav-link active" id="pills-login-tab" data-bs-toggle="pill" data-bs-target="#pills-login" type="button">Connexion</button>
                        </li>
                        <li class="nav-item">
                            <button class="nav-link" id="pills-register-tab" data-bs-toggle="pill" data-bs-target="#pills-register" type="button">Inscription</button>
                        </li>
                    </ul>

                    <div class="tab-content" id="pills-tabContent">
                        <!-- LOGIN -->
                        <div class="tab-pane fade show active" id="pills-login">
                            <form onsubmit="handleAuth(event, 'login')">
                                <div class="mb-3">
                                    <label class="form-label small text-secondary fw-bold">Email professionnel</label>
                                    <input type="email" name="email" class="form-control form-control-lg border-2" required>
                                </div>
                                <div class="mb-4">
                                    <label class="form-label small text-secondary fw-bold">Mot de passe</label>
                                    <input type="password" name="password" class="form-control form-control-lg border-2" required>
                                </div>
                                <button type="submit" class="btn btn-primary btn-lg w-100 fw-bold shadow">Se connecter</button>
                            </form>
                        </div>

                        <!-- REGISTER -->
                        <div class="tab-pane fade" id="pills-register">
                            <form onsubmit="handleAuth(event, 'register')">
                                <div class="mb-3">
                                    <label class="form-label small text-secondary fw-bold">Nom Complet / Entreprise</label>
                                    <input type="text" name="name" class="form-control" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label small text-secondary fw-bold">Email</label>
                                    <input type="email" name="email" class="form-control" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label small text-secondary fw-bold">Téléphone Mobile Money</label>
                                    <input type="text" name="phone" class="form-control" placeholder="ex: +22960606060" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label small text-secondary fw-bold">Code Promo (Optionnel)</label>
                                    <input type="text" name="promo_code" class="form-control" placeholder="ex: MONCODE229 (Généré si vide)">
                                </div>
                                <div class="mb-4">
                                    <label class="form-label small text-secondary fw-bold">Mot de passe</label>
                                    <input type="password" name="password" class="form-control" required>
                                </div>
                                <button type="submit" class="btn btn-outline-primary btn-lg w-100 fw-bold">Créer mon compte</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            <script src="/admin/assets/js/core/libs.min.js"></script>
            <script>
                async function handleAuth(e, type) {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    const data = Object.fromEntries(formData.entries());
                    
                    const res = await fetch(\`/resellers/auth/\${type}\`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    const result = await res.json();
                    
                    if(result.success) {
                        if(type === 'login') window.location.href = '/resellers/dashboard';
                        else {
                            alert('Inscription réussie ! Vous pouvez vous connecter.');
                            document.getElementById('pills-login-tab').click();
                        }
                    } else {
                        alert('Erreur: ' + result.error);
                    }
                }
            </script>
        </body>
        </html>`;
    },

    _generateDashboardHTML({ reseller, partner, sales, payouts }) {
        const resellerProfile = reseller || partner;
        return `
        <!doctype html>
        <html lang="fr">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>J+SERVICE | Dashboard Reseller</title>
            <link rel="stylesheet" href="/admin/assets/css/hope-ui.min.css">
            <!-- Supabase JS Client for Realtime -->
            <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
            <style>
                :root { --bs-primary: #0048ff; }
                .sidebar { background: #fff; border-right: 1px solid #eee; height: 100vh; position: fixed; width: 280px; }
                .main-content { margin-left: 280px; padding: 40px; background: #fafbfc; min-height: 100vh; }
                .card { border-radius: 12px; border: none; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
                .nav-link.active { background: var(--bs-primary) !important; color: white !important; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="sidebar d-flex flex-column p-4">
                <h4 class="fw-bold mb-4 text-primary">J+SERVICE <small class="text-secondary fs-6">Reseller</small></h4>
                <ul class="nav nav-pills flex-column mb-auto">
                    <li class="nav-item">
                        <a href="#" class="nav-link active">Tableau de Bord</a>
                    </li>
                </ul>
                <hr>
                <div class="text-muted small mb-2">Connecté en tant que:</div>
                <div class="fw-bold mb-3">${resellerProfile.name}</div>
                <a href="/resellers/auth/logout" class="btn btn-sm btn-soft-danger w-100">Déconnexion</a>
            </div>

            <main class="main-content">
                <div class="row mb-4">
                    <div class="col-md-4">
                        <div class="card bg-primary text-white">
                            <div class="card-body">
                                <h6 class="text-white-50">Solde Retirable</h6>
                                <h2 class="mb-0 text-white">${new Intl.NumberFormat().format(resellerProfile.balance)} FCFA</h2>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-body text-center">
                                <h6 class="text-muted">Votre Code Promo</h6>
                                <div class="d-flex align-items-center justify-content-center mt-2">
                                    <h4 id="myCode" class="fw-bold text-dark me-3 mb-0">${resellerProfile.promo_code}</h4>
                                    <button class="btn btn-sm btn-soft-primary" onclick="changeCode()">Changer</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4 text-end">
                        <button class="btn btn-success btn-lg px-4 fw-bold shadow" onclick="showPayoutModal()">Retirer mes gains</button>
                    </div>
                </div>

                <div class="row">
                    <div class="col-lg-8">
                        <div class="card">
                            <div class="card-header border-0 bg-transparent pt-4 px-4">
                                <h5 class="fw-bold">Historique des ventes</h5>
                            </div>
                            <div class="card-body p-0">
                                <table class="table table-hover mb-0">
                                    <thead class="bg-light"><tr><th>Date</th><th>Commission</th><th>Status</th></tr></thead>
                                    <tbody>
                                        ${sales.map(s => `<tr>
                                            <td>${new Date(s.sale_date).toLocaleDateString('fr-FR')}</td>
                                            <td class="fw-bold text-success">${new Intl.NumberFormat().format(s.amount)} FCFA</td>
                                            <td><span class="badge bg-soft-success">Crédité</span></td>
                                        </tr>`).join('') || '<tr><td colspan="3" class="text-center py-4">Aucune vente pour le moment. Partagez votre lien !</td></tr>'}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div class="col-lg-4">
                        <div class="card">
                            <div class="card-header border-0 bg-transparent pt-4 px-4">
                                <h5 class="fw-bold">Retraits récents</h5>
                            </div>
                            <div class="card-body p-0 text-center">
                                ${payouts.map(p => `
                                <div class="p-3 border-bottom d-flex justify-content-between align-items-center">
                                    <div class="text-start">
                                        <div class="fw-bold">${new Intl.NumberFormat().format(p.amount)} FCFA</div>
                                        <small class="text-muted">${p.phone_number}</small>
                                    </div>
                                    <span class="badge ${p.status === 'SUCCESS' ? 'bg-success' : 'bg-warning'}">${p.status}</span>
                                </div>
                                `).join('') || '<div class="p-5 text-muted small">Aucun retrait effectué.</div>'}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <!-- MODAL CHANGE CODE -->
            <div class="modal fade" id="modalCode" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content border-0">
                        <div class="modal-body p-4 text-center">
                            <h4 class="fw-bold mb-3">Changer mon code promo</h4>
                            <input type="text" id="newCodeInput" class="form-control mb-4" placeholder="EX: MONCODEJPLUS">
                            <button class="btn btn-primary w-100" onclick="submitChangeCode()">Enregistrer</button>
                        </div>
                    </div>
                </div>
            </div>

            <script src="/admin/assets/js/core/libs.min.js"></script>
            <script>
                const modalCode = new bootstrap.Modal(document.getElementById('modalCode'));

                // --- Supabase Realtime Setup ---
                // Les clés publiques sont récupérées depuis l'endpoint dédié (jamais interpolées ici)
                const resellerId = '${resellerProfile.id}';
                const { supabaseUrl, supabaseAnonKey } = await fetch('/api/config/public').then(r => r.json());
                const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

                const commissionChannel = supabaseClient.channel('reseller_commissions')
                    .on('postgres_changes', { 
                        event: 'INSERT', 
                        schema: 'public', 
                        table: 'commission_logs',
                        filter: 'reseller_id=eq.' + resellerId
                    }, payload => {
                        console.log('[Realtime] Nouvelle commission !', payload);
                        alert('💰 Félicitations ! Vous venez de recevoir une nouvelle commission.');
                        location.reload();
                    })
                    .subscribe();

                const payoutChannel = supabaseClient.channel('reseller_payouts')
                    .on('postgres_changes', { 
                        event: 'UPDATE', 
                        schema: 'public', 
                        table: 'payout_requests',
                        filter: 'reseller_id=eq.' + resellerId
                    }, payload => {
                        console.log('[Realtime] Statut de retrait mis à jour', payload);
                        alert('📢 Le statut de votre demande de retrait a été mis à jour : ' + payload.new.status);
                        location.reload();
                    })
                    .subscribe();

                function changeCode() { modalCode.show(); }

                async function submitChangeCode() {
                    const newCode = document.getElementById('newCodeInput').value;
                    const res = await fetch('/resellers/api/profile/promo-code', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ newCode })
                    });
                    const r = await res.json();
                    if(r.success) { location.reload(); }
                    else alert(r.error);
                }

                function showPayoutModal() {
                    const amount = prompt("Montant à retirer (Solde: ${resellerProfile.balance} FCFA):", "${resellerProfile.balance}");
                    if(!amount || amount < 500) return;
                    
                    const op = prompt("Opérateur (MTN, Moov, Wave, Orange):", "MTN");
                    const phone = prompt("Numéro Mobile Money:", "${resellerProfile.phone}");

                    if(amount && op && phone) {
                        fetch('/api/v1/resellers/payout', {
                            method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ amount, operator: op, phone })
                            }).then(r => r.json()).then(res => {
                                alert(res.message);
                                if(res.success) location.reload();
                            });
                    }
                }
            </script>
        </body>
        </html>`;
    }
};

export const PartnerController = ResellerController;
