'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChartColumn, Compass, HandCoins, LayoutDashboard, Shield, Store, Ticket, Users } from 'lucide-react';
import { BrandMark } from '@/components/ui/brand-mark';
import { cn } from '@/lib/cn';
import type { ShellContext } from '@/components/ui/app-shell';

export type ShellNavItem = {
  href: string;
  label: string;
  icon: 'dashboard' | 'monitoring' | 'accounts' | 'compass' | 'ticket' | 'shield' | 'sales' | 'store';
};

const iconMap = {
  dashboard: LayoutDashboard,
  monitoring: ChartColumn,
  accounts: Users,
  compass: Compass,
  ticket: Ticket,
  shield: Shield,
  sales: HandCoins,
  store: Store,
} as const;

export function Sidebar({ context }: { context: ShellContext }) {
  const pathname = usePathname();

  return (
    <aside className="m3-floating hidden px-4 py-5 text-[var(--foreground)] lg:flex lg:flex-col">
      <div className="m3-glass rounded-[1.5rem] p-[1.125rem]">
        <BrandMark />
        <h1 className="mt-4 text-[1.4rem] font-bold tracking-[-0.05em]">
          {context.title}
        </h1>
        <p className="mt-2.5 text-[13px] leading-6 text-[var(--muted)]">
          {context.description}
        </p>
      </div>

      <nav className="mt-6 flex flex-col gap-1.5" aria-label="Navigation principale">
        {context.navItems.map((item) => {
          const Icon = iconMap[item.icon];
          const active = pathname === item.href || (item.href.includes('#') && item.href.startsWith(pathname));
          return (
            <Link
              key={item.href}
              href={item.href}
              data-active={active}
              className={cn(
                'm3-nav-item flex items-center gap-3 px-3.5 py-2.5 text-[13px] font-semibold transition',
                active
                  ? 'text-[var(--m3-on-secondary-container)]'
                  : 'text-[var(--muted)] hover:bg-white/40 hover:text-[var(--foreground)]',
              )}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="m3-glass mt-auto rounded-[1.5rem] p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[var(--m3-tertiary-container)] p-2.5 text-[var(--m3-on-tertiary-container)]">
            <ChartColumn className="size-[18px]" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[var(--foreground)]">{context.area}</p>
            <p className="text-xs text-[var(--muted)]">Navigation dediee a cet espace uniquement.</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
