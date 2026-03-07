import pool from './src/config/db.js';

async function seedTestData() {
    try {
        console.log('🌱 Simulation de données en cours...');

        // 1. Créer un Manager de test
        const managerId = 'TEST_ADMIN_123';
        await pool.execute(`
            INSERT IGNORE INTO managers (id, email, name, license_type)
            VALUES (?, 'boss@jservicestudio.com', 'Le Grand Patron', 'FULL')
        `, [managerId]);

        // 2. Créer des Vouchers
        console.log('🎟️ Création de vouchers de test...');
        const vouchers = [
            [managerId, '100F-6H', 'TK-111', 0],
            [managerId, '100F-6H', 'TK-222', 1], // Un déjà utilisé
            [managerId, '500F-24H', 'TK-500', 0]
        ];
        for (const v of vouchers) {
            await pool.execute(`
                INSERT IGNORE INTO vouchers (manager_id, profile, code, used)
                VALUES (?, ?, ?, ?)
            `, v);
        }

        // 3. Simuler des Transactions (Ventes) sur les 7 derniers jours
        console.log('💰 Simulation des ventes...');
        const dates = [0, 1, 2, 3, 4, 5, 6]; // jours passés
        for (const offset of dates) {
            const date = new Date();
            date.setDate(date.getDate() - offset);
            const dateStr = date.toISOString().slice(0, 19).replace('T', ' ');

            // Ventes de tickets
            await pool.execute(`
                INSERT INTO transactions (id, manager_id, amount, status, phone_number, created_at)
                VALUES (?, ?, ?, 'SUCCESS', '22990000000', ?)
            `, [`TX_TEST_${offset}_A`, managerId, 100, dateStr]);

            await pool.execute(`
                INSERT INTO transactions (id, manager_id, amount, status, phone_number, created_at)
                VALUES (?, ?, ?, 'SUCCESS', '22991111111', ?)
            `, [`TX_TEST_${offset}_B`, managerId, 500, dateStr]);
        }

        // 4. Une grosse vente de Licence pour booster la courbe
        await pool.execute(`
            INSERT INTO transactions (id, manager_id, amount, status, phone_number, created_at)
            VALUES ('LIC_PRO_EXEMPLE', ?, 25000, 'SUCCESS', 'ADMIN', NOW())
        `, [managerId]);


        console.log('✅ Simulation terminée avec succès !');
        console.log('👉 Allez rafraîchir : http://localhost:3000/admin/dashboard');
        process.exit(0);
    } catch (err) {
        console.error('❌ Erreur simulation :', err);
        process.exit(1);
    }
}

seedTestData();
