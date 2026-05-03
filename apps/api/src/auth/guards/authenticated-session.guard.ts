import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AuthService } from '../auth.service';
import type { AuthSessionPayload } from '../auth.types';
import { readSessionToken, type RequestWithCookies } from '../session-token';

export type AuthenticatedRequest = FastifyRequest & {
  auth: AuthSessionPayload;
  cookies?: Record<string, string | undefined>;
};

@Injectable()
export class AuthenticatedSessionGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithCookies & Partial<AuthenticatedRequest>>();
    const sessionToken = readSessionToken(request, this.authService.getSessionCookieName());

    request.auth = await this.authService.getCurrentSession(sessionToken);

    return true;
  }
}
