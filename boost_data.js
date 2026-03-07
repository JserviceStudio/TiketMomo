import pool from './src/config/db.js';

async function seedMassiveData() {
    try {
        console.log('🚀 Démarrage d\'une simulation massive...');

        // 1. Création de 5 Managers différents (Wi-Fi, Jeux, Full)
        const managers = [
            ['MG_WIFI_01', 'wifi.expert@gmail.com', 'Cyber Wifi Pro', 'WIFI'],
            ['MG_GAMES_02', 'play.center@yahoo.fr', 'Game Zone VIP', 'GAMES'],
            ['MG_FULL_03', 'super.boss@outlook.com', 'Multi Service Hub', 'FULL'],
            ['MG_WIFI_04', 'station.tech@gmail.com', 'Tech Station', 'WIFI'],
            ['MG_WIFI_05', 'global.connect@gmail.com', 'Global Connect', 'WIFI']
        ];

        console.log('👥 Inscription des gérants...');
        for (const m of managers) {
            await pool.execute(`
                INSERT IGNORE INTO managers (id, email, name, license_type)
                VALUES (?, ?, ?, ?)
            `, m);
        }

        // 2. Création d'un Site de test pour les vouchers
        const siteId = 'SITE_TEST_01';
        await pool.execute(`
            INSERT IGNORE INTO sites (id, manager_id, name, ip_address, api_user, api_password)
            VALUES (?, ?, 'Hotspot Principal', '10.8.0.2', 'admin', 'pass')
        `, [siteId, 'MG_WIFI_01']);

        // 3. Simulation de 150 Transactions réparties sur 14 jours
        console.log('💸 Génération de 150 transactions historiques...');
        const statuses = ['SUCCESS', 'SUCCESS', 'SUCCESS', 'FAILED']; // 75% de succès
        const amounts = [100, 200, 500, 1000, 5000];

        for (let i = 0; i < 150; i++) {
            const randomManager = managers[Math.floor(Math.random() * managers.length)][0];
            const randomAmount = amounts[Math.floor(Math.random() * amounts.length)];
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

            const randomDate = new Date();
            randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * 14));
            const dateStr = randomDate.toISOString().slice(0, 19).replace('T', ' ');

            await pool.execute(`
                INSERT IGNORE INTO transactions (id, manager_id, amount, status, phone_number, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                `TX_MASSIVE_${i}`,
                randomManager,
                randomAmount,
                randomStatus,
                `229${Math.floor(10000000 + Math.random() * 90000000)}`,
                dateStr
            ]);
        }

        // 4. Simulation de 10 ventes de Licences (Vrai Cash pour l'Admin)
        console.log('📜 Ventes de licences PRO/VIP...');
        const licensePlans = [
            { id: 'L_01', amount: 12000, type: 'PRO' },
            { id: 'L_02', amount: 35000, type: 'VIP' },
            { id: 'L_03', amount: 20000, type: 'GAMES' }
        ];

        for (let i = 0; i < 10; i++) {
            const plan = licensePlans[Math.floor(Math.random() * licensePlans.length)];
            const mId = managers[Math.floor(Math.random() * managers.length)][0];

            await pool.execute(`
                INSERT IGNORE INTO transactions (id, manager_id, amount, status, phone_number, created_at)
                VALUES (?, ?, ?, 'SUCCESS', 'ADMIN_PAY', NOW())
            `, [`LIC_MASSIVE_${i}`, mId, plan.amount]);
        }

        // 5. Création de ruptures de stock pour les alertes
        console.log('⚠️ Création de 3 alertes de stock...');
        const voucherSeeds = [
            ['V_01', 'MG_WIFI_01', siteId, '500F-24H', 'CRIT-001', 500, 1440, 0],
            ['V_02', 'MG_WIFI_01', siteId, '500F-24H', 'CRIT-002', 500, 1440, 0],
            ['V_03', 'MG_GAMES_02', siteId, '1000F-2H', 'CRIT-GAME', 1000, 120, 0]
        ];

        for (const v of voucherSeeds) {
            await pool.execute(`
                INSERT IGNORE INTO vouchers (id, manager_id, site_id, profile, code, price, duration_minutes, used)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, v);
        }

        console.log('✅ DATABASE BOOSTÉE AVEC SUCCÈS !');
        console.log('📊 Gérants : 5');
        console.log('💰 Transactions : +160');
        console.log('👉 Rafraîchissez votre dashboard : http://localhost:3000/admin/dashboard');

        process.exit(0);
    } catch (err) {
        console.error('❌ Erreur boost :', err);
        process.exit(1);
    }
}

seedMassiveData();
