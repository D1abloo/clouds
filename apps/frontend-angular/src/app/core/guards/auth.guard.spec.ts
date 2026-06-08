import { TestBed } from '@angular/core/testing'
import { Router } from '@angular/router'
import { authGuard, guestGuard, publicGuestGuard } from './auth.guard'
import { AuthService } from '../services/auth.service'

describe('auth guards', () => {
  const runGuard = (guard: typeof authGuard, authenticated: boolean): unknown => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isAuthenticated: () => authenticated } },
        {
          provide: Router,
          useValue: {
            createUrlTree: (segments: string[]) => ({ toString: () => segments.join('/') }),
          },
        },
      ],
    })
    return TestBed.runInInjectionContext(() => guard({} as never, {} as never))
  }

  it('authGuard permite usuarios autenticados', () => {
    expect(runGuard(authGuard, true)).toBe(true)
  })

  it('authGuard redirige anónimos a login', () => {
    const result = runGuard(authGuard, false)
    expect(result).not.toBe(true)
    expect(String(result)).toContain('login')
  })

  it('guestGuard redirige autenticados al dashboard', () => {
    const result = runGuard(guestGuard, true)
    expect(result).not.toBe(true)
    expect(String(result)).toContain('dashboard')
  })

  it('publicGuestGuard redirige autenticados al dashboard', () => {
    const result = runGuard(publicGuestGuard, true)
    expect(result).not.toBe(true)
    expect(String(result)).toContain('dashboard')
  })

  it('publicGuestGuard permite visitantes en rutas públicas', () => {
    expect(runGuard(publicGuestGuard, false)).toBe(true)
  })
})
