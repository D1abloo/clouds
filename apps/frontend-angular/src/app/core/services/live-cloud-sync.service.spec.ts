import { TestBed } from '@angular/core/testing'
import { of, throwError } from 'rxjs'
import { LiveCloudSyncService } from './live-cloud-sync.service'
import { CloudAccountsService } from './cloud-accounts.service'

describe('LiveCloudSyncService', () => {
  let service: LiveCloudSyncService
  let syncAllSpy: jasmine.Spy

  beforeEach(() => {
    syncAllSpy = jasmine.createSpy('syncAll').and.returnValue(of({ accounts: 2, instances: 5 }))

    TestBed.configureTestingModule({
      providers: [
        LiveCloudSyncService,
        {
          provide: CloudAccountsService,
          useValue: { syncAll: syncAllSpy },
        },
      ],
    })

    service = TestBed.inject(LiveCloudSyncService)
  })

  afterEach(() => {
    service.stopPolling()
  })

  it('syncAllAccounts actualiza lastSyncAt al completar', (done) => {
    service.syncAllAccounts().subscribe({
      complete: () => {
        expect(syncAllSpy).toHaveBeenCalled()
        expect(service.lastSyncAt()).not.toBeNull()
        queueMicrotask(() => {
          expect(service.syncing()).toBeFalse()
          done()
        })
      },
    })
  })

  it('syncAllAccounts guarda error cuando falla la API', (done) => {
    syncAllSpy.and.returnValue(throwError(() => new Error('fallo sync')))

    service.syncAllAccounts().subscribe((res) => {
      expect(res.instances).toBe(0)
      expect(service.error()).toContain('fallo sync')
      done()
    })
  })

  it('syncAllAccountsSilent evita solapamientos y libera syncing al completar', (done) => {
    service.syncAllAccountsSilent().subscribe({
      complete: () => {
        expect(syncAllSpy).toHaveBeenCalled()
        queueMicrotask(() => {
          expect(service.syncing()).toBeFalse()
          done()
        })
      },
    })
  })

  it('startPolling invoca syncFn periódicamente', () => {
    jasmine.clock().install()
    const fn = jasmine.createSpy('pollFn')

    service.startPolling(fn, 1000)
    expect(fn).toHaveBeenCalledTimes(1)

    jasmine.clock().tick(1000)
    expect(fn).toHaveBeenCalledTimes(2)

    service.stopPolling()
    jasmine.clock().tick(2000)
    expect(fn).toHaveBeenCalledTimes(2)
    jasmine.clock().uninstall()
  })
})
