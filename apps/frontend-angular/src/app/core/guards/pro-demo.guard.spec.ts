import { TestBed } from '@angular/core/testing'
import { Router, UrlTree } from '@angular/router'
import { proDemoGuard } from './pro-demo.guard'
import { ProModeService } from '../services/pro-mode.service'

describe('proDemoGuard', () => {
  const setup = (proMode: boolean, demoMode: boolean) => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ProModeService,
          useValue: {
            loaded: () => true,
            proMode: () => proMode,
            demoMode: () => demoMode,
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
  }

  it('permite acceso cuando demo está activo', () => {
    setup(false, true)
    const result = TestBed.runInInjectionContext(() => proDemoGuard({} as never, {} as never))
    expect(result).toBe(true)
  })

  it('bloquea /admin/demo-mode en PRO', () => {
    setup(true, false)
    const result = TestBed.runInInjectionContext(() => proDemoGuard({} as never, {} as never))
    expect(result).not.toBe(true)
    expect(String(result)).toContain('settings/general')
  })
})
