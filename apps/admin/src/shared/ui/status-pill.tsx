import { clsx } from 'clsx';

type StatusTone = 'neutral' | 'success' | 'warning' | 'danger';

const toneClassName: Record<StatusTone, string> = {
  neutral: 'border-border bg-white text-muted',
  success: 'border-emerald-200 bg-emerald-50 text-success',
  warning: 'border-amber-200 bg-amber-50 text-warning',
  danger: 'border-red-200 bg-red-50 text-danger',
};

export function StatusPill({ label, tone }: { label: string; tone: StatusTone }) {
  return (
    <span
      className={clsx(
        'inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-medium',
        toneClassName[tone],
      )}
    >
      {label}
    </span>
  );
}
