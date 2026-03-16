import { cn } from '@/lib/cn';

function BrandGlyph({ compact = false }: { compact?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      className={cn('size-11', compact && 'size-10')}
      fill="none"
    >
      <rect x="2" y="2" width="60" height="60" rx="18" fill="url(#jplus-services-gradient)" />
      <path
        d="M23 19H39V26H33V42C33 46.418 29.418 50 25 50H18V43H23C24.105 43 25 42.105 25 41V26H23V19Z"
        fill="white"
      />
      <path
        d="M42 23V29H48V35H42V41H36V35H30V29H36V23H42Z"
        fill="white"
      />
      <defs>
        <linearGradient id="jplus-services-gradient" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D96A12" />
          <stop offset="1" stopColor="#F1A247" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function BrandMark({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="rounded-[1.1rem] shadow-[var(--shadow-card)]">
        <BrandGlyph compact={compact} />
      </div>
      <div className="min-w-0">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[var(--muted)]">
          Business Platform
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-[1.02rem] font-black tracking-[-0.05em] text-[var(--foreground)]">
            J+SERVICES
          </span>
          {!compact ? (
            <span className="text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
              Pro Suite
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function BrandHeroMark() {
  return (
    <div className="flex items-center gap-4">
      <div className="rounded-[1.35rem] shadow-[var(--shadow-card)]">
        <BrandGlyph />
      </div>
      <div>
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.24em] text-[var(--primary)]">
          Business Platform
        </p>
        <p className="mt-1 text-[1.2rem] font-black tracking-[-0.05em] text-[var(--foreground)] md:text-[1.45rem]">
          J+SERVICES
        </p>
      </div>
    </div>
  );
}
