'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  useCreateUserMutation,
  useUpdateUserMutation,
  useUserGroupOptionsQuery,
} from '@/entities/user/hooks';
import type { UserGroupSummary, UserListItem, UserStatus } from '@/entities/user/types';
import { ApiClientError } from '@/shared/api/api-client';
import { routes } from '@/shared/lib/routes';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { FeedbackDialog } from '@/shared/ui/feedback-dialog';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import {
  userCreateSchema,
  userEditSchema,
  type UserCreateFormValues,
  type UserEditFormValues,
} from '../schemas';

type UserFormProps =
  | {
      mode: 'create';
      user?: never;
    }
  | {
      mode: 'edit';
      user: UserListItem;
    };

const statusOptions: Array<{ label: string; value: UserStatus }> = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Locked', value: 'locked' },
];

export function UserForm(props: UserFormProps) {
  if (props.mode === 'create') {
    return <CreateUserForm />;
  }

  return <EditUserForm user={props.user} />;
}

function CreateUserForm() {
  const router = useRouter();
  const [successOpen, setSuccessOpen] = useState(false);
  const groupOptionsQuery = useUserGroupOptionsQuery();
  const createUserMutation = useCreateUserMutation();
  const form = useForm<UserCreateFormValues>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
      email: '',
      fullName: '',
      password: '',
      groupCodes: ['operator'],
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await createUserMutation.mutateAsync(values);
      setSuccessOpen(true);
    } catch {
      // Mutation state renders the API error below the fields.
    }
  });

  return (
    <>
      <UserFormFrame
        title="Create user"
        description="Create an admin account and assign groups."
        error={createUserMutation.error}
        pending={createUserMutation.isPending}
        onSubmit={onSubmit}
      >
        <FieldError message={form.formState.errors.fullName?.message}>
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" {...form.register('fullName')} />
        </FieldError>

        <FieldError message={form.formState.errors.email?.message}>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...form.register('email')} />
        </FieldError>

        <FieldError message={form.formState.errors.password?.message}>
          <Label htmlFor="password">Temporary password</Label>
          <Input id="password" type="password" {...form.register('password')} />
        </FieldError>

        <GroupSelector
          groups={groupOptionsQuery.data ?? []}
          selectedGroups={form.watch('groupCodes')}
          error={form.formState.errors.groupCodes?.message}
          onChange={(groupCodes) =>
            form.setValue('groupCodes', groupCodes, { shouldValidate: true })
          }
        />
      </UserFormFrame>
      <FeedbackDialog
        open={successOpen}
        tone="success"
        title="User created"
        description="The user account has been created successfully."
        confirmLabel="Back to users"
        onConfirm={() => router.push(routes.users)}
      />
    </>
  );
}

function EditUserForm({ user }: { user: UserListItem }) {
  const router = useRouter();
  const [successOpen, setSuccessOpen] = useState(false);
  const groupOptionsQuery = useUserGroupOptionsQuery();
  const updateUserMutation = useUpdateUserMutation(user.id);
  const form = useForm<UserEditFormValues>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      fullName: user.fullName,
      status: user.status,
      groupCodes: user.groups.map((group) => group.code),
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await updateUserMutation.mutateAsync(values);
      setSuccessOpen(true);
    } catch {
      // Mutation state renders the API error below the fields.
    }
  });

  return (
    <>
      <UserFormFrame
        title="Edit user"
        description="Update profile, status, and groups."
        error={updateUserMutation.error}
        pending={updateUserMutation.isPending}
        onSubmit={onSubmit}
      >
        <FieldError message={form.formState.errors.fullName?.message}>
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" {...form.register('fullName')} />
        </FieldError>

        <div className="space-y-1.5">
          <Label htmlFor="emailReadOnly">Email</Label>
          <Input id="emailReadOnly" value={user.email} readOnly className="bg-secondary/50" />
        </div>

        <FieldError message={form.formState.errors.status?.message}>
          <Label>Status</Label>
          <Select
            value={form.watch('status')}
            onValueChange={(value: UserStatus) =>
              form.setValue('status', value, { shouldValidate: true })
            }
          >
            <SelectTrigger>
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
        </FieldError>

        <GroupSelector
          groups={groupOptionsQuery.data ?? []}
          selectedGroups={form.watch('groupCodes')}
          error={form.formState.errors.groupCodes?.message}
          onChange={(groupCodes) =>
            form.setValue('groupCodes', groupCodes, { shouldValidate: true })
          }
        />
      </UserFormFrame>
      <FeedbackDialog
        open={successOpen}
        tone="success"
        title="User updated"
        description="The user account has been updated successfully."
        confirmLabel="Back to users"
        onConfirm={() => router.push(routes.users)}
      />
    </>
  );
}

function UserFormFrame({
  children,
  description,
  error,
  onSubmit,
  pending,
  title,
}: {
  children: React.ReactNode;
  description: string;
  error: unknown;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  pending: boolean;
  title: string;
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        <Button asChild variant="outline">
          <Link href={routes.users}>
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
            <Link href={routes.users}>Cancel</Link>
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

function GroupSelector({
  error,
  groups,
  onChange,
  selectedGroups,
}: {
  error: string | undefined;
  groups: UserGroupSummary[];
  onChange: (groupCodes: string[]) => void;
  selectedGroups: string[];
}) {
  return (
    <FieldError message={error}>
      <p className="text-sm font-medium">Groups</p>
      <div className="grid gap-2">
        {groups.map((group) => (
          <div
            key={group.code}
            className="flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm"
          >
            <Checkbox
              id={`group-${group.code}`}
              checked={selectedGroups.includes(group.code)}
              onCheckedChange={(checked) => {
                const nextGroups =
                  checked === true
                    ? [...selectedGroups, group.code]
                    : selectedGroups.filter((code) => code !== group.code);
                onChange(nextGroups);
              }}
            />
            <Label htmlFor={`group-${group.code}`} className="flex-1">
              {group.name}
            </Label>
          </div>
        ))}
      </div>
    </FieldError>
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

function getMutationMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  return 'Unable to save user. Please try again.';
}
