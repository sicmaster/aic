'use client';

import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSessionQuery } from '@/entities/session/hooks';
import { buildLoginPath, getSessionState } from '@/shared/lib/auth';
import { AppShell } from '@/widgets/app-shell/ui/app-shell';

export function ProtectedDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const sessionQuery = useSessionQuery();
  const sessionState = getSessionState(
    sessionQuery.isLoading,
    sessionQuery.data,
    sessionQuery.error,
  );

  useEffect(() => {
    if (sessionState === 'anonymous') {
      router.replace(buildLoginPath(pathname));
    }
  }, [pathname, router, sessionState]);

  if (sessionState !== 'authenticated' || !sessionQuery.data) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading workspace
        </div>
      </main>
    );
  }

  return <AppShell session={sessionQuery.data}>{children}</AppShell>;
}
