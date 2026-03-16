'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BadgePercent, CircleDollarSign, CircleGauge, HandCoins, Sparkles, Ticket, TrendingUp } from 'lucide-react';
import { AppShell } from '@/components/ui/app-shell';
import { DataTable } from '@/components/ui/data-table';
import { SectionHeader } from '@/components/ui/section-header';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { fetchResellerDashboard } from '@/lib/api/reseller';
import type { ResellerDashboard } from '@/lib/api/types';

type SalesWindow = '7d' | '30d' | 'all';
type PayoutFilter = 'all' | 'pending' | 'success' | 'failed';

function normalizePayoutStatus(status?: string) {
  const normalized = String(status ?? 'PENDING').toUpperCase();

  if (normalized === 'SUCCESS') {
    return { label: 'Valide', tone: 'success' as const, group: 'success' as const };
  }

  if (normalized === 'FAILED' || normalized === 'REJECTED' || normalized === 'CANCELLED') {
    return { label: 'Echec', tone: 'danger' as const, group: 'failed' as const };
  }

  return { label: 'En attente', tone: 'warning' as const, group: 'pending' as const };
}

function isWithinWindow(dateValue: string | undefined, window: SalesWindow) {
  if (window === 'all') return true;

  const timestamp = new Date(dateValue ?? 0).getTime();
  if (!Number.isFinite(timestamp) || timestamp <= 0) return false;

  const days = window === '7d' ? 7 : 30;
  return timestamp >= Date.now() - days * 24 * 60 * 60 * 1000;
}

