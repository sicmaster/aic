'use client';

import { Pencil, ShieldCheck, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { useGroupsQuery } from '@/entities/access-control/hooks';
import type { AccessControlGroup } from '@/entities/access-control/types';
import { routes } from '@/shared/lib/routes';
import { StatusPill } from '@/shared/ui/status-pill';

export function GroupsPage() {
  const groupsQuery = useGroupsQuery();
  const groups = groupsQuery.data?.items ?? [];

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

      <section className="rounded-md border border-border bg-panel shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Group</th>
                <th className="px-4 py-3">Policies</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {groups.map((group) => (
                <GroupRow key={group.code} group={group} />
              ))}
              {groupsQuery.isLoading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-muted" colSpan={5}>
                    Loading groups
                  </td>
                </tr>
              ) : null}
              {!groupsQuery.isLoading && groups.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-muted" colSpan={5}>
                    No groups found
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function GroupRow({ group }: { group: AccessControlGroup }) {
  return (
    <tr>
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-ink">{group.name}</p>
          <p className="text-xs text-muted">{group.description ?? group.code}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {group.policies.map((policy) => (
            <span
              key={policy.code}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-2 py-1 text-xs text-muted"
            >
              <ShieldCheck size={12} aria-hidden="true" />
              {policy.name}
            </span>
          ))}
          {group.policies.length === 0 ? (
            <span className="text-xs text-muted">No policies</span>
          ) : null}
        </div>
      </td>
      <td className="px-4 py-3">
        <StatusPill
          label={group.isActive ? 'active' : 'inactive'}
          tone={group.isActive ? 'success' : 'warning'}
        />
      </td>
      <td className="px-4 py-3 text-muted">{new Date(group.updatedAt).toLocaleString()}</td>
      <td className="px-4 py-3">
        <div className="flex justify-end">
          <Link
            href={routes.groupEdit(group.code)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:bg-slate-50 hover:text-ink"
            aria-label={`Edit ${group.name}`}
            title="Edit"
          >
            <Pencil size={15} aria-hidden="true" />
          </Link>
        </div>
      </td>
    </tr>
  );
}
