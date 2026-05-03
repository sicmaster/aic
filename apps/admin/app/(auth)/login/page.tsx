import { Suspense } from 'react';
import { LoginPage } from '@/views/login/ui/login-page';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginPage />
    </Suspense>
  );
}
