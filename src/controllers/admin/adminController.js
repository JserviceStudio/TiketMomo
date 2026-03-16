import { AdminDashboardService } from '../../modules/admin-control-plane/services/adminDashboardService.js';
import { AdminAccountService } from '../../modules/admin-control-plane/services/adminAccountService.js';

export const AdminController = {
    /**
     * Rendu du Dashboard Principal (Version HOPE UI Premium)
     */
    async renderDashboard(req, res, next) {
        try {
            const data = await AdminDashboardService.fetchDashboardData();
            res.send(AdminController._generateHTML(data));
        } catch (error) {
            next(error);
        }
    },

    async getStatsAPI(req, res) {
        try {
            const data = await AdminDashboardService.fetchDashboardData();
            res.json(data);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async getAccountsAPI(req, res) {
        try {
            const data = await AdminAccountService.listAccounts();
            res.json({ success: true, data });
        } catch (error) {
            res.status(error.statusCode || 500).json({ success: false, error: error.message });
        }
    },

    async createManagerAccountAPI(req, res) {
        try {
            const account = await AdminAccountService.createClientAccount(req.body || {});
            res.status(201).json({ success: true, data: account });
        } catch (error) {
            res.status(error.statusCode || 500).json({ success: false, error: error.message });
        }
    },

    async createResellerAccountAPI(req, res) {
        try {
            const account = await AdminAccountService.createResellerAccount(req.body || {});
            res.status(201).json({ success: true, data: account });
        } catch (error) {
            res.status(error.statusCode || 500).json({ success: false, error: error.message });
        }
    },

    async updateManagerStatusAPI(req, res) {
        try {
            const account = await AdminAccountService.updateClientStatus({
                clientId: req.params.managerId,
                status: req.body?.status
            });
            res.json({ success: true, data: account });
        } catch (error) {
            res.status(error.statusCode || 500).json({ success: false, error: error.message });
        }
    },

    async createClientAccountAPI(req, res) {
        return AdminController.createManagerAccountAPI(req, res);
    },

    async updateClientStatusAPI(req, res) {
        req.params.managerId = req.params.clientId;
        return AdminController.updateManagerStatusAPI(req, res);
    },

    async generateLicensesAPI(req, res) {
        try {
            const { type, quantity, prefix } = req.body;
            const { batchId, keys } = await AdminDashboardService.generateLicenseBatch({ type, quantity, prefix });
            res.json({ success: true, batchId, keys });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async processPayoutAPI(req, res) {
        const { payoutId, action } = req.body;

        try {
            const result = await AdminDashboardService.processPayout({ payoutId, action });
            res.json({ success: true, message: result.message });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async updateSettingsAPI(req, res) {
        try {
            const { key, value } = req.body;
            await AdminDashboardService.updateSetting({ key, value });
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async exportDataAPI(req, res) {
        try {
            const csv = await AdminDashboardService.buildTransactionsCsv();

            res.header('Content-Type', 'text/csv');
            res.attachment('export_transactions_jservice.csv');
            return res.send(csv);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    _generateHTML(data) {
        const revLabels = JSON.stringify(data.charts.revenue.map(r => {
            const d = new Date(r.date);
            return `${d.getDate()}/${d.getMonth() + 1}`;
        }));
        const revData = JSON.stringify(data.charts.revenue.map(r => parseFloat(r.total)));

        return `
        <!doctype html>
        <html lang="fr" dir="ltr">
          <head>
            <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
              <title>J+SERVICE | Admin Pro</title>
              <link rel="preconnect" href="https://fonts.googleapis.com">
              <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
              <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
              
              <!-- Favicon -->
              <link rel="shortcut icon" href="/admin/assets/images/favicon.ico">
              
              <!-- Library / Plugin Css Build -->
              <link rel="stylesheet" href="/admin/assets/css/core/libs.min.css">
              
              <!-- Aos Animation Css -->
              <link rel="stylesheet" href="/admin/assets/vendor/aos/dist/aos.css">
              
              <!-- Hope Ui Design System Css -->
              <link rel="stylesheet" href="/admin/assets/css/hope-ui.min.css?v=4.0.0">
              
              <!-- Custom Css -->
              <link rel="stylesheet" href="/admin/assets/css/custom.min.css?v=4.0.0">
              
              <!-- Supabase JS Client for Realtime -->
              <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

              
              <style>
                :root {
                  --admin-bg: #f3f1ea;
                  --admin-panel: rgba(255, 255, 255, 0.86);
                  --admin-panel-strong: #ffffff;
                  --admin-ink: #13212f;
                  --admin-muted: #5b6b7b;
                  --admin-line: rgba(19, 33, 47, 0.08);
                  --admin-primary: #0f766e;
                  --admin-primary-2: #0b5f5a;
                  --admin-accent: #d97706;
                  --admin-danger: #c2410c;
                  --admin-shadow: 0 24px 60px rgba(27, 39, 51, 0.10);
                }
                html, body { background:
                  radial-gradient(circle at top left, rgba(15, 118, 110, 0.10), transparent 22rem),
                  radial-gradient(circle at top right, rgba(217, 119, 6, 0.12), transparent 26rem),
                  linear-gradient(180deg, #f8f6f1 0%, #f1efe9 100%);
                  color: var(--admin-ink);
                  font-family: 'Manrope', sans-serif;
                }
                *:focus-visible { outline: 3px solid var(--admin-primary); outline-offset: 3px; border-radius: 8px; }
                .skip-link { position: absolute; top: -60px; left: 0; background: var(--admin-primary); color: white; padding: 12px 24px; z-index: 10000; transition: top 0.2s; font-weight: bold; border-radius: 0 0 8px 0; }
                .skip-link:focus { top: 0; }
                .live-badge { display: none; }
                .is-live .live-badge { display: inline-flex; }
                .tab-section.d-none { display: none !important; }
                .sidebar-default { background: rgba(13, 24, 35, 0.92); backdrop-filter: blur(16px); border-right: 1px solid rgba(255,255,255,0.08); }
                .sidebar-default .navbar-brand, .sidebar-default .logo-title, .sidebar-default .default-icon, .sidebar-default .item-name { color: #f5f7fa !important; }
                .sidebar-default .sidebar-list .nav-link { border-radius: 16px; margin: 0.25rem 0.75rem; color: rgba(245,247,250,0.80) !important; min-height: 48px; }
                .sidebar-default .sidebar-list .nav-link:hover { background: rgba(255,255,255,0.08); color: #fff !important; }
                .sidebar-default .sidebar-list .nav-link.active {
                  background: linear-gradient(135deg, rgba(15,118,110,0.92), rgba(11,95,90,0.92));
                  color: #fff !important;
                  box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), 0 12px 24px rgba(15,118,110,0.20);
                }
                .iq-navbar {
                  background: rgba(255, 255, 255, 0.76);
                  backdrop-filter: blur(18px);
                  border-bottom: 1px solid var(--admin-line);
                }
                .iq-navbar-header {
                  height: auto !important;
                  min-height: 240px;
                  border-bottom: 1px solid var(--admin-line);
                  background: transparent;
                }
                .iq-header-img {
                  opacity: 0.16;
                  mix-blend-mode: multiply;
                }
                .content-inner { padding-top: 1rem; }
                .top-summary-grid {
                  display: grid;
                  grid-template-columns: 1.25fr 1fr;
                  gap: 1.25rem;
                  margin-top: 1.5rem;
                }
                .hero-card, .ops-card {
                  background: linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.82));
                  border: 1px solid rgba(19,33,47,0.08);
                  border-radius: 28px;
                  box-shadow: var(--admin-shadow);
                }
                .hero-card {
                  padding: 1.5rem;
                }
                .hero-kicker {
                  display: inline-flex;
                  align-items: center;
                  gap: 0.5rem;
                  background: rgba(15,118,110,0.10);
                  color: var(--admin-primary-2);
                  padding: 0.55rem 0.9rem;
                  border-radius: 999px;
                  font-weight: 700;
                  font-size: 0.84rem;
                  letter-spacing: 0.01em;
                }
                .hero-title {
                  font-size: clamp(2rem, 4vw, 3.4rem);
                  line-height: 0.98;
                  letter-spacing: -0.04em;
                  margin: 1rem 0 0.8rem;
                  max-width: 12ch;
                }
                .hero-copy {
                  max-width: 58ch;
                  color: var(--admin-muted);
                  font-size: 1rem;
                  line-height: 1.7;
                }
                .action-row {
                  display: flex;
                  flex-wrap: wrap;
                  gap: 0.75rem;
                  margin-top: 1.25rem;
                }
                .action-chip {
                  display: inline-flex;
                  align-items: center;
                  justify-content: center;
                  min-height: 46px;
                  padding: 0.8rem 1rem;
                  border-radius: 14px;
                  border: 1px solid rgba(19,33,47,0.08);
                  background: #fff;
                  color: var(--admin-ink);
                  text-decoration: none;
                  font-weight: 700;
                }
                .action-chip.primary {
                  background: linear-gradient(135deg, var(--admin-primary), var(--admin-primary-2));
                  color: #fff;
                  border-color: transparent;
                }
                .action-chip:hover { transform: translateY(-1px); color: inherit; }
                .ops-card { padding: 1.25rem; }
                .ops-title { font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--admin-muted); font-weight: 800; }
                .ops-metric-list { display: grid; gap: 0.9rem; margin-top: 1rem; }
                .ops-metric {
                  display: flex;
                  justify-content: space-between;
                  gap: 1rem;
                  padding: 0.85rem 0;
                  border-bottom: 1px solid var(--admin-line);
                }
                .ops-metric:last-child { border-bottom: none; }
                .ops-metric strong { display: block; font-size: 1.1rem; }
                .ops-metric span { color: var(--admin-muted); font-size: 0.9rem; }
                .control-strip {
                  display: grid;
                  grid-template-columns: repeat(4, minmax(0, 1fr));
                  gap: 1rem;
                  margin: 1.5rem 0 1rem;
                }
                .control-tile {
                  background: rgba(255,255,255,0.85);
                  border: 1px solid rgba(19,33,47,0.08);
                  border-radius: 22px;
                  box-shadow: 0 14px 30px rgba(27,39,51,0.06);
                  padding: 1rem 1.1rem;
                }
                .control-tile .meta { color: var(--admin-muted); font-size: 0.82rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
                .control-tile .value { margin-top: 0.45rem; font-size: 1.9rem; font-weight: 800; letter-spacing: -0.04em; }
                .control-tile .hint { margin-top: 0.25rem; color: var(--admin-muted); font-size: 0.92rem; }
                .card {
                  border: 1px solid rgba(19,33,47,0.08) !important;
                  border-radius: 24px !important;
                  box-shadow: 0 16px 40px rgba(27,39,51,0.07) !important;
                  background: rgba(255,255,255,0.86);
                  backdrop-filter: blur(14px);
                }
                .card-header {
                  background: transparent !important;
                  border-bottom: 1px solid var(--admin-line) !important;
                  padding: 1.1rem 1.25rem !important;
                }
                .card-title { font-weight: 800; letter-spacing: -0.02em; }
                .table thead th {
                  background: rgba(19,33,47,0.04) !important;
                  color: var(--admin-muted);
                  font-size: 0.78rem;
                  text-transform: uppercase;
                  letter-spacing: 0.08em;
                  border-bottom: 1px solid var(--admin-line) !important;
                }
                .table > :not(caption) > * > * {
                  padding: 1rem 1rem;
                  border-bottom-color: rgba(19,33,47,0.06);
                }
                .table-hover tbody tr:hover { background: rgba(15,118,110,0.04); }
                .btn-primary {
                  background: linear-gradient(135deg, var(--admin-primary), var(--admin-primary-2));
                  border-color: transparent;
                  box-shadow: 0 10px 24px rgba(15,118,110,0.22);
                }
                .btn-outline-primary {
                  border-color: rgba(15,118,110,0.28);
                  color: var(--admin-primary-2);
                }
                .btn-link { text-decoration: none; }
                .text-muted, small.text-muted, .small.text-muted, .form-label.text-secondary, .footer a {
                  color: #445565 !important;
                }
                .text-secondary {
                  color: #445565 !important;
                }
                .badge.bg-warning, .badge.bg-danger, .badge.bg-info, .badge.bg-primary, .badge.bg-success { border-radius: 999px; }
                .badge.bg-primary { background: #0b5f5a !important; color: #ffffff !important; }
                .badge.bg-success { background: #166534 !important; color: #ffffff !important; }
                .badge.bg-info { background: #155e75 !important; color: #ffffff !important; }
                .badge.bg-danger { background: #b91c1c !important; color: #ffffff !important; }
                .badge.bg-warning { background: #facc15 !important; color: #3b2a04 !important; }
                .bg-soft-primary { background: rgba(15,118,110,0.12) !important; color: #0b5f5a !important; }
                .bg-soft-success { background: rgba(22,101,52,0.12) !important; color: #14532d !important; }
                .bg-soft-info { background: rgba(21,94,117,0.12) !important; color: #164e63 !important; }
                .bg-soft-warning { background: rgba(202,138,4,0.16) !important; color: #713f12 !important; }
                .bg-soft-danger { background: rgba(185,28,28,0.12) !important; color: #991b1b !important; }
                .footer { margin-top: 1.5rem; border-top: 1px solid var(--admin-line); background: transparent; }
                .footer-body { color: var(--admin-muted); }
                .metric-band-card {
                  border: none !important;
                  color: #ffffff;
                }
                .metric-band-card .metric-copy {
                  color: rgba(255,255,255,0.92) !important;
                }
                .metric-band-card.primary {
                  background: linear-gradient(135deg, #0b5f5a, #134e4a) !important;
                }
                .metric-band-card.info {
                  background: linear-gradient(135deg, #155e75, #164e63) !important;
                }
                .metric-band-card.warning {
                  background: linear-gradient(135deg, #f3d27a, #eab308) !important;
                  color: #2f2408 !important;
                }
                .metric-band-card.warning .metric-copy,
                .metric-band-card.warning h6,
                .metric-band-card.warning h3 {
                  color: #2f2408 !important;
                }
                .section-shell { margin-top: 1rem; }
                .section-intro {
                  display: flex;
                  justify-content: space-between;
                  align-items: end;
                  gap: 1rem;
                  margin-bottom: 1rem;
                }
                .section-label {
                  display: inline-flex;
                  align-items: center;
                  gap: 0.45rem;
                  color: var(--admin-primary-2);
                  font-size: 0.82rem;
                  font-weight: 800;
                  letter-spacing: 0.08em;
                  text-transform: uppercase;
                }
                .section-headline {
                  margin-top: 0.4rem;
                  font-size: clamp(1.5rem, 2vw, 2.2rem);
                  line-height: 1.05;
                  letter-spacing: -0.04em;
                }
                .section-copy {
                  margin: 0.45rem 0 0;
                  color: var(--admin-muted);
                  max-width: 62ch;
                  line-height: 1.7;
                }
                .section-meta {
                  display: flex;
                  flex-wrap: wrap;
                  gap: 0.65rem;
                  justify-content: flex-end;
                }
                .meta-pill {
                  display: inline-flex;
                  align-items: center;
                  min-height: 42px;
                  padding: 0.7rem 0.95rem;
                  background: rgba(255,255,255,0.85);
                  border: 1px solid rgba(19,33,47,0.08);
                  border-radius: 999px;
                  color: var(--admin-muted);
                  font-weight: 700;
                }
                .insight-grid {
                  display: grid;
                  grid-template-columns: repeat(3, minmax(0, 1fr));
                  gap: 1rem;
                  margin-bottom: 1rem;
                }
                .insight-card {
                  background: linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.84));
                  border: 1px solid rgba(19,33,47,0.08);
                  border-radius: 22px;
                  padding: 1rem 1.1rem;
                  box-shadow: 0 12px 28px rgba(27,39,51,0.06);
                }
                .insight-card .eyebrow {
                  color: var(--admin-muted);
                  font-size: 0.78rem;
                  text-transform: uppercase;
                  letter-spacing: 0.08em;
                  font-weight: 800;
                }
                .insight-card .figure {
                  margin-top: 0.5rem;
                  font-size: 1.75rem;
                  font-weight: 800;
                  letter-spacing: -0.04em;
                }
                .insight-card .note {
                  margin-top: 0.3rem;
                  color: var(--admin-muted);
                  font-size: 0.92rem;
                }
                .operator-layout {
                  display: grid;
                  grid-template-columns: minmax(0, 1.6fr) minmax(300px, 0.9fr);
                  gap: 1rem;
                }
                .operator-stack {
                  display: grid;
                  gap: 1rem;
                }
                .utility-panel {
                  background: linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.86));
                  border: 1px solid rgba(19,33,47,0.08);
                  border-radius: 24px;
                  padding: 1.15rem;
                  box-shadow: 0 12px 28px rgba(27,39,51,0.06);
                }
                .utility-panel h5 {
                  font-size: 1.02rem;
                  font-weight: 800;
                  margin-bottom: 0.35rem;
                }
                .utility-panel p {
                  color: var(--admin-muted);
                  line-height: 1.7;
                  margin-bottom: 1rem;
                }
                .signal-list {
                  display: grid;
                  gap: 0.75rem;
                }
                .signal-item {
                  display: flex;
                  justify-content: space-between;
                  gap: 1rem;
                  padding: 0.9rem 0;
                  border-bottom: 1px solid var(--admin-line);
                }
                .signal-item:last-child { border-bottom: none; }
                .signal-item strong { display: block; }
                .signal-item span { color: var(--admin-muted); font-size: 0.92rem; }
                .signal-item .chip {
                  white-space: nowrap;
                  font-weight: 800;
                  color: var(--admin-primary-2);
                }
                #liveToast {
                  border-radius: 18px;
                  background: rgba(255,255,255,0.95);
                  backdrop-filter: blur(14px);
                }
                @media (prefers-reduced-motion: reduce) {
                  *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
                }
                @media (max-width: 1100px) {
                  .top-summary-grid, .control-strip, .insight-grid, .operator-layout { grid-template-columns: 1fr; }
                  .hero-title { max-width: none; }
                  .section-intro { align-items: start; flex-direction: column; }
                  .section-meta { justify-content: flex-start; }
                }
                @media (max-width: 768px) {
                  .action-row { flex-direction: column; }
                  .action-chip { width: 100%; }
                }
              </style>
          </head>
          <body class="  " data-bs-spy="scroll" data-bs-target="#elements-section" data-bs-offset="0">
            <a href="#mainContainer" class="skip-link">Aller au contenu principal</a>
            <!-- loader Start -->
            <div id="loading">
              <div class="loader simple-loader">
                  <div class="loader-body">
                  </div>
              </div>    </div>
            <!-- loader END -->
            
            <aside class="sidebar sidebar-default sidebar-white sidebar-base navs-rounded-all " role="navigation" aria-label="Menu latéral principal">
                <div class="sidebar-header d-flex align-items-center justify-content-start">
                    <a href="#" class="navbar-brand" aria-label="Accueil J+SERVICE">
                        <!--Logo Start: Modern J+ Design -->
                        <svg class="icon-30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 5V20C10 22.7614 12.2386 25 15 25H16M22 10H28M25 7V13" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                            <circle cx="15" cy="15" r="14" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/>
                        </svg>
                        <!--Logo End-->
                        <h4 class="logo-title">J+SERVICE</h4>
                    </a>
                    <div class="sidebar-toggle" data-toggle="sidebar" data-active="true">
                        <i class="icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M4.25 12.2744L19.25 12.2744" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                                <path d="M10.2998 18.2988L4.2498 12.2748L10.2998 6.24976" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                            </svg>
                        </i>
                    </div>
                </div>
                <div class="sidebar-body pt-0 data-scrollbar">
                    <div class="sidebar-list">
                        <ul class="navbar-nav iq-main-menu" id="sidebar-menu">
                            <li class="nav-item static-item">
                                <a class="nav-link static-item disabled" href="#" tabindex="-1">
                                    <span class="default-icon">Menu Principal</span>
                                    <span class="mini-icon">-</span>
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link active" aria-current="page" href="javascript:void(0);" onclick="switchTab('dashboard', this)">
                                    <i class="icon">
                                        <svg class="icon-20" width="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path opacity="0.4" d="M16.0756 2H19.4616C20.8639 2 22.0001 3.14585 22.0001 4.55996V7.97452C22.0001 9.38864 20.8639 10.5345 19.4616 10.5345H16.0756C14.6734 10.5345 13.5371 9.38864 13.5371 7.97452V4.55996C13.5371 3.14585 14.6734 2 16.0756 2Z" fill="currentColor"></path>
                                            <path fill-rule="evenodd" clip-rule="evenodd" d="M4.53852 2H7.92449C9.32676 2 10.463 3.14585 10.463 4.55996V7.97452C10.463 9.38864 9.32676 10.5345 7.92449 10.5345H4.53852C3.13626 10.5345 2 9.38864 2 7.97452V4.55996C2 3.14585 3.13626 2 4.53852 2ZM4.53852 13.4655H7.92449C9.32676 13.4655 10.463 14.6114 10.463 16.0255V19.44C10.463 20.8532 9.32676 22 7.92449 22H4.53852C3.13626 22 2 20.8532 2 19.44V16.0255C2 14.6114 3.13626 13.4655 4.53852 13.4655ZM19.4615 13.4655H16.0755C14.6732 13.4655 13.537 14.6114 13.537 16.0255V19.44C13.537 20.8532 14.6732 22 16.0755 22H19.4615C20.8637 22 22 20.8532 22 19.44V16.0255C22 14.6114 20.8637 13.4655 19.4615 13.4655Z" fill="currentColor"></path>
                                        </svg>
                                    </i>
                                    <span class="item-name">Tableau de Bord</span>
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="javascript:void(0);" onclick="switchTab('licenses', this)">
                                    <i class="icon">
                                        <svg class="icon-20" width="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12.0865 22C11.9627 22 11.8388 21.9716 11.7271 21.9137L8.12599 20.0496C7.10415 19.5201 6.30481 18.9259 5.68063 18.2336C4.31449 16.7195 3.5544 14.776 3.54232 12.7599L3.50004 6.12426C3.495 5.35842 3.98931 4.67103 4.72826 4.41215L11.3405 2.10679C11.7331 1.96656 12.1711 1.9646 12.5707 2.09992L19.2081 4.32684C19.9511 4.57493 20.4535 5.25742 20.4575 6.02228L20.4998 12.6628C20.5129 14.676 19.779 16.6274 18.434 18.1581C17.8168 18.8602 17.0245 19.4632 16.0128 20.0025L12.4439 21.9088C12.3331 21.9686 12.2103 21.999 12.0865 22Z" fill="currentColor"></path>
                                        </svg>
                                    </i>
                                    <span class="item-name">Gestion Licences</span>
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="javascript:void(0);" onclick="switchTab('marketing', this)">
                                    <i class="icon">
                                        <svg class="icon-20" xmlns="http://www.w3.org/2000/svg" width="20" viewBox="0 0 24 24" fill="none">
                                            <path d="M2 5C2 4.44772 2.44772 4 3 4H8.66667H21C21.5523 4 22 4.44772 22 5V8H15.3333H8.66667H2V5Z" fill="currentColor" stroke="currentColor"/>
                                            <path d="M6 8H2V11M6 8V20M6 8H14M6 20H3C2.44772 20 2 19.5523 2 19V11M6 20H14M14 8H22V11M14 8V20M14 20H21C21.5523 20 22 19.5523 22 19V11M2 11H22M2 14H22M2 17H22M10 8V20M18 8V20" stroke="currentColor"/>
                                        </svg>
                                    </i>
                                    <span class="item-name">Marketing Affiliés</span>
                                </a>
                            </li>
                            <li class="nav-item">
                                <a class="nav-link" href="javascript:void(0);" onclick="switchTab('settings', this)">
                                    <i class="icon">
                                        <svg class="icon-20" width="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path opacity="0.4" d="M11.9912 18.6215L5.49945 21.864C5.00921 22.1302 4.39768 21.9525 4.12348 21.4643C4.0434 21.3108 4.00106 21.1402 4 20.9668V13.7087C4 14.4283 4.40573 14.8725 5.47299 15.37L11.9912 18.6215Z" fill="currentColor"></path>
                                            <path fill-rule="evenodd" clip-rule="evenodd" d="M8.89526 2H15.0695C17.7773 2 19.9735 3.06605 20 5.79337V20.9668C19.9989 21.1374 19.9565 21.3051 19.8765 21.4554C19.7479 21.7007 19.5259 21.8827 19.2615 21.9598C18.997 22.0368 18.7128 22.0023 18.4741 21.8641L11.9912 18.6215L5.47299 15.3701C4.40573 14.8726 4 14.4284 4 13.7088V5.79337C4 3.06605 6.19625 2 8.89526 2ZM8.22492 9.62227H15.7486C16.1822 9.62227 16.5336 9.26828 16.5336 8.83162C16.5336 8.39495 16.1822 8.04096 15.7486 8.04096H8.22492C7.79137 8.04096 7.43991 8.39495 7.43991 8.83162C7.43991 9.26828 7.79137 9.62227 8.22492 9.62227Z" fill="currentColor"></path>
                                        </svg>
                                    </i>
                                    <span class="item-name">Configuration</span>
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </aside>
            
            <main class="main-content" id="mainContainer" tabindex="-1">
              <div class="position-relative iq-banner">
                <!--Nav Start-->
                <nav class="nav navbar navbar-expand-lg navbar-light iq-navbar" aria-label="Barre d'outils supérieure">
                  <div class="container-fluid navbar-inner">
                    <a href="#" class="navbar-brand">
                        <h4 class="logo-title">J+SERVICE Cloud</h4>
                    </a>
                    <div class="sidebar-toggle" data-toggle="sidebar" data-active="true">
                        <i class="icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M4.25 12.2744L19.25 12.2744" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                                <path d="M10.2998 18.2988L4.2498 12.2748L10.2998 6.24976" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                            </svg>
                        </i>
                    </div>
                    <div class="collapse navbar-collapse" id="navbarSupportedContent">
                      <ul class="navbar-nav ms-auto align-items-center navbar-list mb-2 mb-lg-0">
                        <li class="nav-item dropdown me-3">
                            <a class="nav-link py-0 d-flex align-items-center" href="javascript:void(0);" id="notificationDrop" role="button" data-bs-toggle="dropdown" aria-expanded="false" onclick="switchTab('logs', this)">
                                <div class="position-relative">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 21V19M12 21C10.8954 21 10 20.1046 10 19H14C14 20.1046 13.1046 21 12 21ZM19 17V11C19 7.13401 15.866 4 12 4C8.13401 4 5 7.13401 5 11V17H19ZM16.364 8.63604C15.242 7.51401 13.702 6.82842 12 6.82842C10.298 6.82842 8.75801 7.51401 7.63604 8.63604" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                    </svg>
                                    <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" id="notifBadge" style="display: ${data.auditLogs.length > 0 ? 'inline' : 'none'}">
                                        ${data.auditLogs.length}
                                    </span>
                                </div>
                            </a>
                        </li>
                        <li class="nav-item me-3">
                            <span class="badge bg-soft-success live-badge px-3">En Direct</span>
                        </li>
                        <li class="nav-item">
                            <div class="form-check form-switch m-0">
                                <input class="form-check-input" type="checkbox" role="switch" id="liveToggle" checked aria-checked="true" aria-label="Activer la synchronisation en direct" onchange="toggleLive()">
                                <label class="form-check-label" for="liveToggle" aria-hidden="true">Live</label>
                            </div>
                        </li>
                      </ul>
                    </div>
                  </div>
                </nav>
                <!-- Nav Header -->
                <div class="iq-navbar-header" style="height: 215px;">
                    <div class="container-fluid iq-container">
                        <div class="row">
                            <div class="col-md-12">
                                <div class="flex-wrap d-flex justify-content-between align-items-center">
                                    <div>
                                        <span class="hero-kicker">Control Plane multi-app en direct</span>
                                        <h1 class="hero-title">Pilote les ventes, licences et opérations sans friction.</h1>
                                        <p class="hero-copy">Une interface de supervision pensée pour l’action: signaux critiques, opérations partenaires, lots de licences et suivi business dans un seul panneau lisible et accessible.</p>
                                    </div>
                                    <div>
                                        <a href="/admin/api/export" class="btn btn-link btn-soft-light action-chip">
                                            <svg width="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="icon-20"><path d="M11.8251 15.2171H12.1748C14.0987 15.2171 15.731 13.985 16.3054 12.2764C16.3887 12.0276 16.1979 11.7703 15.9334 11.7703H14.8962C14.7764 11.7703 14.6592 11.7154 14.5815 11.6217L12.7357 9.39055C12.3533 8.92842 11.6467 8.92842 11.2642 9.39055L9.41846 11.6217C9.34076 11.7154 9.22359 11.7703 9.10377 11.7703H8.06659C7.80204 11.7703 7.61133 12.0276 7.69457 12.2764C8.26896 13.985 9.90124 15.2171 11.8251 15.2171Z" fill="currentColor"></path><path opacity="0.4" d="M16.0811 18.3405H7.91885C6.33778 18.3405 5.05141 17.0543 5.05141 15.4732V6.6211C5.05141 5.04003 6.33778 3.75386 7.91885 3.75386H16.0811C17.6622 3.75386 18.9485 5.04003 18.9485 6.6211V15.4732C18.9485 17.0543 17.6622 18.3405 16.0811 18.3405Z" fill="currentColor"></path></svg>
                                            Exporter les données
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="iq-header-img">
                        <img src="/admin/assets/images/dashboard/top-header.png" alt="" aria-hidden="true" class="theme-color-default-img img-fluid w-100 h-100 animated-gradual">
                    </div>
                </div>
              </div>

              <div class="content-inner container-fluid pb-0" id="page-content">
                <div class="top-summary-grid">
                    <section class="hero-card" aria-label="Synthèse opérationnelle">
                        <div class="action-row">
                            <a class="action-chip primary" href="javascript:void(0);" onclick="switchTab('licenses', document.querySelector('[onclick*=licenses]'))">Générer des licences</a>
                            <a class="action-chip" href="javascript:void(0);" onclick="switchTab('marketing', document.querySelector('[onclick*=marketing]'))">Traiter les retraits</a>
                            <a class="action-chip" href="javascript:void(0);" onclick="switchTab('logs', document.getElementById('notificationDrop'))">Voir l’audit</a>
                        </div>
                    </section>
                    <aside class="ops-card" aria-label="File prioritaire">
                        <div class="ops-title">Priorités immédiates</div>
                        <div class="ops-metric-list">
                            <div class="ops-metric">
                                <div>
                                    <strong>${data.marketing.payouts.length}</strong>
                                    <span>Retraits en attente</span>
                                </div>
                                <span>${data.marketing.payouts.length > 0 ? 'Action requise' : 'RAS'}</span>
                            </div>
                            <div class="ops-metric">
                                <div>
                                    <strong>${data.lowStock.length}</strong>
                                    <span>Stocks critiques</span>
                                </div>
                                <span>${data.lowStock.length > 0 ? 'Surveiller' : 'Stable'}</span>
                            </div>
                            <div class="ops-metric">
                                <div>
                                    <strong>${data.auditLogs.length}</strong>
                                    <span>Événements d’audit récents</span>
                                </div>
                                <span>Traçabilité</span>
                            </div>
                        </div>
                    </aside>
                </div>

                <div class="control-strip" aria-label="Indicateurs principaux">
                    <div class="control-tile">
                        <div class="meta">Clients</div>
                        <div class="value">${data.stats.clients || data.stats.managers}</div>
                        <div class="hint">tenants suivis sur la plateforme</div>
                    </div>
                    <div class="control-tile">
                        <div class="meta">Volume</div>
                        <div class="value">${new Intl.NumberFormat().format(data.stats.volume)}</div>
                        <div class="hint">FCFA encaissés</div>
                    </div>
                    <div class="control-tile">
                        <div class="meta">Transactions</div>
                        <div class="value">${data.stats.tx}</div>
                        <div class="hint">opérations validées</div>
                    </div>
                    <div class="control-tile">
                        <div class="meta">Engagement</div>
                        <div class="value">${(((data.stats.active_clients || data.stats.active) / ((data.stats.clients || data.stats.managers) || 1)) * 100).toFixed(1)}%</div>
                        <div class="hint">clients actifs</div>
                    </div>
                </div>
                
                <!-- SECTION DASHBOARD -->
                <div id="section-dashboard" class="tab-section">
                    <div class="row">
                        <div class="col-md-12 col-lg-12">
                            <div class="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4 mb-4">
                                <div class="col" data-aos="fade-up" data-aos-delay="300">
                                    <div class="card overflow-hidden rounded overflow-hidden shadow-sm border-0">
                                        <div class="card-body bg-soft-primary">
                                            <div class="d-flex align-items-center justify-content-between mb-2">
                                                <div>
                                                    <h6 class="text-primary mb-0">Total Clients</h6>
                                                </div>
                                                <div class="bg-primary rounded p-2 text-white">
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="currentColor"/>
                                                        <path opacity="0.4" d="M12.0001 14.5C6.99014 14.5 2.91016 17.86 2.91016 22H21.0901C21.0901 17.86 17.0101 14.5 12.0001 14.5Z" fill="currentColor"/>
                                                    </svg>
                                                </div>
                                            </div>
                                            <div class="d-flex align-items-center justify-content-between mt-3">
                                                 <h2 class="counter text-primary fw-bolder mb-0" id="val-managers">${data.stats.clients || data.stats.managers}</h2>
                                                <span class="badge bg-primary text-white">+12%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col" data-aos="fade-up" data-aos-delay="400">
                                    <div class="card overflow-hidden rounded overflow-hidden shadow-sm border-0">
                                        <div class="card-body bg-soft-success">
                                            <div class="d-flex align-items-center justify-content-between mb-2">
                                                <div>
                                                    <h6 class="text-success mb-0">Volume Global</h6>
                                                </div>
                                                <div class="bg-success rounded p-2 text-white">
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path opacity="0.4" d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="currentColor"></path>
                                                        <path d="M14.5 12C14.5 10.8954 13.6046 10 12.5 10H11.5C10.9477 10 10.5 9.55228 10.5 9C10.5 8.44772 10.9477 8 11.5 8H13V6H11V8C9.34315 8 8 9.34315 8 11C8 12.6569 9.34315 14 11 14H12.5C13.0523 14 13.5 14.4477 13.5 15C13.5 15.5523 13.0523 16 12.5 16H11V18H13V16C14.6569 16 16 14.6569 16 13C16 12.6074 15.9082 12.2355 15.7486 11.9037C15.9189 11.9665 16.1042 12 16.3 12H14.5Z" fill="currentColor"></path>
                                                    </svg>
                                                </div>
                                            </div>
                                             <div class="d-flex align-items-center justify-content-between mt-3">
                                                <h2 class="counter text-success fw-bolder mb-0" id="val-volume">${new Intl.NumberFormat().format(data.stats.volume)}</h2>
                                                <span class="badge bg-success text-white">FCFA</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col" data-aos="fade-up" data-aos-delay="500">
                                    <div class="card overflow-hidden rounded overflow-hidden shadow-sm border-0">
                                        <div class="card-body bg-soft-info">
                                            <div class="d-flex align-items-center justify-content-between mb-2">
                                                <div>
                                                    <h6 class="text-info mb-0">Transactions</h6>
                                                </div>
                                                <div class="bg-info rounded p-2 text-white">
                                                    <svg width="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M19.75 11.7256L4.75 11.7256" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                                                        <path d="M13.7002 5.70124L19.7502 11.7252L13.7002 17.7502" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>
                                                    </svg>
                                                </div>
                                            </div>
                                            <div class="d-flex align-items-center justify-content-between mt-3">
                                                 <h3 class="counter text-info fw-bolder mb-0" id="val-tx">${data.stats.tx}</h3>
                                                <span class="badge bg-info text-white">Reçus</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col" data-aos="fade-up" data-aos-delay="600">
                                    <div class="card overflow-hidden rounded overflow-hidden shadow-sm border-0">
                                        <div class="card-body bg-soft-warning">
                                            <div class="d-flex align-items-center justify-content-between mb-2">
                                                <div>
                                                    <h6 class="text-warning mb-0">Engagement Client</h6>
                                                </div>
                                                <div class="bg-warning rounded p-2 text-white">
                                                    <svg width="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path opacity="0.4" d="M17.554 4.45789L3.52554 18.4864C3.21043 18.8015 3.51868 19.3406 3.94553 19.2223L18.421 15.2036C18.6753 15.1331 18.8681 14.9403 18.9387 14.6861L22.9573 2.21063C23.0756 1.78378 22.5365 1.47553 22.2214 1.79064L17.554 6.45802V4.45789Z" fill="currentColor"></path>
                                                        <path d="M13.7544 10.2393H10.1423C9.72836 10.2393 9.39233 10.5753 9.39233 10.9893V14.6014C9.39233 15.0154 9.72836 15.3514 10.1423 15.3514H13.7544C14.1684 15.3514 14.5044 15.0154 14.5044 14.6014V10.9893C14.5044 10.5753 14.1684 10.2393 13.7544 10.2393Z" fill="currentColor"></path>
                                                    </svg>
                                                </div>
                                            </div>
                                            <div class="d-flex align-items-center justify-content-between mt-3">
                                                 <h3 class="counter text-warning fw-bolder mb-0" id="val-ret">${(((data.stats.active_clients || data.stats.active) / ((data.stats.clients || data.stats.managers) || 1)) * 100).toFixed(1)}%</h3>
                                                <span class="badge bg-warning text-white">Actifs</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="col-md-12 col-lg-8" data-aos="fade-up" data-aos-delay="700">
                            <div class="card">
                                <div class="card-header d-flex justify-content-between">
                                    <div class="header-title"><h4 class="card-title">Flux de Revenus (7 derniers jours)</h4></div>
                                </div>
                                <div class="card-body" style="position: relative; height: 300px; width: 100%;">
                                    <canvas id="chart-revenue" role="img" aria-label="Graphique des revenus sur les 7 derniers jours"></canvas>
                                </div>
                            </div>
                        </div>

                        <div class="col-md-12 col-lg-4" data-aos="fade-up" data-aos-delay="800">
                            <div class="card">
                                <div class="card-header d-flex justify-content-between align-items-center">
                                    <div class="header-title"><h4 class="card-title">Stocks Critiques Souche</h4></div>
                                    <span class="badge bg-danger">Alertes</span>
                                </div>
                                <div class="card-body p-0">
                                    <div class="table-responsive">
                                        <table class="table mb-0">
                                            <tbody>
                                                ${data.lowStock.map(s => `
                                                    <tr>
                                                        <td>
                                                            <div class="d-flex align-items-center">
                                                                <div class="ms-3"><h6 class="mb-0">${s.email.split('@')[0]}</h6><p class="mb-0 font-size-12">Profil: ${s.profile}</p></div>
                                                            </div>
                                                        </td>
                                                        <td class="text-end text-danger fw-bold">${s.stock} pcs</td>
                                                    </tr>
                                                `).join('') || '<tr><td colspan="2" class="text-center py-4">Tous les stocks sont optimaux.</td></tr>'}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="col-md-12 col-lg-12" data-aos="fade-up" data-aos-delay="900">
                            <div class="card">
                                <div class="card-header d-flex justify-content-between">
                                    <div class="header-title"><h4 class="card-title">Dernières Ventes de Licences</h4></div>
                                </div>
                                <div class="card-body p-0">
                                    <div class="table-responsive">
                                        <table class="table table-hover mb-0">
                                            <thead class="bg-light">
                                                <tr>
                                                    <th>ID Client</th>
                                                    <th>Email</th>
                                                    <th>Montant Payé</th>
                                                    <th>Status</th>
                                                    <th>Date Achat</th>
                                                </tr>
                                            </thead>
                                            <tbody id="table-licenses">
                                                ${data.licenses.map(l => `
                                                    <tr>
                                                        <td><code>#${l.client_id || l.manager_id}</code></td>
                                                        <td>${l.email}</td>
                                                        <td><span class="text-success fw-bold">${new Intl.NumberFormat().format(l.amount)}</span> <small>FCFA</small></td>
                                                        <td><span class="badge bg-soft-success">Payé</span></td>
                                                        <td>${new Date(l.created_at).toLocaleString('fr-FR')}</td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- GESTION DES LICENCES -->
                <div id="section-licenses" class="tab-section d-none">
                    <section class="section-shell">
                        <div class="section-intro">
                            <div>
                                <span class="section-label">License Operations</span>
                                <h2 class="section-headline">Usine de génération et traçabilité des lots</h2>
                                <p class="section-copy">Crée des lots, surveille le stock produit et garde une visibilité immédiate sur les licences récemment générées.</p>
                            </div>
                            <div class="section-meta">
                                <span class="meta-pill">${data.batches.length} lots récents</span>
                                <span class="meta-pill">${data.licenses.length} activations visibles</span>
                            </div>
                        </div>
                        <div class="insight-grid">
                            <div class="insight-card">
                                <div class="eyebrow">Lots récents</div>
                                <div class="figure">${data.batches.length}</div>
                                <div class="note">suivis dans l’historique de production</div>
                            </div>
                            <div class="insight-card">
                                <div class="eyebrow">Ventes licences</div>
                                <div class="figure">${data.licenses.length}</div>
                                <div class="note">remontées dans le panneau principal</div>
                            </div>
                            <div class="insight-card">
                                <div class="eyebrow">Mode de flux</div>
                                <div class="figure">Manuel</div>
                                <div class="note">génération batch pilotée depuis l’admin</div>
                            </div>
                        </div>
                        <div class="operator-layout">
                            <div class="operator-stack">
                            <div class="card" data-aos="fade-up" data-aos-delay="200">
                                <div class="card-header d-flex justify-content-between align-items-center">
                                    <h4 class="card-title mb-0">Usine à Licences</h4>
                                    <span class="badge bg-primary px-3 py-2">Génération Manuelle</span>
                                </div>
                                <div class="card-body">
                                    <form>
                                        <div class="row align-items-end g-3">
                                            <div class="col-md-3">
                                                <label for="productTypeSelect" class="form-label">Type de Produit</label>
                                                <select id="productTypeSelect" class="form-select">
                                                    <option>J+SERVICE Internet</option>
                                                    <option>J+SERVICE Events</option>
                                                </select>
                                            </div>
                                            <div class="col-md-2">
                                                <label for="quantityInput" class="form-label">Quantité</label>
                                                <input type="number" id="quantityInput" class="form-control" value="10" min="1" max="500">
                                            </div>
                                            <div class="col-md-3">
                                                <label for="prefixInput" class="form-label">Préfixe Personnalisé</label>
                                                <input type="text" id="prefixInput" class="form-control" placeholder="Ex: PROMO2026-">
                                            </div>
                                            <div class="col-md-2 d-flex align-items-center mb-2">
                                                <div class="form-check form-switch m-0">
                                                    <input class="form-check-input" type="checkbox" id="flexSwitchCheckDefault" checked>
                                                    <label class="form-check-label" for="flexSwitchCheckDefault">Activer</label>
                                                </div>
                                            </div>
                                            <div class="col-md-2">
                                                <button type="button" class="btn btn-primary w-100" onclick="generateBatch(this)">
                                                    <svg width="20" class="me-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M12 4V20M20 12H4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                    </svg>
                                                    Générer
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            </div>
                            <div class="card" data-aos="fade-up" data-aos-delay="400">
                                <div class="card-header d-flex justify-content-between">
                                    <h4 class="card-title">Stock Récent Généré</h4>
                                </div>
                                <div class="card-body p-0">
                                    <div class="table-responsive">
                                        <table class="table table-striped mb-0">
                                            <thead class="bg-light">
                                                <tr>
                                                    <th>Lot ID</th>
                                                    <th>Type</th>
                                                    <th>Date de Création</th>
                                                    <th>Quantité</th>
                                                    <th>Status</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${data.batches && data.batches.length > 0 ? data.batches.map(b => `
                                                <tr>
                                                    <td><code>#${b.id}</code></td>
                                                    <td>J+SERVICE ${b.license_type}</td>
                                                    <td>${new Date(b.created_at).toLocaleString('fr-FR')}</td>
                                                    <td>${b.quantity}</td>
                                                    <td><span class="badge bg-success">Actif</span></td>
                                                    <td>
                                                        <span class="text-muted small">Via CSV (Déjà fait)</span>
                                                    </td>
                                                </tr>
                                                `).join('') : '<tr><td colspan="6" class="text-center">Aucun lot généré pour l\'instant.</td></tr>'}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                            </div>
                            <aside class="utility-panel" data-aos="fade-up" data-aos-delay="280">
                                <h5>Checklist opérateur</h5>
                                <p>Avant de générer un lot, vérifie le produit, la quantité, le préfixe et l’usage attendu. Cette zone sert de rappel opérationnel pour éviter les lots inutilisables.</p>
                                <div class="signal-list">
                                    <div class="signal-item">
                                        <div>
                                            <strong>Préfixe lisible</strong>
                                            <span>utilise un code parlant pour support et marketing</span>
                                        </div>
                                        <span class="chip">Qualité</span>
                                    </div>
                                    <div class="signal-item">
                                        <div>
                                            <strong>Quantité maîtrisée</strong>
                                            <span>évite les batches trop grands si la diffusion est progressive</span>
                                        </div>
                                        <span class="chip">Stock</span>
                                    </div>
                                    <div class="signal-item">
                                        <div>
                                            <strong>Export immédiat</strong>
                                            <span>exporte les données si le lot doit partir vers un autre canal</span>
                                        </div>
                                        <span class="chip">Ops</span>
                                    </div>
                                </div>
                            </aside>
                        </div>
                    </section>
                </div>

                <!-- MARKETING AFFILIES -->
                <div id="section-marketing" class="tab-section d-none">
                    <section class="section-shell">
                    <div class="section-intro">
                        <div>
                            <span class="section-label">Reseller Marketing</span>
                            <h2 class="section-headline">Resellers, commissions et retraits en une seule vue</h2>
                            <p class="section-copy">Priorise les demandes de retrait, garde l’œil sur la performance des revendeurs et prépare les actions de croissance sans perdre le contexte financier.</p>
                        </div>
                        <div class="section-meta">
                            <span class="meta-pill">${data.marketing.totalResellers} revendeurs</span>
                            <span class="meta-pill">${data.marketing.payouts.length} retraits à traiter</span>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-12 col-lg-4">
                            <div class="card metric-band-card primary" data-aos="fade-up" data-aos-delay="200">
                                <div class="card-body">
                                    <h6 class="mb-3">Commissions Distribuées (Mois)</h6>
                                    <h3>${new Intl.NumberFormat('fr-FR').format(data.marketing.totalCommissions)} FCFA</h3>
                                    <p class="mb-0 metric-copy">Ce mois-ci</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-12 col-lg-4">
                            <div class="card metric-band-card info" data-aos="fade-up" data-aos-delay="300">
                                <div class="card-body">
                                    <h6 class="mb-3">Nombre de Resellers Actifs</h6>
                                    <h3>${data.marketing.totalResellers} Revendeur(s)</h3>
                                    <p class="mb-0 metric-copy">Enregistrés sur la plateforme</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-12 col-lg-4">
                            <div class="card metric-band-card warning" data-aos="fade-up" data-aos-delay="400">
                                <div class="card-body">
                                    <h6 class="mb-3">Taux de Conversion Global</h6>
                                    <h3>--- %</h3>
                                    <p class="mb-0 metric-copy">Pas assez de données</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="row mt-4">
                        <div class="col-lg-8 operator-stack">
                            <div class="card" data-aos="fade-up" data-aos-delay="500">
                                <div class="card-header"><h4 class="card-title">Top Resellers</h4></div>
                                <div class="card-body p-0">
                                    <ul class="list-group list-group-flush">
                                        ${data.marketing.topResellers && data.marketing.topResellers.length > 0 ? Object.values(data.marketing.topResellers).map(r => `
                                        <li class="list-group-item d-flex justify-content-between align-items-center">
                                            <div class="d-flex align-items-center">
                                                <div class="bg-soft-primary rounded-circle p-3 me-3 text-primary fw-bold">${r.name.charAt(0).toUpperCase()}</div>
                                                <div>
                                                    <h6 class="mb-0">${r.name}</h6>
                                                    <small class="text-muted">Code: ${r.promo_code} | Comm: ${r.commission_rate}%</small>
                                                </div>
                                            </div>
                                            <span class="badge bg-primary rounded-pill py-2 px-3">${r.sales_count} Ventes</span>
                                        </li>
                                        `).join('') : '<li class="list-group-item text-center">Aucun revendeur pour l\'instant.</li>'}
                                    </ul>
                                </div>
                            </div>

                            <!-- Demandes de Retrait -->
                            <div class="card mt-4" data-aos="fade-up" data-aos-delay="550">
                                <div class="card-header d-flex justify-content-between">
                                    <h4 class="card-title">Demandes de Retrait en Attente</h4>
                                    <span class="badge bg-warning">${data.marketing.payouts.length} Requêtes</span>
                                </div>
                                <div class="card-body p-0">
                                    <div class="table-responsive">
                                        <table class="table table-hover mb-0">
                                            <thead class="bg-light">
                                                <tr>
                                                    <th>Reseller</th>
                                                    <th>Montant</th>
                                                    <th>Compte (N°)</th>
                                                    <th>Opérateur</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${data.marketing.payouts && data.marketing.payouts.length > 0 ? data.marketing.payouts.map(p => `
                                                <tr>
                                                    <td><strong>${p.reseller_name}</strong></td>
                                                    <td class="text-primary fw-bold">${new Intl.NumberFormat().format(p.amount)} <small>FCFA</small></td>
                                                    <td><code>${p.phone_number}</code></td>
                                                    <td><span class="badge bg-soft-info">${p.operator}</span></td>
                                                    <td>
                                                        <div class="btn-group">
                                                            <button class="btn btn-sm btn-success" onclick="processPayout('${p.id}', 'APPROVE')">Payer</button>
                                                            <button class="btn btn-sm btn-outline-danger" onclick="processPayout('${p.id}', 'REJECT')">Refuser</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                `).join('') : '<tr><td colspan="5" class="text-center py-4 text-muted">Aucune demande de retrait en attente.</td></tr>'}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-4">
                            <div class="utility-panel" data-aos="fade-up" data-aos-delay="600">
                                <h5>Créer Lien Reseller</h5>
                                <p>Prépare un revendeur, calibre la commission et génère un lien d’invitation cohérent avec ta politique d’acquisition.</p>
                                <div class="card-body p-0">
                                    <div class="mb-3">
                                        <label class="form-label">Alias Reseller</label>
                                        <input type="text" class="form-control" placeholder="ex: superreseller">
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Commission (%)</label>
                                        <input type="range" class="form-range" min="1" max="50" step="1" value="15">
                                        <div class="text-center mt-2 fw-bold text-primary fs-5">15%</div>
                                    </div>
                                    <button class="btn btn-primary w-100">Générer le lien invité</button>
                                </div>
                                <div class="signal-list mt-4">
                                    <div class="signal-item">
                                        <div>
                                            <strong>Commission par défaut</strong>
                                            <span>${data.config.global_commission_rate || 15}% global côté plateforme</span>
                                        </div>
                                        <span class="chip">Référence</span>
                                    </div>
                                    <div class="signal-item">
                                        <div>
                                            <strong>Commissions du mois</strong>
                                            <span>${new Intl.NumberFormat('fr-FR').format(data.marketing.totalCommissions)} FCFA distribués</span>
                                        </div>
                                        <span class="chip">Finance</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    </section>
                </div>

                 <!-- CONFIGURATION -->
                 <div id="section-settings" class="tab-section d-none">
                     <section class="section-shell">
                     <div class="section-intro">
                         <div>
                             <span class="section-label">Platform Settings</span>
                             <h2 class="section-headline">Réglages globaux, sécurité et politiques de tarification</h2>
                             <p class="section-copy">Centralise les paramètres sensibles du backend, les politiques tarifaires et les limites d’exploitation dans un espace plus lisible pour l’équipe ops.</p>
                         </div>
                         <div class="section-meta">
                             <span class="meta-pill">Maintenance: ${data.config.maintenance_mode === true ? 'active' : 'inactive'}</span>
                             <span class="meta-pill">Commission par défaut: ${data.config.global_commission_rate || 15}%</span>
                         </div>
                     </div>
                     <div class="row">
                         <div class="col-lg-6" data-aos="fade-up" data-aos-delay="200">
                             <div class="card">
                                 <div class="card-header d-flex justify-content-between">
                                     <h4 class="card-title">Sécurité & Maintenance</h4>
                                 </div>
                                 <div class="card-body">
                                     <div class="d-flex justify-content-between align-items-center mb-3">
                                         <div>
                                             <h6 class="mb-0">Mode Maintenance</h6>
                                             <small class="text-muted">Bloque l'accès aux gérants pendant les MÀJ</small>
                                         </div>
                                         <div class="form-check form-switch m-0">
                                             <input class="form-check-input" type="checkbox" id="switchMaintenance" ${data.config.maintenance_mode === true ? 'checked' : ''} onchange="updateMaintenance(this.checked)">
                                         </div>
                                     </div>
                                     <hr>
                                     <div class="d-flex justify-content-between align-items-center mb-3">
                                         <div>
                                             <h6 class="mb-0">Envoi des factures par Email</h6>
                                             <small class="text-muted">Lors d'un achat de licence</small>
                                         </div>
                                         <div class="form-check form-switch m-0">
                                             <input class="form-check-input" type="checkbox" id="switchInvoice" checked>
                                         </div>
                                     </div>
                                 </div>
                             </div>
                             
                             <div class="card mt-4" data-aos="fade-up" data-aos-delay="400">
                                <div class="card-header"><h4 class="card-title">Tarification SaaS (Dure en dur corrigée)</h4></div>
                                <div class="card-body">
                                    <form id="pricingForm">
                                        <div class="row g-3">
                                            ${Object.entries(data.config.saas_pricing || {}).map(([plan, price]) => `
                                            <div class="col-6">
                                                <label class="form-label">Plan ${plan} (FCFA)</label>
                                                <input type="number" name="price_${plan}" class="form-control" value="${price}">
                                            </div>
                                            `).join('')}
                                        </div>
                                        <button type="button" class="btn btn-primary w-100 mt-4" onclick="savePricing()">Sauvegarder les nouveaux prix</button>
                                    </form>
                                </div>
                             </div>
                         </div>
                         <div class="col-lg-6" data-aos="fade-up" data-aos-delay="300">
                             <div class="card">
                                 <div class="card-header d-flex justify-content-between">
                                     <h4 class="card-title">Limites Globales (API)</h4>
                                 </div>
                                 <div class="card-body">
                                     <form>
                                         <div class="mb-4">
                                             <label class="form-label text-secondary">Requêtes API par minute (par IP)</label>
                                             <input type="number" class="form-control" value="60">
                                         </div>
                                         <div class="mb-3">
                                             <label class="form-label text-secondary">Commission Globale par défaut (%)</label>
                                             <div class="input-group">
                                                 <input type="number" class="form-control" value="${data.config.global_commission_rate || 15}">
                                                 <span class="input-group-text">%</span>
                                             </div>
                                         </div>
                                         <button type="button" class="btn btn-outline-primary w-100 border-2 fw-bold">Sauvegarder les limites</button>
                                     </form>
                                 </div>
                             </div>
                         </div>
                     </div>
                     </section>
                 </div>


               <!-- SECTION LOGS & AUDIT -->
               <div id="section-logs" class="tab-section d-none">
                   <section class="section-shell">
                   <div class="section-intro">
                       <div>
                           <span class="section-label">Audit Trail</span>
                           <h2 class="section-headline">Journal d’audit, événements critiques et traces opérateur</h2>
                           <p class="section-copy">Consulte les actions sensibles, les changements d’état et les signaux système récents pour garder un historique exploitable par support, finance et exploitation.</p>
                       </div>
                       <div class="section-meta">
                           <span class="meta-pill">${data.auditLogs.length} événements chargés</span>
                           <span class="meta-pill">Realtime ${data.auditLogs.length > 0 ? 'actif' : 'prêt'}</span>
                       </div>
                   </div>
                   <div class="card shadow-sm border-0">
                       <div class="card-header d-flex justify-content-between align-items-center bg-transparent border-bottom">
                           <div class="header-title">
                               <h4 class="card-title">Journal d'Audit Système</h4>
                               <p class="mb-0 text-muted small">Suivi des actions critiques et événements serveur.</p>
                           </div>
                       </div>
                       <div class="card-body p-0">
                           <div class="table-responsive">
                               <table class="table table-hover align-middle mb-0">
                                   <thead class="bg-light">
                                       <tr>
                                           <th>Date</th>
                                           <th>Sévérité</th>
                                           <th>Action / Événement</th>
                                           <th>Détails</th>
                                           <th>IP / Source</th>
                                       </tr>
                                   </thead>
                                   <tbody id="logs-container">
                                       ${data.auditLogs.map(log => `
                                           <tr>
                                               <td class="small">${new Date(log.created_at).toLocaleString()}</td>
                                               <td>
                                                   <span class="badge bg-soft-${log.severity === 'CRITICAL' ? 'danger' : (log.severity === 'HIGH' ? 'warning' : 'info')}">
                                                       ${log.severity}
                                                   </span>
                                               </td>
                                               <td class="fw-bold">${log.action_type}</td>
                                               <td class="text-truncate" style="max-width: 250px;">${log.details || ''}</td>
                                               <td class="text-muted small">${log.ip_address}</td>
                                           </tr>
                                       `).join('')}
                                   </tbody>
                               </table>
                           </div>
                       </div>
                   </div>
                   </section>
               </div>
               </div>

               <!-- Footer -->
              <footer class="footer">
                  <div class="footer-body">
                      <ul class="left-panel list-inline mb-0 p-0">
                          <li class="list-inline-item"><a href="#">Politique</a></li>
                          <li class="list-inline-item"><a href="#">Support</a></li>
                      </ul>
                      <div class="right-panel">
                          © <script>document.write(new Date().getFullYear())</script> <b>J+SERVICE Cloud v2.1</b> - All Rights Reserved.
                      </div>
                  </div>
              </footer>
            </main>

            <!-- Toast Notification Container -->
            <div class="toast-container position-fixed bottom-0 end-0 p-3">
              <div id="liveToast" class="card fade hide border-left-primary shadow" role="alert" aria-live="assertive" aria-atomic="true" style="width: 300px;">
                <div class="card-body p-3 d-flex align-items-center">
                  <div class="bg-primary rounded-circle p-2 me-3 text-white">
                    <svg width="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 21V19M12 21C10.8954 21 10 20.1046 10 19H14C14 20.1046 13.1046 21 12 21ZM19 17V11C19 7.13401 15.866 4 12 4C8.13401 4 5 7.13401 5 11V17H19ZM16.364 8.63604C15.242 7.51401 13.702 6.82842 12 6.82842C10.298 6.82842 8.75801 7.51401 7.63604 8.63604" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                  </div>
                  <div class="flex-grow-1">
                    <strong class="d-block text-dark">Alerte Système</strong>
                    <small id="toastBody" class="text-muted">Nouvel événement détecté !</small>
                  </div>
                  <button type="button" class="btn-close ms-2" data-bs-dismiss="toast" aria-label="Close" onclick="document.getElementById('liveToast').classList.add('hide')"></button>
                </div>
              </div>
            </div>
            
            <!-- Library Bundle Script -->
            <script src="/admin/assets/js/core/libs.min.js"></script>
            
            <!-- External Library Bundle Script -->
            <script src="/admin/assets/js/core/external.min.js"></script>
            
            <!-- Slider-tab Script -->
            <script src="/admin/assets/js/plugins/slider-tabs.js"></script>
            
            <!-- Settings Script -->
            <script src="/admin/assets/js/plugins/setting.js"></script>
            
            <!-- AOS Animation Script-->
            <script src="/admin/assets/vendor/aos/dist/aos.js"></script>
            
            <!-- App Script -->
            <script src="/admin/assets/js/hope-ui.js" defer></script>
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            
            <script>
              let charts = {};
              let supabaseClient = null;
              let subscriptions = [];

              function toggleLive() {
                const liveToggle = document.getElementById('liveToggle');
                const isChecked = liveToggle.checked;
                liveToggle.setAttribute('aria-checked', isChecked.toString());
                const container = document.getElementById('mainContainer');
                
                if (!isChecked) {
                  // Cleanup subscriptions
                  subscriptions.forEach(s => s.unsubscribe());
                  subscriptions = [];
                  container.classList.remove('is-live');
                  console.log('[Supabase Realtime] Disconnected.');
                } else {
                  if (!supabaseClient) {
                    supabaseClient = supabase.createClient('${process.env.SUPABASE_URL}', '${process.env.SUPABASE_ANON_KEY}');
                  }
                  
                  // Realtime Channels
                  const salesChannel = supabaseClient.channel('realtime_sales')
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sales' }, payload => {
                      console.log('[Realtime] New Sale Detected!', payload);
                      fetchRefresh();
                      showToast('💰 Nouvelle vente effectuée !');
                    })
                    .subscribe();

                  const logsChannel = supabaseClient.channel('realtime_logs')
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, payload => {
                      console.log('[Realtime] New Audit Log!', payload);
                      fetchRefresh();
                    })
                    .subscribe();

                  const notificationChannel = supabaseClient.channel('realtime_notifs')
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
                        console.log('[Realtime] New Notification!', payload);
                        showToast('🔔 ' + payload.new.title);
                        fetchRefresh();
                    })
                    .subscribe();

                  subscriptions = [salesChannel, logsChannel, notificationChannel];
                  container.classList.add('is-live');
                  fetchRefresh();
                  console.log('[Supabase Realtime] Connected & Listening...');
                }
              }

              let lastPayoutCount = ${data.marketing.payouts.length};

               async function fetchRefresh() {
                try {
                  const r = await fetch('/admin/api/stats');
                  const d = await r.json();
                  document.getElementById('val-managers').innerText = d.stats.clients || d.stats.managers;
                  document.getElementById('val-volume').innerText = new Intl.NumberFormat().format(d.stats.volume);
                  document.getElementById('val-tx').innerText = d.stats.tx;
                  
                  // Suivi des retraits
                  const newPayoutCount = d.marketing.payouts.length;
                  if (newPayoutCount > lastPayoutCount) {
                      showToast('🚨 Nouveau retrait en attente ! (Total: ' + newPayoutCount + ')');
                  }
                  lastPayoutCount = newPayoutCount;

                  // Mise à jour des Logs et du Badge
                  const logsContainer = document.getElementById('logs-container');
                  if (d.auditLogs && d.auditLogs.length > 0) {
                      const badge = document.getElementById('notifBadge');
                      badge.innerText = d.auditLogs.length;
                      badge.style.display = 'inline';
                      
                      logsContainer.innerHTML = d.auditLogs.map(log => {
                          const severityClass = log.severity === 'CRITICAL' ? 'danger' : (log.severity === 'HIGH' ? 'warning' : 'info');
                          const date = new Date(log.created_at).toLocaleString();
                          return '<tr>' +
                              '<td class="small">' + date + '</td>' +
                              '<td><span class="badge bg-soft-' + severityClass + '">' + log.severity + '</span></td>' +
                              '<td class="fw-bold">' + log.action_type + '</td>' +
                              '<td class="text-truncate" style="max-width: 250px;">' + (log.details || '') + '</td>' +
                              '<td class="text-muted small">' + log.ip_address + '</td>' +
                          '</tr>';
                      }).join('');
                  }

                  // Chart update
                  charts.rev.data.labels = d.charts.revenue.map(rv => { const dt = new Date(rv.date); return dt.getDate() + '/' + (dt.getMonth()+1); });
                  charts.rev.data.datasets[0].data = d.charts.revenue.map(rv => parseFloat(rv.total));
                  charts.rev.update('none');
                } catch(e) { console.error('Refresh error:', e); }
              }

              function showToast(msg) {
                  const t = document.getElementById('liveToast');
                  document.getElementById('toastBody').innerText = msg;
                  t.classList.remove('hide');
                  t.classList.add('show', 'animate__animated', 'animate__fadeInUp');
                  setTimeout(() => {
                      t.classList.remove('show');
                      t.classList.add('hide');
                  }, 5000);
              }

              function switchTab(id, el) {
                const target = document.getElementById('section-' + id);
                if (!target) {
                    console.error('Section manquante:', id);
                    alert('Cette section est en cours de développement ou indisponible.');
                    return;
                }

                // Masquer tout
                document.querySelectorAll('.tab-section').forEach(s => s.classList.add('d-none'));
                
                // Désactiver les liens du menu
                document.querySelectorAll('#sidebar-menu .nav-link, #notificationDrop').forEach(i => {
                    i.classList.remove('active', 'bg-primary', 'text-white');
                    i.removeAttribute('aria-current');
                });

                // Afficher la cible
                target.classList.remove('d-none');

                // Activer le lien si c'est un menu latéral
                if (el && el.classList.contains('nav-link')) {
                    el.classList.add('active');
                    el.setAttribute('aria-current', 'page');
                }
                
                // Si on vient de la cloche, on met quand même un feedback visuel
                if (id === 'logs' && document.getElementById('notificationDrop')) {
                    document.getElementById('notificationDrop').classList.add('text-primary');
                }
              }

              function generateBatch(btn) {
                 const type = document.getElementById('productTypeSelect').value;
                 const qty = document.getElementById('quantityInput').value;
                 const prefix = document.getElementById('prefixInput').value;
                 
                 btn.disabled = true;
                 btn.innerHTML = 'En cours...';
                 
                 fetch('/admin/api/licenses/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type, quantity: parseInt(qty), prefix })
                 }).then(r => r.json()).then(res => {
                    btn.disabled = false;
                    btn.innerHTML = '<svg width="20" class="me-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4V20M20 12H4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Générer';
                    if(res.success) {
                       let csvContent = "data:text/csv;charset=utf-8,Lot ID,License Key\\n" + res.keys.map(k => \`\${res.batchId},\${k}\`).join("\\n");
                       let encodedUri = encodeURI(csvContent);
                       let link = document.createElement("a");
                       link.setAttribute("href", encodedUri);
                       link.setAttribute("download", \`batch_\${res.batchId}.csv\`);
                       document.body.appendChild(link);
                       link.click();
                       setTimeout(() => location.reload(), 1000);
                    } else {
                       alert('Erreur: ' + res.error);
                    }
                 }).catch(err => {
                    btn.disabled = false;
                    btn.innerHTML = 'Erreur';
                    alert('Erreur système');
                 });
              }

              function updateMaintenance(val) {
                fetch('/admin/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: 'maintenance_mode', value: val })
                });
              }

              function savePricing() {
                  const form = document.getElementById('pricingForm');
                  const pricing = {};
                  form.querySelectorAll('input').forEach(input => {
                      const plan = input.name.replace('price_', '');
                      pricing[plan] = parseInt(input.value);
                  });
                  
                  fetch('/admin/api/settings', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ key: 'saas_pricing', value: pricing })
                  }).then(r => r.json()).then(res => {
                      if(res.success) alert('Tarifs mis à jour avec succès !');
                      else alert('Erreur lors de la mise à jour.');
                  });
              }

              window.addEventListener('load', () => {
                  toggleLive(); // Activer le live par défaut on-load
              });

              function processPayout(id, action) {
                  if(!confirm(\`Êtes-vous sûr de vouloir \${action === 'APPROVE' ? 'valider' : 'rejeter'} ce paiement ?\`)) return;
                  
                  fetch('/admin/api/payouts/process', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ payoutId: id, action })
                  }).then(r => r.json()).then(res => {
                      if(res.success) {
                          alert(res.message);
                          location.reload();
                      } else {
                          alert('Erreur: ' + res.error);
                      }
                  });
              }

              window.onload = () => {
                // Initialize AOS
                if(typeof AOS !== 'undefined') AOS.init({ duration: 1000, once: true });
                
                const ctx = document.getElementById('chart-revenue').getContext('2d');
                charts.rev = new Chart(ctx, {
                  type: 'line',
                  data: {
                    labels: ${revLabels},
                    datasets: [{
                      label: "Chiffre d'affaires",
                      data: ${revData},
                      borderColor: '#3a57e8',
                      backgroundColor: 'rgba(58, 87, 232, 0.2)',
                      fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#fff', borderWidth: 3
                    }]
                  },
                  options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { 
                        y: { beginAtZero: true, grid: { borderDash: [5, 5], color: '#e5e5e5' }, ticks: { font: { size: 10 }, color: '#8a92a6' } }, 
                        x: { grid: { display: false }, ticks: { color: '#8a92a6' } } 
                    }
                  }
                });
              };
            </script>
          </body>
        </html>
        `;
    }
};
