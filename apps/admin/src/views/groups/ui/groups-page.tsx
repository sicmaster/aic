'use client';

import { MoreHorizontal, Pencil, ShieldCheck, SlidersHorizontal, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useGroupsQuery } from '@/entities/access-control/hooks';
import type { AccessControlGroup } from '@/entities/access-control/types';
import { routes } from '@/shared/lib/routes';
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

const groupColumns = [
  { key: 'policies', label: 'Policies' },
  { key: 'status', label: 'Status' },
  { key: 'updated', label: 'Updated' },
] as const;

type GroupColumnKey = (typeof groupColumns)[number]['key'];
type VisibleGroupColumns = Record<GroupColumnKey, boolean>;

export function GroupsPage() {
  const groupsQuery = useGroupsQuery();
  const groups = groupsQuery.data?.items ?? [];
  const [visibleColumns, setVisibleColumns] = useState<VisibleGroupColumns>({
    policies: true,
    status: true,
    updated: true,
  });
  const tableColSpan = 2 + groupColumns.filter((column) => visibleColumns[column.key]).length;

  const handleToggleColumn = (columnKey: GroupColumnKey, checked: boolean) => {
    setVisibleColumns((current) => ({
      ...current,
      [columnKey]: checked,
    }));
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Group policies</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Assign policy bundles to admin groups and keep access rules centralized.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          <UsersRound size={16} aria-hidden="true" />
          {groupsQuery.isLoading ? 'Loading groups' : `${groups.length} groups`}
        </div>
      </div>

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
              {groupColumns.map((column) => (
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
              <TableHead>Group</TableHead>
              {visibleColumns.policies ? <TableHead>Policies</TableHead> : null}
              {visibleColumns.status ? <TableHead>Status</TableHead> : null}
              {visibleColumns.updated ? <TableHead>Updated</TableHead> : null}
              <TableHead className="w-12 text-right" aria-label="Actions" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => (
              <GroupRow key={group.code} group={group} visibleColumns={visibleColumns} />
            ))}
            {groupsQuery.isLoading ? (
              <TableRow>
                <TableCell className="py-8 text-center text-muted" colSpan={tableColSpan}>
                  Loading groups
                </TableCell>
              </TableRow>
            ) : null}
            {!groupsQuery.isLoading && groups.length === 0 ? (
              <TableRow>
                <TableCell className="py-8 text-center text-muted" colSpan={tableColSpan}>
                  No groups found
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}

function GroupRow({
  group,
  visibleColumns,
}: {
  group: AccessControlGroup;
  visibleColumns: VisibleGroupColumns;
}) {
  return (
    <TableRow>
      <TableCell>
        <div>
          <p className="font-medium text-foreground">{group.name}</p>
          <p className="text-xs text-muted">{group.description ?? group.code}</p>
        </div>
      </TableCell>
      {visibleColumns.policies ? (
        <TableCell>
          <div className="flex flex-wrap gap-1.5">
            {group.policies.map((policy) => (
              <Badge key={policy.code} variant="muted" className="gap-1">
                <ShieldCheck size={12} aria-hidden="true" />
                {policy.name}
              </Badge>
            ))}
            {group.policies.length === 0 ? (
              <span className="text-xs text-muted">No policies</span>
            ) : null}
          </div>
        </TableCell>
      ) : null}
      {visibleColumns.status ? (
        <TableCell>
          <StatusPill
            label={group.isActive ? 'active' : 'inactive'}
            tone={group.isActive ? 'success' : 'warning'}
          />
        </TableCell>
      ) : null}
      {visibleColumns.updated ? (
        <TableCell className="text-muted">{new Date(group.updatedAt).toLocaleString()}</TableCell>
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
                aria-label={`Open actions for ${group.name}`}
              >
                <MoreHorizontal size={16} aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href={routes.groupEdit(group.code)}>
                  <Pencil size={15} aria-hidden="true" />
                  Edit policies
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}
