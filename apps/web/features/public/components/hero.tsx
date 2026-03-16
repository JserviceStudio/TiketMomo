import Link from 'next/link';
import { LayoutGrid } from 'lucide-react';
import { BrandHeroMark } from '@/components/ui/brand-mark';

export function Hero() {
  return (
    <section className="card-public rounded-[1.75rem] px-6 py-7 shadow-[var(--shadow-card)] md:px-8 md:py-9">
      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
        <div>
          <BrandHeroMark />
          <p className="m3-label mt-5 text-[var(--primary)]">
            Plateforme unifiee
          </p>
          <h1 className="mt-3 max-w-4xl text-[2.8rem] font-bold tracking-[-0.065em] text-[var(--foreground)] md:text-[4.8rem]">
            Une plateforme web unique pour piloter tickets, licences et revenus.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[var(--muted)] md:text-[17px]">
            TiketMomo passe vers une surface web moderne en Next.js. Le backend metier reste stable,
            l&apos;experience utilisateur devient plus claire, plus rapide et plus accessible.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/admin"
              className="m3-filled-button rounded-full px-5 py-3 text-[13px] font-semibold"
            >
              Ouvrir le control plane
            </Link>
            <Link
              href="/auth"
              className="m3-tonal-button rounded-full px-5 py-3 text-[13px] font-semibold"
            >
              Choisir un espace
            </Link>
          </div>
        </div>
        <div className="rounded-[1.5rem] bg-white/88 p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-white/72 text-[var(--primary)]">
              <LayoutGrid className="size-4.5" />
            </span>
            <p className="m3-label">Plateforme</p>
          </div>
          <p className="mt-2.5 text-[1.8rem] font-bold tracking-[-0.045em] text-[var(--foreground)]">
            Admin, Client, Reseller
          </p>
          <p className="mt-2.5 text-[13px] leading-6 text-[var(--muted)]">
            Une seule app Next.js, un backend Express stable, et une migration progressive des
            interfaces metier sans rupture.
          </p>
        </div>
      </div>
    </section>
  );
}
