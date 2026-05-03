import { useQuery } from '@tanstack/react-query';
import { listAuditLogs } from './api';
import type { ListAuditLogsParams } from './types';

export const auditLogsQueryKey = (params: ListAuditLogsParams) =>
  ['audit-logs', 'list', params] as const;

export function useAuditLogsQuery(params: ListAuditLogsParams) {
  return useQuery({
    queryKey: auditLogsQueryKey(params),
    queryFn: () => listAuditLogs(params),
  });
}
