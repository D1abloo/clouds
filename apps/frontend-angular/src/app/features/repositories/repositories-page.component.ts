import { Component, inject, OnInit, signal, computed } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { DatePipe, SlicePipe } from '@angular/common'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatTableModule } from '@angular/material/table'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatCardModule } from '@angular/material/card'
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { NavIconComponent } from '../../shared/components/nav-icon/nav-icon.component'
import { InventoryService } from '../../core/services/inventory.service'
import {
  GithubService,
  type DeployTargetType,
  type GithubConnection,
  type GithubRepo,
} from '../../core/services/github.service'
import { DemoActionsService } from '../../core/services/demo-actions.service'
import { createPageLoader } from '../../core/utils/page-load.util'
import { invNum } from '../../core/utils/inventory.util'
import { catchError, of } from 'rxjs'

const DEPLOY_TARGETS: { id: string; name: string; type: DeployTargetType }[] = [
  { id: 'aws-prod-app-1', name: 'aws-prod-app-1', type: 'instance' },
  { id: 'vps-prod-nginx-01', name: 'vps-prod-nginx-01', type: 'vps' },
  { id: 'docker-host-01', name: 'docker-host-01', type: 'docker' },
  { id: 'cluster-prod-01', name: 'cluster-prod-01', type: 'kubernetes' },
]

const SECTION_TITLES: Record<string, { title: string; description: string }> = {
  github: {
    title: 'GitHub',
    description: 'Conecta tu cuenta, sincroniza repositorios y despliega a tu infraestructura',
  },
  gitlab: { title: 'GitLab', description: 'Integración GitLab (próximamente)' },
  webhooks: { title: 'Webhooks', description: 'Webhooks de repositorios configurados' },
  branches: { title: 'Ramas', description: 'Ramas del repositorio seleccionado' },
  commits: { title: 'Commits', description: 'Historial de commits' },
  'pull-requests': { title: 'Pull Requests', description: 'Pull requests abiertos y fusionados' },
  deployments: { title: 'Despliegues', description: 'Despliegues desde repositorios a instancias, VPS, Docker o K8s' },
}

