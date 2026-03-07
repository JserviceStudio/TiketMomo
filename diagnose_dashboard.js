import pool from './src/config/db.js';

async function diagnose() {
    try {
        console.log('🔍 Diagnostic des données du Dashboard...');

        const [managers] = await pool.execute('SELECT id, license_type FROM managers');
        console.log(`Gérants trouvés : ${managers.length}`);
        console.log('Types de licences :', managers.map(m => m.license_type));

        const [txs] = await pool.execute('SELECT COUNT(*) as count FROM transactions');
        console.log(`Nombre total de transactions : ${txs[0].count}`);

        const [recentTxs] = await pool.execute(`
            SELECT DATE(created_at) as date, SUM(amount) as total 
            FROM transactions 
            WHERE status = 'SUCCESS' 
            AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) 
            GROUP BY DATE(created_at)
        `);
        console.log('Transactions réussies (7j) :', recentTxs);

        const [vouchers] = await pool.execute('SELECT COUNT(*) as count FROM vouchers');
        console.log(`Nombre de vouchers en base : ${vouchers[0].count}`);

        const [lowStock] = await pool.execute(`
            SELECT m.email, v.profile, COUNT(*) as stock
            FROM vouchers v
            JOIN managers m ON v.manager_id = m.id
            WHERE v.used = 0
            GROUP BY v.manager_id, v.profile
            HAVING stock < 10
        `);
        console.log('Alertes de stock trouvées :', lowStock.length);

        process.exit(0);
    } catch (err) {
        console.error('❌ Erreur diagnostic :', err);
        process.exit(1);
    }
}
diagnose();
