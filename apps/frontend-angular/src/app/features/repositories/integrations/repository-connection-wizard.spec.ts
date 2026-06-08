import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { of } from 'rxjs'
import { RepositoryConnectionWizardComponent } from './repository-connection-wizard.component'
import { GithubService } from '../../../core/services/github.service'
import { GitlabService } from '../../../core/services/gitlab.service'
import { ProModeService } from '../../../core/services/pro-mode.service'
import { ToastService } from '../../../core/services/toast.service'

describe('RepositoryConnectionWizardComponent', () => {
  let fixture: ComponentFixture<RepositoryConnectionWizardComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RepositoryConnectionWizardComponent],
      providers: [
        provideRouter([]),
        {
          provide: GithubService,
          useValue: {
            validatePreview: () =>
              of({ valid: true, username: 'user', avatarUrl: null, scopes: ['repo'], repoCount: 0, message: 'OK' }),
            previewRepos: () => of({ items: [] }),
            createAccount: () => of({ id: 'gh-1', label: 'Test', username: 'user', status: 'connected', createdAt: '' }),
            syncAccount: () => of({ synced: 0, message: 'OK', lastSyncAt: new Date().toISOString() }),
          },
        },
        {
          provide: GitlabService,
          useValue: {
            validatePreview: () =>
              of({ valid: true, username: 'user', avatarUrl: null, scopes: ['api'], repoCount: 0, message: 'OK' }),
            previewProjects: () => of({ items: [] }),
            createAccount: () => of({ id: 'gl-1', label: 'Test', username: 'user', status: 'connected', statusLabel: 'OK', lastSyncAt: '', demoMode: false, message: 'OK' }),
            syncAccount: () => of({ synced: 0, message: 'OK', lastSyncAt: new Date().toISOString() }),
          },
        },
        {
          provide: ProModeService,
          useValue: { proMode: () => true, oauthGithubEnabled: () => false },
        },
        { provide: ToastService, useValue: { success: () => {}, error: () => {}, info: () => {} } },
      ],
    }).compileComponents()

    fixture = TestBed.createComponent(RepositoryConnectionWizardComponent)
    fixture.detectChanges()
  })

  it('renderiza el asistente con pasos en español', () => {
    const el: HTMLElement = fixture.nativeElement
    expect(el.textContent).toContain('Proveedor')
    expect(el.textContent).toContain('GitHub')
    expect(el.textContent).toContain('GitLab')
  })

  it('no muestra repos demo cloudops en PRO', () => {
    const el: HTMLElement = fixture.nativeElement
    expect(el.textContent).not.toContain('cloudops-org')
    expect(el.textContent).not.toContain('cloudops-demo')
  })
})
