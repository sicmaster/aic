'use client';

import { Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useDeleteUserMutation, useUsersQuery } from '@/entities/user/hooks';
import type { UserListItem, UserStatus } from '@/entities/user/types';
import { routes } from '@/shared/lib/routes';
import { FeedbackDialog } from '@/shared/ui/feedback-dialog';
import { StatusPill } from '@/shared/ui/status-pill';

const pageSize = 20;
const statusOptions: Array<{ label: string; value: UserStatus | '' }> = [
  { label: 'All statuses', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Locked', value: 'locked' },
];

export function UsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = readPositiveInteger(searchParams.get('page')) ?? 1;
  const search = searchParams.get('search') ?? '';
  const status = readStatus(searchParams.get('status'));
  const [searchInput, setSearchInput] = useState(search);
  const [deleteTarget, setDeleteTarget] = useState<UserListItem | undefined>();
  const [deleteSuccessOpen, setDeleteSuccessOpen] = useState(false);
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

  const updateParams = (next: { page?: number; search?: string; status?: string }) => {
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

  const pagination = usersQuery.data?.pagination;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
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

      <section className="rounded-md border border-border bg-panel shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
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
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search users"
                className="h-10 w-full rounded-md border border-border bg-white pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </form>
            <select
              value={status ?? ''}
              onChange={(event) => updateParams({ status: event.target.value })}
              className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            >
              {statusOptions.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <Link
            href={routes.userCreate}
            className="flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            <Plus size={16} aria-hidden="true" />
            Add user
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-muted">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Groups</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last login</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {usersQuery.data?.items.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  deletePending={deleteUserMutation.isPending}
                  onDelete={() => setDeleteTarget(user)}
                />
              ))}
              {usersQuery.isLoading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-muted" colSpan={5}>
                    Loading users
                  </td>
                </tr>
              ) : null}
              {usersQuery.data?.items.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-muted" colSpan={5}>
                    No users found
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
  user,
}: {
  deletePending: boolean;
  onDelete: () => void;
  user: UserListItem;
}) {
  return (
    <tr>
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-ink">{user.fullName}</p>
          <p className="text-xs text-muted">{user.email}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {user.groups.map((group) => (
            <span
              key={group.code}
              className="rounded-full border border-border bg-white px-2 py-1 text-xs text-muted"
            >
              {group.name}
            </span>
          ))}
        </div>
      </td>
      <td className="px-4 py-3">
        <StatusPill label={user.status} tone={statusTone(user.status)} />
      </td>
      <td className="px-4 py-3 text-muted">
        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1">
          <Link
            href={routes.userEdit(user.id)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:bg-slate-50 hover:text-ink"
            aria-label={`Edit ${user.fullName}`}
            title="Edit"
          >
            <Pencil size={15} aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={onDelete}
            disabled={deletePending}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:bg-red-50 hover:text-red-600"
            aria-label={`Delete ${user.fullName}`}
            title="Delete"
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        </div>
      </td>
    </tr>
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
