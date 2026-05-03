'use client';

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useDeleteUserMutation, useUsersQuery } from '@/entities/user/hooks';
import type { UserListItem, UserStatus } from '@/entities/user/types';
import { routes } from '@/shared/lib/routes';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { FeedbackDialog } from '@/shared/ui/feedback-dialog';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { StatusPill } from '@/shared/ui/status-pill';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

const pageSize = 20;
const statusOptions: Array<{ label: string; value: UserStatus | 'all' }> = [
  { label: 'All statuses', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Locked', value: 'locked' },
];

const userColumns = [
  { key: 'groups', label: 'Groups' },
  { key: 'status', label: 'Status' },
  { key: 'lastLogin', label: 'Last login' },
] as const;

type UserColumnKey = (typeof userColumns)[number]['key'];

export function UsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = readPositiveInteger(searchParams.get('page')) ?? 1;
  const search = searchParams.get('search') ?? '';
  const status = readStatus(searchParams.get('status'));
  const [searchInput, setSearchInput] = useState(search);
  const [deleteTarget, setDeleteTarget] = useState<UserListItem | undefined>();
  const [deleteSuccessOpen, setDeleteSuccessOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<Record<UserColumnKey, boolean>>({
    groups: true,
    lastLogin: true,
    status: true,
  });
  const usersQuery = useUsersQuery(
    useMemo(
      () => ({
        page,
        pageSize,
        search: search || undefined,
        status: status || undefined,
      }),
      [page, search, status],
    ),
  );
  const deleteUserMutation = useDeleteUserMutation();
  const users = usersQuery.data?.items ?? [];
  const pagination = usersQuery.data?.pagination;
  const selectedVisibleCount = users.filter((user) => selectedUserIds.includes(user.id)).length;
  const allVisibleSelected = users.length > 0 && selectedVisibleCount === users.length;
  const tableColSpan = 3 + userColumns.filter((column) => visibleColumns[column.key]).length;

  useEffect(() => {
    setSelectedUserIds([]);
  }, [page, search, status]);

  const updateParams = (next: {
    page?: number;
    search?: string | undefined;
    status?: string | undefined;
  }) => {
    const params = new URLSearchParams(searchParams.toString());

    if (next.page) {
      params.set('page', String(next.page));
    }

    if ('search' in next) {
      setOrDelete(params, 'search', next.search);
      params.set('page', '1');
    }

    if ('status' in next) {
      setOrDelete(params, 'status', next.status);
      params.set('page', '1');
    }

    router.replace(`?${params.toString()}`);
  };

  const handleToggleAllVisible = (checked: boolean) => {
    if (!checked) {
      const visibleIds = new Set(users.map((user) => user.id));
      setSelectedUserIds((current) => current.filter((id) => !visibleIds.has(id)));
      return;
    }

    setSelectedUserIds((current) =>
      Array.from(new Set([...current, ...users.map((user) => user.id)])),
    );
  };

  const handleToggleUser = (userId: string, checked: boolean) => {
    setSelectedUserIds((current) => {
      if (!checked) {
        return current.filter((id) => id !== userId);
      }

      return current.includes(userId) ? current : [...current, userId];
    });
  };

  const handleToggleColumn = (columnKey: UserColumnKey, checked: boolean) => {
    setVisibleColumns((current) => ({
      ...current,
      [columnKey]: checked,
    }));
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">User management</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Manage admin access through users and group assignment.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          <Users size={16} aria-hidden="true" />
          {pagination ? `${pagination.total} users` : 'Loading users'}
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border bg-secondary/30 p-4 lg:flex-row lg:items-center">
          <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center">
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
                placeholder="Search users"
                className="h-9 bg-background pl-9"
              />
            </form>
            <Select
              value={status ?? 'all'}
              onValueChange={(value) =>
                updateParams({ status: value === 'all' ? undefined : value })
              }
            >
              <SelectTrigger className="h-9 w-full bg-background lg:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
              {userColumns.map((column) => (
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
          <Button asChild>
            <Link href={routes.userCreate}>
              <Plus size={16} aria-hidden="true" />
              Add user
            </Link>
          </Button>
        </div>

        <Table>
          <TableHeader className="bg-secondary/60">
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  aria-label="Select all visible users"
                  checked={
                    allVisibleSelected || (selectedVisibleCount > 0 ? 'indeterminate' : false)
                  }
                  onCheckedChange={(checked) => handleToggleAllVisible(checked === true)}
                />
              </TableHead>
              <TableHead>User</TableHead>
              {visibleColumns.groups ? <TableHead>Groups</TableHead> : null}
              {visibleColumns.status ? <TableHead>Status</TableHead> : null}
              {visibleColumns.lastLogin ? <TableHead>Last login</TableHead> : null}
              <TableHead className="w-12 text-right" aria-label="Actions" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                selected={selectedUserIds.includes(user.id)}
                visibleColumns={visibleColumns}
                deletePending={deleteUserMutation.isPending}
                onDelete={() => setDeleteTarget(user)}
                onSelectChange={(checked) => handleToggleUser(user.id, checked)}
              />
            ))}
            {usersQuery.isLoading ? (
              <TableRow>
                <TableCell className="py-10 text-center text-muted" colSpan={tableColSpan}>
                  Loading users
                </TableCell>
              </TableRow>
            ) : null}
            {usersQuery.data?.items.length === 0 ? (
              <TableRow>
                <TableCell className="py-10 text-center text-muted" colSpan={tableColSpan}>
                  No users found
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>

        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted lg:flex-row lg:items-center lg:justify-between">
          <span>
            {selectedUserIds.length} of {pagination?.total ?? 0} row(s) selected.
          </span>
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
      <FeedbackDialog
        open={Boolean(deleteTarget)}
        tone="danger"
        title="Delete user"
        description={
          deleteTarget
            ? `Delete ${deleteTarget.fullName}? This user will be hidden from active management screens.`
            : undefined
        }
        cancelLabel="Cancel"
        confirmLabel="Delete"
        pending={deleteUserMutation.isPending}
        onCancel={() => setDeleteTarget(undefined)}
        onConfirm={() => {
          if (!deleteTarget) {
            return;
          }

          deleteUserMutation.mutate(deleteTarget.id, {
            onSuccess: () => {
              setDeleteTarget(undefined);
              setDeleteSuccessOpen(true);
            },
          });
        }}
      />
      <FeedbackDialog
        open={deleteSuccessOpen}
        tone="success"
        title="User deleted"
        description="The user account has been removed from active management screens."
        confirmLabel="OK"
        onConfirm={() => setDeleteSuccessOpen(false)}
      />
    </div>
  );
}

function UserRow({
  deletePending,
  onDelete,
  onSelectChange,
  selected,
  user,
  visibleColumns,
}: {
  deletePending: boolean;
  onDelete: () => void;
  onSelectChange: (checked: boolean) => void;
  selected: boolean;
  user: UserListItem;
  visibleColumns: Record<UserColumnKey, boolean>;
}) {
  return (
    <TableRow data-state={selected ? 'selected' : undefined}>
      <TableCell>
        <Checkbox
          aria-label={`Select ${user.fullName}`}
          checked={selected}
          onCheckedChange={(checked) => onSelectChange(checked === true)}
        />
      </TableCell>
      <TableCell>
        <div>
          <p className="font-medium text-foreground">{user.fullName}</p>
          <p className="text-xs text-muted">{user.email}</p>
        </div>
      </TableCell>
      {visibleColumns.groups ? (
        <TableCell>
          <div className="flex flex-wrap gap-1.5">
            {user.groups.map((group) => (
              <Badge key={group.code} variant="muted">
                {group.name}
              </Badge>
            ))}
          </div>
        </TableCell>
      ) : null}
      {visibleColumns.status ? (
        <TableCell>
          <StatusPill label={user.status} tone={statusTone(user.status)} />
        </TableCell>
      ) : null}
      {visibleColumns.lastLogin ? (
        <TableCell className="text-muted">
          {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
        </TableCell>
      ) : null}
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="ml-auto text-muted hover:text-foreground"
              aria-label={`Open actions for ${user.fullName}`}
            >
              <MoreHorizontal size={16} aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={routes.userEdit(user.id)}>
                <Pencil size={15} aria-hidden="true" />
                Edit user
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={deletePending}
              onClick={onDelete}
              className="text-danger focus:text-danger"
            >
              <Trash2 size={15} aria-hidden="true" />
              Delete user
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

function statusTone(status: UserStatus): 'success' | 'warning' | 'danger' {
  if (status === 'active') {
    return 'success';
  }

  if (status === 'locked') {
    return 'danger';
  }

  return 'warning';
}

function readPositiveInteger(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function readStatus(value: string | null): UserStatus | undefined {
  return value === 'active' || value === 'inactive' || value === 'locked' ? value : undefined;
}

function setOrDelete(params: URLSearchParams, key: string, value: string | undefined) {
  const trimmedValue = value?.trim();

  if (trimmedValue) {
    params.set(key, trimmedValue);
    return;
  }

  params.delete(key);
}
