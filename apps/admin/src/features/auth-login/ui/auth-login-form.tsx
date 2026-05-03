'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2, LogIn } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useLoginMutation } from '@/entities/session/hooks';
import { ApiClientError } from '@/shared/api/api-client';
import { resolvePostLoginPath } from '@/shared/lib/auth';
import { loginSchema, type LoginFormValues } from '../schemas';

export function AuthLoginForm() {
  const searchParams = useSearchParams();
  const loginMutation = useLoginMutation();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await loginMutation.mutateAsync(values);
    window.location.replace(resolvePostLoginPath(searchParams.get('next')));
  });

  const errorMessage = getLoginErrorMessage(loginMutation.error);

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-ink" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          {...form.register('email')}
        />
        {form.formState.errors.email ? (
          <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-ink" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          {...form.register('password')}
        />
        {form.formState.errors.password ? (
          <p className="text-xs text-red-600">{form.formState.errors.password.message}</p>
        ) : null}
      </div>

      {errorMessage ? (
        <div className="flex gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{errorMessage}</p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loginMutation.isPending}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loginMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <LogIn className="h-4 w-4" aria-hidden="true" />
        )}
        Sign in
      </button>
    </form>
  );
}

function getLoginErrorMessage(error: unknown): string | undefined {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error) {
    return 'Unable to sign in. Please try again.';
  }

  return undefined;
}
