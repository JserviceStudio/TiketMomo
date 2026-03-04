import pool from '../../config/db.js';

export const AdminController = {
    /**
     * Rendu du Dashboard Principal de l'Admin (Version Pro Interactif)
     */
    async renderDashboard(req, res, next) {
        try {
            // 1. Statistiques Globales
            const [managerCount] = await pool.execute('SELECT COUNT(*) as total FROM managers');
            const [txStats] = await pool.execute(`
                SELECT 
                    COUNT(*) as total_tx, 
                    SUM(amount) as total_volume,
                    COUNT(DISTINCT manager_id) as active_managers
                FROM transactions 
                WHERE status = 'SUCCESS'
            `);

            // 2. Données pour le Graphique de Revenus (7 derniers jours)
            const [revenueHistory] = await pool.execute(`
                SELECT DATE(created_at) as date, SUM(amount) as total
                FROM transactions 
                WHERE status = 'SUCCESS' 
                AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                GROUP BY DATE(created_at)
                ORDER BY date ASC
            `);

            // 3. Données pour la Répartition des Plans (Camembert)
            const [planStats] = await pool.execute(`
                SELECT license_type as plan, COUNT(*) as count
                FROM managers
                WHERE license_type IS NOT NULL
                GROUP BY license_type
            `);

            const [lowStockAdmins] = await pool.execute(`
                SELECT m.email, v.profile, COUNT(*) as stock
                FROM vouchers v
                JOIN managers m ON v.manager_id = m.id
                WHERE v.used = 0
                GROUP BY v.manager_id, v.profile
                HAVING stock < 10
                LIMIT 5
            `);

            // 4. Dernières Transactions de Licences
            const [recentLicenses] = await pool.execute(`
                SELECT t.*, m.email 
                FROM transactions t
                JOIN managers m ON t.manager_id = m.id
                WHERE t.id LIKE 'LIC_%'
                ORDER BY t.created_at DESC
                LIMIT 10
            `);

            res.send(AdminController._generateHTML({
                stats: {
                    managers: managerCount[0].total,
                    tx: txStats[0].total_tx,
                    volume: txStats[0].total_volume || 0,
                    active: txStats[0].active_managers
                },
                charts: {
                    revenue: revenueHistory,
                    plans: planStats
                },
                lowStock: lowStockAdmins,
                licenses: recentLicenses
            }));
        } catch (error) {
            next(error);
        }
    },

    _generateHTML(data) {
        const revLabels = JSON.stringify(data.charts.revenue.map(r => r.date));
        const revData = JSON.stringify(data.charts.revenue.map(r => r.total));
        const planLabels = JSON.stringify(data.charts.plans.map(p => p.plan));
        const planData = JSON.stringify(data.charts.plans.map(p => p.count));

        return `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Jservice Professional Analytics</title>
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            <style>
                :root {
                    --bg: #050505;
                    --surface: #121212;
                    --card: #1c1c1c;
                    --primary: #ff2d55;
                    --secondary: #5856d6;
                    --text: #ffffff;
                    --muted: #8e8e93;
                    --success: #34c759;
                    --warning: #ff9500;
                }
                body { 
                    background: var(--bg); color: var(--text); font-family: 'Outfit', sans-serif; margin: 0; padding: 0;
                    background-image: radial-gradient(circle at 50% -20%, #1a1a1a 0%, #050505 100%);
                }
                .navbar { padding: 20px 40px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; }
                .container { padding: 40px; max-width: 1400px; margin: 0 auto; }
                
                .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 40px; }
                .stat-card { 
                    background: var(--card); padding: 24px; border-radius: 20px; border: 1px solid #333;
                    transition: transform 0.3s ease;
                }
                .stat-card:hover { transform: translateY(-5px); border-color: var(--primary); }
                .stat-card h3 { color: var(--muted); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; margin: 0; }
                .stat-card .val { font-size: 2.2rem; font-weight: 600; margin: 12px 0; background: linear-gradient(to right, #fff, var(--muted)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

                .main-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; }
                .viz-card { background: var(--card); border-radius: 24px; padding: 24px; border: 1px solid #333; }
                
                table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 20px; }
                th { text-align: left; padding: 16px; color: var(--muted); border-bottom: 1px solid #333; font-weight: 400; font-size: 0.9rem; }
                td { padding: 16px; border-bottom: 1px solid #222; font-size: 0.95rem; }
                
                .badge { padding: 6px 12px; border-radius: 100px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
                .bg-pink { background: rgba(255, 45, 85, 0.1); color: var(--primary); }
                
                canvas { max-width: 100%; }
                .btn { background: var(--text); color: var(--bg); padding: 10px 24px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 0.9rem; transition: 0.2s; }
                .btn:hover { opacity: 0.8; transform: scale(0.98); }
            </style>
        </head>
        <body>
            <nav class="navbar">
                <div style="font-size: 1.5rem; font-weight: 600; letter-spacing: -1px;">Jservice <span style="color:var(--primary)">P.A</span></div>
                <div style="display:flex; gap: 15px;">
                    <a href="#" class="btn">Exporter Logs</a>
                </div>
            </nav>

            <div class="container">
                <div class="grid">
                    <div class="stat-card">
                        <h3>Patrons Connectés</h3>
                        <div class="val">${data.stats.managers}</div>
                    </div>
                    <div class="stat-card">
                        <h3>Volume Cash</h3>
                        <div class="val">${new Intl.NumberFormat().format(data.stats.volume)} <span style="font-size:1rem; color:var(--muted)">FCFA</span></div>
                    </div>
                    <div class="stat-card">
                        <h3>Transactions</h3>
                        <div class="val">${data.stats.tx}</div>
                    </div>
                    <div class="stat-card" style="border: 1px solid rgba(52, 199, 89, 0.3)">
                        <h3>Taux Rétention</h3>
                        <div class="val">${((data.stats.active / data.stats.managers) * 100).toFixed(1)}%</div>
                    </div>
                </div>

                <div class="main-grid">
                    <div class="viz-card">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                            <h2 style="margin:0; font-weight: 400;">Flux Financier <span style="color:var(--muted); font-size:0.9rem;">(7 derniers jours)</span></h2>
                        </div>
                        <canvas id="revChart" height="120"></canvas>
                    </div>
                    <div class="viz-card">
                        <h2 style="margin:0 0 20px 0; font-weight: 400;">Répartition</h2>
                        <canvas id="planChart"></canvas>
                    </div>
                </div>

                <div class="main-grid" style="margin-top:24px;">
                    <div class="viz-card">
                        <h2 style="margin:0 0 10px 0; font-weight: 400;">Ventes Licences Récentes</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>Gérant</th>
                                    <th>Investissement</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.licenses.length > 0 ? data.licenses.map(l => `
                                    <tr>
                                        <td style="font-weight:600;">${l.email}</td>
                                        <td>${new Intl.NumberFormat().format(l.amount)} FCFA</td>
                                        <td><span class="badge bg-pink">${l.status}</span></td>
                                        <td style="color:var(--muted)">${new Date(l.created_at).toLocaleDateString()}</td>
                                    </tr>
                                `).join('') : '<tr><td colspan="4" style="text-align:center; padding:40px; color:var(--muted);">Aucune vente pour le moment.</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                    <div class="viz-card">
                        <h2 style="margin:0 0 20px 0; font-weight: 400;">Alertes Stocks</h2>
                        ${data.lowStock.length > 0 ? data.lowStock.map(s => `
                            <div style="padding:15px; background:#222; border-radius:12px; margin-bottom:12px; border-left: 4px solid var(--warning);">
                                <div style="font-weight:600; margin-bottom:4px;">${s.email}</div>
                                <div style="color:var(--muted); font-size:0.85rem;">Profil ${s.profile}: <span style="color:var(--warning)">${s.stock} tickets</span></div>
                            </div>
                        `).join('') : '<div style="color:var(--success)">Tous les stocks sont optimaux.</div>'}
                    </div>
                </div>
            </div>

            <script>
                // CONFIGURATION CHART.JS (STYLE APPLE/STRIPE)
                const ctxRev = document.getElementById('revChart').getContext('2d');
                new Chart(ctxRev, {
                    type: 'line',
                    data: {
                        labels: ${revLabels},
                        datasets: [{
                            label: 'Revenus journaliers',
                            data: ${revData},
                            borderColor: '#ff2d55',
                            backgroundColor: 'rgba(255, 45, 85, 0.05)',
                            fill: true,
                            tension: 0.4,
                            pointRadius: 4,
                            pointBackgroundColor: '#ff2d55'
                        }]
                    },
                    options: {
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { grid: { color: '#222' }, ticks: { color: '#8e8e93' } },
                            x: { grid: { display: false }, ticks: { color: '#8e8e93' } }
                        }
                    }
                });

                const ctxPlan = document.getElementById('planChart').getContext('2d');
                new Chart(ctxPlan, {
                    type: 'doughnut',
                    data: {
                        labels: ${planLabels},
                        datasets: [{
                            data: ${planData},
                            backgroundColor: ['#5856d6', '#ff2d55', '#34c759', '#ff9500'],
                            borderWidth: 0,
                            hoverOffset: 10
                        }]
                    },
                    options: {
                        plugins: {
                            legend: { position: 'bottom', labels: { color: '#8e8e93', usePointStyle: true, padding: 20 } }
                        },
                        cutout: '75%'
                    }
                });
            </script>
        </body>
        </html>
        `;
    }
};
