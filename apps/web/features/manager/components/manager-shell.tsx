'use client';

import { useEffect, useState } from 'react';
import { Compass, Gauge, Layers3, ListTodo, ShieldCheck, Ticket } from 'lucide-react';
import { AppShell } from '@/components/ui/app-shell';
import { DataTable } from '@/components/ui/data-table';
import { SectionHeader } from '@/components/ui/section-header';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { fetchClientDashboard } from '@/lib/api/clients-dashboard';
import type { ClientDashboard } from '@/lib/api/types';

export function ClientShell() {
  const [data, setData] = useState<ClientDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileFilter, setProfileFilter] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let mounted = true;

    fetchClientDashboard()
      .then((payload) => {
        if (!mounted) return;
        setData(payload.data);
        setError(null);
      })
      .catch((reason: Error & { status?: number }) => {
        if (!mounted) return;
        if (reason.status === 401) {
          setError('Session client absente. Connecte-toi pour ouvrir le dashboard.');
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

  const formatExpiry = (rawDate?: string | null) => {
    if (!rawDate) return 'Aucune date';
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return 'Date invalide';
    return date.toLocaleDateString('fr-FR');
  };

  const licenseStatus = data?.client.license_status;

  return (
    <AppShell
      context={{
        area: 'Client workspace',
        title: 'Client',
        description: 'Boutique web, vouchers, distribution et abonnement.',
        navItems: [
          { href: '/client', label: 'Accueil', icon: 'compass' },
          { href: '/client#modules', label: 'Vouchers', icon: 'ticket' },
          { href: '/client#recommendation', label: 'Abonnement', icon: 'shield' },
        ],
      }}
    >
      <section className="space-y-5">
        <SectionHeader
          kicker="Client operations"
          title="Espace client"
          description="Cet espace regroupe le stock recu depuis Mikhmo AI, la distribution et l’etat de la licence."
          badge="Live data"
        />

        {loading ? (
          <div className="m3-surface rounded-[1.5rem] p-6 text-[13px] text-[var(--muted)]">
            Chargement du dashboard client...
          </div>
        ) : null}

        {error ? (
          <div className="m3-glass rounded-[1.5rem] p-6">
            <StatusBadge tone="warning">Acces requis</StatusBadge>
            <h3 className="mt-3 text-[1.7rem] font-bold tracking-[-0.04em] text-[var(--foreground)]">
              La vue client est prete, mais la session est absente.
            </h3>
            <p className="mt-2.5 max-w-2xl text-[13px] leading-6 text-[var(--muted)]">{error}</p>
          </div>
        ) : null}

        {data ? (
          <>
        {(() => {
          const filteredVouchers = data.vouchers.filter((voucher) => {
            const matchesProfile = profileFilter === 'all' || voucher.profile === profileFilter;
            const matchesQuery =
              !query.trim() || voucher.code.toLowerCase().includes(query.trim().toLowerCase());
            return matchesProfile && matchesQuery;
          });
          const profileOptions = ['all', ...new Set(data.vouchers.map((voucher) => voucher.profile))];

          return (
            <>
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="card-manager rounded-[1.5rem] p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-full bg-white/72 text-[var(--primary)]">
                <Compass className="size-4.5" />
              </span>
              <p className="m3-label text-[var(--primary)]">Client overview</p>
            </div>
            <h3 className="mt-2.5 text-[1.95rem] font-bold tracking-[-0.05em] text-[var(--foreground)]">
              {data.client.display_name || data.client.email}
            </h3>
            <p className="mt-2.5 max-w-2xl text-[13px] leading-6 text-[var(--muted)]">
              Stock vouchers recu depuis Mikhmo AI, synchronisation recente et etat de licence regroupes dans un cockpit unique.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <span className="m3-tonal-button rounded-full px-4 py-2 text-[13px] font-semibold">
                Licence {data.client.license_type || 'FREE'}
              </span>
              <span className="m3-outline-button rounded-full px-4 py-2 text-[13px] font-semibold">
                {data.inventory.available} vouchers dispo
              </span>
              <StatusBadge tone={licenseStatus?.severity || 'neutral'}>
                {licenseStatus?.label || 'Statut licence'}
              </StatusBadge>
            </div>
          </div>

          <div className="card-neutral rounded-[1.5rem] p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-full bg-white/72 text-[var(--primary)]">
                <ListTodo className="size-4.5" />
              </span>
              <p className="m3-label">Priorites client</p>
            </div>
            <div className="mt-3.5 space-y-3">
              <div className="rounded-[1rem] bg-white/80 p-3.5">
                <p className="text-[13px] font-semibold text-[var(--foreground)]">Vue compacte</p>
                <p className="mt-1 text-[13px] text-[var(--muted)]">
                  Le stock recu depuis Mikhmo AI et la licence sont visibles sans changer de page.
                </p>
              </div>
              <div className="rounded-[1rem] bg-white/80 p-3.5">
                <p className="text-[13px] font-semibold text-[var(--foreground)]">Source de distribution</p>
                <p className="mt-1 text-[13px] text-[var(--muted)]">
                  Mikhmo AI genere le stock et le transfere au backend pour la distribution.
                </p>
              </div>
              <div className="rounded-[1rem] bg-white/80 p-3.5">
                <p className="text-[13px] font-semibold text-[var(--foreground)]">Licence</p>
                <p className="mt-1 text-[13px] text-[var(--muted)]">
                  Expire le {formatExpiry(data.client.license_expiry_date)}. {licenseStatus?.days_remaining != null ? `Reste ${licenseStatus.days_remaining} jour(s).` : ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Stock total" value={String(data.inventory.total)} hint="Total des vouchers recus depuis Mikhmo AI pour ce client." tone="manager" icon={Layers3} />
          <StatCard label="Disponibles" value={String(data.inventory.available)} hint="Vouchers recus et encore disponibles pour la distribution." tone="public" icon={Ticket} />
          <StatCard label="Utilises" value={String(data.inventory.used)} hint={`Licence ${data.client.license_type || 'FREE'} • ${licenseStatus?.label || 'statut inconnu'} • expiration ${formatExpiry(data.client.license_expiry_date)}`} tone="admin" icon={Gauge} />
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="card-public rounded-[1.5rem] p-[1.125rem] shadow-[var(--shadow-card)]">
            <p className="m3-label text-[var(--primary)]">Dernier sync recu</p>
            <p className="mt-2 text-[1.8rem] font-bold tracking-[-0.04em] text-[var(--foreground)]">
              {data.sync_summary.last_received_at
                ? new Date(data.sync_summary.last_received_at).toLocaleDateString('fr-FR')
                : 'Aucun'}
            </p>
            <p className="mt-1 text-[13px] leading-6 text-[var(--muted)]">
              Source {data.sync_summary.source} • lot {data.sync_summary.last_batch_size} • importes {data.sync_summary.last_inserted}.
            </p>
          </div>
          <div className="card-neutral rounded-[1.5rem] p-[1.125rem] shadow-[var(--shadow-card)]">
            <p className="m3-label">Etat du flux</p>
            <div className="mt-3">
              <StatusBadge tone={data.sync_summary.last_status === 'COMPLETED' ? 'success' : 'warning'}>
                {data.sync_summary.last_status}
              </StatusBadge>
            </div>
            <p className="mt-3 text-[13px] leading-6 text-[var(--muted)]">
              {data.sync_summary.last_error || 'Aucune erreur signalee sur le dernier envoi Mikhmo AI.'}
            </p>
          </div>
          <div className="card-admin rounded-[1.5rem] p-[1.125rem] shadow-[var(--shadow-card)]">
            <p className="m3-label">Alerte stock faible</p>
            <p className="mt-2 text-[1.8rem] font-bold tracking-[-0.04em] text-[var(--foreground)]">
              {data.inventory.alerts.low_stock ? 'Oui' : 'Non'}
            </p>
            <p className="mt-1 text-[13px] leading-6 text-[var(--muted)]">
              Seuil critique: {data.inventory.alerts.low_stock_threshold} vouchers. Profils critiques: {data.inventory.alerts.critical_profiles.length}.
            </p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="card-admin rounded-[1.5rem] p-[1.125rem] shadow-[var(--shadow-card)]">
            <p className="m3-label">Profils critiques</p>
            <p className="mt-2 text-[13px] leading-6 text-[var(--muted)]">
              Profils en dessous ou au niveau du seuil critique recu depuis Mikhmo AI.
            </p>
            <div className="mt-4 space-y-3">
              {data.inventory.alerts.critical_profiles.length ? (
                data.inventory.alerts.critical_profiles.map((profile) => (
                  <div key={profile.profile} className="rounded-[1rem] bg-white/80 p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[13px] font-semibold text-[var(--foreground)]">{profile.profile}</p>
                      <StatusBadge tone={profile.available <= Math.max(3, Math.floor(data.inventory.alerts.low_stock_threshold / 3)) ? 'danger' : 'warning'}>
                        {profile.available} restants
                      </StatusBadge>
                    </div>
                    <p className="mt-1 text-[13px] text-[var(--muted)]">
                      Total {profile.total} • utilises {profile.used} • disponibles {profile.available}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-[13px] leading-6 text-[var(--muted)]">
                  Aucun profil critique pour le moment.
                </p>
              )}
            </div>
          </div>
          <div className="card-neutral rounded-[1.5rem] p-[1.125rem] shadow-[var(--shadow-card)]">
            <p className="m3-label">Lecture operationnelle</p>
            <p className="mt-2 text-[13px] leading-6 text-[var(--muted)]">
              Cette zone permet de croiser rapidement les profils sensibles avec l’inventaire detaille.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-[1rem] bg-white/80 p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Seuil</p>
                <p className="mt-2 text-[1.5rem] font-bold tracking-[-0.04em] text-[var(--foreground)]">
                  {data.inventory.alerts.low_stock_threshold}
                </p>
              </div>
              <div className="rounded-[1rem] bg-white/80 p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Profils critiques</p>
                <p className="mt-2 text-[1.5rem] font-bold tracking-[-0.04em] text-[var(--foreground)]">
                  {data.inventory.alerts.critical_profiles.length}
                </p>
              </div>
              <div className="rounded-[1rem] bg-white/80 p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Dernier lot</p>
                <p className="mt-2 text-[1.5rem] font-bold tracking-[-0.04em] text-[var(--foreground)]">
                  {data.sync_summary.last_batch_size}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div id="modules" className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="card-neutral rounded-[1.5rem] p-[1.125rem] shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-full bg-white/72 text-[var(--primary)]">
                  <Layers3 className="size-4.5" />
                </span>
                <p className="m3-label">Client scope</p>
              </div>
              <p className="mt-2.5 text-[13px] leading-6 text-[var(--muted)]">
                Vue par profil pour suivre quels vouchers recus depuis Mikhmo AI sont les plus charges et les plus consommes.
              </p>
            </div>
            <DataTable
              rows={data.inventory.profiles}
              emptyMessage="Aucun profil voucher detecte."
              tone="manager"
              columns={[
                { key: 'profile', header: 'Profil' },
                { key: 'total', header: 'Total' },
                { key: 'available', header: 'Disponibles' },
                {
                  key: 'used',
                  header: 'Utilises',
                  render: (row) => (
                    <span>{row.used}</span>
                  ),
                },
              ]}
            />
          </div>

          <div id="recommendation" className="card-public rounded-[1.5rem] p-[1.125rem] shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-full bg-white/72 text-[var(--primary)]">
                <ShieldCheck className="size-4.5" />
              </span>
              <p className="m3-label">Recommendation</p>
            </div>
            <h3 className="mt-2.5 text-[1.7rem] font-bold tracking-[-0.04em] text-[var(--foreground)]">
              Derniers vouchers recus
            </h3>
            <div className="mt-4 space-y-3">
              {data.vouchers.slice(0, 4).map((voucher) => (
                <div key={voucher.id} className="rounded-[1rem] bg-white/80 p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[13px] font-semibold text-[var(--foreground)]">{voucher.profile}</p>
                    <StatusBadge tone={voucher.used ? 'warning' : 'success'}>
                      {voucher.used ? 'Utilise' : 'Disponible'}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 text-[13px] text-[var(--muted)]">
                    {voucher.code} • {voucher.price.toLocaleString('fr-FR')} FCFA
                  </p>
                  <p className="mt-1 text-[12px] text-[var(--muted)]">
                    {voucher.created_at ? new Date(voucher.created_at).toLocaleString('fr-FR') : 'Date inconnue'}
                  </p>
                </div>
              ))}
              {!data.vouchers.length ? (
                <p className="text-[13px] leading-6 text-[var(--muted)]">
                  Aucun voucher synchronise pour le moment.
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="card-neutral rounded-[1.5rem] p-[1.125rem] shadow-[var(--shadow-card)]">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="m3-label">Voucher inventory</p>
                  <p className="mt-2 text-[13px] leading-6 text-[var(--muted)]">
                    Recherche rapide et filtre par profil sur les vouchers recus depuis Mikhmo AI.
                  </p>
                </div>
                <div className="flex flex-col gap-2 md:flex-row">
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Rechercher un code"
                    className="rounded-[1rem] border border-[var(--line)] bg-white px-4 py-3 text-[13px] outline-none"
                  />
                  <select
                    value={profileFilter}
                    onChange={(event) => setProfileFilter(event.target.value)}
                    className="rounded-[1rem] border border-[var(--line)] bg-white px-4 py-3 text-[13px] outline-none"
                  >
                    {profileOptions.map((option) => (
                      <option key={option} value={option}>
                        {option === 'all' ? 'Tous les profils' : option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <DataTable
              rows={filteredVouchers}
              emptyMessage="Aucun voucher pour ce filtre."
              tone="manager"
              columns={[
                { key: 'code', header: 'Code' },
                { key: 'profile', header: 'Profil' },
                {
                  key: 'price',
                  header: 'Prix',
                  render: (row) => `${row.price.toLocaleString('fr-FR')} FCFA`,
                },
                {
                  key: 'duration_minutes',
                  header: 'Duree',
                  render: (row) => `${row.duration_minutes || 0} min`,
                },
                {
                  key: 'site_id',
                  header: 'Site',
                  render: (row) => row.site_id || 'Defaut',
                },
                {
                  key: 'used',
                  header: 'Etat',
                  render: (row) => (
                    <StatusBadge tone={row.used ? 'warning' : 'success'}>
                      {row.used ? 'Utilise' : 'Disponible'}
                    </StatusBadge>
                  ),
                },
                {
                  key: 'created_at',
                  header: 'Charge le',
                  render: (row) =>
                    row.created_at ? new Date(row.created_at).toLocaleString('fr-FR') : '—',
                },
              ]}
            />
          </div>
          <div className="space-y-4">
            <div className="card-public rounded-[1.5rem] p-[1.125rem] shadow-[var(--shadow-card)]">
              <p className="m3-label text-[var(--primary)]">Sync history</p>
              <p className="mt-2 text-[13px] leading-6 text-[var(--muted)]">
                Historique des derniers stocks recus depuis Mikhmo AI vers le backend.
              </p>
            </div>
            <DataTable
              rows={data.sync_jobs}
              emptyMessage="Aucune synchronisation recente."
              tone="public"
              columns={[
                {
                  key: 'created_at',
                  header: 'Date',
                  render: (row) =>
                    row.created_at ? new Date(row.created_at).toLocaleString('fr-FR') : '—',
                },
                {
                  key: 'source',
                  header: 'Source',
                },
                {
                  key: 'batch_size',
                  header: 'Lot',
                  render: (row) => `${row.batch_size} vouchers`,
                },
                {
                  key: 'inserted',
                  header: 'Importes',
                },
                {
                  key: 'status',
                  header: 'Etat',
                  render: (row) => (
                    <StatusBadge tone={row.status === 'COMPLETED' ? 'success' : 'warning'}>
                      {row.status}
                    </StatusBadge>
                  ),
                },
              ]}
            />
          </div>
        </div>
            </>
          );
        })()}
          </>
        ) : null}
      </section>
    </AppShell>
  );
}

export { ClientShell as ManagerShell };
