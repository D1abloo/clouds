import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PERMISSIONS_KEY } from '../decorators/auth.decorators'
import { JwtPayload } from '../decorators/current-user.decorator'
import { hasAnyPermission } from '../rbac/rbac.util'

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!required?.length) return true

    const user = context.switchToHttp().getRequest().user as JwtPayload
    if (!hasAnyPermission(user?.permissions, user?.roles, required)) {
      throw new ForbiddenException('Permisos insuficientes')
    }
    return true
  }
}
