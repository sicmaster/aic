import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { ApiResponse } from '@aic/types';
import { map, Observable } from 'rxjs';

type RequestLike = {
  id?: string;
  headers?: Record<string, string | string[] | undefined>;
};

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<RequestLike>();
    const requestId = getRequestId(request);

    return next.handle().pipe(
      map((data): ApiResponse<T> => {
        if (isApiResponse<T>(data)) {
          return data;
        }

        return {
          success: true,
          data,
          ...(requestId ? { meta: { requestId } } : {}),
        };
      }),
    );
  }
}

function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof (value as { success?: unknown }).success === 'boolean'
  );
}

function getRequestId(request: RequestLike): string | undefined {
  const header = request.headers?.['x-request-id'];

  if (typeof request.id === 'string' && request.id.length > 0) {
    return request.id;
  }

  if (typeof header === 'string' && header.length > 0) {
    return header;
  }

  if (Array.isArray(header)) {
    return header[0];
  }

  return undefined;
}
