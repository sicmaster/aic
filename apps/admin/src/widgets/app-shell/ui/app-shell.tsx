'use client';

import {
  Activity,
  ChevronLeft,
  ChevronRight,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type CSSProperties } from 'react';
import type { Session, SessionMenu } from '@/entities/session/types';
import { useLogoutMutation } from '@/entities/session/hooks';
import { routes } from '@/shared/lib/routes';
import { cn } from '@/shared/lib/utils';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { Separator } from '@/shared/ui/separator';
import { ThemeToggle } from '@/shared/ui/theme-toggle';

const iconMap: Record<string, LucideIcon> = {
  history: History,
  menu: Menu,
  settings: Settings,
  'shield-check': ShieldCheck,
  users: Users,
  'users-round': UsersRound,
};
const expandedSidebarWidth = 288;
const collapsedSidebarWidth = 72;
const sidebarCollapsedStorageKey = 'aic-admin-sidebar-collapsed';

export function AppShell({ children, session }: { children: React.ReactNode; session: Session }) {
  const pathname = usePathname();
  const router = useRouter();
  const logoutMutation = useLogoutMutation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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

  useEffect(() => {
    const storedCollapsed = window.localStorage.getItem(sidebarCollapsedStorageKey);

    if (storedCollapsed === 'true' || storedCollapsed === 'false') {
      setSidebarCollapsed(storedCollapsed === 'true');
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(sidebarCollapsedStorageKey, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={
        {
          '--sidebar-width': `${sidebarCollapsed ? collapsedSidebarWidth : expandedSidebarWidth}px`,
        } as CSSProperties
      }
    >
      <aside className="fixed inset-y-0 left-0 hidden w-[var(--sidebar-width)] border-r bg-card transition-[width] duration-200 lg:block">
        <SidebarContent
          collapsed={sidebarCollapsed}
          navigation={navigation}
          pathname={pathname}
          session={session}
          onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
        />
      </aside>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/35"
            aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative z-10 h-full w-72 border-r bg-card shadow-xl">
            <SidebarContent
              navigation={navigation}
              pathname={pathname}
              session={session}
              collapsed={false}
              onNavigate={() => setMobileNavOpen(false)}
              onClose={() => setMobileNavOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-[var(--sidebar-width)]">
        <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
          <div className="flex h-16 items-center justify-between px-4 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open navigation"
              >
                <Menu size={18} aria-hidden="true" />
              </Button>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{getHeaderTitle(pathname)}</p>
                <p className="truncate text-xs text-muted">AIC internal administration console</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 gap-3 px-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{getInitials(session.user.fullName)}</AvatarFallback>
                    </Avatar>
                    <div className="hidden min-w-0 text-left sm:block">
                      <p className="truncate text-sm font-medium">{session.user.fullName}</p>
                      <p className="truncate text-xs text-muted">{session.user.email}</p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    <p>{session.user.fullName}</p>
                    <p className="text-xs font-normal text-muted">{session.user.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={logoutMutation.isPending}
                    onClick={() => void handleLogout()}
                    className="text-danger focus:text-danger"
                  >
                    <LogOut size={16} aria-hidden="true" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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

function SidebarContent({
  collapsed,
  navigation,
  onClose,
  onNavigate,
  onToggleCollapsed,
  pathname,
  session,
}: {
  collapsed: boolean;
  navigation: NavigationItem[];
  onClose?: () => void;
  onNavigate?: () => void;
  onToggleCollapsed?: () => void;
  pathname: string;
  session: Session;
}) {
  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          'flex h-16 items-center gap-3 px-4',
          collapsed ? 'justify-center px-3' : 'justify-between',
        )}
      >
        <div
          className={cn(
            'flex min-w-0 items-center gap-3',
            collapsed && 'w-full justify-center gap-0',
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Activity size={17} aria-hidden="true" />
          </div>
          <div className={cn('min-w-0', collapsed && 'hidden')}>
            <p className="truncate text-sm font-semibold leading-5">AIC Admin</p>
            <p className="text-xs text-muted">Operations console</p>
          </div>
        </div>
        {onClose ? (
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X size={16} aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      <Separator />
      <nav
        className={cn('flex-1 space-y-1 overflow-y-auto py-4', collapsed ? 'px-2' : 'px-3')}
        aria-label="Primary navigation"
      >
        {navigation.map((item) => (
          <SidebarNavigationItem
            active={isActivePath(pathname, item.href)}
            collapsed={collapsed}
            item={item}
            key={item.id}
            {...(onNavigate ? { onNavigate } : {})}
          />
        ))}
      </nav>
      {onToggleCollapsed ? (
        <div className={cn('border-t border-border p-3', collapsed && 'px-2')}>
          <Button
            type="button"
            variant="ghost"
            className={cn('h-9 w-full', collapsed ? 'px-0' : 'justify-start')}
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight size={16} aria-hidden="true" />
            ) : (
              <ChevronLeft size={16} aria-hidden="true" />
            )}
            <span className={cn(collapsed && 'sr-only')}>{collapsed ? 'Expand' : 'Collapse'}</span>
          </Button>
        </div>
      ) : null}
      <div className={cn('p-4', collapsed && 'hidden')}>
        <div className="rounded-lg border bg-background p-3 text-xs text-muted">
          <p className="font-medium text-foreground">Session</p>
          <p className="mt-1">Expires {new Date(session.expiresAt).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}

function SidebarNavigationItem({
  active,
  collapsed,
  item,
  onNavigate,
}: {
  active: boolean;
  collapsed: boolean;
  item: NavigationItem;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  return (
    <Button
      asChild
      variant={active ? 'secondary' : 'ghost'}
      className={cn(
        'h-10 w-full font-medium',
        collapsed ? 'justify-center px-0' : 'justify-start gap-3 px-3',
        !collapsed && item.level > 1 && 'pl-9',
        active
          ? 'border border-border bg-secondary text-foreground shadow-sm'
          : 'text-muted hover:text-foreground',
      )}
    >
      <Link
        href={item.href}
        title={collapsed ? item.label : undefined}
        {...(onNavigate ? { onClick: onNavigate } : {})}
      >
        <Icon size={17} aria-hidden="true" />
        <span className={cn('truncate', collapsed && 'sr-only')}>{item.label}</span>
      </Link>
    </Button>
  );
}

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

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getHeaderTitle(pathname: string): string {
  if (pathname.startsWith('/setting/users')) {
    return 'User management';
  }

  if (pathname.startsWith('/setting/groups')) {
    return 'Group policies';
  }

  if (pathname.startsWith('/setting/policies')) {
    return 'Policies';
  }

  if (pathname.startsWith('/setting/menus')) {
    return 'Menus';
  }

  if (pathname.startsWith('/setting/audit-logs')) {
    return 'Audit logs';
  }

  return 'Dashboard';
}
