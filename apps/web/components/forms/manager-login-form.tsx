'use client';

import { useState, useTransition } from 'react';
import { StatusBadge } from '@/components/ui/status-badge';
import { loginClient } from '@/lib/api/clients';

export function ClientLoginForm() {
  const [email, setEmail] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        await loginClient(email, apiKey);
        window.location.href = '/client';
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Connexion client impossible.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="m3-glass mx-auto w-full max-w-lg rounded-[2rem] p-6 md:p-8">
      <p className="m3-label text-[var(--primary)]">Client access</p>
      <h1 className="mt-4 text-4xl font-bold tracking-[-0.05em] text-[var(--foreground)]">
        Connexion client
      </h1>
      <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
        Ouvre l’espace client avec l’email du compte et l’API key generee lors de l’onboarding.
      </p>

      <label className="mt-6 block text-sm font-semibold text-[var(--foreground)]" htmlFor="manager-email">
        Email client
      </label>
      <input
        id="manager-email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="mt-2 w-full rounded-[1rem] border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-lowest)] px-4 py-3 text-[var(--foreground)]"
        autoComplete="email"
        required
      />

      <label className="mt-4 block text-sm font-semibold text-[var(--foreground)]" htmlFor="manager-api-key">
        API key
      </label>
      <input
        id="manager-api-key"
        type="password"
        value={apiKey}
        onChange={(event) => setApiKey(event.target.value)}
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
        {isPending ? 'Connexion...' : 'Ouvrir l’espace client'}
      </button>
    </form>
  );
}

export { ClientLoginForm as ManagerLoginForm };
