import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { of } from 'rxjs'
import { IntegrationsHubPageComponent } from './integrations-hub-page.component'
import { CloudAccountsService } from '../../core/services/cloud-accounts.service'
import { VpsService } from '../../core/services/vps.service'
import { GithubService } from '../../core/services/github.service'
import { IntegrationConnectionService } from '../../core/services/integration-connection.service'

describe('IntegrationsHubPageComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [IntegrationsHubPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: CloudAccountsService,
          useValue: { list: () => of([]) },
        },
        {
          provide: VpsService,
          useValue: { list: () => of([]) },
        },
        {
          provide: GithubService,
          useValue: { accounts: () => of({ items: [] }) },
        },
        {
          provide: IntegrationConnectionService,
          useValue: { navigateToWizard: jasmine.createSpy('navigateToWizard') },
        },
      ],
    })
  })

  it('crea el hub de integraciones', () => {
    const fixture = TestBed.createComponent(IntegrationsHubPageComponent)
    fixture.detectChanges()
    const el: HTMLElement = fixture.nativeElement
    expect(el.textContent).toContain('Centro de integraciones')
    expect(el.textContent).toContain('Sin integraciones conectadas')
  })
})
