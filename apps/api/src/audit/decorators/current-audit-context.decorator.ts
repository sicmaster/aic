import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { AuditContext } from '../audit.types';

type RequestLike = FastifyRequest & {
  id?: string;
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
};

export const CurrentAuditContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuditContext => {
    const request = context.switchToHttp().getRequest<RequestLike>();

    return {
      ipAddress: request.ip,
      requestId: getRequestId(request),
      userAgent: getFirstHeader(request.headers['user-agent']),
    };
  },
);

function getRequestId(request: RequestLike): string | undefined {
  const header = request.headers['x-request-id'];

  if (typeof request.id === 'string' && request.id.length > 0) {
    return request.id;
  }

  return getFirstHeader(header);
}

function getFirstHeader(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0];
  }

  return undefined;
}
