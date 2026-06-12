import { TestBed } from '@angular/core/testing'
import { ApplicationRef } from '@angular/core'
import { signal } from '@angular/core'
import { of, throwError } from 'rxjs'
import { SidebarService } from './sidebar.service'
import { AuthService } from '../../core/services/auth.service'
import { UserShortcutsService } from '../../core/services/user-shortcuts.service'
import { ToastService } from '../../core/services/toast.service'
import type { AuthUser } from '../../core/models/api.models'

describe('SidebarService', () => {
  const userSignal = signal<AuthUser | null>(null)

  const shortcutsApi = {
    list: jasmine.createSpy('list').and.returnValue(of([])),
    add: jasmine.createSpy('add').and.returnValue(of({ id: '1', route: '/runbooks', label: 'Runbooks', position: 0, createdAt: '', updatedAt: '' })),
    removeByRoute: jasmine.createSpy('removeByRoute').and.returnValue(of({ ok: true })),
  }

  const toast = {
    success: jasmine.createSpy('success'),
    info: jasmine.createSpy('info'),
    error: jasmine.createSpy('error'),
  }

  beforeEach(() => {
    localStorage.clear()
    userSignal.set(null)
    TestBed.resetTestingModule()
    shortcutsApi.list.and.returnValue(of([]))
    shortcutsApi.add.and.returnValue(of({ id: '1', route: '/runbooks', label: 'Runbooks', position: 0, createdAt: '', updatedAt: '' }))
    shortcutsApi.removeByRoute.and.returnValue(of({ ok: true }))
    shortcutsApi.list.calls.reset()
    shortcutsApi.add.calls.reset()
    shortcutsApi.removeByRoute.calls.reset()
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { user: userSignal.asReadonly() } },
        { provide: UserShortcutsService, useValue: shortcutsApi },
        { provide: ToastService, useValue: toast },
      ],
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

  it('starts with empty favorites for a logged-in user without saved shortcuts', () => {
    loginAs('user-new')
    const svc = createService()
    tickEffects()
    expect(svc.favorites()).toEqual([])
    expect(shortcutsApi.list).toHaveBeenCalled()
  })

  it('does not show default favorites before user stars items', () => {
    loginAs('fresh-user')
    const svc = createService()
    tickEffects()
    expect(svc.favorites()).not.toContain('/dashboard')
    expect(svc.favorites()).not.toContain('/resource-explorer')
    expect(svc.favorites()).not.toContain('/ai-assistant')
  })

  it('persists favorites per user after logout', () => {
    loginAs('user-a')
    const svc = createService()
    tickEffects()
    svc.toggleFavorite('/runbooks', { label: 'Runbooks' })
    tickEffects()

    expect(svc.favorites()).toContain('/runbooks')
    expect(shortcutsApi.add).toHaveBeenCalled()

    userSignal.set(null)
    tickEffects()

    loginAs('user-a')
    shortcutsApi.list.and.returnValue(of([{ id: '1', route: '/runbooks', label: 'Runbooks', position: 0, createdAt: '', updatedAt: '' }]))
    TestBed.resetTestingModule()
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { user: userSignal.asReadonly() } },
        { provide: UserShortcutsService, useValue: shortcutsApi },
        { provide: ToastService, useValue: toast },
      ],
    })
    const svcAgain = TestBed.inject(SidebarService)
    tickEffects()

    expect(svcAgain.favorites()).toContain('/runbooks')
  })

  it('keeps separate favorites for different users', () => {
    loginAs('user-a')
    const svcA = createService()
    tickEffects()
    svcA.toggleFavorite('/runbooks', { label: 'Runbooks' })
    tickEffects()

    userSignal.set(null)
    tickEffects()

    loginAs('user-b')
    shortcutsApi.list.and.returnValue(of([]))
    TestBed.resetTestingModule()
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { user: userSignal.asReadonly() } },
        { provide: UserShortcutsService, useValue: shortcutsApi },
        { provide: ToastService, useValue: toast },
      ],
    })
    const svcB = TestBed.inject(SidebarService)
    tickEffects()
    svcB.toggleFavorite('/admin/users', { label: 'Usuarios' })
    tickEffects()

    expect(svcB.favorites()).toContain('/admin/users')
    expect(svcB.favorites()).not.toContain('/runbooks')
  })

  it('removing last favorite clears favorites list', () => {
    loginAs('solo-user')
    shortcutsApi.list.and.returnValue(of([{ id: '1', route: '/dashboard', label: 'Tablero', position: 0, createdAt: '', updatedAt: '' }]))
    const svc = createService()
    tickEffects()
    expect(svc.favorites()).toContain('/dashboard')

    svc.toggleFavorite('/dashboard', { label: 'Tablero' })
    tickEffects()
    expect(svc.favorites()).not.toContain('/dashboard')
    expect(shortcutsApi.removeByRoute).toHaveBeenCalled()
  })

  it('rolls back favorite on API error', () => {
    loginAs('user-err')
    shortcutsApi.add.and.returnValue(throwError(() => new Error('fail')))
    const svc = createService()
    tickEffects()
    svc.toggleFavorite('/alerts/active', { label: 'Alertas' })
    tickEffects()
    expect(svc.favorites()).not.toContain('/alerts/active')
    expect(toast.error).toHaveBeenCalled()
  })
})
