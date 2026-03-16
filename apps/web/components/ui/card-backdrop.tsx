import { cn } from '@/lib/cn';

type CardBackdropProps = {
  tone: 'neutral' | 'public' | 'admin' | 'partner' | 'manager';
  className?: string;
};

const toneStyles = {
  neutral: 'text-slate-300/55',
  public: 'text-orange-300/65',
  admin: 'text-blue-300/65',
  partner: 'text-emerald-300/65',
  manager: 'text-violet-300/65',
} as const;

export function CardBackdrop({ tone, className }: CardBackdropProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]', className)}
    >
      <svg
        viewBox="0 0 320 220"
        className={cn('absolute -right-10 -top-4 h-[120%] w-[78%]', toneStyles[tone])}
        fill="none"
      >
        <circle cx="212" cy="64" r="84" fill="currentColor" opacity="0.18" />
        <circle cx="258" cy="152" r="56" fill="currentColor" opacity="0.15" />
        <path
          d="M118 30C165 30 204 69 204 116C204 163 165 202 118 202"
          stroke="currentColor"
          strokeWidth="14"
          strokeLinecap="round"
          opacity="0.42"
        />
        <path
          d="M138 56H248"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          opacity="0.3"
        />
        <path
          d="M170 100H282"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          opacity="0.24"
        />
        <path
          d="M156 144H250"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          opacity="0.22"
        />
      </svg>
    </div>
  );
}
