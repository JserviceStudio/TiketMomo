import Link from 'next/link';
import { BrandMark } from '@/components/ui/brand-mark';
import type { ShellContext } from '@/components/ui/app-shell';

export function Topbar({ context }: { context: ShellContext }) {
  return (
    <header className="m3-floating relative z-10 flex items-center justify-between rounded-[1.5rem] px-4 py-3.5 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-4">
        <BrandMark compact className="md:hidden" />
        <div className="hidden md:block">
          <p className="m3-label">
            {context.area}
          </p>
          <p className="mt-1 text-[13px] text-[var(--muted)]">
            {context.description}
          </p>
        </div>
      </div>
      <div className="pointer-events-auto flex items-center gap-3">
        <Link
          href="/"
          className="m3-outline-button rounded-full px-4 py-2 text-[13px] font-semibold"
        >
          Retour acces
        </Link>
        <Link
          href={context.navItems[0]?.href ?? '/'}
          className="m3-filled-button rounded-full px-4 py-2 text-[13px] font-semibold"
        >
          Ouvrir espace
        </Link>
      </div>
    </header>
  );
}
