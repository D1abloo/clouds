import { TestBed } from '@angular/core/testing'
import { Router, UrlTree } from '@angular/router'
import { SIDEBAR_MAIN_MODULES } from './routing/area-nav.config'
import { allowsDemoDataFrom } from './utils/demo-runtime.util'
import { proDemoGuard } from './guards/pro-demo.guard'
import { ProModeService } from './services/pro-mode.service'
import type { ProModeService as ProModeServiceType } from './services/pro-mode.service'

describe('PRO production UI — modo demo habilitado', () => {
  it('environment.production.ts activa demoMode junto a PRO', async () => {
    const { environment: prodEnv } = await import('../../environments/environment.production')
    expect(prodEnv.production).toBe(true)
    expect(prodEnv.demoMode).toBe(true)
    expect(prodEnv.proMode).toBe(true)
  })

  it('sidebar config incluye pestaña Modo demo', () => {
    const admin = SIDEBAR_MAIN_MODULES.find((m) => m.id === 'admin')
    expect(admin).toBeTruthy()
    expect(admin!.tabs.some((t) => t.id === 'demo-mode')).toBe(true)
    expect(admin!.tabs.some((t) => t.label === 'Modo demo')).toBe(true)
  })

  it('allowsDemoDataFrom devuelve false en PRO sin demo', () => {
    const pro = {
      loaded: () => true,
      proMode: () => true,
      demoMode: () => false,
    } as ProModeServiceType
    expect(allowsDemoDataFrom(pro)).toBe(false)
  })

  it('allowsDemoDataFrom devuelve true con demo activo en PRO', () => {
    const pro = {
      loaded: () => true,
      proMode: () => true,
      demoMode: () => true,
    } as ProModeServiceType
    expect(allowsDemoDataFrom(pro)).toBe(true)
  })

  it('proDemoGuard permite demo-mode cuando DEMO_MODE está activo', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ProModeService,
          useValue: {
            loaded: () => true,
            proMode: () => true,
            demoMode: () => true,
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

    expect(result).toBe(true)
  })

  it('proDemoGuard redirige a configuración en PRO sin demo', () => {
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
