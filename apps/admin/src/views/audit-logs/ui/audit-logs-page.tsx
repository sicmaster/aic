'use client';

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  History,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useAuditLogsQuery } from '@/entities/audit/hooks';
import type { AuditLogItem } from '@/entities/audit/types';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

const pageSize = 20;
const auditLogColumns = [
  { key: 'actor', label: 'Actor' },
  { key: 'target', label: 'Target' },
  { key: 'request', label: 'Request' },
  { key: 'created', label: 'Created' },
] as const;

type AuditLogColumnKey = (typeof auditLogColumns)[number]['key'];
type VisibleAuditLogColumns = Record<AuditLogColumnKey, boolean>;

export function AuditLogsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = readPositiveInteger(searchParams.get('page')) ?? 1;
  const search = searchParams.get('search') ?? '';
  const entityType = searchParams.get('entityType') ?? '';
  const action = searchParams.get('action') ?? '';
  const [searchInput, setSearchInput] = useState(search);
  const [detailTarget, setDetailTarget] = useState<AuditLogItem | undefined>();
  const [visibleColumns, setVisibleColumns] = useState<VisibleAuditLogColumns>({
    actor: true,
    created: true,
    request: true,
    target: true,
  });
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
  const items = auditLogsQuery.data?.items ?? [];
  const tableColSpan = 2 + auditLogColumns.filter((column) => visibleColumns[column.key]).length;

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

  const handleToggleColumn = (columnKey: AuditLogColumnKey, checked: boolean) => {
    setVisibleColumns((current) => ({
      ...current,
      [columnKey]: checked,
    }));
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

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border bg-secondary/30 p-4 lg:flex-row lg:items-center">
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
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search audit logs"
              className="bg-background pl-9"
            />
          </form>
          <Input
            value={entityType}
            onChange={(event) => updateParams({ entityType: event.target.value })}
            placeholder="Entity type"
            className="bg-background lg:w-48"
          />
          <Input
            value={action}
            onChange={(event) => updateParams({ action: event.target.value })}
            placeholder="Action"
            className="bg-background lg:w-56"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" className="h-10">
                <SlidersHorizontal size={16} aria-hidden="true" />
                Customize Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {auditLogColumns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.key}
                  checked={visibleColumns[column.key]}
                  onCheckedChange={(checked) => handleToggleColumn(column.key, checked === true)}
                >
                  {column.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Table>
          <TableHeader className="bg-secondary/60">
            <TableRow>
              <TableHead>Event</TableHead>
              {visibleColumns.actor ? <TableHead>Actor</TableHead> : null}
              {visibleColumns.target ? <TableHead>Target</TableHead> : null}
              {visibleColumns.request ? <TableHead>Request</TableHead> : null}
              {visibleColumns.created ? <TableHead>Created</TableHead> : null}
              <TableHead className="w-12 text-right" aria-label="Actions" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <AuditLogRow
                key={item.id}
                item={item}
                visibleColumns={visibleColumns}
                onInspect={() => setDetailTarget(item)}
              />
            ))}
            {auditLogsQuery.isLoading ? (
              <TableRow>
                <TableCell className="py-8 text-center text-muted" colSpan={tableColSpan}>
                  Loading audit logs
                </TableCell>
              </TableRow>
            ) : null}
            {auditLogsQuery.data?.items.length === 0 ? (
              <TableRow>
                <TableCell className="py-8 text-center text-muted" colSpan={tableColSpan}>
                  No audit logs found
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>

        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted lg:flex-row lg:items-center lg:justify-between">
          <span>{pagination?.total ?? 0} row(s) total.</span>
          <div className="flex flex-wrap items-center gap-2 text-foreground">
            <span className="text-muted">Rows per page</span>
            <Select value={String(pageSize)} disabled>
              <SelectTrigger className="h-9 w-20 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={String(pageSize)}>{pageSize}</SelectItem>
              </SelectContent>
            </Select>
            <span className="min-w-24 text-center text-sm">
              Page {page} of {pagination?.pageCount || 1}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={page <= 1}
              onClick={() => updateParams({ page: 1 })}
              aria-label="First page"
            >
              <ChevronsLeft size={16} aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={page <= 1}
              onClick={() => updateParams({ page: page - 1 })}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={!pagination || page >= pagination.pageCount}
              onClick={() => updateParams({ page: page + 1 })}
              aria-label="Next page"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={!pagination || page >= pagination.pageCount}
              onClick={() => updateParams({ page: pagination?.pageCount ?? page })}
              aria-label="Last page"
            >
              <ChevronsRight size={16} aria-hidden="true" />
            </Button>
          </div>
        </div>
      </section>

      <AuditLogDetailsDialog
        item={detailTarget}
        open={Boolean(detailTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDetailTarget(undefined);
          }
        }}
      />
    </div>
  );
}

