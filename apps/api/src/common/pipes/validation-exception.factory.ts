import { ValidationError } from 'class-validator';
import type { ApiFieldErrors } from '@aic/types';
import { AppException } from '../errors/app.exception';

export function createValidationException(errors: ValidationError[]): AppException {
  return AppException.validation('Validation failed', collectFieldErrors(errors));
}

function collectFieldErrors(errors: ValidationError[], parentPath?: string): ApiFieldErrors {
  return errors.reduce<ApiFieldErrors>((fieldErrors, error) => {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;
    const messages = error.constraints ? Object.values(error.constraints) : [];

    if (messages.length > 0) {
      fieldErrors[path] = messages;
    }

    if (error.children && error.children.length > 0) {
      Object.assign(fieldErrors, collectFieldErrors(error.children, path));
    }

    return fieldErrors;
  }, {});
}
