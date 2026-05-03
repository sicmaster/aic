'use client';

import { Loader2 } from 'lucide-react';
import { useMenuQuery, useMenusQuery } from '@/entities/access-control/hooks';
import { MenuForm } from '@/features/menu-form/ui/menu-form';

export function MenusEditPage({ menuCode }: { menuCode: string }) {
  const menuQuery = useMenuQuery(menuCode);
  const menusQuery = useMenusQuery();
  const loading = menuQuery.isLoading || menusQuery.isLoading;

  if (loading) {
    return (
      <div className="grid min-h-80 place-items-center text-muted">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading menu
        </div>
      </div>
    );
  }

  if (!menuQuery.data?.menu) {
    return (
      <div className="rounded-md border border-border bg-panel p-6 text-sm text-muted">
        Menu not found.
      </div>
    );
  }

  return <MenuForm mode="edit" menu={menuQuery.data.menu} menus={menusQuery.data?.items ?? []} />;
}
