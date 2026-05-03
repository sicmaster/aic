'use client';

import { Loader2 } from 'lucide-react';
import { useMenusQuery } from '@/entities/access-control/hooks';
import { MenuForm } from '@/features/menu-form/ui/menu-form';

export function MenusCreatePage() {
  const menusQuery = useMenusQuery();

  if (menusQuery.isLoading) {
    return (
      <div className="grid min-h-80 place-items-center text-muted">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading menus
        </div>
      </div>
    );
  }

  return <MenuForm mode="create" menus={menusQuery.data?.items ?? []} />;
}
