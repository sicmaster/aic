import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ApiErrorResponse } from '@aic/types';
import { ApiErrorCode } from '../errors/api-error-code';

type RequestLike = {
  id?: string;
  headers?: Record<string, string | string[] | undefined>;
  method?: string;
  url?: string;
};

type ReplyLike = {
  status: (statusCode: number) => ReplyLike;
  send: (body: unknown) => void;
};

type NormalizedError = {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestLike>();
    const reply = context.getResponse<ReplyLike>();
    const statusCode = this.getStatusCode(exception);
    const error = this.normalizeException(exception, statusCode);
    const requestId = getRequestId(request);

    if (statusCode >= 500) {
      this.logger.error(
        {
          err: exception,
          requestId,
          method: request.method,
          url: request.url,
        },
        error.message,
      );
    }

    const body: ApiErrorResponse = {
      success: false,
      error,
      ...(requestId ? { meta: { requestId } } : {}),
    };

    reply.status(statusCode).send(body);
  }

  private getStatusCode(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private normalizeException(exception: unknown, statusCode: number): NormalizedError {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return {
          code: codeFromStatus(statusCode),
          message: response,
        };
      }

      if (isRecord(response)) {
        return {
          code: readString(response.code) ?? codeFromStatus(statusCode),
          message: readMessage(response.message, exception.message),
          ...(isFieldErrors(response.fieldErrors) ? { fieldErrors: response.fieldErrors } : {}),
        };
      }

      return {
        code: codeFromStatus(statusCode),
        message: exception.message,
      };
    }

    return {
      code: ApiErrorCode.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    };
  }
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readMessage(value: unknown, fallback: string): string {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string').join('; ') || fallback;
  }

  return readString(value) ?? fallback;
}

function isFieldErrors(value: unknown): value is Record<string, string[]> {
  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every(
    (messages) =>
      Array.isArray(messages) && messages.every((message) => typeof message === 'string'),
  );
}

function codeFromStatus(statusCode: number): string {
  switch (statusCode) {
    case HttpStatus.BAD_REQUEST:
      return ApiErrorCode.BAD_REQUEST;
    case HttpStatus.UNAUTHORIZED:
      return ApiErrorCode.UNAUTHORIZED;
    case HttpStatus.FORBIDDEN:
      return ApiErrorCode.FORBIDDEN;
    case HttpStatus.NOT_FOUND:
      return ApiErrorCode.NOT_FOUND;
    case HttpStatus.CONFLICT:
      return ApiErrorCode.CONFLICT;
    case HttpStatus.TOO_MANY_REQUESTS:
      return ApiErrorCode.RATE_LIMITED;
    case HttpStatus.SERVICE_UNAVAILABLE:
      return ApiErrorCode.SERVICE_UNAVAILABLE;
    default:
      return statusCode >= 500 ? ApiErrorCode.INTERNAL_SERVER_ERROR : ApiErrorCode.BAD_REQUEST;
  }
}
