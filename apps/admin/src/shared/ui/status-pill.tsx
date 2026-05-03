import { Badge } from './badge';

type StatusTone = 'neutral' | 'success' | 'warning' | 'danger';

const toneVariant: Record<StatusTone, 'muted' | 'success' | 'warning' | 'danger'> = {
  neutral: 'muted',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
};

export function StatusPill({ label, tone }: { label: string; tone: StatusTone }) {
  return <Badge variant={toneVariant[tone]}>{label}</Badge>;
}
