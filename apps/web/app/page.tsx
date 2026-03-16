import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Shield, Store, UserRoundCog } from 'lucide-react';

const entries = [
  {
    href: '/auth/admin',
    title: 'Admin',
    description: 'Gérant central. Crée les comptes, pilote le SaaS, suit le monitoring et les outils critiques.',
    icon: Shield,
  },
  {
    href: '/auth/client',
    title: 'Client',
    description: 'Espace boutique, vouchers, abonnement actif et renouvellement.',
    icon: UserRoundCog,
  },
  {
    href: '/auth/reseller',
    title: 'Reseller',
    description: 'Portail commercial pour commissions, code promo et retraits.',
    icon: Store,
  },
];

export default async function HomePage() {
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
      <section className="w-full space-y-8">
        <div className="max-w-3xl space-y-4">
          <p className="m3-label text-[var(--primary)]">Access intro</p>
          <h1 className="text-[2.7rem] font-bold tracking-[-0.06em] text-[var(--foreground)] md:text-[4.6rem]">
            Une entree unique, puis un espace dedie a chaque type de compte.
          </h1>
          <p className="max-w-2xl text-[15px] leading-7 text-[var(--muted)]">
            Cette page n’est pas un dashboard partage. C’est la porte d’entree. L’utilisateur
            choisit son type d’acces, puis il entre dans une application separee, avec sa propre
            navigation et sa propre logique metier.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {entries.map((entry) => {
            const Icon = entry.icon;
            return (
              <Link
                key={entry.href}
                href={entry.href}
                className="card-neutral rounded-[1.75rem] p-6 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5"
              >
                <span className="flex size-11 items-center justify-center rounded-2xl bg-white text-[var(--primary)] shadow-[var(--shadow-card)]">
                  <Icon className="size-5" />
                </span>
                <p className="m3-label mt-5">Workspace</p>
                <h2 className="mt-3 text-[2rem] font-bold tracking-[-0.05em] text-[var(--foreground)]">
                  {entry.title}
                </h2>
                <p className="mt-4 text-[14px] leading-7 text-[var(--muted)]">{entry.description}</p>
              </Link>
            );
          })}
        </div>
        <div className="pt-2">
          <Link
            href="/auth"
            className="m3-outline-button inline-flex rounded-full px-5 py-3 text-[13px] font-semibold"
          >
            Voir tous les acces
          </Link>
        </div>
      </section>
    </main>
  );
}
