'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CircleAlert, FileKey2, ShieldCheck } from 'lucide-react';
import { AppShell } from '@/components/ui/app-shell';
import { SectionHeader } from '@/components/ui/section-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { fetchAdminStats } from '@/lib/api/admin';
import type { AdminStats } from '@/lib/api/types';
import { AuditFeed } from '@/features/admin/components/audit-feed';
import { AccountPanel } from '@/features/admin/components/account-panel';
import { LicenseTable } from '@/features/admin/components/license-table';
import { MonitoringPanel } from '@/features/admin/components/monitoring-panel';
import { OperationsPanel } from '@/features/admin/components/operations-panel';
import { PartnerPanel } from '@/features/admin/components/partner-panel';

export function AdminDashboard() {
  const [data, setData] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    fetchAdminStats()
      .then((payload) => {
        if (mounted) {
          setData(payload);
          setError(null);
        }
      })
      .catch((reason: Error & { status?: number }) => {
        if (!mounted) return;
        if (reason.status === 401) {
          setError("Session admin absente. Connecte-toi depuis l'espace d'acces.");
          return;
        }
        setError(reason.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AppShell
      context={{
        area: 'Admin control plane',
        title: 'Admin',
        description: 'Pilotage global, monitoring, comptes, licences et audit.',
        navItems: [
          { href: '/admin', label: 'Dashboard', icon: 'dashboard' },
          { href: '/admin#monitoring', label: 'Monitoring', icon: 'monitoring' },
          { href: '/admin#accounts', label: 'Comptes', icon: 'accounts' },
        ],
      }}
    >
      <section className="space-y-5">
        <SectionHeader
          kicker="Admin control plane"
          title="Operations, licences, resellers et audit"
          description="Premiere surface admin en Next.js branchee a l’API Express existante. Le but est de remplacer l’ancien HTML monolithique sans casser le backend."
          badge="Live migration"
        />

        {loading ? (
          <div className="m3-surface rounded-[1.5rem] p-6 text-[13px] text-[var(--muted)]">
            Chargement des donnees admin...
          </div>
        ) : null}

        {error ? (
          <div className="m3-surface rounded-[1.5rem] p-6">
            <StatusBadge tone="warning">Acces requis</StatusBadge>
            <h3 className="mt-3 text-[1.7rem] font-bold tracking-[-0.04em] text-[var(--foreground)]">
              Le dashboard ne peut pas charger les donnees admin.
            </h3>
            <p className="mt-2.5 max-w-2xl text-[13px] leading-6 text-[var(--muted)]">{error}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/auth/admin"
                className="m3-filled-button rounded-full px-5 py-3 text-[13px] font-semibold"
              >
                Se connecter a l’admin
              </Link>
              <a
                href="http://127.0.0.1:3000/admin/dev-login"
                className="m3-outline-button rounded-full px-5 py-3 text-[13px] font-semibold"
              >
                Dev login backend
              </a>
            </div>
          </div>
        ) : null}

        {data ? (
          <>
            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="card-admin rounded-[1.5rem] p-5 shadow-[var(--shadow-card)]">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-full bg-white/72 text-[var(--primary)]">
                    <ShieldCheck className="size-4.5" />
                  </span>
                  <p className="m3-label text-[var(--primary)]">Overview</p>
                </div>
                <h3 className="mt-2.5 text-[1.95rem] font-bold tracking-[-0.05em] text-[var(--foreground)]">
                  Console d’operations centralisee
                </h3>
                <p className="mt-2.5 max-w-2xl text-[13px] leading-6 text-[var(--muted)]">
                  Cette vue remonte les flux critiques licences, commissions, retraits et audit
                  depuis le backend Express. L’objectif est de suivre l’etat global, puis agir
                  rapidement sans changer d’espace.
                </p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <span className="m3-tonal-button rounded-full px-4 py-2 text-[13px] font-semibold">
                    Licences
                  </span>
                  <span className="m3-outline-button rounded-full px-4 py-2 text-[13px] font-semibold">
                    Payouts
                  </span>
                  <span className="m3-outline-button rounded-full px-4 py-2 text-[13px] font-semibold">
                    Audit
                  </span>
                </div>
              </div>
              <div className="card-neutral rounded-[1.5rem] p-5 shadow-[var(--shadow-card)]">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-full bg-white/72 text-[var(--primary)]">
                    <CircleAlert className="size-4.5" />
                  </span>
                  <p className="m3-label">Immediate priorities</p>
                </div>
                <div className="mt-3.5 space-y-3">
                  <div className="rounded-[1rem] bg-white/80 p-3.5">
                    <p className="text-[13px] font-semibold text-[var(--foreground)]">Licences recentes</p>
                    <p className="mt-1 text-[13px] text-[var(--muted)]">
                      {data.licenses.length} entrees disponibles pour verification rapide.
                    </p>
                  </div>
                  <div className="rounded-[1rem] bg-white/80 p-3.5">
                    <p className="text-[13px] font-semibold text-[var(--foreground)]">Demandes de retrait</p>
                    <p className="mt-1 text-[13px] text-[var(--muted)]">
                      {data.marketing.payouts.length} demandes a traiter ou surveiller.
                    </p>
                  </div>
                  <div className="rounded-[1rem] bg-white/80 p-3.5">
                    <p className="text-[13px] font-semibold text-[var(--foreground)]">Evenements d’audit</p>
                    <p className="mt-1 text-[13px] text-[var(--muted)]">
                      {data.auditLogs.length} evenements recents remontes par la journalisation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <OperationsPanel data={data} />
            <div id="monitoring">
              <MonitoringPanel data={data} />
            </div>
            <div id="accounts">
              <AccountPanel />
            </div>
            <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
              <div className="space-y-4">
                <div className="card-neutral rounded-[1.5rem] p-[1.125rem] shadow-[var(--shadow-card)]">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-9 items-center justify-center rounded-full bg-white/72 text-[var(--primary)]">
                      <FileKey2 className="size-4.5" />
                    </span>
                    <p className="m3-label">License operations</p>
                  </div>
                  <p className="mt-2.5 text-[13px] leading-6 text-[var(--muted)]">
                    Licences recentes, montants associes et statut terrain remontes par le module
                    {' '}
                    <code>license-saas</code>.
                  </p>
                </div>
                <LicenseTable rows={data.licenses} />
              </div>
              <AuditFeed rows={data.auditLogs} />
            </div>
            <PartnerPanel data={data.marketing} />
          </>
        ) : null}
      </section>
    </AppShell>
  );
}
