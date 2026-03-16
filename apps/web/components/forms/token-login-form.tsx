'use client';

import { useState, useTransition } from 'react';
import { loginAdmin } from '@/lib/api/admin';
import { StatusBadge } from '@/components/ui/status-badge';

export function TokenLoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        await loginAdmin(username, password);
        window.location.href = '/admin';
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : "Les identifiants n'ont pas pu etre valides.";
        setError(message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="m3-glass mx-auto w-full max-w-lg rounded-[2rem] p-6 md:p-8">
      <p className="m3-label text-[var(--primary)]">
        Secure access
      </p>
      <h1 className="mt-4 text-4xl font-bold tracking-[-0.05em] text-[var(--foreground)]">
        Connexion admin
      </h1>
      <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
        Connecte-toi avec ton identifiant admin et ton mot de passe. Le backend pose ensuite une session securisee pour les appels API.
      </p>

      <label className="mt-6 block text-sm font-semibold text-[var(--foreground)]" htmlFor="admin-username">
        Identifiant admin
      </label>
      <input
        id="admin-username"
        type="text"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        className="mt-2 w-full rounded-[1rem] border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-lowest)] px-4 py-3 text-[var(--foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
        autoComplete="username"
        required
      />

      <label className="mt-4 block text-sm font-semibold text-[var(--foreground)]" htmlFor="admin-password">
        Mot de passe
      </label>
      <input
        id="admin-password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="mt-2 w-full rounded-[1rem] border border-[var(--m3-outline-variant)] bg-[var(--m3-surface-container-lowest)] px-4 py-3 text-[var(--foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
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
        {isPending ? 'Connexion...' : 'Ouvrir le panel'}
      </button>
    </form>
  );
}
