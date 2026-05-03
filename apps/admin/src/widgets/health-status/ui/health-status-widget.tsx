'use client';

import { RefreshCw, Server, ShieldCheck } from 'lucide-react';
import { useHealthQuery } from '@/entities/health/hooks';
import { StatusPill } from '@/shared/ui/status-pill';

export function HealthStatusWidget() {
  const healthQuery = useHealthQuery();
  const health = healthQuery.data;

  return (
    <section className="rounded-md border border-border bg-panel">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Server size={18} aria-hidden="true" />
          <h2 className="text-sm font-semibold">API health</h2>
        </div>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted hover:bg-slate-50 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => void healthQuery.refetch()}
          disabled={healthQuery.isFetching}
          aria-label="Refresh API health"
          title="Refresh API health"
        >
          <RefreshCw size={15} aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-3">
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
        <div className="border-t border-border px-4 py-3 text-sm text-danger">
          API health check failed. Confirm the API is running and NEXT_PUBLIC_API_URL points to the
          API base path.
        </div>
      ) : null}

      {health ? (
        <div className="border-t border-border px-4 py-3 text-xs text-muted">
          Last checked {new Date(health.timestamp).toLocaleString()}
        </div>
      ) : null}
    </section>
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
    <div className="rounded-md border border-border bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase text-muted">{label}</p>
        <ShieldCheck size={16} className="text-muted" aria-hidden="true" />
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-lg font-semibold">{loading ? 'Checking' : value}</p>
        <StatusPill
          label={status === 'ok' ? 'OK' : 'Check'}
          tone={status === 'ok' ? 'success' : 'warning'}
        />
      </div>
    </div>
  );
}
