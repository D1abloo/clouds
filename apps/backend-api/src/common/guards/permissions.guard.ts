import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PERMISSIONS_KEY } from '../decorators/auth.decorators'
import { JwtPayload } from '../decorators/current-user.decorator'

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
    const userPerms: string[] = user?.roles ?? []

    const hasPermission = required.some((p) => userPerms.includes(p) || userPerms.includes('super_admin'))
    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions')
    }
    return true
  }
}
