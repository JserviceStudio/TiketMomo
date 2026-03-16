import Link from 'next/link';
import { ArrowRight, Building2, Shield, Users } from 'lucide-react';

const spaces = [
  {
    href: '/client',
    name: 'Client',
    description: 'Stock vouchers, boutique web, abonnement et parametrage du compte.',
    cardClass: 'card-manager',
    Icon: Building2,
  },
  {
    href: '/reseller',
    name: 'Reseller',
    description: 'Commissions, retraits, codes promo et suivi des performances commerciales.',
    cardClass: 'card-partner',
    Icon: Users,
  },
  {
    href: '/admin',
    name: 'Admin',
    description: 'Control plane, audits, operations critiques et supervision.',
    cardClass: 'card-admin',
    Icon: Shield,
  },
];

export function SpacePicker() {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {spaces.map((space) => (
        <Link
          key={space.href}
          href={space.href}
          className={`${space.cardClass} group rounded-[1.75rem] p-6 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5`}
        >
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--muted)]">
            Workspace
          </p>
          <div className="mt-4 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-white/72 text-[var(--primary)]">
              <space.Icon className="size-5" />
            </span>
            <h2 className="display-font text-3xl font-bold tracking-[-0.05em] text-[var(--foreground)]">
              {space.name}
            </h2>
          </div>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">{space.description}</p>
          <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)]">
            Ouvrir
            <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
          </div>
        </Link>
      ))}
    </section>
  );
}
