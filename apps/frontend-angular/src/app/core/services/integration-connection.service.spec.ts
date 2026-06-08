import { TestBed } from '@angular/core/testing'
import { MatDialog } from '@angular/material/dialog'
import { Router } from '@angular/router'
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
  const navigateSpy = jasmine.createSpy('navigateByUrl').and.returnValue(Promise.resolve(true))

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        IntegrationConnectionService,
        { provide: MatDialog, useValue: { open: openSpy } },
        { provide: Router, useValue: { navigateByUrl: navigateSpy } },
      ],
    })
    service = TestBed.inject(IntegrationConnectionService)
    openSpy.calls.reset()
    navigateSpy.calls.reset()
  })

  it('openGithub navega al wizard interno sin dialog', () => {
    service.openGithub().subscribe()
    expect(navigateSpy).toHaveBeenCalledWith('/admin/configuracion/integraciones/github/conectar')
    expect(openSpy).not.toHaveBeenCalled()
  })

  it('openGitlab navega al wizard interno sin dialog', () => {
    service.openGitlab().subscribe()
    expect(navigateSpy).toHaveBeenCalledWith('/admin/configuracion/integraciones/gitlab/conectar')
    expect(openSpy).not.toHaveBeenCalled()
  })

  it('navigateToWizard usa rutas internas cloud y VPS', () => {
    service.navigateToWizard('aws')
    expect(navigateSpy).toHaveBeenCalledWith('/admin/configuracion/integraciones/aws/conectar')
    service.navigateToWizard('vps')
    expect(navigateSpy).toHaveBeenCalledWith('/admin/infraestructura/vps/nuevo')
  })

  it('openForModuleId abre modal cloud o navega repos sin rutas públicas', () => {
    service.openForModuleId('aws').subscribe()
    expect(openSpy).toHaveBeenCalled()
    openSpy.calls.reset()
    service.openForModuleId('github').subscribe()
    expect(navigateSpy).toHaveBeenCalledWith('/admin/configuracion/integraciones/github/conectar')
    expect(openSpy).not.toHaveBeenCalled()
  })

  it('openForProviderAlias navega al wizard de página para cloud', () => {
    service.openForProviderAlias('gcp').subscribe()
    expect(navigateSpy).toHaveBeenCalledWith('/admin/configuracion/integraciones/gcp/conectar')
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
