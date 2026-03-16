import { supabaseAdmin } from '../src/config/supabase.js';

async function runAnalysis() {
    console.log('--- 🛡️ ANALYSE TERMINAL J+SERVICE ---');
    console.log('Date:', new Date().toLocaleString());

    try {
        const [
            { count: totalManagers, error: managersError },
            { count: totalResellers, error: resellersError },
            { count: successfulTx, error: successfulTxError },
            { data: revenueRows, error: revenueError },
            { count: pendingPayouts, error: pendingPayoutsError },
            { data: lowStock, error: lowStockError }
        ] = await Promise.all([
            supabaseAdmin.from('managers').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('resellers').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('transactions').select('*', { count: 'exact', head: true }).eq('status', 'SUCCESS'),
            supabaseAdmin.from('transactions').select('amount').eq('status', 'SUCCESS'),
            supabaseAdmin.from('payout_requests').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
            supabaseAdmin.rpc('get_low_stock_managers')
        ]);

        const firstError = managersError || resellersError || successfulTxError || revenueError || pendingPayoutsError || lowStockError;
        if (firstError) throw firstError;
        const totalRevenue = (revenueRows || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);

        console.log('\n📊 STATISTIQUES GLOBALES :');
        console.log(`- Gérants actifs : ${totalManagers || 0}`);
        console.log(`- Partenaires : ${totalResellers || 0}`);
        console.log(`- Chiffre d'Affaires : ${new Intl.NumberFormat().format(totalRevenue)} FCFA`);
        console.log(`- Transactions réussies : ${successfulTx || 0}`);

        console.log('\n🚨 ALERTES ACTIONNABLES :');
        if ((pendingPayouts || 0) > 0) {
            console.log(`- ! [URGENT] : ${pendingPayouts} demandes de retrait en attente.`);
        } else {
            console.log('- Aucune demande de retrait en attente.');
        }

        if ((lowStock || []).length > 0) {
            console.log('\n🔻 STOCK CRITIQUE (< 5) :');
            lowStock.forEach((s) => {
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
