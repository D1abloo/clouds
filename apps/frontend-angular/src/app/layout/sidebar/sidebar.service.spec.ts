import { TestBed } from '@angular/core/testing'
import { SidebarService } from './sidebar.service'

describe('SidebarService', () => {
  beforeEach(() => {
    localStorage.clear()
    TestBed.configureTestingModule({})
  })

  const createService = (): SidebarService => TestBed.inject(SidebarService)

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
})
