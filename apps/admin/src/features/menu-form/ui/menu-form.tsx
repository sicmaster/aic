'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { useCreateMenuMutation, useUpdateMenuMutation } from '@/entities/access-control/hooks';
import type { AccessControlMenu } from '@/entities/access-control/types';
import { ApiClientError } from '@/shared/api/api-client';
import { routes } from '@/shared/lib/routes';
import { FeedbackDialog } from '@/shared/ui/feedback-dialog';
import {
  menuCreateSchema,
  menuEditSchema,
  type MenuCreateFormValues,
  type MenuEditFormValues,
} from '../schemas';

type MenuFormProps =
  | {
      menus: AccessControlMenu[];
      mode: 'create';
      menu?: never;
    }
  | {
      menu: AccessControlMenu;
      menus: AccessControlMenu[];
      mode: 'edit';
    };

export function MenuForm(props: MenuFormProps) {
  if (props.mode === 'create') {
    return <CreateMenuForm menus={props.menus} />;
  }

  return <EditMenuForm menu={props.menu} menus={props.menus} />;
}

function CreateMenuForm({ menus }: { menus: AccessControlMenu[] }) {
  const router = useRouter();
  const [successOpen, setSuccessOpen] = useState(false);
  const createMenuMutation = useCreateMenuMutation();
  const form = useForm<MenuCreateFormValues>({
    resolver: zodResolver(menuCreateSchema),
    defaultValues: {
      code: '',
      label: '',
      parentCode: '',
      path: '',
      icon: 'menu',
      level: 2,
      sortOrder: 0,
      isActive: true,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await createMenuMutation.mutateAsync(normalizeCreate(values));
      setSuccessOpen(true);
    } catch {
      // Mutation state renders the API error below the fields.
    }
  });

  return (
    <>
      <MenuFormFrame
        error={createMenuMutation.error}
        menus={menus}
        mode="create"
        pending={createMenuMutation.isPending}
        selectedLevel={form.watch('level')}
        selectedMenuCode={undefined}
        onSubmit={onSubmit}
      >
        <FieldError message={form.formState.errors.code?.message}>
          <label className="text-sm font-medium" htmlFor="code">
            Code
          </label>
          <input
            id="code"
            className="h-10 w-full rounded-md border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            {...form.register('code')}
          />
        </FieldError>

        <SharedFields form={form as unknown as UseFormReturn<MenuEditFormValues>} menus={menus} />
      </MenuFormFrame>
      <FeedbackDialog
        open={successOpen}
        tone="success"
        title="Menu created"
        description="The menu has been created successfully."
        confirmLabel="Back to menus"
        onConfirm={() => router.push(routes.menus)}
      />
    </>
  );
}

function EditMenuForm({ menu, menus }: { menu: AccessControlMenu; menus: AccessControlMenu[] }) {
  const router = useRouter();
  const [successOpen, setSuccessOpen] = useState(false);
  const updateMenuMutation = useUpdateMenuMutation(menu.code);
  const form = useForm<MenuEditFormValues>({
    resolver: zodResolver(menuEditSchema),
    defaultValues: {
      label: menu.label,
      parentCode: findParentCode(menus, menu.parentId) ?? '',
      path: menu.path ?? '',
      icon: menu.icon ?? '',
      level: menu.level,
      sortOrder: menu.sortOrder,
      isActive: menu.isActive,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await updateMenuMutation.mutateAsync(normalizeEdit(values));
      setSuccessOpen(true);
    } catch {
      // Mutation state renders the API error below the fields.
    }
  });

  return (
    <>
      <MenuFormFrame
        error={updateMenuMutation.error}
        menus={menus}
        mode="edit"
        pending={updateMenuMutation.isPending}
        selectedLevel={form.watch('level')}
        selectedMenuCode={menu.code}
        onSubmit={onSubmit}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="codeReadOnly">
            Code
          </label>
          <input
            id="codeReadOnly"
            value={menu.code}
            readOnly
            className="h-10 w-full rounded-md border border-border bg-slate-50 px-3 text-sm text-muted outline-none"
          />
        </div>

        <SharedFields form={form} menus={menus} selectedMenuCode={menu.code} />
      </MenuFormFrame>
      <FeedbackDialog
        open={successOpen}
        tone="success"
        title="Menu updated"
        description="The menu has been updated successfully."
        confirmLabel="Back to menus"
        onConfirm={() => router.push(routes.menus)}
      />
    </>
  );
}

