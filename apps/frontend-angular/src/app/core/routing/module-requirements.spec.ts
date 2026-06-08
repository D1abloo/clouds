import {
  EXTERNAL_CONNECTION_COPY,
  MODULE_REQUIREMENTS,
} from './module-requirements.config'
import {
  DEPRECATED_GENERIC_INTEGRATION_MSG,
  getExternalConnectionCopy,
  getInternalEmptyCopy,
  isInternalAdminRoute,
  requiresExternalConnection,
  resolveConnectionCopy,
  resolveModuleId,
  resolveModuleIdFromPath,
  shouldBlockForMissingConnection,
} from './module-requirements.util'

describe('module-requirements', () => {
  it('marca módulos internos sin conexión externa obligatoria', () => {
    for (const id of ['dashboard', 'users', 'roles', 'audit', 'notifications', 'runbooks']) {
      expect(MODULE_REQUIREMENTS[id]?.requiresExternalConnection).toBe(false)
      expect(shouldBlockForMissingConnection(id)).toBe(false)
    }
  })

  it('bloquea proveedores externos e infra sin datos en vivo', () => {
    for (const id of [
      'aws',
      'gcp',
      'azure',
      'github',
      'gitlab',
      'jenkins',
      'vps',
      'docker',
      'kubernetes',
      'terraform',
      'network',
      'storage',
      'backups',
      'branches',
      'commits',
      'pull-requests',
      'deployments',
    ]) {
      expect(requiresExternalConnection(id)).toBe(true)
      expect(shouldBlockForMissingConnection(id)).toBe(true)
      expect(shouldBlockForMissingConnection(id, true)).toBe(false)
    }
  })

  it('resuelve rutas del sidebar a ids de módulo', () => {
    expect(resolveModuleIdFromPath('/admin/users')).toBe('users')
    expect(resolveModuleIdFromPath('/dashboard')).toBe('dashboard')
    expect(resolveModuleIdFromPath('/cloud/aws/instances')).toBe('aws')
    expect(resolveModuleId('Usuarios')).toBe('users')
  })

  it('expone copy corto por proveedor externo', () => {
    const aws = getExternalConnectionCopy('aws')
    expect(aws.actionLabel).toBe('Añadir cuenta AWS')
    expect(aws.title).toContain('AWS')
    expect(aws.description).not.toContain(DEPRECATED_GENERIC_INTEGRATION_MSG)
    expect(resolveConnectionCopy('github').actionRoute).toBe('/repositories/github')
    expect(resolveConnectionCopy('metrics').actionLabel).toBe('Conectar fuente')
  })

  it('acciones de conexión apuntan solo a rutas internas', () => {
    for (const provider of Object.keys(EXTERNAL_CONNECTION_COPY) as Array<keyof typeof EXTERNAL_CONNECTION_COPY>) {
      const copy = EXTERNAL_CONNECTION_COPY[provider]
      expect(isInternalAdminRoute(copy.actionRoute)).toBe(true)
    }
  })

  it('usa empty state interno por defecto', () => {
    const empty = getInternalEmptyCopy('reports')
    expect(empty.title).toBe('Sin datos todavía')
    expect(empty.message).toContain('Cuando haya actividad')
  })

  it('asistente IA usa mensaje inline específico', () => {
    const ai = resolveConnectionCopy('ai-assistant')
    expect(ai.title).toBe('Asistente no disponible')
    expect(ai.actionLabel).toBe('Configurar IA')
    expect(ai.description).not.toContain('integración aún no está conectada')
  })

  it('no incluye el mensaje genérico largo en copy de proveedores', () => {
    for (const provider of Object.keys(EXTERNAL_CONNECTION_COPY) as Array<keyof typeof EXTERNAL_CONNECTION_COPY>) {
      const copy = EXTERNAL_CONNECTION_COPY[provider]
      expect(copy.description).not.toContain('Esta integración aún no está conectada')
    }
  })
})
