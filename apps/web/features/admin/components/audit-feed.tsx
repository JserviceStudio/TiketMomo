import { ScrollText } from 'lucide-react';
import type { AdminStats } from '@/lib/api/types';

export function AuditFeed({ rows }: { rows: AdminStats['auditLogs'] }) {
  return (
    <div className="m3-surface rounded-[1.5rem] p-[1.125rem]">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-full bg-white/72 text-[var(--primary)]">
          <ScrollText className="size-4.5" />
        </span>
        <p className="m3-label">Audit trail</p>
      </div>
      <div className="mt-4 space-y-3">
        {rows.length ? (
          rows.map((row, index) => (
            <article
              key={row.id ?? `${row.action}-${index}`}
              className="rounded-[1rem] border border-[var(--line)] bg-[var(--m3-surface-container-low)] p-3.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[13px] font-semibold text-[var(--foreground)]">{row.action ?? 'Action inconnue'}</p>
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                  {row.target_type ?? 'system'}
                </p>
              </div>
              <p className="mt-1.5 text-[13px] text-[var(--muted)]">
                {row.created_at
                  ? new Date(row.created_at).toLocaleString('fr-FR')
                  : 'Horodatage absent'}
              </p>
            </article>
          ))
        ) : (
          <p className="text-[13px] text-[var(--muted)]">Aucun evenement de journalisation disponible.</p>
        )}
      </div>
    </div>
  );
}
