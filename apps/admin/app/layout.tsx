import type { Metadata } from 'next';
import { Providers } from '@/shared/providers/providers';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'AIC Admin',
  description: 'AIC internal administration console',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
