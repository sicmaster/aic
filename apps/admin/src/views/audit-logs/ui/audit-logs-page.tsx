'use client';

import { History, Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useAuditLogsQuery } from '@/entities/audit/hooks';
import type { AuditLogItem } from '@/entities/audit/types';

const pageSize = 20;

export function AuditLogsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = readPositiveInteger(searchParams.get('page')) ?? 1;
  const search = searchParams.get('search') ?? '';
  const entityType = searchParams.get('entityType') ?? '';
  const action = searchParams.get('action') ?? '';
  const [searchInput, setSearchInput] = useState(search);
  const auditLogsQuery = useAuditLogsQuery(
    useMemo(
      () => ({
        page,
        pageSize,
        search: search || undefined,
        entityType: entityType || undefined,
        action: action || undefined,
      }),
      [action, entityType, page, search],
    ),
  );
  const pagination = auditLogsQuery.data?.pagination;

  const updateParams = (next: {
    action?: string;
    entityType?: string;
    page?: number;
    search?: string;
  }) => {
    const params = new URLSearchParams(searchParams.toString());

    if (next.page) {
      params.set('page', String(next.page));
    }

    if ('search' in next) {
      setOrDelete(params, 'search', next.search);
      params.set('page', '1');
    }

    if ('entityType' in next) {
      setOrDelete(params, 'entityType', next.entityType);
      params.set('page', '1');
    }

    if ('action' in next) {
      setOrDelete(params, 'action', next.action);
      params.set('page', '1');
    }

    router.replace(`?${params.toString()}`);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Audit logs</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Review important admin actions with actor, request, and target context.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          <History size={16} aria-hidden="true" />
          {pagination ? `${pagination.total} events` : 'Loading events'}
        </div>
      </div>

      <section className="rounded-md border border-border bg-panel shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
          <form
            className="relative flex-1"
            onSubmit={(event) => {
              event.preventDefault();
              updateParams({ search: searchInput });
            }}
          >
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search audit logs"
              className="h-10 w-full rounded-md border border-border bg-white pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </form>
          <input
            value={entityType}
            onChange={(event) => updateParams({ entityType: event.target.value })}
            placeholder="Entity type"
            className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
          <input
            value={action}
            onChange={(event) => updateParams({ action: event.target.value })}
            placeholder="Action"
            className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Request</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {auditLogsQuery.data?.items.map((item) => (
                <AuditLogRow key={item.id} item={item} />
              ))}
              {auditLogsQuery.isLoading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-muted" colSpan={5}>
                    Loading audit logs
                  </td>
                </tr>
              ) : null}
              {auditLogsQuery.data?.items.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-muted" colSpan={5}>
                    No audit logs found
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => updateParams({ page: page - 1 })}
            className="rounded-md border border-border px-3 py-1.5 text-muted transition hover:bg-slate-50 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-muted">
            Page {page} of {pagination?.pageCount || 1}
          </span>
          <button
            type="button"
            disabled={!pagination || page >= pagination.pageCount}
            onClick={() => updateParams({ page: page + 1 })}
            className="rounded-md border border-border px-3 py-1.5 text-muted transition hover:bg-slate-50 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
}

function AuditLogRow({ item }: { item: AuditLogItem }) {
  return (
    <tr>
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-ink">{item.action}</p>
          <p className="text-xs text-muted">{summarizeMetadata(item.metadata)}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        {item.actor ? (
          <div>
            <p className="font-medium text-ink">{item.actor.fullName}</p>
            <p className="text-xs text-muted">{item.actor.email}</p>
          </div>
        ) : (
          <span className="text-muted">System</span>
        )}
      </td>
      <td className="px-4 py-3 text-muted">
        {item.entityType}
        {item.entityId ? ` / ${item.entityId}` : ''}
      </td>
      <td className="px-4 py-3 text-muted">
        <div>
          <p>{item.requestId ?? 'No request id'}</p>
          <p className="text-xs">{item.ipAddress ?? 'No IP'}</p>
        </div>
      </td>
      <td className="px-4 py-3 text-muted">{new Date(item.createdAt).toLocaleString()}</td>
    </tr>
  );
}

function summarizeMetadata(metadata: unknown): string {
  if (!metadata || typeof metadata !== 'object') {
    return 'No metadata';
  }

  const record = metadata as Record<string, unknown>;

  if ('email' in record && typeof record.email === 'string') {
    return record.email;
  }

  if ('before' in record && 'after' in record) {
    return 'Before and after snapshot captured';
  }

  return 'Metadata captured';
}

function readPositiveInteger(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function setOrDelete(params: URLSearchParams, key: string, value: string | undefined) {
  const trimmedValue = value?.trim();

  if (trimmedValue) {
    params.set(key, trimmedValue);
    return;
  }

  params.delete(key);
}
