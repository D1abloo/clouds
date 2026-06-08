import { ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PermissionsGuard } from './permissions.guard'

describe('PermissionsGuard', () => {
  const reflector = new Reflector()
  const guard = new PermissionsGuard(reflector)

  const mockContext = (
    user: { roles: string[]; permissions?: string[] } | null,
    permissions?: string[],
  ) => {
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
    expect(guard.canActivate(mockContext({ roles: ['solo_lectura'] }))).toBe(true)
  })

  it('allows superadministrador for any permission', () => {
    expect(
      guard.canActivate(
        mockContext({ roles: ['superadministrador'], permissions: [] }, ['configuracion.gestionar']),
      ),
    ).toBe(true)
  })

  it('allows legacy super_admin for any permission', () => {
    expect(
      guard.canActivate(
        mockContext({ roles: ['super_admin'], permissions: [] }, ['configuracion.gestionar']),
      ),
    ).toBe(true)
  })

  it('allows when user has required permission code', () => {
    expect(
      guard.canActivate(
        mockContext(
          { roles: ['auditor'], permissions: ['auditoria.leer', 'usuarios.leer'] },
          ['auditoria.leer'],
        ),
      ),
    ).toBe(true)
  })

  it('denies when user lacks permission', () => {
    expect(() =>
      guard.canActivate(
        mockContext({ roles: ['solo_lectura'], permissions: ['usuarios.leer'] }, [
          'configuracion.gestionar',
        ]),
      ),
    ).toThrow(ForbiddenException)
  })
})
