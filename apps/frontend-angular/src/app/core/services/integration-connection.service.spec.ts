import { TestBed } from '@angular/core/testing'
import { MatDialog } from '@angular/material/dialog'
import { of } from 'rxjs'
import { IntegrationConnectionService } from './integration-connection.service'
import {
  EXTERNAL_CONNECTION_COPY,
  MODULE_REQUIREMENTS,
} from '../routing/module-requirements.config'
import { isInternalAdminRoute, resolveConnectionCopy } from '../routing/module-requirements.util'

describe('IntegrationConnectionService', () => {
  let service: IntegrationConnectionService
  const openSpy = jasmine.createSpy('open').and.returnValue({ afterClosed: () => of(null) })

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        IntegrationConnectionService,
        { provide: MatDialog, useValue: { open: openSpy } },
      ],
    })
    service = TestBed.inject(IntegrationConnectionService)
    openSpy.calls.reset()
  })

  it('openForModuleId abre modal sin rutas públicas', () => {
    for (const id of ['aws', 'gcp', 'azure', 'github', 'gitlab', 'jenkins', 'vps', 'docker', 'kubernetes']) {
      service.openForModuleId(id).subscribe()
      expect(openSpy).toHaveBeenCalled()
      openSpy.calls.reset()
    }
  })

  it('fallbackRouteForAlias devuelve rutas internas del panel', () => {
    for (const alias of ['aws', 'gcp', 'azure', 'github', 'gitlab', 'jenkins', 'docker', 'kubernetes']) {
      const route = service.fallbackRouteForAlias(alias)
      expect(isInternalAdminRoute(route)).toBe(true)
      expect(route).not.toBe('/')
      expect(route).not.toBe('/registro')
      expect(route).not.toBe('/producto')
    }
  })

  it('copy de conexión usa rutas internas', () => {
    for (const provider of Object.keys(EXTERNAL_CONNECTION_COPY) as Array<keyof typeof EXTERNAL_CONNECTION_COPY>) {
      const copy = EXTERNAL_CONNECTION_COPY[provider]
      expect(isInternalAdminRoute(copy.actionRoute)).toBe(true)
      expect(copy.actionRoute).not.toBe('/')
      expect(copy.actionRoute).not.toBe('/registro')
    }
  })

  it('módulos externos bloqueados tienen copy con acción interna', () => {
    const externalIds = Object.values(MODULE_REQUIREMENTS)
      .filter((m) => m.requiresExternalConnection)
      .map((m) => m.id)

    for (const id of externalIds) {
      const copy = resolveConnectionCopy(id)
      expect(isInternalAdminRoute(copy.actionRoute)).toBe(true)
      expect(copy.actionLabel.length).toBeGreaterThan(0)
    }
  })
})
