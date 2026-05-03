'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2, LogIn } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useLoginMutation } from '@/entities/session/hooks';
import { ApiClientError } from '@/shared/api/api-client';
import { resolvePostLoginPath } from '@/shared/lib/auth';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
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
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          className="h-11"
          {...form.register('email')}
        />
        {form.formState.errors.email ? (
          <p className="text-xs text-red-400">{form.formState.errors.email.message}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          className="h-11"
          {...form.register('password')}
        />
        {form.formState.errors.password ? (
          <p className="text-xs text-red-400">{form.formState.errors.password.message}</p>
        ) : null}
      </div>

      {errorMessage ? (
        <div className="flex gap-2 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{errorMessage}</p>
        </div>
      ) : null}

      <Button type="submit" disabled={loginMutation.isPending} className="h-11 w-full">
        {loginMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <LogIn className="h-4 w-4" aria-hidden="true" />
        )}
        Sign in
      </Button>
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
