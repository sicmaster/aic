export type AuditActor = {
  id: string;
  email: string;
  fullName: string;
} | null;

export type AuditLogItem = {
  id: string;
  actor: AuditActor;
  action: string;
  entityType: string;
  entityId: string | null;
  requestId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown;
  createdAt: string;
};

export type AuditLogsPagination = {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type ListAuditLogsParams = {
  page?: number;
  pageSize?: number;
  action?: string | undefined;
  entityType?: string | undefined;
  search?: string | undefined;
};

export type ListAuditLogsResponse = {
  items: AuditLogItem[];
  pagination: AuditLogsPagination;
};
