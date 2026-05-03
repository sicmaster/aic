export type AuditContext = {
  ipAddress: string | undefined;
  requestId: string | undefined;
  userAgent: string | undefined;
};

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

export type ListAuditLogsResult = {
  items: AuditLogItem[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    pageCount: number;
  };
};

export type RecordAuditLogInput = AuditContext & {
  action: string;
  actorUserId: string | null;
  entityId?: string | null;
  entityType: string;
  metadata?: unknown;
};
