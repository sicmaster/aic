import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthSessionPayload } from '../auth.types';
import type { AuthenticatedRequest } from '../guards/authenticated-session.guard';

export const CurrentSession = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthSessionPayload => {
    return context.switchToHttp().getRequest<AuthenticatedRequest>().auth;
  },
);
