import { apiGet } from '@/shared/api/api-client';
import type { ListAuditLogsParams, ListAuditLogsResponse } from './types';

export function listAuditLogs(params: ListAuditLogsParams): Promise<ListAuditLogsResponse> {
  return apiGet<ListAuditLogsResponse>(`/audit-logs${buildQueryString(params)}`);
}

function buildQueryString(params: ListAuditLogsParams): string {
  const searchParams = new URLSearchParams();

  if (params.page) {
    searchParams.set('page', String(params.page));
  }

  if (params.pageSize) {
    searchParams.set('pageSize', String(params.pageSize));
  }

  if (params.action) {
    searchParams.set('action', params.action);
  }

  if (params.entityType) {
    searchParams.set('entityType', params.entityType);
  }

  if (params.search) {
    searchParams.set('search', params.search);
  }

  const queryString = searchParams.toString();

  return queryString ? `?${queryString}` : '';
}
