import crypto from 'crypto';
import { supabaseAdmin } from '../../config/supabase.js';
import { Parser } from 'json2csv';

export const AdminController = {
    /**
     * Rendu du Dashboard Principal (Version HOPE UI Premium)
     */
    async renderDashboard(req, res, next) {
        try {
            const data = await AdminController._fetchDashboardData();
            res.send(AdminController._generateHTML(data));
        } catch (error) {
            next(error);
        }
    },

    async getStatsAPI(req, res) {
        try {
            const data = await AdminController._fetchDashboardData();
            res.json(data);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async generateLicensesAPI(req, res) {
        try {
            const { type, quantity, prefix } = req.body;
            const batchId = 'LOT-' + crypto.randomBytes(3).toString('hex').toUpperCase();
            const keys = [];

            for (let i = 0; i < quantity; i++) {
                const block1 = crypto.randomBytes(2).toString('hex').toUpperCase().padStart(5, '0');
                const block2 = crypto.randomBytes(2).toString('hex').toUpperCase().padStart(5, '0');
                keys.push(`JSVC-${prefix || 'STD'}-${block1}-${block2}`);
            }

            // Insert audit record in Supabase
            const { error } = await supabaseAdmin
                .from('license_batches')
                .insert([{
                    id: batchId,
                    batch_name: `Batch ${prefix || 'STD'}`,
                    license_type: type.includes('WIFI') ? 'WIFI' : 'FULL',
                    quantity,
                    generated_by: 'ADMIN'
                }]);

            if (error) throw error;

            res.json({ success: true, batchId, keys });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async _fetchDashboardData() {
        // En Supabase, on fait plusieurs requêtes asynchrones en parallèle
        const [
            { count: totalManagers },
            { data: txStats },
            { data: revenueHistory },
            { data: planStats },
            { data: lowStockData },
            { data: recentLicenses },
            { data: recentBatches },
            { data: settingsRows },
            { data: commissionStats },
            { count: totalResellers },
            { data: topResellers },
            { data: payoutRequests },
            { data: auditLogs }
        ] = await Promise.all([
            supabaseAdmin.from('managers').select('*', { count: 'exact', head: true }),
            supabaseAdmin.rpc('get_admin_tx_stats'), // On peut utiliser un RPC pour les aggrégations complexes
            supabaseAdmin.rpc('get_revenue_history_7d'),
            supabaseAdmin.rpc('get_license_type_stats'),
            supabaseAdmin.rpc('get_low_stock_managers'),
            supabaseAdmin.from('transactions').select('*, managers(email)').ilike('id', 'LIC_%').order('created_at', { ascending: false }).limit(5),
            supabaseAdmin.from('license_batches').select('*').order('created_at', { ascending: false }).limit(5),
            supabaseAdmin.from('system_settings').select('setting_key, setting_value'),
            supabaseAdmin.rpc('get_total_commissions_30d'),
            supabaseAdmin.from('resellers').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('resellers').select('*, commission_logs(count)').order('balance', { ascending: false }).limit(5), // Note: count relation needs exact schema
            supabaseAdmin.from('payout_requests').select('*, resellers(name)').eq('status', 'PENDING').order('created_at', { ascending: false }),
            supabaseAdmin.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(10)
        ]);

        const settings = {};
        (settingsRows || []).forEach(row => {
            try {
                settings[row.setting_key] = JSON.parse(row.setting_value);
            } catch (e) {
                settings[row.setting_key] = row.setting_value;
            }
        });

        // Fallback pour les stats complexes si les RPC ne sont pas encore prêts
        const stats = txStats ? txStats[0] : { total_tx: 0, total_volume: 0, active_managers: 0 };

        return {
            stats: {
                managers: totalManagers || 0,
                tx: stats.total_tx || 0,
                volume: stats.total_volume || 0,
                active: stats.active_managers || 0
            },
            charts: {
                revenue: revenueHistory || [],
                plans: planStats || []
            },
            lowStock: lowStockData || [],
            licenses: (recentLicenses || []).map(l => ({ ...l, email: l.managers?.email })),
            batches: recentBatches || [],
            marketing: {
                totalCommissions: (commissionStats && commissionStats[0]?.total) || 0,
                totalResellers: totalResellers || 0,
                topResellers: (topResellers || []).map(r => ({ ...r, sales_count: r.commission_logs?.length || 0 })),
                payouts: (payoutRequests || []).map(p => ({ ...p, reseller_name: p.resellers?.name }))
            },
            auditLogs: auditLogs || [],
            config: settings
        };
    },

    async processPayoutAPI(req, res) {
        const { payoutId, action } = req.body;

        try {
            if (action === 'APPROVE') {
                const { error } = await supabaseAdmin
                    .from('payout_requests')
                    .update({ status: 'SUCCESS' })
                    .eq('id', payoutId);

                if (error) throw error;
                res.json({ success: true, message: 'Retrait approuvé !' });
            } else {
                const { data: payout, error: fetchError } = await supabaseAdmin
                    .from('payout_requests')
                    .select('reseller_id, amount')
                    .eq('id', payoutId)
                    .single();

                if (fetchError || !payout) throw new Error('Demande introuvable.');

                // Restituer les fonds
                await supabaseAdmin.rpc('refund_reseller_balance', {
                    reseller_id: payout.reseller_id,
                    amount_to_add: payout.amount
                });

                await supabaseAdmin
                    .from('payout_requests')
                    .update({ status: 'FAILED', error_message: 'Rejeté par l\'admin' })
                    .eq('id', payoutId);

                res.json({ success: true, message: 'Retrait rejeté et fonds restitués.' });
            }
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async updateSettingsAPI(req, res) {
        try {
            const { key, value } = req.body;
            const { error } = await supabaseAdmin
                .from('system_settings')
                .upsert({
                    setting_key: key,
                    setting_value: JSON.stringify(value),
                    updated_at: new Date().toISOString()
                }, { onConflict: 'setting_key' });

            if (error) throw error;
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    async exportDataAPI(req, res) {
        try {
            const { data: transactions, error } = await supabaseAdmin
                .from('transactions')
                .select('id, manager_id, amount, status, created_at, managers(email)')
                .order('created_at', { ascending: false })
                .limit(500);

            if (error) throw error;

            const formatted = transactions.map(t => ({
                id: t.id,
                manager: t.managers?.email,
                amount: t.amount,
                status: t.status,
                created_at: t.created_at
            }));

            const json2csvParser = new Parser();
            const csv = json2csvParser.parse(formatted);

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
                *:focus-visible { outline: 3px solid var(--bs-primary); outline-offset: 2px; border-radius: 4px; }
                .skip-link { position: absolute; top: -60px; left: 0; background: var(--bs-primary); color: white; padding: 12px 24px; z-index: 10000; transition: top 0.2s; font-weight: bold; border-radius: 0 0 8px 0; }
                .skip-link:focus { top: 0; }
                .live-badge { display: none; }
                .is-live .live-badge { display: inline-flex; }
                /* Fix pour les sections dans Hope UI */
                .tab-section.d-none { display: none !important; }
                .sidebar-default .sidebar-list .nav-link.active { background-color: var(--bs-primary); color: #fff !important; }
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
                                        <h1>Tableau de Bord J+SERVICE</h1>
                                        <p>Gestion unifiée des licences, revenus et partenaires revendeurs.</p>
                                    </div>
                                    <div>
                                        <a href="/admin/api/export" class="btn btn-link btn-soft-light">
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
                                                    <h6 class="text-primary mb-0">Total Gérants</h6>
                                                </div>
                                                <div class="bg-primary rounded p-2 text-white">
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="currentColor"/>
                                                        <path opacity="0.4" d="M12.0001 14.5C6.99014 14.5 2.91016 17.86 2.91016 22H21.0901C21.0901 17.86 17.0101 14.5 12.0001 14.5Z" fill="currentColor"/>
                                                    </svg>
                                                </div>
                                            </div>
                                            <div class="d-flex align-items-center justify-content-between mt-3">
                                                 <h2 class="counter text-primary fw-bolder mb-0" id="val-managers">${data.stats.managers}</h2>
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
                                                 <h3 class="counter text-warning fw-bolder mb-0" id="val-ret">${((data.stats.active / (data.stats.managers || 1)) * 100).toFixed(1)}%</h3>
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
                                                    <th>ID Gérant</th>
                                                    <th>Email</th>
                                                    <th>Montant Payé</th>
                                                    <th>Status</th>
                                                    <th>Date Achat</th>
                                                </tr>
                                            </thead>
                                            <tbody id="table-licenses">
                                                ${data.licenses.map(l => `
                                                    <tr>
                                                        <td><code>#${l.manager_id}</code></td>
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
                    <div class="row">
                        <!-- Générateur -->
                        <div class="col-lg-12">
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
                        </div>
                        
                        <!-- Historique des Licences -->
                        <div class="col-lg-12 mt-4">
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
                    </div>
                </div>

                <!-- MARKETING AFFILIES -->
                <div id="section-marketing" class="tab-section d-none">
                    <div class="row">
                        <div class="col-md-12 col-lg-4">
                            <div class="card bg-primary text-white" data-aos="fade-up" data-aos-delay="200">
                                <div class="card-body">
                                    <h6 class="mb-3 text-white">Commissions Distribuées (Mois)</h6>
                                    <h3>${new Intl.NumberFormat('fr-FR').format(data.marketing.totalCommissions)} FCFA</h3>
                                    <p class="mb-0 text-white-50">Ce mois-ci</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-12 col-lg-4">
                            <div class="card bg-info text-white" data-aos="fade-up" data-aos-delay="300">
                                <div class="card-body">
                                    <h6 class="mb-3 text-white">Nombre d'Affiliés Actifs</h6>
                                    <h3>${data.marketing.totalResellers} Revendeur(s)</h3>
                                    <p class="mb-0 text-white-50">Enregistrés sur la plateforme</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-12 col-lg-4">
                            <div class="card bg-warning text-white" data-aos="fade-up" data-aos-delay="400">
                                <div class="card-body">
                                    <h6 class="mb-3 text-white">Taux de Conversion Global</h6>
                                    <h3>--- %</h3>
                                    <p class="mb-0 text-white-50">Pas assez de données</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="row mt-4">
                        <div class="col-lg-8">
                            <div class="card" data-aos="fade-up" data-aos-delay="500">
                                <div class="card-header"><h4 class="card-title">Top Partenaires Revendeurs</h4></div>
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
                                                    <th>Partenaire</th>
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
                            <div class="card" data-aos="fade-up" data-aos-delay="600">
                                <div class="card-header"><h4 class="card-title">Créer Lien Partenaire</h4></div>
                                <div class="card-body">
                                    <div class="mb-3">
                                        <label class="form-label">Pseudo Revendeur</label>
                                        <input type="text" class="form-control" placeholder="ex: superpartner">
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Commission (%)</label>
                                        <input type="range" class="form-range" min="1" max="50" step="1" value="15">
                                        <div class="text-center mt-2 fw-bold text-primary fs-5">15%</div>
                                    </div>
                                    <button class="btn btn-primary w-100">Générer le lien invité</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                 <!-- CONFIGURATION -->
                 <div id="section-settings" class="tab-section d-none">
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
                 </div>


               <!-- SECTION LOGS & AUDIT -->
               <div id="section-logs" class="tab-section d-none">
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
                  document.getElementById('val-managers').innerText = d.stats.managers;
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
