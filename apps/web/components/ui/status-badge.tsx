import { cn } from '@/lib/cn';

const toneMap = {
  success:
    'border-transparent bg-[color:var(--m3-secondary-container)] text-[color:var(--m3-on-secondary-container)]',
  warning:
    'border-transparent bg-[color:var(--m3-tertiary-container)] text-[color:var(--m3-on-tertiary-container)]',
  danger:
    'border-transparent bg-[color:var(--m3-error-container)] text-[color:var(--m3-on-error-container)]',
  neutral:
    'border-[color:var(--m3-outline-variant)] bg-[color:var(--m3-surface-container-low)] text-[color:var(--m3-on-surface-variant)]',
  info:
    'border-transparent bg-[color:var(--m3-primary-container)] text-[color:var(--m3-on-primary-container)]',
} as const;

export function StatusBadge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: keyof typeof toneMap;
}) {
  return (
    <span
      className={cn(
        'inline-flex min-h-8 items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]',
        toneMap[tone],
      )}
    >
      {children}
    </span>
  );
}
