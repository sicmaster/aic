'use client';

import { AlertCircle, ArrowLeft, Loader2, Save, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  useGroupQuery,
  usePoliciesQuery,
  useUpdateGroupPoliciesMutation,
} from '@/entities/access-control/hooks';
import type { AccessControlPolicy } from '@/entities/access-control/types';
import { ApiClientError } from '@/shared/api/api-client';
import { routes } from '@/shared/lib/routes';
import { FeedbackDialog } from '@/shared/ui/feedback-dialog';
import { StatusPill } from '@/shared/ui/status-pill';

export function GroupsEditPage({ groupCode }: { groupCode: string }) {
  const router = useRouter();
  const groupQuery = useGroupQuery(groupCode);
  const policiesQuery = usePoliciesQuery();
  const updatePoliciesMutation = useUpdateGroupPoliciesMutation(groupCode);
  const [selectedPolicyCodes, setSelectedPolicyCodes] = useState<string[]>([]);
  const [successOpen, setSuccessOpen] = useState(false);

  useEffect(() => {
    if (groupQuery.data?.group) {
      setSelectedPolicyCodes(groupQuery.data.group.policies.map((policy) => policy.code));
    }
  }, [groupQuery.data?.group]);

  const group = groupQuery.data?.group;
  const policies = policiesQuery.data?.items ?? [];
  const selectedPolicies = useMemo(
    () => policies.filter((policy) => selectedPolicyCodes.includes(policy.code)),
    [policies, selectedPolicyCodes],
  );
  const loading = groupQuery.isLoading || policiesQuery.isLoading;

  if (loading) {
    return (
      <div className="grid min-h-80 place-items-center text-muted">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading group policies
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="rounded-md border border-border bg-panel p-6 text-sm text-muted">
        Group not found.
      </div>
    );
  }

  const handleSave = async () => {
    try {
      await updatePoliciesMutation.mutateAsync({ policyCodes: selectedPolicyCodes });
      setSuccessOpen(true);
    } catch {
      // Mutation state renders the API error below the policy selector.
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Edit group policies</h1>
          <p className="mt-1 text-sm text-muted">{group.description ?? group.name}</p>
        </div>
        <Link
          href={routes.groups}
          className="flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-muted transition hover:bg-slate-50 hover:text-ink"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back
        </Link>
      </div>

      <section className="rounded-md border border-border bg-panel shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-base font-semibold">{group.name}</p>
            <p className="mt-1 text-xs text-muted">{group.code}</p>
          </div>
          <div className="flex items-center gap-2">
            {group.isSystem ? <StatusPill label="system" tone="warning" /> : null}
            <StatusPill
              label={group.isActive ? 'active' : 'inactive'}
              tone={group.isActive ? 'success' : 'warning'}
            />
          </div>
        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold">Policies</p>
              <p className="mt-1 text-xs text-muted">
                The selected policies define permissions and visible menus for this group.
              </p>
            </div>
            <div className="grid gap-3">
              {policies.map((policy) => (
                <PolicyOption
                  key={policy.code}
                  groupCode={group.code}
                  policy={policy}
                  selected={selectedPolicyCodes.includes(policy.code)}
                  onChange={(selected) => {
                    setSelectedPolicyCodes((current) =>
                      selected
                        ? [...current, policy.code]
                        : current.filter((code) => code !== policy.code),
                    );
                  }}
                />
              ))}
            </div>
          </div>

          <aside className="space-y-3">
            <div>
              <p className="text-sm font-semibold">Selected access</p>
              <p className="mt-1 text-xs text-muted">
                A quick preview of enabled permissions from selected policies.
              </p>
            </div>
            <div className="rounded-md border border-border bg-slate-50 p-3">
              <div className="flex flex-wrap gap-1.5">
                {uniquePermissions(selectedPolicies).map((permission) => (
                  <span
                    key={permission}
                    className="rounded-full border border-border bg-white px-2 py-1 text-xs text-muted"
                  >
                    {permission}
                  </span>
                ))}
                {selectedPolicies.length === 0 ? (
                  <span className="text-xs text-muted">No policies selected</span>
                ) : null}
              </div>
            </div>
          </aside>
        </div>

        {updatePoliciesMutation.error ? (
          <div className="mx-5 mb-5 flex gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{getMutationMessage(updatePoliciesMutation.error)}</p>
          </div>
        ) : null}

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Link
            href={routes.groups}
            className="flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium text-muted transition hover:bg-slate-50 hover:text-ink"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={updatePoliciesMutation.isPending}
            className="flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {updatePoliciesMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            Save
          </button>
        </div>
      </section>

      <FeedbackDialog
        open={successOpen}
        tone="success"
        title="Group policies updated"
        description="The group policy assignment has been updated successfully."
        confirmLabel="Back to groups"
        onConfirm={() => router.push(routes.groups)}
      />
    </div>
  );
}

function PolicyOption({
  groupCode,
  onChange,
  policy,
  selected,
}: {
  groupCode: string;
  onChange: (selected: boolean) => void;
  policy: AccessControlPolicy;
  selected: boolean;
}) {
  const locked = groupCode === 'admin' && policy.code === 'admin.full-access';
  const permissionCount = policy.permissions.length;
  const menuCount = countMenus(policy.menus);

  return (
    <label className="flex gap-3 rounded-md border border-border p-3 text-sm transition hover:bg-slate-50">
      <input
        type="checkbox"
        checked={selected}
        disabled={locked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-ink">{policy.name}</p>
          {policy.isSystem ? <StatusPill label="system" tone="warning" /> : null}
          {!policy.isActive ? <StatusPill label="inactive" tone="warning" /> : null}
        </div>
        <p className="mt-1 text-xs text-muted">{policy.description ?? policy.code}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck size={12} aria-hidden="true" />
            {permissionCount} permissions
          </span>
          <span>{menuCount} menus</span>
          {locked ? <span>Required for admin recovery</span> : null}
        </div>
      </div>
    </label>
  );
}

function uniquePermissions(policies: AccessControlPolicy[]): string[] {
  return [
    ...new Set(
      policies.flatMap((policy) => policy.permissions.map((permission) => permission.code)),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

function countMenus(menus: AccessControlPolicy['menus']): number {
  return menus.reduce((total, menu) => total + 1 + countMenus(menu.children), 0);
}

function getMutationMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  return 'Unable to update group policies. Please try again.';
}
