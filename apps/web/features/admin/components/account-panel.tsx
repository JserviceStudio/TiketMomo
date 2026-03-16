'use client';

import { useEffect, useState } from 'react';
import { CircleUserRound, Store, UserCog } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  createAdminClient,
  createAdminReseller,
  fetchAdminWorkspaceAccounts,
  updateAdminClientStatus,
} from '@/lib/api/admin';
import type { AdminAccountClient, AdminWorkspaceAccounts } from '@/lib/api/types';

const initialClientForm = {
  email: '',
  displayName: '',
  licenseKey: '',
};

const initialResellerForm = {
  name: '',
  email: '',
  password: '',
  phone: '',
  promoCode: '',
  commissionRate: '10',
};

export function AccountPanel() {
  const [accounts, setAccounts] = useState<AdminWorkspaceAccounts>({ clients: [], resellers: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [clientForm, setClientForm] = useState(initialClientForm);
  const [resellerForm, setResellerForm] = useState(initialResellerForm);
  const [submitting, setSubmitting] = useState<'client' | 'reseller' | null>(null);
  const [updatingClientId, setUpdatingClientId] = useState<string | null>(null);

  async function loadAccounts() {
    try {
      setLoading(true);
      const payload = await fetchAdminWorkspaceAccounts();
      setAccounts(payload);
      setError(null);
    } catch (reason) {
      const err = reason as Error;
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAccounts();
  }, []);

  async function handleClientSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting('client');
    setMessage(null);

    try {
      const created = await createAdminClient(clientForm);
      setAccounts((current) => ({
        ...current,
        clients: [created, ...current.clients].slice(0, 20),
      }));
      setClientForm(initialClientForm);
      setError(null);
      setMessage(`Client ${created.email} cree.`);
    } catch (reason) {
      const err = reason as Error;
      setError(err.message);
    } finally {
      setSubmitting(null);
    }
  }

  async function handleResellerSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting('reseller');
    setMessage(null);

    try {
      const created = await createAdminReseller({
        ...resellerForm,
        commissionRate: Number(resellerForm.commissionRate || 10),
      });
      setAccounts((current) => ({
        ...current,
        resellers: [created, ...current.resellers].slice(0, 20),
      }));
      setResellerForm(initialResellerForm);
      setError(null);
      setMessage(`Reseller ${created.email} cree.`);
    } catch (reason) {
      const err = reason as Error;
      setError(err.message);
    } finally {
      setSubmitting(null);
    }
  }

  async function toggleClientStatus(client: AdminAccountClient) {
    const nextStatus = client.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setUpdatingClientId(client.id);
    setMessage(null);

    try {
      await updateAdminClientStatus(client.id, nextStatus);
      setAccounts((current) => ({
        ...current,
        clients: current.clients.map((entry) =>
          entry.id === client.id ? { ...entry, status: nextStatus } : entry,
        ),
      }));
      setError(null);
      setMessage(`Client ${client.email} passe a ${nextStatus}.`);
    } catch (reason) {
      const err = reason as Error;
      setError(err.message);
    } finally {
      setUpdatingClientId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="card-manager rounded-[1.5rem] p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-white/72 text-[var(--primary)]">
              <UserCog className="size-4.5" />
            </span>
            <p className="m3-label">Admin account factory</p>
          </div>
          <h3 className="mt-2.5 text-[1.9rem] font-bold tracking-[-0.04em] text-[var(--foreground)]">
            Creation et pilotage des acces
          </h3>
          <p className="mt-2 text-[13px] leading-6 text-[var(--muted)]">
            L’admin central peut maintenant creer des comptes client et reseller, puis suspendre
            ou reactiver les clients sans quitter le dashboard.
          </p>
          {message ? (
            <div className="mt-4 rounded-[1rem] bg-white/78 px-4 py-3 text-[13px] text-[var(--foreground)]">
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="mt-4 rounded-[1rem] bg-[color:var(--m3-error-container)] px-4 py-3 text-[13px] text-[color:var(--m3-on-error-container)]">
              {error}
            </div>
          ) : null}
        </div>
        <div className="card-neutral rounded-[1.5rem] p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-white/72 text-[var(--primary)]">
              <CircleUserRound className="size-4.5" />
            </span>
            <p className="m3-label">Access snapshot</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1rem] bg-white/80 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
                Clients
              </p>
              <p className="mt-2 text-[1.85rem] font-bold tracking-[-0.04em] text-[var(--foreground)]">
                {accounts.clients.length}
              </p>
              <p className="mt-1 text-[13px] text-[var(--muted)]">
                Comptes recents charges pour action rapide.
              </p>
            </div>
            <div className="rounded-[1rem] bg-white/80 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
                Resellers
              </p>
              <p className="mt-2 text-[1.85rem] font-bold tracking-[-0.04em] text-[var(--foreground)]">
                {accounts.resellers.length}
              </p>
              <p className="mt-1 text-[13px] text-[var(--muted)]">
                Revendeurs disponibles dans la console centrale.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="card-neutral rounded-[1.5rem] p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-white/72 text-[var(--primary)]">
              <UserCog className="size-4.5" />
            </span>
            <p className="m3-label">Create client</p>
          </div>
          <form className="mt-4 grid gap-3" onSubmit={handleClientSubmit}>
            <input
              className="rounded-[1rem] border border-[var(--line)] bg-white px-4 py-3 text-[13px] outline-none"
              placeholder="Email client"
              value={clientForm.email}
              onChange={(event) =>
                setClientForm((current) => ({ ...current, email: event.target.value }))
              }
              required
            />
            <input
              className="rounded-[1rem] border border-[var(--line)] bg-white px-4 py-3 text-[13px] outline-none"
              placeholder="Nom affiche (optionnel)"
              value={clientForm.displayName}
              onChange={(event) =>
                setClientForm((current) => ({ ...current, displayName: event.target.value }))
              }
            />
            <input
              className="rounded-[1rem] border border-[var(--line)] bg-white px-4 py-3 text-[13px] outline-none"
              placeholder="Cle licence (optionnel)"
              value={clientForm.licenseKey}
              onChange={(event) =>
                setClientForm((current) => ({ ...current, licenseKey: event.target.value }))
              }
            />
            <button
              type="submit"
              disabled={submitting === 'client'}
              className="m3-filled-button rounded-full px-5 py-3 text-[13px] font-semibold disabled:opacity-60"
            >
              {submitting === 'client' ? 'Creation...' : 'Creer client'}
            </button>
          </form>
        </div>

        <div className="card-neutral rounded-[1.5rem] p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-white/72 text-[var(--primary)]">
              <Store className="size-4.5" />
            </span>
            <p className="m3-label">Create reseller</p>
          </div>
          <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleResellerSubmit}>
            <input
              className="rounded-[1rem] border border-[var(--line)] bg-white px-4 py-3 text-[13px] outline-none sm:col-span-2"
              placeholder="Nom / entreprise"
              value={resellerForm.name}
              onChange={(event) =>
                setResellerForm((current) => ({ ...current, name: event.target.value }))
              }
              required
            />
            <input
              className="rounded-[1rem] border border-[var(--line)] bg-white px-4 py-3 text-[13px] outline-none"
              placeholder="Email"
              value={resellerForm.email}
              onChange={(event) =>
                setResellerForm((current) => ({ ...current, email: event.target.value }))
              }
              required
            />
            <input
              className="rounded-[1rem] border border-[var(--line)] bg-white px-4 py-3 text-[13px] outline-none"
              placeholder="Telephone"
              value={resellerForm.phone}
              onChange={(event) =>
                setResellerForm((current) => ({ ...current, phone: event.target.value }))
              }
              required
            />
            <input
              className="rounded-[1rem] border border-[var(--line)] bg-white px-4 py-3 text-[13px] outline-none"
              placeholder="Mot de passe"
              type="password"
              value={resellerForm.password}
              onChange={(event) =>
                setResellerForm((current) => ({ ...current, password: event.target.value }))
              }
              required
            />
            <input
              className="rounded-[1rem] border border-[var(--line)] bg-white px-4 py-3 text-[13px] outline-none"
              placeholder="Code promo"
              value={resellerForm.promoCode}
              onChange={(event) =>
                setResellerForm((current) => ({ ...current, promoCode: event.target.value }))
              }
            />
            <input
              className="rounded-[1rem] border border-[var(--line)] bg-white px-4 py-3 text-[13px] outline-none"
              placeholder="Commission %"
              type="number"
              min="0"
              step="0.01"
              value={resellerForm.commissionRate}
              onChange={(event) =>
                setResellerForm((current) => ({ ...current, commissionRate: event.target.value }))
              }
            />
            <button
              type="submit"
              disabled={submitting === 'reseller'}
              className="m3-filled-button rounded-full px-5 py-3 text-[13px] font-semibold disabled:opacity-60 sm:col-span-2"
            >
              {submitting === 'reseller' ? 'Creation...' : 'Creer reseller'}
            </button>
          </form>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          <div className="card-manager rounded-[1.5rem] p-[1.125rem] shadow-[var(--shadow-card)]">
            <p className="m3-label">Clients recents</p>
            <p className="mt-2 text-[13px] leading-6 text-[var(--muted)]">
              Activation immediate, suspension rapide et verification du statut.
            </p>
          </div>
          <DataTable
            rows={accounts.clients}
            emptyMessage={loading ? 'Chargement...' : 'Aucun client recent.'}
            tone="manager"
            columns={[
              {
                key: 'display_name',
                header: 'Client',
                render: (row) => (
                  <div>
                    <p className="text-[13px] font-semibold">{row.display_name ?? row.email}</p>
                    <p className="text-[11px] text-[var(--muted)]">{row.email}</p>
                  </div>
                ),
              },
              {
                key: 'license_type',
                header: 'Licence',
                render: (row) => row.license_type ?? 'FREE',
              },
              {
                key: 'status',
                header: 'Statut',
                render: (row) => (
                  <StatusBadge tone={row.status === 'ACTIVE' ? 'success' : 'warning'}>
                    {row.status ?? 'ACTIVE'}
                  </StatusBadge>
                ),
              },
              {
                key: 'action',
                header: 'Action',
                render: (row) => (
                  <button
                    type="button"
                    disabled={updatingClientId === row.id}
                    onClick={() => toggleClientStatus(row)}
                    className="m3-outline-button rounded-full px-3 py-2 text-[11px] font-semibold disabled:opacity-60"
                  >
                    {updatingClientId === row.id
                      ? 'Mise a jour...'
                      : row.status === 'ACTIVE'
                        ? 'Suspendre'
                        : 'Reactiver'}
                  </button>
                ),
              },
            ]}
          />
        </div>

        <div className="space-y-4">
          <div className="card-partner rounded-[1.5rem] p-[1.125rem] shadow-[var(--shadow-card)]">
            <p className="m3-label">Resellers recents</p>
            <p className="mt-2 text-[13px] leading-6 text-[var(--muted)]">
              Vue centrale des revendeurs, codes promo et commissions configurees.
            </p>
          </div>
          <DataTable
            rows={accounts.resellers}
            emptyMessage={loading ? 'Chargement...' : 'Aucun reseller recent.'}
            tone="partner"
            columns={[
              {
                key: 'name',
                header: 'Reseller',
                render: (row) => (
                  <div>
                    <p className="text-[13px] font-semibold">{row.name}</p>
                    <p className="text-[11px] text-[var(--muted)]">{row.email}</p>
                  </div>
                ),
              },
              {
                key: 'promo_code',
                header: 'Code',
              },
              {
                key: 'commission_rate',
                header: 'Commission',
                render: (row) => `${Number(row.commission_rate ?? 0)}%`,
              },
              {
                key: 'balance',
                header: 'Balance',
                render: (row) => `${Number(row.balance ?? 0).toLocaleString('fr-FR')} FCFA`,
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
