import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { MatButtonModule } from '@angular/material/button'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component'
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component'
import { GithubService } from '../../../core/services/github.service'
import { GitlabService } from '../../../core/services/gitlab.service'
import { ProModeService } from '../../../core/services/pro-mode.service'
import { ToastService } from '../../../core/services/toast.service'
import { catchError, of, switchMap } from 'rxjs'
import {
  REPO_AUTH_METHOD_CARDS,
  REPO_PROVIDER_CARDS,
  REPO_WIZARD_STEPS,
  providerDetailRoute,
  type RepoAuthMethod,
  type RepoProviderId,
  type RepoWizardStep,
} from './repository-connection-wizard.config'

type RemoteRepo = {
  id: number
  name: string
  fullName: string
  archived?: boolean
  description?: string
}

@Component({
  selector: 'app-repository-connection-wizard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    BrandLogoComponent,
    PageHeaderComponent,
  ],
  templateUrl: './repository-connection-wizard.component.html',
  styleUrl: './repository-connection-wizard.component.scss',
})
export class RepositoryConnectionWizardComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly fb = inject(FormBuilder)
  private readonly github = inject(GithubService)
  private readonly gitlab = inject(GitlabService)
  private readonly pro = inject(ProModeService)
  private readonly toast = inject(ToastService)

  readonly steps = REPO_WIZARD_STEPS
  readonly providerCards = REPO_PROVIDER_CARDS
  readonly methodCards = REPO_AUTH_METHOD_CARDS

  readonly step = signal<RepoWizardStep>('provider')
  readonly provider = signal<RepoProviderId | null>(null)
  readonly authMethod = signal<RepoAuthMethod | null>(null)
  readonly validating = signal(false)
  readonly saving = signal(false)
  readonly validation = signal<{
    valid: boolean
    username: string | null
    avatarUrl: string | null
    scopes: string[]
    repoCount: number
    message: string
  } | null>(null)
  readonly remoteRepos = signal<RemoteRepo[]>([])
  readonly selectedRepoIds = signal<Set<number>>(new Set())
  readonly excludeArchived = signal(true)
  readonly createdAccountId = signal<string | null>(null)

  readonly stepIndex = computed(() => this.steps.findIndex((s) => s.id === this.step()))
  readonly providerLabel = computed(() =>
    this.provider() === 'gitlab' ? 'GitLab' : this.provider() === 'github' ? 'GitHub' : 'repositorio',
  )
  readonly oauthAvailable = computed(() => this.pro.oauthGithubEnabled())

  form = this.fb.nonNullable.group({
    connectionName: ['', Validators.required],
    token: [''],
    baseUrl: [''],
  })

  ngOnInit(): void {
    const fromRoute = this.route.snapshot.data['provider'] as RepoProviderId | undefined
    const fromParam = this.route.snapshot.paramMap.get('provider') as RepoProviderId | null
    const initial = fromRoute ?? fromParam
    if (initial === 'github' || initial === 'gitlab') {
      this.provider.set(initial)
      this.step.set('method')
    }
  }

  selectProvider = (id: RepoProviderId): void => {
    this.provider.set(id)
    this.validation.set(null)
  }

  selectMethod = (id: RepoAuthMethod): void => {
    this.authMethod.set(id)
    this.validation.set(null)
    if (id === 'enterprise') {
      this.form.patchValue({
        baseUrl: this.provider() === 'gitlab' ? 'https://gitlab.com' : 'https://github.example.com',
      })
    }
  }

  canGoToStep = (target: RepoWizardStep): boolean => {
    const current = this.stepIndex()
    const targetIdx = this.steps.findIndex((s) => s.id === target)
    if (targetIdx <= current) return true
    if (target === 'method') return !!this.provider()
    if (target === 'credentials') return !!this.authMethod()
    if (target === 'validate') return this.credentialsReady()
    if (target === 'repos') return !!this.validation()?.valid
    return false
  }

  goToStep = (target: RepoWizardStep): void => {
    if (!this.canGoToStep(target)) return
    this.step.set(target)
  }

  credentialsReady = (): boolean => {
    if (this.authMethod() === 'oauth') return true
    return !!this.form.controls.connectionName.value.trim() && !!this.form.controls.token.value.trim()
  }

  handleBack = (): void => {
    const idx = this.stepIndex()
    if (idx <= 0) return
    this.step.set(this.steps[idx - 1].id)
  }

  handleNext = (): void => {
    const current = this.step()
    if (current === 'provider') {
      if (!this.provider()) {
        this.toast.error('Selecciona GitHub o GitLab')
        return
      }
      this.step.set('method')
      return
    }
    if (current === 'method') {
      if (!this.authMethod()) {
        this.toast.error('Selecciona un método de conexión')
        return
      }
      this.step.set('credentials')
      return
    }
    if (current === 'credentials') {
      if (this.authMethod() === 'oauth') {
        this.toast.info('OAuth próximamente — usa token PAT por ahora')
        return
      }
      if (!this.credentialsReady()) {
        this.toast.error('Completa nombre de conexión y token')
        return
      }
      this.runValidatePreview()
      return
    }
    if (current === 'validate') {
      if (!this.validation()?.valid) {
        this.toast.error('Valida la conexión antes de continuar')
        return
      }
      this.loadRemoteRepos()
      this.step.set('repos')
      return
    }
    if (current === 'repos') {
      this.saveAndSync()
    }
  }

  handleOAuth = (): void => {
    this.toast.info('OAuth próximamente. Configura GITHUB_CLIENT_ID en el servidor o usa token PAT.')
  }

  runValidatePreview = (): void => {
    const prov = this.provider()
    const token = this.form.controls.token.value.trim()
    const baseUrl = this.form.controls.baseUrl.value.trim() || undefined
    if (!prov || !token) return
    this.validating.set(true)
    const req =
      prov === 'github'
        ? this.github.validatePreview({ token, baseUrl, authType: this.authMethod() ?? 'pat' })
        : this.gitlab.validatePreview({ token, baseUrl, authType: this.authMethod() ?? 'pat' })
    req.pipe(catchError(() => of({ valid: false, message: 'Error al validar', scopes: [], repoCount: 0, username: null, avatarUrl: null }))).subscribe({
      next: (res) => {
        this.validation.set(res)
        this.validating.set(false)
        if (res.valid) {
          this.step.set('validate')
          this.toast.success(res.message)
        } else {
          this.toast.error(res.message)
        }
      },
      error: () => {
        this.validating.set(false)
        this.toast.error('No se pudo validar la conexión')
      },
    })
  }

  loadRemoteRepos = (): void => {
    const prov = this.provider()
    const token = this.form.controls.token.value.trim()
    const baseUrl = this.form.controls.baseUrl.value.trim() || undefined
    if (!prov || !token) return
    const req =
      prov === 'github'
        ? this.github.previewRepos({ token, baseUrl, excludeArchived: this.excludeArchived() })
        : this.gitlab.previewProjects({ token, baseUrl, excludeArchived: this.excludeArchived() })
    req.pipe(catchError(() => of({ items: [] as RemoteRepo[] }))).subscribe((res) => {
      const items: RemoteRepo[] = res.items.map((r) => ({
        id: r.id,
        name: r.name,
        fullName: r.fullName,
        archived: r.archived,
        description: r.description,
      }))
      this.remoteRepos.set(items)
      this.selectedRepoIds.set(new Set(items.map((r) => r.id)))
    })
  }

  toggleRepo = (id: number, checked: boolean): void => {
    this.selectedRepoIds.update((set) => {
      const next = new Set(set)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  toggleSelectAll = (checked: boolean): void => {
    const repos = this.remoteRepos().filter((r) => !this.excludeArchived() || !r.archived)
    this.selectedRepoIds.set(checked ? new Set(repos.map((r) => r.id)) : new Set())
  }

  saveAndSync = (): void => {
    const prov = this.provider()
    if (!prov) return
    this.saving.set(true)
    const body = {
      label: this.form.controls.connectionName.value.trim(),
      connectionName: this.form.controls.connectionName.value.trim(),
      token: this.form.controls.token.value.trim(),
      authType: this.authMethod() ?? 'pat',
      baseUrl: this.form.controls.baseUrl.value.trim() || undefined,
      syncFrequency: 'manual',
    }
    const syncBody = {
      selectedRepoIds: [...this.selectedRepoIds()],
      excludeArchived: this.excludeArchived(),
    }
    const finish = (created: { id: string } | null): void => {
      this.saving.set(false)
      if (!created) return
      this.createdAccountId.set(created.id)
      this.step.set('success')
      this.toast.success('Cuenta conectada correctamente')
    }
    if (prov === 'github') {
      this.github
        .createAccount(body)
        .pipe(
          switchMap((created) =>
            this.github.syncAccount(created.id, syncBody).pipe(switchMap(() => of(created))),
          ),
          catchError(() => {
            this.saving.set(false)
            this.toast.error('No se pudo guardar la conexión')
            return of(null)
          }),
        )
        .subscribe(finish)
      return
    }
    this.gitlab
      .createAccount(body)
      .pipe(
        switchMap((created) =>
          this.gitlab
            .syncAccount(created.id, {
              selectedProjectIds: syncBody.selectedRepoIds,
              excludeArchived: syncBody.excludeArchived,
            })
            .pipe(switchMap(() => of(created))),
        ),
        catchError(() => {
          this.saving.set(false)
          this.toast.error('No se pudo guardar la conexión')
          return of(null)
        }),
      )
      .subscribe(finish)
  }

  finish = (): void => {
    const prov = this.provider()
    const id = this.createdAccountId()
    if (prov && id) {
      void this.router.navigateByUrl(providerDetailRoute(prov, id))
      return
    }
    void this.router.navigateByUrl('/settings/integrations')
  }
}