function MenuFormFrame({
  children,
  error,
  onSubmit,
  pending,
}: {
  children: React.ReactNode;
  error: unknown;
  menus: AccessControlMenu[];
  mode: 'create' | 'edit';
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  pending: boolean;
  selectedLevel: number;
  selectedMenuCode: string | undefined;
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Menu management</h1>
          <p className="mt-1 text-sm text-muted">Manage navigation records and visibility.</p>
        </div>
        <Link
          href={routes.menus}
          className="flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-muted transition hover:bg-slate-50 hover:text-ink"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back
        </Link>
      </div>

      <form className="rounded-md border border-border bg-panel shadow-sm" onSubmit={onSubmit}>
        <div className="grid gap-5 p-5 md:grid-cols-2">{children}</div>

        {error ? (
          <div className="mx-5 mb-5 flex gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{getMutationMessage(error)}</p>
          </div>
        ) : null}

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Link
            href={routes.menus}
            className="flex h-10 items-center rounded-md border border-border px-4 text-sm font-medium text-muted transition hover:bg-slate-50 hover:text-ink"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

function SharedFields({
  form,
  menus,
  selectedMenuCode,
}: {
  form: UseFormReturn<MenuEditFormValues>;
  menus: AccessControlMenu[];
  selectedMenuCode?: string;
}) {
  const level = Number(form.watch('level'));
  const parentOptions = useMemo(
    () =>
      flattenMenus(menus).filter(
        (menu) => menu.code !== selectedMenuCode && menu.level === level - 1,
      ),
    [level, menus, selectedMenuCode],
  );

  return (
    <>
      <FieldError message={form.formState.errors.label?.message}>
        <label className="text-sm font-medium" htmlFor="label">
          Label
        </label>
        <input
          id="label"
          className="h-10 w-full rounded-md border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          {...form.register('label')}
        />
      </FieldError>

      <FieldError message={form.formState.errors.level?.message}>
        <label className="text-sm font-medium" htmlFor="level">
          Level
        </label>
        <select
          id="level"
          className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          {...form.register('level', { valueAsNumber: true })}
        >
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
        </select>
      </FieldError>

      <FieldError message={form.formState.errors.parentCode?.message}>
        <label className="text-sm font-medium" htmlFor="parentCode">
          Parent
        </label>
        <select
          id="parentCode"
          disabled={level === 1}
          className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-slate-50 disabled:text-muted"
          {...form.register('parentCode')}
        >
          <option value="">No parent</option>
          {parentOptions.map((menu) => (
            <option key={menu.code} value={menu.code}>
              {menu.label}
            </option>
          ))}
        </select>
      </FieldError>

      <FieldError message={form.formState.errors.path?.message}>
        <label className="text-sm font-medium" htmlFor="path">
          Path
        </label>
        <input
          id="path"
          className="h-10 w-full rounded-md border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          {...form.register('path')}
        />
      </FieldError>

      <FieldError message={form.formState.errors.icon?.message}>
        <label className="text-sm font-medium" htmlFor="icon">
          Icon
        </label>
        <input
          id="icon"
          className="h-10 w-full rounded-md border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          {...form.register('icon')}
        />
      </FieldError>

      <FieldError message={form.formState.errors.sortOrder?.message}>
        <label className="text-sm font-medium" htmlFor="sortOrder">
          Sort order
        </label>
        <input
          id="sortOrder"
          type="number"
          min={0}
          className="h-10 w-full rounded-md border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          {...form.register('sortOrder', { valueAsNumber: true })}
        />
      </FieldError>

      <label className="flex h-10 items-center gap-2 text-sm">
        <input type="checkbox" {...form.register('isActive')} />
        Active
      </label>
    </>
  );
}

function FieldError({
  children,
  message,
}: {
  children: React.ReactNode;
  message: string | undefined;
}) {
  return (
    <div className="space-y-1.5">
      {children}
      {message ? <p className="text-xs text-red-600">{message}</p> : null}
    </div>
  );
}

function normalizeCreate(values: MenuCreateFormValues) {
  return {
    ...values,
    parentCode: values.parentCode || undefined,
    path: values.path || undefined,
    icon: values.icon || undefined,
  };
}

function normalizeEdit(values: MenuEditFormValues) {
  return {
    ...values,
    parentCode: values.parentCode || undefined,
    path: values.path || undefined,
    icon: values.icon || undefined,
  };
}

function flattenMenus(menus: AccessControlMenu[]): AccessControlMenu[] {
  return menus.flatMap((menu) => [menu, ...flattenMenus(menu.children)]);
}

function findParentCode(menus: AccessControlMenu[], parentId: string | null): string | undefined {
  if (!parentId) {
    return undefined;
  }

  return flattenMenus(menus).find((menu) => menu.id === parentId)?.code;
}

function getMutationMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  return 'Unable to save menu. Please try again.';
}
