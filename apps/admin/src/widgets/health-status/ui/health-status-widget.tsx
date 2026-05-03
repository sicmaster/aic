'use client';

import { RefreshCw, Server, ShieldCheck } from 'lucide-react';
import { useHealthQuery } from '@/entities/health/hooks';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { StatusPill } from '@/shared/ui/status-pill';

export function HealthStatusWidget() {
  const healthQuery = useHealthQuery();
  const health = healthQuery.data;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
            <Server size={18} aria-hidden="true" />
          </div>
          <div>
            <CardTitle>API health</CardTitle>
            <CardDescription>Dependency readiness for the admin workspace.</CardDescription>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => void healthQuery.refetch()}
          disabled={healthQuery.isFetching}
          aria-label="Refresh API health"
          title="Refresh API health"
        >
          <RefreshCw size={15} aria-hidden="true" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Metric
            label="Service"
            value={health?.service ?? 'aic-api'}
            status={health?.status ?? 'degraded'}
            loading={healthQuery.isLoading}
          />
          <Metric
            label="Database"
            value={health?.dependencies.database.status ?? 'unknown'}
            status={health?.dependencies.database.status === 'available' ? 'ok' : 'degraded'}
            loading={healthQuery.isLoading}
          />
          <Metric
            label="Redis"
            value={health?.dependencies.redis.status ?? 'unknown'}
            status={health?.dependencies.redis.status === 'unavailable' ? 'degraded' : 'ok'}
            loading={healthQuery.isLoading}
          />
        </div>

        {healthQuery.isError ? (
          <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            API health check failed. Confirm the API is running and NEXT_PUBLIC_API_URL points to
            the API base path.
          </div>
        ) : null}

        {health ? (
          <div className="text-xs text-muted">
            Last checked {new Date(health.timestamp).toLocaleString()}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  status,
  loading,
}: {
  label: string;
  value: string;
  status: 'ok' | 'degraded';
  loading: boolean;
}) {
  return (
    <div className="rounded-lg border bg-background p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase text-muted">{label}</p>
        <ShieldCheck size={16} className="text-muted" aria-hidden="true" />
      </div>
      <div className="flex items-center justify-between gap-3">
        {loading ? (
          <Skeleton className="h-7 w-28" />
        ) : (
          <p className="truncate text-lg font-semibold">{value}</p>
        )}
        <StatusPill
          label={status === 'ok' ? 'OK' : 'Check'}
          tone={status === 'ok' ? 'success' : 'warning'}
        />
      </div>
    </div>
  );
}