function AuditLogRow({
  item,
  onInspect,
  visibleColumns,
}: {
  item: AuditLogItem;
  onInspect: () => void;
  visibleColumns: VisibleAuditLogColumns;
}) {
  return (
    <TableRow>
      <TableCell>
        <div>
          <p className="font-medium text-foreground">{item.action}</p>
          <p className="text-xs text-muted">{summarizeMetadata(item.metadata)}</p>
        </div>
      </TableCell>
      {visibleColumns.actor ? (
        <TableCell>
          {item.actor ? (
            <div>
              <p className="font-medium text-foreground">{item.actor.fullName}</p>
              <p className="text-xs text-muted">{item.actor.email}</p>
            </div>
          ) : (
            <span className="text-muted">System</span>
          )}
        </TableCell>
      ) : null}
      {visibleColumns.target ? (
        <TableCell className="text-muted">
          {item.entityType}
          {item.entityId ? ` / ${item.entityId}` : ''}
        </TableCell>
      ) : null}
      {visibleColumns.request ? (
        <TableCell className="text-muted">
          <div>
            <p>{item.requestId ?? 'No request id'}</p>
            <p className="text-xs">{item.ipAddress ?? 'No IP'}</p>
          </div>
        </TableCell>
      ) : null}
      {visibleColumns.created ? (
        <TableCell className="text-muted">{new Date(item.createdAt).toLocaleString()}</TableCell>
      ) : null}
      <TableCell>
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted hover:text-foreground"
                aria-label={`Open actions for ${item.action}`}
              >
                <MoreHorizontal size={16} aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={onInspect}>
                <Eye size={15} aria-hidden="true" />
                Inspect event
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}

function AuditLogDetailsDialog({
  item,
  onOpenChange,
  open,
}: {
  item: AuditLogItem | undefined;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item?.action ?? 'Audit event'}</DialogTitle>
          <DialogDescription>
            {item ? new Date(item.createdAt).toLocaleString() : 'Event details'}
          </DialogDescription>
        </DialogHeader>
        {item ? (
          <div className="space-y-4">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <DetailItem label="Actor" value={item.actor?.fullName ?? 'System'} />
              <DetailItem label="Actor email" value={item.actor?.email ?? '-'} />
              <DetailItem label="Entity type" value={item.entityType} />
              <DetailItem label="Entity ID" value={item.entityId ?? '-'} />
              <DetailItem label="Request ID" value={item.requestId ?? '-'} />
              <DetailItem label="IP address" value={item.ipAddress ?? '-'} />
            </dl>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">User agent</p>
              <p className="break-words rounded-md border bg-secondary/40 p-3 text-sm text-muted">
                {item.userAgent ?? '-'}
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Metadata</p>
              <pre className="max-h-72 overflow-auto rounded-md border bg-secondary/40 p-3 text-xs leading-5 text-muted">
                {formatMetadata(item.metadata)}
              </pre>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-secondary/40 p-3">
      <dt className="text-xs font-medium uppercase text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm text-foreground">{value}</dd>
    </div>
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

function formatMetadata(metadata: unknown): string {
  if (metadata === null || metadata === undefined) {
    return '-';
  }

  try {
    return JSON.stringify(metadata, null, 2);
  } catch {
    return String(metadata);
  }
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
