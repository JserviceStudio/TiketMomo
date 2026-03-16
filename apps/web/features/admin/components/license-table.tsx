import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import type { AdminStats } from '@/lib/api/types';

export function LicenseTable({ rows }: { rows: AdminStats['licenses'] }) {
  return (
    <DataTable
      rows={rows}
      emptyMessage="Aucune licence recente disponible."
      tone="admin"
      columns={[
        {
          key: 'id',
          header: 'Licence',
          render: (row) => (
            <div>
              <p className="text-[13px] font-semibold">{row.id}</p>
              <p className="text-[11px] text-[var(--muted)]">{row.email ?? 'Client inconnu'}</p>
            </div>
          ),
        },
        {
          key: 'plan_code',
          header: 'Plan',
        },
        {
          key: 'status',
          header: 'Statut',
          render: (row) => {
            const tone =
              row.status === 'ACTIVE'
                ? 'success'
                : row.status === 'PENDING'
                  ? 'warning'
                  : 'neutral';
            return <StatusBadge tone={tone}>{row.status ?? 'UNKNOWN'}</StatusBadge>;
          },
        },
        {
          key: 'amount',
          header: 'Montant',
          render: (row) => `${Number(row.amount ?? 0).toLocaleString('fr-FR')} FCFA`,
        },
      ]}
    />
  );
}
