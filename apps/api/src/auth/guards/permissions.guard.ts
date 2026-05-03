import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppException } from '../../common/errors/app.exception';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import type { AuthenticatedRequest } from './authenticated-session.guard';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const grantedPermissions = new Set(request.auth.permissions);
    const allowed = requiredPermissions.every((permission) => grantedPermissions.has(permission));

    if (!allowed) {
      throw new AppException(
        {
          code: 'PERMISSION_DENIED',
          message: 'You do not have permission to perform this action.',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
