'use client';

import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useSessionQuery } from '@/entities/session/hooks';
import { AuthLoginForm } from '@/features/auth-login/ui/auth-login-form';
import { getSessionState, resolvePostLoginPath } from '@/shared/lib/auth';
import { ThemeToggle } from '@/shared/ui/theme-toggle';

export function LoginPage() {
  const searchParams = useSearchParams();
  const sessionQuery = useSessionQuery();
  const sessionState = getSessionState(
    sessionQuery.isLoading,
    sessionQuery.data,
    sessionQuery.error,
  );

  useEffect(() => {
    if (sessionState === 'authenticated') {
      window.location.replace(resolvePostLoginPath(searchParams.get('next')));
    }
  }, [searchParams, sessionState]);

  if (sessionState === 'loading' || sessionState === 'authenticated') {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Checking session
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen bg-background px-4 py-8 text-foreground lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,0.55fr)] lg:px-8">
      <div className="absolute right-4 top-4 lg:right-8">
        <ThemeToggle />
      </div>
      <section className="hidden items-center lg:flex">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            AIC Admin
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-normal text-foreground">
            Operational access for internal teams
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted">
            Sign in to manage users, policies, menus, and operational workflows.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-sm font-semibold text-primary">AIC Admin</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal">Sign in</h2>
            <p className="mt-1 text-sm text-muted">Use your internal admin account.</p>
          </div>
          <AuthLoginForm />
        </div>
      </section>
    </main>
  );
}
