import { StatusBadge } from '@/components/ui/status-badge';

export function SectionHeader({
  kicker,
  title,
  description,
  badge,
}: {
  kicker: string;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <div className="flex flex-col gap-2.5 md:flex-row md:items-end md:justify-between">
      <div className="max-w-[44rem]">
        <p className="m3-label">
          {kicker}
        </p>
        <h2 className="mt-2.5 text-[1.9rem] font-bold tracking-[-0.045em] text-[var(--foreground)] md:text-[2.35rem]">
          {title}
        </h2>
        <p className="mt-2.5 max-w-3xl text-sm leading-6 text-[var(--muted)] md:text-[15px]">
          {description}
        </p>
      </div>
      {badge ? <StatusBadge tone="info">{badge}</StatusBadge> : null}
    </div>
  );
}
