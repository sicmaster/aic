'use client';

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { clsx } from 'clsx';
import {
  GripVertical,
  Loader2,
  Menu as MenuIcon,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  useDeleteMenuMutation,
  useMenusQuery,
  useUpdateMenuSortOrderMutation,
} from '@/entities/access-control/hooks';
import type { AccessControlMenu } from '@/entities/access-control/types';
import { ApiClientError } from '@/shared/api/api-client';
import { routes } from '@/shared/lib/routes';
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
import { FeedbackDialog } from '@/shared/ui/feedback-dialog';
import { StatusPill } from '@/shared/ui/status-pill';

const ROOT_PARENT_KEY = 'root';
const menuColumns = [
  { key: 'path', label: 'Path' },
  { key: 'status', label: 'Status' },
  { key: 'level', label: 'Level' },
] as const;

type MenuColumnKey = (typeof menuColumns)[number]['key'];
type VisibleMenuColumns = Record<MenuColumnKey, boolean>;

export function MenusPage() {
  const menusQuery = useMenusQuery();
  const deleteMenuMutation = useDeleteMenuMutation();
  const updateSortMutation = useUpdateMenuSortOrderMutation();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const [menuTree, setMenuTree] = useState<AccessControlMenu[]>([]);
  const [dirtyParentKey, setDirtyParentKey] = useState<string | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<AccessControlMenu | undefined>();
  const [deleteSuccessOpen, setDeleteSuccessOpen] = useState(false);
  const [sortSuccessOpen, setSortSuccessOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<VisibleMenuColumns>({
    level: true,
    path: true,
    status: true,
  });
  const menus = useMemo(() => flattenMenus(menuTree), [menuTree]);
  const isSortDirty = Boolean(dirtyParentKey);
  const sortErrorMessage = getMutationErrorMessage(updateSortMutation.error);
  const menuGridTemplate = getMenuGridTemplate(visibleColumns);

  useEffect(() => {
    if (!dirtyParentKey) {
      setMenuTree(menusQuery.data?.items ?? []);
    }
  }, [dirtyParentKey, menusQuery.data?.items]);

  function handleReorder(parentKey: string, event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id || updateSortMutation.isPending) {
      return;
    }

    setMenuTree((currentMenus) =>
      reorderSiblingGroup(currentMenus, parentKey, String(active.id), String(over.id)),
    );
    setDirtyParentKey(parentKey);
  }

  function handleResetSort() {
    setMenuTree(menusQuery.data?.items ?? []);
    setDirtyParentKey(undefined);
  }

  function handleSaveSort() {
    if (!dirtyParentKey) {
      return;
    }

    const siblings = getSiblingsByParentKey(menuTree, dirtyParentKey);

    updateSortMutation.mutate(
      {
        items: siblings.map((menu, index) => ({
          code: menu.code,
          sortOrder: getSortOrder(index),
        })),
      },
      {
        onSuccess: (response) => {
          setMenuTree(response.items);
          setDirtyParentKey(undefined);
          setSortSuccessOpen(true);
        },
      },
    );
  }

  function handleToggleColumn(columnKey: MenuColumnKey, checked: boolean) {
    setVisibleColumns((current) => ({
      ...current,
      [columnKey]: checked,
    }));
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Menus</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Manage admin navigation records, hierarchy, active visibility, and sibling sort order.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          <MenuIcon size={16} aria-hidden="true" />
          {menusQuery.isLoading ? 'Loading menus' : `${menus.length} menus`}
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border bg-secondary/30 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Navigation tree</p>
            <p className="mt-1 text-xs text-muted">
              Drag menus within the same parent group, then save the changed order.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline">
                  <SlidersHorizontal size={16} aria-hidden="true" />
                  Customize Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {menuColumns.map((column) => (
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
            <Button
              type="button"
              variant="outline"
              onClick={handleResetSort}
              disabled={!isSortDirty || updateSortMutation.isPending}
            >
              <RotateCcw size={16} aria-hidden="true" />
              Reset
            </Button>
            <Button
              type="button"
              onClick={handleSaveSort}
              disabled={!isSortDirty || updateSortMutation.isPending}
            >
              {updateSortMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save size={16} aria-hidden="true" />
              )}
              Save order
            </Button>
            <Button asChild>
              <Link href={routes.menuCreate}>
                <Plus size={16} aria-hidden="true" />
                Add menu
              </Link>
            </Button>
          </div>
        </div>

        {sortErrorMessage ? (
          <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {sortErrorMessage}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <div
            className="grid min-w-[760px] gap-3 border-b border-border bg-secondary/60 px-4 py-3 text-xs font-semibold uppercase text-muted"
            style={{ gridTemplateColumns: menuGridTemplate }}
          >
            <span>Menu</span>
            {visibleColumns.path ? <span>Path</span> : null}
            {visibleColumns.status ? <span>Status</span> : null}
            {visibleColumns.level ? <span>Level</span> : null}
            <span className="text-right">Actions</span>
          </div>

          {menusQuery.isLoading ? (
            <div className="px-4 py-10 text-center text-sm text-muted">Loading menus</div>
          ) : null}

          {!menusQuery.isLoading && menuTree.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted">No menus found</div>
          ) : null}

          {!menusQuery.isLoading && menuTree.length > 0 ? (
            <SortableMenuGroup
              deletePending={deleteMenuMutation.isPending}
              disabled={updateSortMutation.isPending}
              menus={menuTree}
              onDelete={setDeleteTarget}
              onReorder={handleReorder}
              parentKey={ROOT_PARENT_KEY}
              sensors={sensors}
              visibleColumns={visibleColumns}
            />
          ) : null}
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
      <FeedbackDialog
        open={sortSuccessOpen}
        tone="success"
        title="Menu order saved"
        description="The navigation order has been updated."
        confirmLabel="OK"
        onConfirm={() => setSortSuccessOpen(false)}
      />
    </div>
  );
}

function SortableMenuGroup({
  deletePending,
  disabled,
  menus,
  onDelete,
  onReorder,
  parentKey,
  sensors,
  visibleColumns,
}: {
  deletePending: boolean;
  disabled: boolean;
  menus: AccessControlMenu[];
  onDelete: (menu: AccessControlMenu) => void;
  onReorder: (parentKey: string, event: DragEndEvent) => void;
  parentKey: string;
  sensors: ReturnType<typeof useSensors>;
  visibleColumns: VisibleMenuColumns;
}) {
  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={(event) => onReorder(parentKey, event)}
      sensors={sensors}
    >
      <SortableContext
        items={menus.map((menu) => menu.code)}
        strategy={verticalListSortingStrategy}
      >
        <div className={clsx(parentKey === ROOT_PARENT_KEY ? 'divide-y divide-border' : '')}>
          {menus.map((menu) => (
            <SortableMenuItem
              deletePending={deletePending}
              disabled={disabled}
              key={menu.id}
              menu={menu}
              onDelete={onDelete}
              onReorder={onReorder}
              sensors={sensors}
              visibleColumns={visibleColumns}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableMenuItem({
  deletePending,
  disabled,
  menu,
  onDelete,
  onReorder,
  sensors,
  visibleColumns,
}: {
  deletePending: boolean;
  disabled: boolean;
  menu: AccessControlMenu;
  onDelete: (menu: AccessControlMenu) => void;
  onReorder: (parentKey: string, event: DragEndEvent) => void;
  sensors: ReturnType<typeof useSensors>;
  visibleColumns: VisibleMenuColumns;
}) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    disabled,
    id: menu.code,
  });
  const deleteDisabled = deletePending || menu.isSystem;
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const menuGridTemplate = getMenuGridTemplate(visibleColumns);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx('bg-card', isDragging ? 'relative z-10 shadow-lg' : '')}
    >
      <div
        className="grid min-w-[760px] items-center gap-3 px-4 py-3 text-sm transition hover:bg-secondary/35"
        style={{ gridTemplateColumns: menuGridTemplate }}
      >
        <div
          className="flex min-w-0 items-center gap-3"
          style={{ paddingLeft: `${(menu.level - 1) * 22}px` }}
        >
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-md text-muted transition hover:bg-secondary/70 hover:text-foreground active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Drag ${menu.label}`}
            disabled={disabled}
            title="Drag to sort"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={16} aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{menu.label}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="truncate text-xs text-muted">{menu.code}</span>
              {menu.isSystem ? <StatusPill label="system" tone="warning" /> : null}
            </div>
          </div>
        </div>
        {visibleColumns.path ? (
          <div className="min-w-0 truncate text-muted">{menu.path ?? '-'}</div>
        ) : null}
        {visibleColumns.status ? (
          <div className="flex flex-wrap gap-1.5">
            <StatusPill
              label={menu.isActive ? 'active' : 'inactive'}
              tone={menu.isActive ? 'success' : 'warning'}
            />
          </div>
        ) : null}
        {visibleColumns.level ? <div className="text-muted">{menu.level}</div> : null}
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted hover:text-foreground"
                aria-label={`Open actions for ${menu.label}`}
              >
                <MoreHorizontal size={16} aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href={routes.menuEdit(menu.code)}>
                  <Pencil size={15} aria-hidden="true" />
                  Edit menu
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={deleteDisabled}
                onClick={() => onDelete(menu)}
                className="text-danger focus:text-danger"
              >
                <Trash2 size={15} aria-hidden="true" />
                Delete menu
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {menu.children.length > 0 ? (
        <SortableMenuGroup
          deletePending={deletePending}
          disabled={disabled}
          menus={menu.children}
          onDelete={onDelete}
          onReorder={onReorder}
          parentKey={menu.id}
          sensors={sensors}
          visibleColumns={visibleColumns}
        />
      ) : null}
    </div>
  );
}

function getMenuGridTemplate(visibleColumns: VisibleMenuColumns): string {
  const columns = ['minmax(280px,1fr)'];

  if (visibleColumns.path) {
    columns.push('minmax(180px,280px)');
  }

  if (visibleColumns.status) {
    columns.push('128px');
  }

  if (visibleColumns.level) {
    columns.push('80px');
  }

  columns.push('72px');

  return columns.join(' ');
}

function flattenMenus(menus: AccessControlMenu[]): AccessControlMenu[] {
  return menus.flatMap((menu) => [menu, ...flattenMenus(menu.children)]);
}

function getSortOrder(index: number): number {
  return (index + 1) * 10;
}

function reorderSiblingGroup(
  menus: AccessControlMenu[],
  parentKey: string,
  activeCode: string,
  overCode: string,
): AccessControlMenu[] {
  if (parentKey === ROOT_PARENT_KEY) {
    return reorderMenus(menus, activeCode, overCode);
  }

  return menus.map((menu) => ({
    ...menu,
    children:
      menu.id === parentKey
        ? reorderMenus(menu.children, activeCode, overCode)
        : reorderSiblingGroup(menu.children, parentKey, activeCode, overCode),
  }));
}

function reorderMenus(
  menus: AccessControlMenu[],
  activeCode: string,
  overCode: string,
): AccessControlMenu[] {
  const oldIndex = menus.findIndex((menu) => menu.code === activeCode);
  const newIndex = menus.findIndex((menu) => menu.code === overCode);

  if (oldIndex < 0 || newIndex < 0) {
    return menus;
  }

  return arrayMove(menus, oldIndex, newIndex).map((menu, index) => ({
    ...menu,
    sortOrder: getSortOrder(index),
  }));
}

function getSiblingsByParentKey(
  menus: AccessControlMenu[],
  parentKey: string,
): AccessControlMenu[] {
  if (parentKey === ROOT_PARENT_KEY) {
    return menus;
  }

  for (const menu of menus) {
    if (menu.id === parentKey) {
      return menu.children;
    }

    const childResult = getSiblingsByParentKey(menu.children, parentKey);

    if (childResult.length > 0) {
      return childResult;
    }
  }

  return [];
}

function getMutationErrorMessage(error: unknown): string | undefined {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error) {
    return 'Unable to save menu order. Please try again.';
  }

  return undefined;
}
