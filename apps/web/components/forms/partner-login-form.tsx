'use client';

import { useState, useTransition } from 'react';
import { StatusBadge } from '@/components/ui/status-badge';
import { loginReseller } from '@/lib/api/reseller';

export function PartnerLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        await loginReseller(email, password);
        window.location.href = '/reseller';
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Connexion reseller impossible.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="m3-glass mx-auto w-full max-w-lg rounded-[2rem] p-6 md:p-8">
      <p className="m3-label text-[var(--primary)]">Reseller access</p>
      <h1 className="mt-4 text-4xl font-bold tracking-[-0.05em] text-[var(--foreground)]">
        Connexion reseller
      </h1>
      <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
        Accede au suivi commissions, retraits et code promo depuis un espace commercial dedie.
      </p>

      <label className="mt-6 block text-sm font-semibold text-[var(--foreground)]" htmlFor="partner-email">
        Email
      </label>
      <input
        id="partner-email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="mt-2 w-full rounded-[1rem] border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-lowest)] px-4 py-3 text-[var(--foreground)]"
        autoComplete="email"
        required
      />

      <label className="mt-4 block text-sm font-semibold text-[var(--foreground)]" htmlFor="partner-password">
        Mot de passe
      </label>
      <input
        id="partner-password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="mt-2 w-full rounded-[1rem] border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-lowest)] px-4 py-3 text-[var(--foreground)]"
        autoComplete="current-password"
        required
      />

      {error ? (
        <div className="mt-4">
          <StatusBadge tone="danger">{error}</StatusBadge>
        </div>
      ) : null}

      <button
        type="submit"
        className="m3-filled-button mt-6 w-full rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-60"
        disabled={isPending}
      >
        {isPending ? 'Connexion...' : 'Ouvrir l’espace reseller'}
      </button>
    </form>
  );
}
