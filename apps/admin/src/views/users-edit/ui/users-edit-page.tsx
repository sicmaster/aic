'use client';

import { Loader2 } from 'lucide-react';
import { useUserQuery } from '@/entities/user/hooks';
import { UserForm } from '@/features/user-form/ui/user-form';

export function UsersEditPage({ userId }: { userId: string }) {
  const userQuery = useUserQuery(userId);

  if (userQuery.isLoading) {
    return (
      <div className="grid min-h-80 place-items-center text-muted">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading user
        </div>
      </div>
    );
  }

  if (!userQuery.data?.user) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted">
        User not found.
      </div>
    );
  }

  return <UserForm mode="edit" user={userQuery.data.user} />;
}
