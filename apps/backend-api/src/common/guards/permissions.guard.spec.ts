import { ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PermissionsGuard } from './permissions.guard'
import { PERMISSIONS_KEY } from '../decorators/auth.decorators'

describe('PermissionsGuard', () => {
  const reflector = new Reflector()
  const guard = new PermissionsGuard(reflector)

  const mockContext = (user: { roles: string[] } | null, permissions?: string[]) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(permissions)
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as never
  }

  it('allows access when no permissions required', () => {
    expect(guard.canActivate(mockContext({ roles: ['viewer'] }))).toBe(true)
  })

  it('allows super_admin for any permission', () => {
    expect(
      guard.canActivate(mockContext({ roles: ['super_admin'] }, ['terraform:write'])),
    ).toBe(true)
  })

  it('denies when user lacks permission', () => {
    expect(() =>
      guard.canActivate(mockContext({ roles: ['viewer'] }, ['terraform:write'])),
    ).toThrow(ForbiddenException)
  })
})
