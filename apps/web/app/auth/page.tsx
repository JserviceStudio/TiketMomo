import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Shield, Store, UserRoundCog } from 'lucide-react';

const entries = [
  { href: '/auth/admin', title: 'Admin', description: 'Connexion au control plane et aux operations critiques.', icon: Shield },
  { href: '/auth/reseller', title: 'Reseller', description: 'Connexion au portail ventes, retraits et code promo.', icon: Store },
  { href: '/auth/client', title: 'Client', description: 'Connexion a l’espace boutique, vouchers et abonnement.', icon: UserRoundCog },
];

export default async function AuthHubPage() {
  const cookieStore = await cookies();

  if (cookieStore.get('admin_session')) {
    redirect('/admin');
  }

  if (cookieStore.get('client_session') || cookieStore.get('manager_session')) {
    redirect('/client');
  }

  if (cookieStore.get('partner_token')) {
    redirect('/reseller');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10 md:px-6">
      <section className="w-full space-y-6">
        <div className="max-w-3xl space-y-4">
          <p className="m3-label text-[var(--primary)]">Access hub</p>
          <h1 className="text-[2.7rem] font-bold tracking-[-0.06em] text-[var(--foreground)] md:text-[4rem]">
            Choisir un espace de travail
          </h1>
          <p className="max-w-2xl text-[15px] leading-7 text-[var(--muted)]">
            Chaque type de compte ouvre sa propre application. Pas de menu universel, pas
            d’interference entre les usages.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {entries.map((entry) => {
            const Icon = entry.icon;
            return (
              <Link
                key={entry.href}
                href={entry.href}
                className="surface rounded-[1.75rem] p-6 transition hover:-translate-y-0.5"
              >
                <span className="flex size-11 items-center justify-center rounded-2xl bg-white text-[var(--primary)] shadow-[var(--shadow-card)]">
                  <Icon className="size-5" />
                </span>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--muted)]">Workspace</p>
                <h2 className="display-font mt-4 text-3xl font-bold tracking-[-0.05em] text-[var(--foreground)]">
                  {entry.title}
                </h2>
                <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{entry.description}</p>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
