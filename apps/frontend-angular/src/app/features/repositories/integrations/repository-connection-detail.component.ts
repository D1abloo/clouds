import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTabsModule } from '@angular/material/tabs'
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component'
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component'
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import { GithubService, type GithubAccount, type GithubRepo } from '../../../core/services/github.service'
import { GitlabService, type GitlabAccount, type GitlabProject } from '../../../core/services/gitlab.service'
import { ToastService } from '../../../core/services/toast.service'
import { catchError, of } from 'rxjs'

type ConnectionDetail = {
  id: string
  label: string
  connectionName?: string
  username: string
  status: string
  statusLabel?: string
  authType?: string
  baseUrl?: string | null
  lastError?: string | null
  lastSyncAt?: string | null
  repoCount?: number
}

@Component({
  selector: 'app-repository-connection-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    PageHeaderComponent,
    LoadingStateComponent,
    BrandLogoComponent,
    StatusBadgeComponent,
  ],
  template: `
    <div class="page-container">
      @if (loading()) {
        <app-loading-state message="Cargando conexión…" />
      } @else if (account()) {
        <app-page-header
          [title]="accountLabel()"
          [description]="'Cuenta ' + providerLabel() + ' · ' + accountUsername()"
          [actions]="detailActions"
          (actionClick)="handleHeader($event)"
        />

        <div class="detail-summary">
          <app-brand-logo [logo]="provider()" size="lg" />
          <div>
            <app-status-badge [status]="accountStatus()" [value]="accountStatusLabel()" />
            <p>{{ accountRepoCount() }} repositorios · Última sync: {{ accountLastSync() }}</p>
          </div>
        </div>

        <mat-tab-group>
          <mat-tab label="Resumen">
            <div class="tab-panel">
              <p>Conexión {{ accountConnectionName() }} activa para {{ providerLabel() }}.</p>
              @if (accountLastError()) {
                <p class="detail-error">Último error: {{ accountLastError() }}</p>
              }
            </div>
          </mat-tab>
          <mat-tab [label]="provider() === 'gitlab' ? 'Proyectos' : 'Repositorios'">
            <div class="tab-panel">
              @if (!repos().length) {
                <p>Sin repositorios sincronizados. Usa Sincronizar para importar desde la API.</p>
              } @else {
                <ul class="repo-list">
                  @for (repo of repos(); track repo.id) {
                    <li>{{ repoLabel(repo) }}</li>
                  }
                </ul>
              }
            </div>
          </mat-tab>
          <mat-tab label="Ramas"><div class="tab-panel"><p>Ramas disponibles al abrir un repositorio desde el módulo Repositorios.</p></div></mat-tab>
          <mat-tab label="Commits"><div class="tab-panel"><p>Historial de commits por repositorio y rama.</p></div></mat-tab>
          <mat-tab [label]="provider() === 'gitlab' ? 'MRs' : 'PRs'"><div class="tab-panel"><p>Pull/Merge requests sincronizados por repositorio.</p></div></mat-tab>
          <mat-tab label="Webhooks"><div class="tab-panel"><p>Configura webhooks desde el módulo Repositorios → Webhooks.</p></div></mat-tab>
          <mat-tab label="Despliegues"><div class="tab-panel"><p>Despliegues lanzados desde repos conectados.</p></div></mat-tab>
          <mat-tab label="Actividad"><div class="tab-panel"><p>Eventos de auditoría registrados al conectar, validar y sincronizar.</p></div></mat-tab>
          <mat-tab label="Configuración">
            <div class="tab-panel">
              <p>Tipo auth: {{ accountAuthType() }}</p>
              @if (accountBaseUrl()) { <p>URL base: {{ accountBaseUrl() }}</p> }
              <button mat-stroked-button type="button" routerLink="/settings/integrations">Volver al hub</button>
            </div>
          </mat-tab>
        </mat-tab-group>
      }
    </div>
  `,
  styles: `
    .detail-summary { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
    .tab-panel { padding: 1rem 0; min-height: 120px; }
    .repo-list { margin: 0; padding-left: 1.2rem; }
    .detail-error { color: var(--status-critical, #c62828); }
  `,
})
export class RepositoryConnectionDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly github = inject(GithubService)
  private readonly gitlab = inject(GitlabService)
  private readonly toast = inject(ToastService)

  readonly loading = signal(true)
  readonly account = signal<ConnectionDetail | null>(null)
  readonly repos = signal<Array<GithubRepo | GitlabProject>>([])
  readonly provider = signal<'github' | 'gitlab'>('github')
  readonly detailActions = [
    { label: 'Sincronizar', icon: 'sync' },
    { label: 'Validar', icon: 'verified' },
  ]

  ngOnInit(): void {
    const connectionId = this.route.snapshot.paramMap.get('connectionId') ?? ''
    const url = this.route.snapshot.url.map((s) => s.path).join('/')
    const prov: 'github' | 'gitlab' = url.includes('gitlab') ? 'gitlab' : 'github'
    this.provider.set(prov)
    if (prov === 'github') {
      this.github
        .getAccount(connectionId)
        .pipe(catchError(() => of(null)))
        .subscribe((res) => {
          if (!res) {
            this.loading.set(false)
            return
          }
          this.account.set(this.mapGithubAccount(res.account))
          this.repos.set(res.repositories)
          this.loading.set(false)
        })
      return
    }
    this.gitlab
      .getAccount(connectionId)
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (!res) {
          this.loading.set(false)
          return
        }
        this.account.set(this.mapGitlabAccount(res.account))
        this.repos.set(res.projects)
        this.loading.set(false)
      })
  }

  providerLabel = (): string => (this.provider() === 'gitlab' ? 'GitLab' : 'GitHub')

  accountLabel = (): string => this.account()?.label ?? '—'
  accountUsername = (): string => this.account()?.username ?? '—'
  accountStatus = (): string => this.account()?.status ?? 'pending'
  accountStatusLabel = (): string => this.account()?.statusLabel ?? this.account()?.status ?? '—'
  accountRepoCount = (): number => this.account()?.repoCount ?? this.repos().length
  accountLastSync = (): string => this.account()?.lastSyncAt ?? '—'
  accountConnectionName = (): string => this.account()?.connectionName ?? this.account()?.label ?? '—'
  accountLastError = (): string | null | undefined => this.account()?.lastError
  accountAuthType = (): string => this.account()?.authType ?? 'pat'
  accountBaseUrl = (): string | null | undefined => this.account()?.baseUrl

  repoLabel = (repo: GithubRepo | GitlabProject): string => {
    if ('fullName' in repo) return repo.fullName
    return repo.fullPath ?? repo.name
  }

  handleHeader = (label: string): void => {
    const id = this.account()?.id
    if (!id) return
    if (label === 'Sincronizar') {
      if (this.provider() === 'github') {
        this.github.syncAccount(id).subscribe({ next: (r) => this.toast.success(r.message) })
      } else {
        this.gitlab.syncAccount(id).subscribe({ next: (r) => this.toast.success(r.message) })
      }
      return
    }
    if (label === 'Validar') {
      if (this.provider() === 'github') {
        this.github.validateAccount(id).subscribe({ next: (r) => this.toast.success(r.message) })
      } else {
        this.gitlab.validateAccount(id).subscribe({ next: (r) => this.toast.success(r.message) })
      }
    }
  }

  private mapGithubAccount = (a: GithubAccount): ConnectionDetail => ({
    id: a.id,
    label: a.label,
    connectionName: a.connectionName,
    username: a.username,
    status: a.status,
    statusLabel: a.statusLabel,
    authType: a.authType,
    baseUrl: a.baseUrl,
    lastError: a.lastError,
    lastSyncAt: a.lastSyncAt,
    repoCount: a.repoCount,
  })

  private mapGitlabAccount = (a: GitlabAccount): ConnectionDetail => ({
    id: a.id,
    label: a.label,
    connectionName: a.connectionName,
    username: a.username,
    status: a.status,
    statusLabel: a.statusLabel,
    authType: a.authType,
    baseUrl: a.baseUrl,
    lastError: a.lastError,
    lastSyncAt: a.lastSyncAt,
    repoCount: a.repoCount,
  })
}
