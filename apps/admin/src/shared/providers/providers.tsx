'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from '@/shared/lib/query-client';
import { ThemeProvider } from './theme-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={getQueryClient()}>{children}</QueryClientProvider>
    </ThemeProvider>
  );
}
