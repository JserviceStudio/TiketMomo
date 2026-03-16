import { ArrowDownToLine, Trophy } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import type { AdminStats } from '@/lib/api/types';

export function PartnerPanel({ data }: { data: AdminStats['marketing'] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <div className="space-y-4">
        <div className="card-partner rounded-[1.5rem] p-[1.125rem] shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-white/72 text-[var(--primary)]">
              <Trophy className="size-4.5" />
            </span>
            <p className="m3-label">Reseller ranking</p>
          </div>
          <p className="mt-2 text-[13px] leading-6 text-[var(--muted)]">
            Les meilleurs resellers sont tries par balance et enrichis avec le volume reel de ventes.
          </p>
        </div>
        <DataTable
          rows={data.topResellers}
          emptyMessage="Aucun reseller a afficher."
          tone="partner"
          columns={[
            {
              key: 'name',
              header: 'Reseller',
              render: (row) => (
                <div>
                  <p className="text-[13px] font-semibold">{row.name ?? 'Sans nom'}</p>
                  <p className="text-[11px] text-[var(--muted)]">{row.email ?? 'Email absent'}</p>
                </div>
              ),
            },
            {
              key: 'promo_code',
              header: 'Code',
            },
            {
              key: 'sales_count',
              header: 'Ventes',
            },
            {
              key: 'commission_volume',
              header: 'Commissions',
              render: (row) => `${Number(row.commission_volume ?? 0).toLocaleString('fr-FR')} FCFA`,
            },
            {
              key: 'health',
              header: 'Etat',
              render: (row) => (
                <StatusBadge tone={row.health === 'ACTIVE' ? 'success' : 'neutral'}>
                  {row.health ?? 'IDLE'}
                </StatusBadge>
              ),
            },
          ]}
        />
      </div>
      <div className="space-y-4">
        <div className="card-public rounded-[1.5rem] p-[1.125rem] text-[var(--foreground)] shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-white/72 text-[var(--primary)]">
              <ArrowDownToLine className="size-4.5" />
            </span>
            <p className="m3-label text-[var(--primary)]">Payout monitoring</p>
          </div>
          <p className="mt-2.5 text-[1.9rem] font-bold tracking-[-0.04em]">
            {Number(data.totalCommissions ?? 0).toLocaleString('fr-FR')} FCFA
          </p>
          <p className="mt-1.5 text-[13px] leading-6 text-[var(--muted)]">
            Commissions consolidees sur 30 jours avec un total de {data.totalResellers ?? 0} revendeurs.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-[1rem] bg-white/80 p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">En attente</p>
              <p className="mt-2 text-[1.3rem] font-bold tracking-[-0.04em] text-[var(--foreground)]">
                {data.payoutBreakdown?.pending ?? 0}
              </p>
            </div>
            <div className="rounded-[1rem] bg-white/80 p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Valides</p>
              <p className="mt-2 text-[1.3rem] font-bold tracking-[-0.04em] text-[var(--foreground)]">
                {data.payoutBreakdown?.success ?? 0}
              </p>
            </div>
            <div className="rounded-[1rem] bg-white/80 p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Echecs</p>
              <p className="mt-2 text-[1.3rem] font-bold tracking-[-0.04em] text-[var(--foreground)]">
                {data.payoutBreakdown?.failed ?? 0}
              </p>
            </div>
          </div>
        </div>
        <DataTable
          rows={data.payouts}
          emptyMessage="Aucune demande de retrait en attente."
          tone="public"
          columns={[
            {
              key: 'reseller_name',
              header: 'Reseller',
            },
            {
              key: 'amount',
              header: 'Montant',
              render: (row) => `${Number(row.amount ?? 0).toLocaleString('fr-FR')} FCFA`,
            },
            {
              key: 'status',
              header: 'Statut',
              render: (row) => (
                <StatusBadge
                  tone={
                    row.payout_status === 'SUCCESS'
                      ? 'success'
                      : row.payout_status === 'FAILED'
                        ? 'danger'
                        : 'warning'
                  }
                >
                  {row.payout_status ?? row.status ?? 'PENDING'}
                </StatusBadge>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
