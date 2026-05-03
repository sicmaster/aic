import { Suspense } from 'react';
import { AuditLogsPage } from '@/views/audit-logs/ui/audit-logs-page';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AuditLogsPage />
    </Suspense>
  );
}