export function ResellerShell() {
  const [data, setData] = useState<ResellerDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [salesWindow, setSalesWindow] = useState<SalesWindow>('30d');
  const [payoutFilter, setPayoutFilter] = useState<PayoutFilter>('all');

  useEffect(() => {
    let mounted = true;

    fetchResellerDashboard()
      .then((payload) => {
        if (!mounted) return;
        setData(payload.data);
        setError(null);
      })
      .catch((reason: Error & { status?: number }) => {
        if (!mounted) return;
        if (reason.status === 401) {
          setError('Session partenaire absente. Connecte-toi pour ouvrir le portail.');
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

  const filteredSales = (data?.sales ?? []).filter((sale) =>
    isWithinWindow(sale.sale_date ?? sale.commission_date, salesWindow),
  );
  const filteredPayouts = (data?.payouts ?? []).filter((payout) => {
    if (payoutFilter === 'all') return true;
    return normalizePayoutStatus(payout.status).group === payoutFilter;
  });
  const filteredSalesAmount = filteredSales.reduce(
    (sum, sale) => sum + Number(sale.amount ?? 0),
    0,
  );
  const latestSale = filteredSales[0] ?? data?.sales?.[0] ?? null;
  const latestPayout = filteredPayouts[0] ?? data?.payouts?.[0] ?? null;

  return (
    <AppShell
      context={{
        area: 'Reseller workspace',
        title: 'Reseller',
        description: 'Commissions, code promo, retraits et historique commercial.',
        navItems: [
          { href: '/reseller', label: 'Accueil', icon: 'store' },
          { href: '/reseller#sales', label: 'Ventes', icon: 'dashboard' },
          { href: '/reseller#payouts', label: 'Retraits', icon: 'sales' },
        ],
      }}
    >
      <section className="space-y-5">
        <SectionHeader
          kicker="Reseller sales"
          title="Portail reseller"
          description="Suivi des ventes, commissions, codes promo et retraits dans l’espace commercial dedie."
          badge="Live migration"
        />

        {loading ? (
          <div className="m3-surface rounded-[1.5rem] p-6 text-[13px] text-[var(--muted)]">
            Chargement des donnees reseller...
          </div>
        ) : null}

        {error ? (
          <div className="m3-glass rounded-[1.5rem] p-6">
            <StatusBadge tone="warning">Acces requis</StatusBadge>
            <h3 className="mt-3 text-[1.7rem] font-bold tracking-[-0.04em] text-[var(--foreground)]">
              Le portail reseller est pret, mais la session est absente.
            </h3>
            <p className="mt-2.5 max-w-2xl text-[13px] leading-6 text-[var(--muted)]">{error}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/auth/reseller"
                className="m3-filled-button rounded-full px-5 py-3 text-[13px] font-semibold"
              >
                Se connecter
              </Link>
              <a
                href="http://127.0.0.1:3000/resellers/auth"
                className="m3-outline-button rounded-full px-5 py-3 text-[13px] font-semibold"
              >
                Auth backend
              </a>
            </div>
          </div>
        ) : null}

        {data ? (
          <>
            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="card-partner rounded-[1.5rem] p-5 shadow-[var(--shadow-card)]">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-full bg-white/72 text-[var(--primary)]">
                    <CircleGauge className="size-4.5" />
                  </span>
                  <p className="m3-label text-[var(--primary)]">Reseller overview</p>
                </div>
                <h3 className="mt-2.5 text-[1.95rem] font-bold tracking-[-0.05em] text-[var(--foreground)]">
                  {data.reseller.name}
                </h3>
                <p className="mt-2.5 max-w-2xl text-[13px] leading-6 text-[var(--muted)]">
                  Ton code promo actif est <strong>{data.reseller.promo_code}</strong>. Utilise cette
                  vue pour suivre tes ventes, retraits et performances commerciales.
                </p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <span className="m3-tonal-button rounded-full px-4 py-2 text-[13px] font-semibold">
                    Promo {data.reseller.promo_code}
                  </span>
                  <span className="m3-outline-button rounded-full px-4 py-2 text-[13px] font-semibold">
                    Commission {Number(data.reseller.commission_rate ?? 0)}%
                  </span>
                </div>
              </div>
              <div className="card-neutral rounded-[1.5rem] p-5 shadow-[var(--shadow-card)]">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-full bg-white/72 text-[var(--primary)]">
                    <Sparkles className="size-4.5" />
                  </span>
                  <p className="m3-label">Immediate priorities</p>
                </div>
                <div className="mt-3.5 space-y-3">
                  <div className="rounded-[1rem] bg-white/80 p-3.5">
                    <p className="text-[13px] font-semibold text-[var(--foreground)]">Solde retirable</p>
                    <p className="mt-1 text-[13px] text-[var(--muted)]">
                      {Number(data.reseller.balance ?? 0).toLocaleString('fr-FR')} FCFA disponibles.
                    </p>
                  </div>
                  <div className="rounded-[1rem] bg-white/80 p-3.5">
                    <p className="text-[13px] font-semibold text-[var(--foreground)]">Ventes recentes</p>
                    <p className="mt-1 text-[13px] text-[var(--muted)]">
                      {data.sales.length} lignes disponibles dans l’historique reseller.
                    </p>
                  </div>
                  <div className="rounded-[1rem] bg-white/80 p-3.5">
                    <p className="text-[13px] font-semibold text-[var(--foreground)]">Retraits</p>
                    <p className="mt-1 text-[13px] text-[var(--muted)]">
                      {data.payouts.length} demandes recentes remontees par le backend.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                label="Solde"
                value={`${Number(data.reseller.balance ?? 0).toLocaleString('fr-FR')} FCFA`}
                hint="Montant actuellement disponible pour retrait."
                tone="partner"
                icon={CircleDollarSign}
              />
              <StatCard
                label="Code promo"
                value={data.reseller.promo_code}
                hint="Code utilise pour attribuer les commissions."
                tone="public"
                icon={Ticket}
              />
              <StatCard
                label="Commission"
                value={`${Number(data.reseller.commission_rate ?? 0)}%`}
                hint="Taux de commission configure pour ce partenaire."
                tone="admin"
                icon={BadgePercent}
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="card-neutral rounded-[1.5rem] p-[1.125rem] shadow-[var(--shadow-card)]">
                <p className="m3-label">Commissions cumulees</p>
                <p className="mt-2 text-[1.8rem] font-bold tracking-[-0.04em] text-[var(--foreground)]">
                  {Number(data.summary?.total_commissions ?? 0).toLocaleString('fr-FR')} FCFA
                </p>
                <p className="mt-1 text-[13px] leading-6 text-[var(--muted)]">
                  Total visible sur l’historique recent des commissions creditees.
                </p>
              </div>
              <div className="card-public rounded-[1.5rem] p-[1.125rem] shadow-[var(--shadow-card)]">
                <p className="m3-label text-[var(--primary)]">Ventes recentes</p>
                <p className="mt-2 text-[1.8rem] font-bold tracking-[-0.04em] text-[var(--foreground)]">
                  {data.summary?.sales_count ?? data.sales.length}
                </p>
                <p className="mt-1 text-[13px] leading-6 text-[var(--muted)]">
                  Nombre de lignes commerciales remontees dans le portail reseller.
                </p>
              </div>
              <div className="card-admin rounded-[1.5rem] p-[1.125rem] shadow-[var(--shadow-card)]">
                <p className="m3-label">Retraits en attente</p>
                <p className="mt-2 text-[1.8rem] font-bold tracking-[-0.04em] text-[var(--foreground)]">
                  {data.summary?.pending_payouts ?? 0}
                </p>
                <p className="mt-1 text-[13px] leading-6 text-[var(--muted)]">
                  Demandes de retrait non finalisees a suivre en priorite.
                </p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <div className="card-neutral rounded-[1.5rem] p-[1.125rem] shadow-[var(--shadow-card)]">
                <p className="m3-label">Performance commerciale</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-[1rem] bg-white/80 p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">7 derniers jours</p>
                    <p className="mt-2 text-[1.5rem] font-bold tracking-[-0.04em] text-[var(--foreground)]">
                      {Number(data.summary?.commissions_last_7d ?? 0).toLocaleString('fr-FR')} FCFA
                    </p>
                    <p className="mt-1 text-[12px] text-[var(--muted)]">
                      {data.summary?.sales_last_7d ?? 0} ventes attribuees au code promo.
                    </p>
                  </div>
                  <div className="rounded-[1rem] bg-white/80 p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Ce mois</p>
                    <p className="mt-2 text-[1.5rem] font-bold tracking-[-0.04em] text-[var(--foreground)]">
                      {Number(data.summary?.commissions_this_month ?? 0).toLocaleString('fr-FR')} FCFA
                    </p>
                    <p className="mt-1 text-[12px] text-[var(--muted)]">
                      {data.summary?.sales_this_month ?? 0} ventes sur la periode courante.
                    </p>
                  </div>
                </div>
              </div>
              <div className="card-public rounded-[1.5rem] p-[1.125rem] shadow-[var(--shadow-card)]">
                <p className="m3-label text-[var(--primary)]">Suivi retraits</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-[1rem] bg-white/80 p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">En attente</p>
                    <p className="mt-2 text-[1.5rem] font-bold tracking-[-0.04em] text-[var(--foreground)]">
                      {data.summary?.pending_payouts ?? 0}
                    </p>
                  </div>
                  <div className="rounded-[1rem] bg-white/80 p-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Valides</p>
                    <p className="mt-2 text-[1.5rem] font-bold tracking-[-0.04em] text-[var(--foreground)]">
                      {data.summary?.successful_payouts ?? 0}
                    </p>
                  </div>
                </div>
                <div className="mt-3 rounded-[1rem] bg-white/80 p-3.5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Echecs / rejetes</p>
                  <p className="mt-2 text-[1.5rem] font-bold tracking-[-0.04em] text-[var(--foreground)]">
                    {data.summary?.payout_breakdown?.failed ?? 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <div className="card-admin rounded-[1.5rem] p-[1.125rem] shadow-[var(--shadow-card)]">
                <p className="m3-label">Activation promo</p>
                <p className="mt-2 text-[1.8rem] font-bold tracking-[-0.04em] text-[var(--foreground)]">
                  {data.summary?.sales_count ?? 0}
                </p>
                <p className="mt-1 text-[13px] leading-6 text-[var(--muted)]">
                  Utilisations commerciales visibles du code <strong>{data.reseller.promo_code}</strong>.
                </p>
              </div>
              <div className="card-neutral rounded-[1.5rem] p-[1.125rem] shadow-[var(--shadow-card)]">
                <p className="m3-label">Commission moyenne</p>
                <p className="mt-2 text-[1.8rem] font-bold tracking-[-0.04em] text-[var(--foreground)]">
                  {Number(data.summary?.average_commission ?? 0).toLocaleString('fr-FR')} FCFA
                </p>
                <p className="mt-1 text-[13px] leading-6 text-[var(--muted)]">
                  Valeur moyenne par vente commissionnee sur l’historique recent.
                </p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <div className="card-public rounded-[1.5rem] p-[1.125rem] shadow-[var(--shadow-card)]">
                <p className="m3-label text-[var(--primary)]">Focus ventes</p>
                <p className="mt-2 text-[1.8rem] font-bold tracking-[-0.04em] text-[var(--foreground)]">
                  {Number(filteredSalesAmount).toLocaleString('fr-FR')} FCFA
                </p>
                <p className="mt-1 text-[13px] leading-6 text-[var(--muted)]">
                  {filteredSales.length} ventes sur la fenetre active <strong>{salesWindow}</strong>.
                </p>
                <p className="mt-2 text-[12px] text-[var(--muted)]">
                  Derniere activite:{' '}
                  {latestSale?.sale_date || latestSale?.commission_date
                    ? new Date(latestSale.sale_date ?? latestSale.commission_date ?? '').toLocaleString('fr-FR')
                    : 'aucune vente visible'}
                </p>
              </div>
              <div className="card-admin rounded-[1.5rem] p-[1.125rem] shadow-[var(--shadow-card)]">
                <p className="m3-label">Focus retraits</p>
                <p className="mt-2 text-[1.8rem] font-bold tracking-[-0.04em] text-[var(--foreground)]">
                  {filteredPayouts.length}
                </p>
                <p className="mt-1 text-[13px] leading-6 text-[var(--muted)]">
                  Retraits visibles pour le filtre <strong>{payoutFilter}</strong>.
                </p>
                <p className="mt-2 text-[12px] text-[var(--muted)]">
                  Derniere demande:{' '}
                  {latestPayout?.created_at
                    ? new Date(latestPayout.created_at).toLocaleString('fr-FR')
                    : 'aucun retrait visible'}
                </p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <div id="sales" className="space-y-4">
                <div className="card-neutral rounded-[1.5rem] p-[1.125rem] shadow-[var(--shadow-card)]">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-9 items-center justify-center rounded-full bg-white/72 text-[var(--primary)]">
                      <TrendingUp className="size-4.5" />
                    </span>
                    <p className="m3-label">Sales history</p>
                  </div>
                  <p className="mt-2.5 text-[13px] leading-6 text-[var(--muted)]">
                    Historique recent des commissions creditees pour suivre la traction du code promo.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(['7d', '30d', 'all'] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setSalesWindow(option)}
                        className={
                          salesWindow === option
                            ? 'm3-filled-button rounded-full px-4 py-2 text-[12px] font-semibold'
                            : 'm3-outline-button rounded-full px-4 py-2 text-[12px] font-semibold'
                        }
                      >
                        {option === '7d' ? '7 jours' : option === '30d' ? '30 jours' : 'Tout'}
                      </button>
                    ))}
                  </div>
                </div>
                <DataTable
                  rows={filteredSales}
                  emptyMessage="Aucune vente pour le moment."
                  tone="partner"
                  columns={[
                    {
                      key: 'reference',
                      header: 'Reference',
                      render: (row) => String(row.reference || '—').slice(0, 12).toUpperCase(),
                    },
                    {
                      key: 'sale_date',
                      header: 'Date',
                      render: (row) =>
                        row.sale_date
                          ? new Date(row.sale_date).toLocaleDateString('fr-FR')
                          : '—',
                    },
                    {
                      key: 'amount',
                      header: 'Commission',
                      render: (row) =>
                        `${Number(row.amount ?? 0).toLocaleString('fr-FR')} FCFA`,
                    },
                    {
                      key: 'sale_kind',
                      header: 'Type',
                      render: (row) => (
                        <StatusBadge tone={row.sale_kind === 'LICENSE' ? 'info' : 'neutral'}>
                          {row.sale_kind}
                        </StatusBadge>
                      ),
                    },
                    {
                      key: 'license',
                      header: 'Offre',
                      render: (row) => row.license?.plan_code || row.transaction_type || '—',
                    },
                    {
                      key: 'status',
                      header: 'Etat',
                      render: (row) => (
                        <StatusBadge tone={row.transaction_status === 'SUCCESS' ? 'success' : 'warning'}>
                          {row.transaction_status === 'SUCCESS' ? 'Credite' : row.transaction_status || 'Inconnu'}
                        </StatusBadge>
                      ),
                    },
                  ]}
                />
              </div>

              <div id="payouts" className="space-y-4">
                <div className="card-public rounded-[1.5rem] p-[1.125rem] shadow-[var(--shadow-card)]">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-9 items-center justify-center rounded-full bg-white/72 text-[var(--primary)]">
                      <HandCoins className="size-4.5" />
                    </span>
                    <p className="m3-label text-[var(--primary)]">Payout monitoring</p>
                  </div>
                  <p className="mt-2.5 text-[1.9rem] font-bold tracking-[-0.04em]">
                    {data.payouts.length}
                  </p>
                  <p className="mt-1.5 text-[13px] leading-6 text-[var(--muted)]">
                    Demandes de retrait recentes visibles dans le portail reseller.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {([
                      ['all', 'Tous'],
                      ['pending', 'En attente'],
                      ['success', 'Valides'],
                      ['failed', 'Echecs'],
                    ] as const).map(([option, label]) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setPayoutFilter(option)}
                        className={
                          payoutFilter === option
                            ? 'm3-filled-button rounded-full px-4 py-2 text-[12px] font-semibold'
                            : 'm3-outline-button rounded-full px-4 py-2 text-[12px] font-semibold'
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <DataTable
                  rows={filteredPayouts}
                  emptyMessage="Aucun retrait recent."
                  tone="public"
                  columns={[
                    {
                      key: 'created_at',
                      header: 'Date',
                      render: (row) =>
                        row.created_at
                          ? new Date(row.created_at).toLocaleDateString('fr-FR')
                          : '—',
                    },
                    {
                      key: 'amount',
                      header: 'Montant',
                      render: (row) =>
                        `${Number(row.amount ?? 0).toLocaleString('fr-FR')} FCFA`,
                    },
                    {
                      key: 'phone_number',
                      header: 'Telephone',
                    },
                    {
                      key: 'operator',
                      header: 'Operateur',
                      render: (row) => row.operator || '—',
                    },
                    {
                      key: 'status',
                      header: 'Statut',
                      render: (row) => {
                        const payoutStatus = normalizePayoutStatus(row.status);

                        return (
                          <StatusBadge tone={payoutStatus.tone}>
                            {payoutStatus.label}
                          </StatusBadge>
                        );
                      },
                    },
                  ]}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="card-neutral rounded-[1.5rem] p-[1.125rem] shadow-[var(--shadow-card)]">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-full bg-white/72 text-[var(--primary)]">
                    <TrendingUp className="size-4.5" />
                  </span>
                  <p className="m3-label">Activite unifiee</p>
                </div>
                <p className="mt-2.5 text-[13px] leading-6 text-[var(--muted)]">
                  Flux consolide des ventes commissionnees et des retraits pour mieux lire la chronologie reseller.
                </p>
              </div>
              <DataTable
                rows={data.activity ?? []}
                emptyMessage="Aucune activite recente."
                tone="neutral"
                columns={[
                  {
                    key: 'date',
                    header: 'Date',
                    render: (row) => (row.date ? new Date(row.date).toLocaleString('fr-FR') : '—'),
                  },
                  {
                    key: 'event_type',
                    header: 'Flux',
                    render: (row) => (
                      <StatusBadge tone={row.event_type === 'SALE' ? 'info' : 'warning'}>
                        {row.event_type}
                      </StatusBadge>
                    ),
                  },
                  {
                    key: 'title',
                    header: 'Detail',
                  },
                  {
                    key: 'amount',
                    header: 'Montant',
                    render: (row) => `${Number(row.amount ?? 0).toLocaleString('fr-FR')} FCFA`,
                  },
                  {
                    key: 'status',
                    header: 'Statut',
                    render: (row) => row.status || '—',
                  },
                  {
                    key: 'reference',
                    header: 'Reference',
                    render: (row) => String(row.reference || '—').slice(0, 12).toUpperCase(),
                  },
                ]}
              />
            </div>
          </>
        ) : null}
      </section>
    </AppShell>
  );
}

export { ResellerShell as PartnerShell };
