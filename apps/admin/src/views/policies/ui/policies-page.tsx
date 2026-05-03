'use client';

import { ChevronRight, Menu, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { usePoliciesQuery } from '@/entities/access-control/hooks';
import type {
  AccessControlMenu,
  AccessControlPermission,
  AccessControlPolicy,
} from '@/entities/access-control/types';
import { StatusPill } from '@/shared/ui/status-pill';

export function PoliciesPage() {
  const policiesQuery = usePoliciesQuery();
  const policies = policiesQuery.data?.items ?? [];
  const [selectedCode, setSelectedCode] = useState<string | undefined>();
  const selectedPolicy = policies.find((policy) => policy.code === selectedCode) ?? policies[0];

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
        <section className="rounded-md border border-border bg-panel shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">Policy</th>
                  <th className="px-4 py-3">Permissions</th>
                  <th className="px-4 py-3">Menus</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {policies.map((policy) => (
                  <PolicyRow
                    key={policy.code}
                    active={selectedPolicy?.code === policy.code}
                    policy={policy}
                    onSelect={() => setSelectedCode(policy.code)}
                  />
                ))}
                {policiesQuery.isLoading ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-muted" colSpan={5}>
                      Loading policies
                    </td>
                  </tr>
                ) : null}
                {!policiesQuery.isLoading && policies.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-muted" colSpan={5}>
                      No policies found
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
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
}: {
  active: boolean;
  onSelect: () => void;
  policy: AccessControlPolicy;
}) {
  return (
    <tr className={active ? 'bg-slate-50' : undefined}>
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-ink">{policy.name}</p>
          <p className="text-xs text-muted">{policy.description ?? policy.code}</p>
        </div>
      </td>
      <td className="px-4 py-3 text-muted">{policy.permissions.length}</td>
      <td className="px-4 py-3 text-muted">{countMenus(policy.menus)}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {policy.isSystem ? <StatusPill label="system" tone="warning" /> : null}
          <StatusPill
            label={policy.isActive ? 'active' : 'inactive'}
            tone={policy.isActive ? 'success' : 'warning'}
          />
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onSelect}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:bg-white hover:text-ink"
            aria-label={`Inspect ${policy.name}`}
            title="Inspect"
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function PolicyDetails({ policy }: { policy: AccessControlPolicy | undefined }) {
  const groupedPermissions = useMemo(
    () => groupPermissionsByResource(policy?.permissions ?? []),
    [policy?.permissions],
  );

  if (!policy) {
    return (
      <aside className="rounded-md border border-border bg-panel p-5 text-sm text-muted shadow-sm">
        Select a policy to inspect its permissions and menus.
      </aside>
    );
  }

  return (
    <aside className="space-y-4 rounded-md border border-border bg-panel p-5 shadow-sm">
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
                  <span
                    key={permission.code}
                    className="rounded-full border border-border bg-white px-2 py-1 text-xs text-muted"
                  >
                    {permission.code}
                  </span>
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
              <span className="font-medium text-ink">{menu.label}</span>
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
