import { Suspense } from 'react';
import { UsersPage } from '@/views/users/ui/users-page';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <UsersPage />
    </Suspense>
  );
}
