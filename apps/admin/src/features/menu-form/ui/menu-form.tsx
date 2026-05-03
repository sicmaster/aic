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
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { FeedbackDialog } from '@/shared/ui/feedback-dialog';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
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
          <Label htmlFor="code">Code</Label>
          <Input id="code" {...form.register('code')} />
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
          <Label htmlFor="codeReadOnly">Code</Label>
          <Input id="codeReadOnly" value={menu.code} readOnly className="bg-secondary/50" />
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
        <Button asChild variant="outline">
          <Link href={routes.menus}>
            <ArrowLeft size={16} aria-hidden="true" />
            Back
          </Link>
        </Button>
      </div>

      <form className="rounded-lg border border-border bg-card shadow-sm" onSubmit={onSubmit}>
        <div className="grid gap-5 p-5 md:grid-cols-2">{children}</div>

        {error ? (
          <div className="mx-5 mb-5 flex gap-2 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{getMutationMessage(error)}</p>
          </div>
        ) : null}

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Button asChild variant="outline">
            <Link href={routes.menus}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            Save
          </Button>
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
        <Label htmlFor="label">Label</Label>
        <Input id="label" {...form.register('label')} />
      </FieldError>

      <FieldError message={form.formState.errors.level?.message}>
        <Label>Level</Label>
        <Select
          value={String(level)}
          onValueChange={(value) => form.setValue('level', Number(value), { shouldValidate: true })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1</SelectItem>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="3">3</SelectItem>
          </SelectContent>
        </Select>
      </FieldError>

      <FieldError message={form.formState.errors.parentCode?.message}>
        <Label>Parent</Label>
        <Select
          value={form.watch('parentCode') || 'none'}
          disabled={level === 1}
          onValueChange={(value) =>
            form.setValue('parentCode', value === 'none' ? '' : value, { shouldValidate: true })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Parent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No parent</SelectItem>
            {parentOptions.map((menu) => (
              <SelectItem key={menu.code} value={menu.code}>
                {menu.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldError>

      <FieldError message={form.formState.errors.path?.message}>
        <Label htmlFor="path">Path</Label>
        <Input id="path" {...form.register('path')} />
      </FieldError>

      <FieldError message={form.formState.errors.icon?.message}>
        <Label htmlFor="icon">Icon</Label>
        <Input id="icon" {...form.register('icon')} />
      </FieldError>

      <FieldError message={form.formState.errors.sortOrder?.message}>
        <Label htmlFor="sortOrder">Sort order</Label>
        <Input
          id="sortOrder"
          type="number"
          min={0}
          {...form.register('sortOrder', { valueAsNumber: true })}
        />
      </FieldError>

      <div className="flex h-10 items-center gap-2 text-sm">
        <Checkbox
          id="isActive"
          checked={form.watch('isActive')}
          onCheckedChange={(checked) =>
            form.setValue('isActive', checked === true, { shouldValidate: true })
          }
        />
        <Label htmlFor="isActive">Active</Label>
      </div>
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
      {message ? <p className="text-xs text-red-400">{message}</p> : null}
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
