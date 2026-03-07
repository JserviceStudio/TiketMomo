import { supabaseAdmin } from '../config/supabase.js';

export const TransactionModel = {
  /**
   * Récupère la liste des transactions d'un gérant (Historique des ventes / Dashboard)
   */
  async getTransactionsByManager(managerId, limit = 50, offset = 0) {
    const { data, error } = await supabaseAdmin
      .from('transactions')
      .select(`
        id, 
        amount, 
        status, 
        created_at, 
        vouchers (profile, code)
      `)
      .eq('manager_id', managerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[TransactionModel] Error fetching transactions:', error.message);
      return [];
    }

    // Aplanir la structure pour rester compatible avec l'ancien format si nécessaire
    return data.map(t => ({
      ...t,
      profile: t.vouchers?.profile,
      code: t.vouchers?.code
    }));
  },

  /**
   * Calcul des statistiques financières pour l'application mobile (CA, Nbre ventes)
   */
  async getSalesStats(managerId) {
    const { data, error } = await supabaseAdmin
      .from('transactions')
      .select('amount')
      .eq('manager_id', managerId)
      .eq('status', 'SUCCESS');

    if (error) {
      console.error('[TransactionModel] Error fetching sales stats:', error.message);
      return { totalVentes: 0, chiffreAffaires: 0 };
    }

    const totalRevenue = data.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    return {
      totalVentes: data.length,
      chiffreAffaires: totalRevenue
    };
  },

  /**
   * Vérifie le niveau de stock (tickets restants) pour CHAQUE profil de ce gérant
   */
  async getStockLevels(managerId) {
    // Note: Supabase n'a pas de GROUP BY direct simple via .select(). 
    // On peut utiliser une vue SQL ou une fonction RPC, ou le faire en JS pour les petites quantités.
    // Ici, on récupère tout et on groupe en JS pour la simplicité, car le nombre de profils est restreint.
    const { data, error } = await supabaseAdmin
      .from('vouchers')
      .select('profile')
      .eq('manager_id', managerId)
      .eq('used', false);

    if (error) {
      console.error('[TransactionModel] Error fetching stock levels:', error.message);
      return [];
    }

    const counts = data.reduce((acc, v) => {
      acc[v.profile] = (acc[v.profile] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts).map(([profile, count]) => ({
      profile,
      remaining_stock: count
    }));
  }
};
