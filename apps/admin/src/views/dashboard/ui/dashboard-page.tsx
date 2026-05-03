import { HealthStatusWidget } from '@/widgets/health-status/ui/health-status-widget';
import { Activity, Database, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';

export function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Operations dashboard</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Monitor backend readiness before building operational workflows.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <DashboardMetric icon={Activity} label="Workspace" value="Admin console" />
        <DashboardMetric icon={ShieldCheck} label="Access model" value="Group policies" />
        <DashboardMetric icon={Database} label="Source of truth" value="PostgreSQL" />
      </div>
      <HealthStatusWidget />
    </div>
  );
}

function DashboardMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div className="text-xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
