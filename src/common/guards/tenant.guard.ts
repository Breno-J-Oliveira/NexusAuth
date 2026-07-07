import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TENANT_KEY } from '../decorators/tenant.decorator';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiresTenant = this.reflector.getAllAndOverride<boolean>(
      TENANT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiresTenant) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.tenantId) {
      throw new ForbiddenException({
        code: 'NO_TENANT_CONTEXT',
        message: 'This endpoint requires a tenant context',
      });
    }

    return true;
  }
}
