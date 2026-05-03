'use client';

import { Menu as MenuIcon, Pencil, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useDeleteMenuMutation, useMenusQuery } from '@/entities/access-control/hooks';
import type { AccessControlMenu } from '@/entities/access-control/types';
import { routes } from '@/shared/lib/routes';
import { FeedbackDialog } from '@/shared/ui/feedback-dialog';
import { StatusPill } from '@/shared/ui/status-pill';

export function MenusPage() {
  const menusQuery = useMenusQuery();
  const deleteMenuMutation = useDeleteMenuMutation();
  const menus = flattenMenus(menusQuery.data?.items ?? []);
  const [deleteTarget, setDeleteTarget] = useState<AccessControlMenu | undefined>();
  const [deleteSuccessOpen, setDeleteSuccessOpen] = useState(false);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Menus</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Manage admin navigation records, hierarchy, and active visibility.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          <MenuIcon size={16} aria-hidden="true" />
          {menusQuery.isLoading ? 'Loading menus' : `${menus.length} menus`}
        </div>
      </div>

      <section className="rounded-md border border-border bg-panel shadow-sm">
        <div className="flex justify-end border-b border-border p-4">
          <Link
            href={routes.menuCreate}
            className="flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            <Plus size={16} aria-hidden="true" />
            Add menu
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Menu</th>
                <th className="px-4 py-3">Path</th>
                <th className="px-4 py-3">Level</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {menus.map((menu) => (
                <MenuRow
                  key={menu.id}
                  menu={menu}
                  deletePending={deleteMenuMutation.isPending}
                  onDelete={() => setDeleteTarget(menu)}
                />
              ))}
              {menusQuery.isLoading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-muted" colSpan={5}>
                    Loading menus
                  </td>
                </tr>
              ) : null}
              {!menusQuery.isLoading && menus.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-muted" colSpan={5}>
                    No menus found
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <FeedbackDialog
        open={Boolean(deleteTarget)}
        tone="danger"
        title="Delete menu"
        description={
          deleteTarget
            ? `Delete ${deleteTarget.label}? This menu will be hidden and soft deleted.`
            : undefined
        }
        cancelLabel="Cancel"
        confirmLabel="Delete"
        pending={deleteMenuMutation.isPending}
        onCancel={() => setDeleteTarget(undefined)}
        onConfirm={() => {
          if (!deleteTarget) {
            return;
          }

          deleteMenuMutation.mutate(deleteTarget.code, {
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
        title="Menu deleted"
        description="The menu has been removed from active management screens."
        confirmLabel="OK"
        onConfirm={() => setDeleteSuccessOpen(false)}
      />
    </div>
  );
}

function MenuRow({
  deletePending,
  menu,
  onDelete,
}: {
  deletePending: boolean;
  menu: AccessControlMenu;
  onDelete: () => void;
}) {
  const deleteDisabled = deletePending || menu.isSystem;

  return (
    <tr>
      <td className="px-4 py-3">
        <div style={{ paddingLeft: `${(menu.level - 1) * 18}px` }}>
          <p className="font-medium text-ink">{menu.label}</p>
          <p className="text-xs text-muted">{menu.code}</p>
        </div>
      </td>
      <td className="px-4 py-3 text-muted">{menu.path ?? '-'}</td>
      <td className="px-4 py-3 text-muted">{menu.level}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {menu.isSystem ? <StatusPill label="system" tone="warning" /> : null}
          <StatusPill
            label={menu.isActive ? 'active' : 'inactive'}
            tone={menu.isActive ? 'success' : 'warning'}
          />
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1">
          <Link
            href={routes.menuEdit(menu.code)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:bg-slate-50 hover:text-ink"
            aria-label={`Edit ${menu.label}`}
            title="Edit"
          >
            <Pencil size={15} aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleteDisabled}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Delete ${menu.label}`}
            title={menu.isSystem ? 'System menus cannot be deleted' : 'Delete'}
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function flattenMenus(menus: AccessControlMenu[]): AccessControlMenu[] {
  return menus.flatMap((menu) => [menu, ...flattenMenus(menu.children)]);
}
