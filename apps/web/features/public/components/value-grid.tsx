import { BadgeCheck, Layers3, RefreshCcw } from 'lucide-react';

const values = [
  {
    title: 'Une base UX commune',
    copy: 'Design system partage entre admin, clients et resellers pour supprimer les interfaces disjointes.',
    cardClass: 'card-neutral',
    Icon: Layers3,
  },
  {
    title: 'Migration sans rupture',
    copy: 'Le backend Express existant reste actif pendant la transition, ce qui limite le risque produit.',
    cardClass: 'card-public',
    Icon: RefreshCcw,
  },
  {
    title: 'Lisibilite operationnelle',
    copy: 'Typographie, contraste, tables et parcours sont redessines pour de vraies situations d’exploitation.',
    cardClass: 'card-admin',
    Icon: BadgeCheck,
  },
];

export function ValueGrid() {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {values.map((value) => (
        <article
          key={value.title}
          className={`${value.cardClass} rounded-[1.75rem] p-6 shadow-[var(--shadow-card)]`}
        >
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-white/72 text-[var(--primary)]">
              <value.Icon className="size-5" />
            </span>
          <h3 className="text-lg font-bold tracking-[-0.03em] text-[var(--foreground)]">{value.title}</h3>
          </div>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{value.copy}</p>
        </article>
      ))}
    </section>
  );
}
