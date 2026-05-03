'use client';

import {
  Activity,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { Session, SessionMenu } from '@/entities/session/types';
import { useLogoutMutation } from '@/entities/session/hooks';
import { routes } from '@/shared/lib/routes';

const iconMap: Record<string, LucideIcon> = {
  history: History,
  menu: Menu,
  settings: Settings,
  'shield-check': ShieldCheck,
  users: Users,
  'users-round': UsersRound,
};

export function AppShell({ children, session }: { children: React.ReactNode; session: Session }) {
  const pathname = usePathname();
  const router = useRouter();
  const logoutMutation = useLogoutMutation();
  const navigation = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: routes.dashboard,
      icon: LayoutDashboard,
      level: 1,
    },
    ...flattenMenus(session.menus),
  ];

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    router.replace(routes.login);
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-panel lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-border px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-white">
            <Activity size={18} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-5">AIC Admin</p>
            <p className="text-xs text-muted">Operations console</p>
          </div>
        </div>
        <nav className="space-y-1 px-3 py-4" aria-label="Primary navigation">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.id}
                href={item.href}
                className={[
                  'flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium',
                  item.level > 1 ? 'pl-8' : '',
                  active ? 'bg-slate-100 text-ink' : 'text-muted hover:bg-slate-50 hover:text-ink',
                ].join(' ')}
              >
                <Icon size={17} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-panel px-4 lg:px-8">
          <div>
            <p className="text-sm font-semibold">Dashboard</p>
            <p className="text-xs text-muted">API and operational readiness</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{session.user.fullName}</p>
              <p className="text-xs text-muted">{session.user.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted transition hover:bg-slate-50 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut size={16} aria-hidden="true" />
            </button>
          </div>
        </header>
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

type NavigationItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  level: number;
};

function flattenMenus(menus: SessionMenu[]): NavigationItem[] {
  return menus.flatMap((menu) => {
    const item = toNavigationItem(menu);
    const children = flattenMenus(menu.children);

    return item ? [item, ...children] : children;
  });
}

function toNavigationItem(menu: SessionMenu): NavigationItem | undefined {
  if (!menu.path) {
    return undefined;
  }

  return {
    id: menu.id,
    label: menu.label,
    href: menu.path,
    icon: menu.icon ? (iconMap[menu.icon] ?? Menu) : Menu,
    level: menu.level,
  };
}

function isActivePath(pathname: string, href: string): boolean {
  if (href === routes.dashboard) {
    return pathname === routes.dashboard;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
