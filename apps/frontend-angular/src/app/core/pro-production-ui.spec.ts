import { TestBed } from '@angular/core/testing'
import { Router, UrlTree } from '@angular/router'
import { SIDEBAR_MAIN_MODULES } from './routing/area-nav.config'
import { allowsDemoDataFrom } from './utils/demo-runtime.util'
import { proDemoGuard } from './guards/pro-demo.guard'
import { ProModeService } from './services/pro-mode.service'
import type { ProModeService as ProModeServiceType } from './services/pro-mode.service'

describe('PRO production UI — sin referencias demo visibles', () => {
  it('environment.production.ts desactiva demoMode', async () => {
    const { environment: prodEnv } = await import('../../environments/environment.production')
    expect(prodEnv.production).toBe(true)
    expect(prodEnv.demoMode).toBe(false)
    expect(prodEnv.proMode).toBe(true)
  })

  it('sidebar config no incluye pestaña demo-mode', () => {
    const admin = SIDEBAR_MAIN_MODULES.find((m) => m.id === 'admin')
    expect(admin).toBeTruthy()
    expect(admin!.tabs.some((t) => t.id === 'demo-mode')).toBe(false)
    expect(admin!.tabs.some((t) => t.label === 'Modo demo')).toBe(false)
  })

  it('sidebar principal no muestra FinOps como sección visible', () => {
    expect(SIDEBAR_MAIN_MODULES.some((m) => m.id === 'finops')).toBe(false)
    expect(SIDEBAR_MAIN_MODULES.some((m) => m.label === 'FinOps')).toBe(false)
  })

  it('allowsDemoDataFrom devuelve false en PRO sin demo', () => {
    const pro = {
      loaded: () => true,
      proMode: () => true,
      demoMode: () => false,
    } as ProModeServiceType
    expect(allowsDemoDataFrom(pro)).toBe(false)
  })

  it('buildVpsSnapshot no incluye servidores demo en PRO', async () => {
    const { buildVpsSnapshot } = await import('../features/infrastructure/vps-provider.data')
    const snap = buildVpsSnapshot('digitalocean')
    expect(snap.servers).toBe(0)
    expect(snap.serverRows.some((r) => r.name.includes('demo') || r.id.includes('demo'))).toBeFalse()
  })

  it('proDemoGuard redirige a configuración en PRO', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ProModeService,
          useValue: {
            loaded: () => true,
            proMode: () => true,
            demoMode: () => false,
          },
        },
        {
          provide: Router,
          useValue: {
            createUrlTree: (segments: string[]) =>
              ({ toString: () => segments.join('/') }) as UrlTree,
          },
        },
      ],
    })

    const result = TestBed.runInInjectionContext(() =>
      proDemoGuard({} as never, {} as never),
    )

    expect(result).not.toBe(true)
    expect(String(result)).toContain('settings/general')
  })
})
