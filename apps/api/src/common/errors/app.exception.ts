import { HttpException, HttpStatus } from '@nestjs/common';
import type { ApiFieldErrors } from '@aic/types';
import { ApiErrorCode, type ApiErrorCode as ApiErrorCodeValue } from './api-error-code';

export type AppExceptionResponse = {
  code: ApiErrorCodeValue | string;
  message: string;
  fieldErrors?: ApiFieldErrors;
};

export class AppException extends HttpException {
  constructor(response: AppExceptionResponse, status: HttpStatus) {
    super(response, status);
  }

  static validation(message: string, fieldErrors: ApiFieldErrors): AppException {
    return new AppException(
      {
        code: ApiErrorCode.VALIDATION_ERROR,
        message,
        fieldErrors,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
