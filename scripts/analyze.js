import pool from '../src/config/db.js';

async function runAnalysis() {
    console.log('--- 🛡️ ANALYSE TERMINAL J+SERVICE ---');
    console.log('Date:', new Date().toLocaleString());

    try {
        const [[stats]] = await pool.execute(`
            SELECT 
                (SELECT COUNT(*) FROM managers) as total_managers,
                (SELECT COUNT(*) FROM resellers) as total_resellers,
                (SELECT COUNT(*) FROM transactions WHERE status = 'SUCCESS') as successful_tx,
                (SELECT IFNULL(SUM(amount), 0) FROM transactions WHERE status = 'SUCCESS') as total_revenue,
                (SELECT COUNT(*) FROM payout_requests WHERE status = 'PENDING') as pending_payouts
            FROM DUAL
        `);

        console.log('\n📊 STATISTIQUES GLOBALES :');
        console.log(`- Gérants actifs : ${stats.total_managers}`);
        console.log(`- Partenaires : ${stats.total_resellers}`);
        console.log(`- Chiffre d'Affaires : ${new Intl.NumberFormat().format(stats.total_revenue)} FCFA`);
        console.log(`- Transactions réussies : ${stats.successful_tx}`);

        console.log('\n🚨 ALERTES ACTIONNABLES :');
        if (stats.pending_payouts > 0) {
            console.log(`- ! [URGENT] : ${stats.pending_payouts} demandes de retrait en attente.`);
        } else {
            console.log('- Aucune demande de retrait en attente.');
        }

        const [lowStock] = await pool.execute(`
            SELECT m.email, v.profile, COUNT(*) as stock
            FROM vouchers v
            JOIN managers m ON v.manager_id = m.id
            WHERE v.used = 0
            GROUP BY v.manager_id, v.profile
            HAVING stock < 5
        `);

        if (lowStock.length > 0) {
            console.log('\n🔻 STOCK CRITIQUE (< 5) :');
            lowStock.forEach(s => {
                console.log(`- ${s.email} [${s.profile}] : ${s.stock} restants`);
            });
        }

    } catch (error) {
        console.error('❌ Erreur pendant l\'analyse:', error.message);
    } finally {
        process.exit();
    }
}

runAnalysis();