@Component({
  selector: 'app-repo-deploy-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>Desplegar repositorio</h2>
    <mat-dialog-content>
      <p class="deploy-hint">{{ data.repoName }}</p>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Rama</mat-label>
        <input matInput [formControl]="branch" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Destino</mat-label>
        <mat-select [formControl]="targetId">
          @for (t of targets; track t.id) {
            <mat-option [value]="t.id">{{ t.name }} ({{ targetLabel(t.type) }})</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Cancelar</button>
      <button mat-flat-button color="primary" type="button" [mat-dialog-close]="result()">Desplegar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .full { width: 100%; }
    .deploy-hint { margin: 0 0 1rem; color: var(--app-text-muted); font-size: 0.85rem; }
  `,
})
export class RepoDeployDialogComponent {
  readonly data = inject<{ repoName: string; defaultBranch: string }>(MAT_DIALOG_DATA)
  readonly branch = new FormControl('', { nonNullable: true })

  constructor() {
    this.branch.setValue(this.data.defaultBranch)
  }
  readonly targetId = new FormControl(DEPLOY_TARGETS[0].id, { nonNullable: true })
  readonly targets = DEPLOY_TARGETS

  targetLabel = (t: DeployTargetType): string =>
    ({ instance: 'Instancia', vps: 'VPS', docker: 'Docker', kubernetes: 'Kubernetes' })[t]

  result = () => {
    const target = DEPLOY_TARGETS.find((t) => t.id === this.targetId.value)!
    return {
      branch: this.branch.value,
      targetType: target.type,
      targetId: target.id,
      targetName: target.name,
    }
  }
}

@Component({
  selector: 'app-repositories-page',
  standalone: true,
  imports: [
    DatePipe,
    SlicePipe,
    ReactiveFormsModule,
    PageHeaderComponent,
    SummaryCardComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    NavIconComponent,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
  ],
  template: `
    <div class="page-container">
      <app-page-header
        [title]="headerMeta().title"
        [description]="headerMeta().description"
        [actions]="headerActions()"
        (actionClick)="handleHeader($event)"
      />

      @if (page.loading()) {
        <app-loading-state message="Cargando repositorios…" />
      } @else if (page.error()) {
        <app-error-state [message]="page.error()!" (retry)="load()" />
      } @else {
        <div class="summary-grid app-section-panel stagger-children">
          <app-summary-card title="Repositorios" [value]="n('repoCount')" icon="folder" variant="elevated" />
          <app-summary-card title="Ramas" [value]="n('branchCount')" icon="account_tree" variant="elevated" />
          <app-summary-card title="PR abiertos" [value]="n('openPullRequests')" icon="merge" variant="elevated" />
          <app-summary-card title="Despliegues" [value]="n('deploymentCount')" icon="rocket_launch" variant="elevated" />
        </div>

        @if (section() === 'github') {
          <mat-card class="connect-card">
            <div class="connect-card__head">
              <app-nav-icon logo="github" size="lg" />
              <div>
                <strong>Cuenta GitHub</strong>
                @if (connection()?.connected) {
                  <p>Conectado como <strong>{{ connection()?.username }}</strong>
                    @if (connection()?.lastSyncAt) {
                      · Última sync {{ connection()?.lastSyncAt | date: 'short' }}
                    }
                  </p>
                } @else {
                  <p>No hay cuenta conectada. Usa el token demo o conéctate en modo demostración.</p>
                }
              </div>
            </div>
            <div class="connect-card__actions">
              @if (!connection()?.connected) {
                <button mat-flat-button color="primary" type="button" (click)="handleConnect()">
                  <mat-icon>link</mat-icon> Conectar GitHub
                </button>
              } @else {
                <button mat-stroked-button type="button" (click)="handleSync()">
                  <mat-icon>sync</mat-icon> Sincronizar repos
                </button>
                <button mat-stroked-button type="button" (click)="handleDisconnect()">
                  <mat-icon>link_off</mat-icon> Desconectar
                </button>
              }
            </div>
          </mat-card>

          @if (connection()?.connected) {
            <div class="table-card">
              <h3>Repositorios sincronizados</h3>
              <mat-form-field appearance="outline" class="repo-select">
                <mat-label>Repositorio activo</mat-label>
                <mat-select [formControl]="repoControl">
                  @for (r of repos(); track r.id) {
                    <mat-option [value]="r.id">{{ r.fullName }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <div class="data-table-wrap">
                <table mat-table [dataSource]="repos()" class="premium-table table-row-hover">
                  <ng-container matColumnDef="name">
                    <th mat-header-cell *matHeaderCellDef>Nombre</th>
                    <td mat-cell *matCellDef="let row"><strong>{{ row.name }}</strong></td>
                  </ng-container>
                  <ng-container matColumnDef="language">
                    <th mat-header-cell *matHeaderCellDef>Lenguaje</th>
                    <td mat-cell *matCellDef="let row">{{ row.language }}</td>
                  </ng-container>
                  <ng-container matColumnDef="branch">
                    <th mat-header-cell *matHeaderCellDef>Rama por defecto</th>
                    <td mat-cell *matCellDef="let row">{{ row.defaultBranch }}</td>
                  </ng-container>
                  <ng-container matColumnDef="visibility">
                    <th mat-header-cell *matHeaderCellDef>Visibilidad</th>
                    <td mat-cell *matCellDef="let row">{{ row.visibility }}</td>
                  </ng-container>
                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef>Acciones</th>
                    <td mat-cell *matCellDef="let row">
                      <button mat-stroked-button type="button" (click)="selectRepo(row.id); openDeploy(row)">
                        <mat-icon>rocket_launch</mat-icon> Desplegar
                      </button>
                    </td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="repoCols"></tr>
                  <tr mat-row *matRowDef="let row; columns: repoCols" (click)="selectRepo(row.id)"></tr>
                </table>
              </div>
            </div>
          }
        }

        @if (section() === 'gitlab') {
          <app-empty-state
            icon="code"
            title="GitLab — próximamente"
            message="La integración con GitLab estará disponible en una próxima versión. Usa GitHub para sincronizar y desplegar ahora."
          />
        }

        @if (section() === 'webhooks') {
          <div class="table-card">
            <table mat-table [dataSource]="webhooks()" class="premium-table">
              <ng-container matColumnDef="repo">
                <th mat-header-cell *matHeaderCellDef>Repositorio</th>
                <td mat-cell *matCellDef="let row">{{ row.repoFullName }}</td>
              </ng-container>
              <ng-container matColumnDef="event">
                <th mat-header-cell *matHeaderCellDef>Evento</th>
                <td mat-cell *matCellDef="let row">{{ row.event }}</td>
              </ng-container>
              <ng-container matColumnDef="url">
                <th mat-header-cell *matHeaderCellDef>URL</th>
                <td mat-cell *matCellDef="let row" class="mono">{{ row.url }}</td>
              </ng-container>
              <ng-container matColumnDef="active">
                <th mat-header-cell *matHeaderCellDef>Estado</th>
                <td mat-cell *matCellDef="let row">
                  <app-status-badge [value]="row.active ? 'RUNNING' : 'STOPPED'" />
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="webhookCols"></tr>
              <tr mat-row *matRowDef="let row; columns: webhookCols"></tr>
            </table>
          </div>
        }

        @if (needsRepo() && !selectedRepoId()) {
          <app-empty-state
            icon="folder_open"
            title="Selecciona un repositorio"
            message="Conecta GitHub, sincroniza y elige un repositorio en la pestaña GitHub."
          />
        } @else if (section() === 'branches') {
          <div class="table-card">
            <table mat-table [dataSource]="branches()" class="premium-table">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Rama</th>
                <td mat-cell *matCellDef="let row"><strong>{{ row.name }}</strong></td>
              </ng-container>
              <ng-container matColumnDef="protected">
                <th mat-header-cell *matHeaderCellDef>Protegida</th>
                <td mat-cell *matCellDef="let row">{{ row.protected ? 'Sí' : 'No' }}</td>
              </ng-container>
              <ng-container matColumnDef="commit">
                <th mat-header-cell *matHeaderCellDef>Último commit</th>
                <td mat-cell *matCellDef="let row">{{ row.lastCommitMessage }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="branchCols"></tr>
              <tr mat-row *matRowDef="let row; columns: branchCols"></tr>
            </table>
          </div>
        } @else if (section() === 'commits') {
          <div class="table-card">
            <table mat-table [dataSource]="commits()" class="premium-table">
              <ng-container matColumnDef="sha">
                <th mat-header-cell *matHeaderCellDef>SHA</th>
                <td mat-cell *matCellDef="let row" class="mono">{{ row.sha | slice:0:12 }}</td>
              </ng-container>
              <ng-container matColumnDef="message">
                <th mat-header-cell *matHeaderCellDef>Mensaje</th>
                <td mat-cell *matCellDef="let row">{{ row.message }}</td>
              </ng-container>
              <ng-container matColumnDef="author">
                <th mat-header-cell *matHeaderCellDef>Autor</th>
                <td mat-cell *matCellDef="let row">{{ row.author }}</td>
              </ng-container>
              <ng-container matColumnDef="branch">
                <th mat-header-cell *matHeaderCellDef>Rama</th>
                <td mat-cell *matCellDef="let row">{{ row.branch }}</td>
              </ng-container>
              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef>Fecha</th>
                <td mat-cell *matCellDef="let row">{{ row.date | date: 'short' }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="commitCols"></tr>
              <tr mat-row *matRowDef="let row; columns: commitCols"></tr>
            </table>
          </div>
        } @else if (section() === 'pull-requests') {
          <div class="table-card">
            <table mat-table [dataSource]="pullRequests()" class="premium-table">
              <ng-container matColumnDef="number">
                <th mat-header-cell *matHeaderCellDef>#</th>
                <td mat-cell *matCellDef="let row">{{ row.number }}</td>
              </ng-container>
              <ng-container matColumnDef="title">
                <th mat-header-cell *matHeaderCellDef>Título</th>
                <td mat-cell *matCellDef="let row">{{ row.title }}</td>
              </ng-container>
              <ng-container matColumnDef="state">
                <th mat-header-cell *matHeaderCellDef>Estado</th>
                <td mat-cell *matCellDef="let row"><app-status-badge [value]="prStatus(row.state)" /></td>
              </ng-container>
              <ng-container matColumnDef="author">
                <th mat-header-cell *matHeaderCellDef>Autor</th>
                <td mat-cell *matCellDef="let row">{{ row.author }}</td>
              </ng-container>
              <ng-container matColumnDef="branches">
                <th mat-header-cell *matHeaderCellDef>Ramas</th>
                <td mat-cell *matCellDef="let row">{{ row.head }} → {{ row.base }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="prCols"></tr>
              <tr mat-row *matRowDef="let row; columns: prCols"></tr>
            </table>
          </div>
        } @else if (section() === 'deployments') {
          <div class="table-card">
            <table mat-table [dataSource]="deployments()" class="premium-table">
              <ng-container matColumnDef="repo">
                <th mat-header-cell *matHeaderCellDef>Repositorio</th>
                <td mat-cell *matCellDef="let row">{{ row.repoFullName }}</td>
              </ng-container>
              <ng-container matColumnDef="branch">
                <th mat-header-cell *matHeaderCellDef>Rama</th>
                <td mat-cell *matCellDef="let row">{{ row.branch }}</td>
              </ng-container>
              <ng-container matColumnDef="target">
                <th mat-header-cell *matHeaderCellDef>Destino</th>
                <td mat-cell *matCellDef="let row">{{ row.targetName }} ({{ row.targetType }})</td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Estado</th>
                <td mat-cell *matCellDef="let row"><app-status-badge [value]="deployStatus(row.status)" /></td>
              </ng-container>
              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef>Fecha</th>
                <td mat-cell *matCellDef="let row">{{ row.createdAt | date: 'short' }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="deployCols"></tr>
              <tr mat-row *matRowDef="let row; columns: deployCols"></tr>
            </table>
          </div>
        }
      }
    </div>
  `,
  styles: `
    .connect-card {
      padding: 1.25rem 1.35rem;
      margin-bottom: 1.25rem;
      border-radius: var(--app-radius-lg);
    }
    .connect-card__head {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
      margin-bottom: 1rem;
      p { margin: 0.35rem 0 0; font-size: 0.85rem; color: var(--app-text-muted); }
    }
    .connect-card__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      button { display: inline-flex; align-items: center; gap: 0.35rem; }
    }
    .table-card {
      padding: 1.15rem 1.25rem;
      border-radius: var(--app-radius-lg);
      background: var(--app-card);
      box-shadow: var(--app-shadow-sm);
      margin-bottom: 1.25rem;
      h3 { margin: 0 0 1rem; font-size: 1rem; }
    }
    .repo-select { width: min(100%, 420px); margin-bottom: 1rem; }
    .mono { font-family: ui-monospace, monospace; font-size: 0.78rem; }
  `,
})
export class RepositoriesPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly github = inject(GithubService)
  private readonly inventory = inject(InventoryService)
  private readonly demoActions = inject(DemoActionsService)
  private readonly dialog = inject(MatDialog)

  readonly page = createPageLoader(true)
  readonly data = signal<Record<string, unknown> | null>(null)
  readonly connection = signal<GithubConnection | null>(null)
  readonly repos = signal<GithubRepo[]>([])
  readonly selectedRepoId = signal<string | null>(null)
  readonly branches = signal<Record<string, unknown>[]>([])
  readonly commits = signal<Record<string, unknown>[]>([])
  readonly pullRequests = signal<Record<string, unknown>[]>([])
  readonly webhooks = signal<Record<string, unknown>[]>([])
  readonly deployments = signal<Record<string, unknown>[]>([])

  readonly repoControl = new FormControl<string>('', { nonNullable: true })

  readonly repoCols = ['name', 'language', 'branch', 'visibility', 'actions']
  readonly webhookCols = ['repo', 'event', 'url', 'active']
  readonly branchCols = ['name', 'protected', 'commit']
  readonly commitCols = ['sha', 'message', 'author', 'branch', 'date']
  readonly prCols = ['number', 'title', 'state', 'author', 'branches']
  readonly deployCols = ['repo', 'branch', 'target', 'status', 'date']

  readonly section = computed(() => this.route.snapshot.paramMap.get('section') ?? 'github')

  readonly headerMeta = computed(() => SECTION_TITLES[this.section()] ?? SECTION_TITLES['github'])

  readonly needsRepo = (): boolean =>
    ['branches', 'commits', 'pull-requests'].includes(this.section())

  ngOnInit(): void {
    this.load()
    this.loadConnection()
    this.github.webhooks().subscribe((w) => this.webhooks.set(w.items))
    this.github.deployments().subscribe((d) => this.deployments.set(d.items))
    this.repoControl.valueChanges.subscribe((id) => {
      if (id) {
        this.selectRepo(id)
        this.loadRepoDetails(id)
      }
    })
  }

  n = (key: string): number => invNum(this.data(), key)

  load = (): void => {
    this.page.run(this.inventory.github(), {
      onSuccess: (d) => {
        this.data.set(d)
        const items = (d['repoItems'] as GithubRepo[]) ?? []
        if (items.length && !this.selectedRepoId()) {
          this.repos.set(items)
          this.repoControl.setValue(items[0].id)
        }
      },
      errorMessage: 'No se pudo cargar el inventario de repositorios',
    })
  }

  loadConnection = (): void => {
    this.github
      .connection()
      .pipe(catchError(() => of({ connected: false, username: null, repoCount: 0 })))
      .subscribe((c) => {
        this.connection.set(c)
        if (c.connected) this.refreshRepos()
      })
  }

  refreshRepos = (): void => {
    this.github.repositories().subscribe((r) => {
      this.repos.set(r.items)
      if (r.items.length && !this.repoControl.value) {
        this.repoControl.setValue(r.items[0].id)
      }
    })
  }

  handleConnect = (): void => {
    this.github.connect({ username: 'cloudops-demo' }).subscribe({
      next: (c) => {
        this.connection.set(c)
        this.demoActions.simulate('Cuenta GitHub conectada', 400, c.message ?? 'Conectado').subscribe()
        this.handleSync()
      },
    })
  }

  handleDisconnect = (): void => {
    this.github.disconnect().subscribe({
      next: () => {
        this.connection.set({ connected: false, username: null, repoCount: 0 })
        this.repos.set([])
        this.demoActions.simulate('GitHub desconectado', 300).subscribe()
      },
    })
  }

  handleSync = (): void => {
    this.github.sync().subscribe({
      next: (res) => {
        this.repos.set(res.repos)
        this.connection.update((c) => (c ? { ...c, lastSyncAt: res.lastSyncAt, repoCount: res.synced } : c))
        this.demoActions.simulate('Sincronización GitHub', 600, `${res.synced} repositorios`).subscribe()
        if (res.repos.length) this.repoControl.setValue(res.repos[0].id)
        this.load()
      },
      error: (err) => {
        this.demoActions.simulate('Error sync', 300, err?.error?.message ?? 'Conecta primero').subscribe()
      },
    })
  }

  selectRepo = (id: string): void => {
    this.selectedRepoId.set(id)
    this.repoControl.setValue(id, { emitEvent: false })
  }

  loadRepoDetails = (repoId: string): void => {
    this.github.branches(repoId).subscribe((b) => this.branches.set(b.items))
    this.github.commits(repoId).subscribe((c) => this.commits.set(c.items))
    this.github.pullRequests(repoId).subscribe((p) => this.pullRequests.set(p.items))
  }

  openDeploy = (repo: GithubRepo): void => {
    const ref = this.dialog.open(RepoDeployDialogComponent, {
      width: '420px',
      data: { repoName: repo.fullName, defaultBranch: repo.defaultBranch },
    })
    ref.afterClosed().subscribe((result) => {
      if (!result) return
      this.github
        .deploy({
          repoId: repo.id,
          branch: result.branch,
          targetType: result.targetType,
          targetId: result.targetId,
          targetName: result.targetName,
        })
        .subscribe({
          next: (res) => {
            this.demoActions.simulate('Despliegue', 800, res.message).subscribe()
            this.github.deployments().subscribe((d) => this.deployments.set(d.items))
          },
        })
    })
  }

  headerActions = (): { label: string; icon?: string; primary?: boolean }[] => {
    if (this.section() === 'github') {
      return [
        { label: 'Conectar GitHub', icon: 'link', primary: true },
        { label: 'Sincronizar', icon: 'sync' },
        { label: 'Desplegar', icon: 'rocket_launch' },
      ]
    }
    return [{ label: 'Actualizar', icon: 'refresh' }]
  }

  handleHeader = (label: string): void => {
    if (label === 'Conectar GitHub') this.handleConnect()
    else if (label === 'Sincronizar') this.handleSync()
    else if (label === 'Desplegar') {
      const repo = this.repos().find((r) => r.id === this.selectedRepoId()) ?? this.repos()[0]
      if (repo) this.openDeploy(repo)
    } else this.load()
  }

  prStatus = (state: string): string => {
    if (state === 'open') return 'RUNNING'
    if (state === 'merged') return 'SUCCESS'
    return 'STOPPED'
  }

  deployStatus = (status: string): string => {
    if (status === 'success') return 'SUCCESS'
    if (status === 'running') return 'RUNNING'
    return 'ERROR'
  }
}
