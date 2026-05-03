'use client';

import { Eye, Menu, MoreHorizontal, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { usePoliciesQuery } from '@/entities/access-control/hooks';
import type {
  AccessControlMenu,
  AccessControlPermission,
  AccessControlPolicy,
} from '@/entities/access-control/types';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { StatusPill } from '@/shared/ui/status-pill';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

const policyColumns = [
  { key: 'permissions', label: 'Permissions' },
  { key: 'menus', label: 'Menus' },
  { key: 'status', label: 'Status' },
] as const;

type PolicyColumnKey = (typeof policyColumns)[number]['key'];
type VisiblePolicyColumns = Record<PolicyColumnKey, boolean>;

export function PoliciesPage() {
  const policiesQuery = usePoliciesQuery();
  const policies = policiesQuery.data?.items ?? [];
  const [selectedCode, setSelectedCode] = useState<string | undefined>();
  const [visibleColumns, setVisibleColumns] = useState<VisiblePolicyColumns>({
    menus: true,
    permissions: true,
    status: true,
  });
  const selectedPolicy = policies.find((policy) => policy.code === selectedCode) ?? policies[0];
  const tableColSpan = 2 + policyColumns.filter((column) => visibleColumns[column.key]).length;

  const handleToggleColumn = (columnKey: PolicyColumnKey, checked: boolean) => {
    setVisibleColumns((current) => ({
      ...current,
      [columnKey]: checked,
    }));
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Policies</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Review policy bundles, granted permissions, and visible menu access.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          <ShieldCheck size={16} aria-hidden="true" />
          {policiesQuery.isLoading ? 'Loading policies' : `${policies.length} policies`}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className="flex justify-end border-b border-border bg-secondary/30 p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="h-9">
                  <SlidersHorizontal size={16} aria-hidden="true" />
                  Customize Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {policyColumns.map((column) => (
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
                <TableHead>Policy</TableHead>
                {visibleColumns.permissions ? <TableHead>Permissions</TableHead> : null}
                {visibleColumns.menus ? <TableHead>Menus</TableHead> : null}
                {visibleColumns.status ? <TableHead>Status</TableHead> : null}
                <TableHead className="w-12 text-right" aria-label="Actions" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((policy) => (
                <PolicyRow
                  key={policy.code}
                  active={selectedPolicy?.code === policy.code}
                  policy={policy}
                  visibleColumns={visibleColumns}
                  onSelect={() => setSelectedCode(policy.code)}
                />
              ))}
              {policiesQuery.isLoading ? (
                <TableRow>
                  <TableCell className="py-8 text-center text-muted" colSpan={tableColSpan}>
                    Loading policies
                  </TableCell>
                </TableRow>
              ) : null}
              {!policiesQuery.isLoading && policies.length === 0 ? (
                <TableRow>
                  <TableCell className="py-8 text-center text-muted" colSpan={tableColSpan}>
                    No policies found
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </section>

        <PolicyDetails policy={selectedPolicy} />
      </div>
    </div>
  );
}

function PolicyRow({
  active,
  onSelect,
  policy,
  visibleColumns,
}: {
  active: boolean;
  onSelect: () => void;
  policy: AccessControlPolicy;
  visibleColumns: VisiblePolicyColumns;
}) {
  return (
    <TableRow className={active ? 'bg-secondary/60' : undefined}>
      <TableCell>
        <div>
          <p className="font-medium text-foreground">{policy.name}</p>
          <p className="text-xs text-muted">{policy.description ?? policy.code}</p>
        </div>
      </TableCell>
      {visibleColumns.permissions ? (
        <TableCell className="text-muted">{policy.permissions.length}</TableCell>
      ) : null}
      {visibleColumns.menus ? (
        <TableCell className="text-muted">{countMenus(policy.menus)}</TableCell>
      ) : null}
      {visibleColumns.status ? (
        <TableCell>
          <div className="flex flex-wrap gap-1.5">
            {policy.isSystem ? <StatusPill label="system" tone="warning" /> : null}
            <StatusPill
              label={policy.isActive ? 'active' : 'inactive'}
              tone={policy.isActive ? 'success' : 'warning'}
            />
          </div>
        </TableCell>
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
                aria-label={`Open actions for ${policy.name}`}
              >
                <MoreHorizontal size={16} aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={onSelect}>
                <Eye size={15} aria-hidden="true" />
                Inspect policy
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}

function PolicyDetails({ policy }: { policy: AccessControlPolicy | undefined }) {
  const groupedPermissions = useMemo(
    () => groupPermissionsByResource(policy?.permissions ?? []),
    [policy?.permissions],
  );

  if (!policy) {
    return (
      <aside className="rounded-lg border border-border bg-card p-5 text-sm text-muted shadow-sm">
        Select a policy to inspect its permissions and menus.
      </aside>
    );
  }

  return (
    <aside className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-sm">
      <div>
        <div className="flex items-center gap-2">
          <ShieldCheck size={17} aria-hidden="true" />
          <h2 className="text-base font-semibold">{policy.name}</h2>
        </div>
        <p className="mt-1 text-xs text-muted">{policy.code}</p>
        {policy.description ? (
          <p className="mt-3 text-sm leading-6 text-muted">{policy.description}</p>
        ) : null}
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-sm font-semibold">Permissions</p>
        <div className="mt-3 space-y-3">
          {groupedPermissions.map((group) => (
            <div key={group.resource}>
              <p className="mb-1.5 text-xs font-semibold uppercase text-muted">{group.resource}</p>
              <div className="flex flex-wrap gap-1.5">
                {group.permissions.map((permission) => (
                  <Badge key={permission.code} variant="muted">
                    {permission.code}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <div className="flex items-center gap-2">
          <Menu size={15} aria-hidden="true" />
          <p className="text-sm font-semibold">Menus</p>
        </div>
        <div className="mt-3 space-y-2">
          {flattenMenus(policy.menus).map((menu) => (
            <div key={menu.code} className="flex items-center gap-2 text-sm">
              <span className="w-4 shrink-0 text-xs text-muted">{menu.level}</span>
              <span className="font-medium text-foreground">{menu.label}</span>
              <span className="truncate text-xs text-muted">{menu.path ?? menu.code}</span>
            </div>
          ))}
          {policy.menus.length === 0 ? (
            <p className="text-sm text-muted">No menu access assigned.</p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function groupPermissionsByResource(permissions: AccessControlPermission[]) {
  const grouped = new Map<string, AccessControlPermission[]>();

  for (const permission of permissions) {
    const current = grouped.get(permission.resource) ?? [];
    current.push(permission);
    grouped.set(permission.resource, current);
  }

  return [...grouped.entries()]
    .sort(([resourceA], [resourceB]) => resourceA.localeCompare(resourceB))
    .map(([resource, items]) => ({
      resource,
      permissions: items.sort((a, b) => a.action.localeCompare(b.action)),
    }));
}

function flattenMenus(menus: AccessControlMenu[]): AccessControlMenu[] {
  return menus.flatMap((menu) => [menu, ...flattenMenus(menu.children)]);
}

function countMenus(menus: AccessControlMenu[]): number {
  return menus.reduce((total, menu) => total + 1 + countMenus(menu.children), 0);
}
