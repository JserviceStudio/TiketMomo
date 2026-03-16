import { Activity, CircleDollarSign, UserCog, Wallet } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import type { AdminStats } from '@/lib/api/types';

export function OperationsPanel({ data }: { data: AdminStats }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Clients"
        value={String(data.stats.clients ?? data.stats.managers ?? 0)}
        hint="Comptes clients relies a la plateforme et visibles dans la supervision."
        tone="admin"
        icon={UserCog}
      />
      <StatCard
        label="Transactions"
        value={String(data.stats.tx ?? 0)}
        hint="Transactions consolidees depuis l’API admin-control-plane."
        tone="public"
        icon={Activity}
      />
      <StatCard
        label="Actifs"
        value={String(data.stats.active_clients ?? data.stats.active ?? 0)}
        hint="Clients detectes comme actifs sur la fenetre de reference."
        tone="partner"
        icon={CircleDollarSign}
      />
      <StatCard
        label="Volume"
        value={`${Number(data.stats.volume ?? 0).toLocaleString('fr-FR')} FCFA`}
        hint="Montant cumule remonte par les flux de paiement et de licences."
        tone="manager"
        icon={Wallet}
      />
    </div>
  );
}
