import { TestBed } from '@angular/core/testing'
import { ApplicationRef } from '@angular/core'
import { signal } from '@angular/core'
import { SidebarService } from './sidebar.service'
import { AuthService } from '../../core/services/auth.service'
import type { AuthUser } from '../../core/models/api.models'

describe('SidebarService', () => {
  const userSignal = signal<AuthUser | null>(null)

  beforeEach(() => {
    localStorage.clear()
    userSignal.set(null)
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { user: userSignal.asReadonly() } }],
    })
  })

  const createService = (): SidebarService => TestBed.inject(SidebarService)

  const loginAs = (id: string): void => {
    userSignal.set({
      id,
      email: `${id}@test.com`,
      name: 'Test User',
      roles: ['admin'],
    })
  }

  const tickEffects = (): void => {
    TestBed.inject(ApplicationRef).tick()
  }

  it('keeps sections collapsed by default', () => {
    const svc = createService()
    expect(svc.isExpanded('overview')).toBe(false)
    expect(svc.isExpanded('clouds')).toBe(false)
  })

  it('remembers manual expand state', () => {
    const svc = createService()
    svc.setExpanded('infrastructure', true)
    expect(svc.isExpanded('infrastructure')).toBe(true)
  })

  it('syncNavigationExpand opens only active section on mobile', () => {
    Object.defineProperty(window, 'innerWidth', { value: 480, configurable: true })
    const svc = createService()
    svc.setExpanded('overview', true)
    svc.setExpanded('clouds', true)
    svc.syncNavigationExpand('/jenkins/jobs')
    expect(svc.isExpanded('overview')).toBe(false)
    expect(svc.isExpanded('automation')).toBe(true)
  })

  it('persists favorites per user after logout', () => {
    loginAs('user-a')
    const svc = createService()
    svc.toggleFavorite('/dashboard')
    svc.toggleFavorite('/runbooks')
    tickEffects()

    expect(svc.favorites()).toContain('/runbooks')
    expect(svc.favorites()).not.toContain('/dashboard')

    userSignal.set(null)
    tickEffects()

    loginAs('user-a')
    TestBed.resetTestingModule()
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { user: userSignal.asReadonly() } }],
    })
    const svcAgain = TestBed.inject(SidebarService)
    tickEffects()

    expect(svcAgain.favorites()).toContain('/runbooks')
    expect(svcAgain.favorites()).not.toContain('/dashboard')
  })

  it('keeps separate favorites for different users', () => {
    loginAs('user-a')
    const svcA = createService()
    svcA.toggleFavorite('/dashboard')
    svcA.toggleFavorite('/runbooks')
    tickEffects()

    userSignal.set(null)
    tickEffects()

    loginAs('user-b')
    TestBed.resetTestingModule()
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { user: userSignal.asReadonly() } }],
    })
    const svcB = TestBed.inject(SidebarService)
    svcB.toggleFavorite('/admin/users')
    tickEffects()

    expect(svcB.favorites()).toContain('/admin/users')
    expect(svcB.favorites()).not.toContain('/runbooks')

    userSignal.set(null)
    tickEffects()

    loginAs('user-a')
    TestBed.resetTestingModule()
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { user: userSignal.asReadonly() } }],
    })
    const svcAReload = TestBed.inject(SidebarService)
    tickEffects()

    expect(svcAReload.favorites()).toContain('/runbooks')
    expect(svcAReload.favorites()).not.toContain('/admin/users')
  })
})
