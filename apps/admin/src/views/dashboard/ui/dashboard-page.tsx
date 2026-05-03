import { HealthStatusWidget } from '@/widgets/health-status/ui/health-status-widget';

export function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Operations dashboard</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Monitor backend readiness before building operational workflows.
        </p>
      </div>
      <HealthStatusWidget />
    </div>
  );
}
