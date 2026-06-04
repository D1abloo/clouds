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
import { MatDialog } from '@angular/material/dialog'
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
  type GithubAccount,
  type GithubConnection,
  type GithubRepo,
} from '../../core/services/github.service'
import { DemoActionsService } from '../../core/services/demo-actions.service'
import { createPageLoader } from '../../core/utils/page-load.util'
import { invNum } from '../../core/utils/inventory.util'
import { catchError, finalize, map, of, switchMap, type Observable } from 'rxjs'
import { GithubAccountDialogComponent } from './components/github-account-dialog.component'
import { GithubAccountCardComponent } from './components/github-account-card.component'
import { GithubSyncStatusComponent } from './components/github-sync-status.component'
import { buildGithubInventoryFallback } from './utils/github-inventory-fallback'
import type { GithubDemoConnectResult } from '../../core/services/github.service'
import { DeployProjectDialogComponent } from './components/deploy-project-dialog.component'
import { RepositoryDetailDrawerComponent } from './components/repository-detail-drawer.component'
import { GithubLogsPanelComponent } from './components/github-logs-panel.component'

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
    GithubSyncStatusComponent,
    GithubAccountCardComponent,
    RepositoryDetailDrawerComponent,
    GithubLogsPanelComponent,
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

      @if (bootstrapping() || page.loading()) {
        <app-loading-state message="Conectando cuenta GitHub demo…" />
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
          @if (primaryAccount()) {
            <app-github-account-card [account]="primaryAccount()" [demoMode]="demoMode()" />
          }
          <mat-card class="connect-card">
            <div class="connect-card__head">
              <app-nav-icon logo="github" size="lg" />
              <div>
                <strong>Integración GitHub</strong>
                <p>Gestión de repositorios, despliegues y webhooks (modo demo disponible)</p>
              </div>
            </div>
            <app-github-sync-status
              [status]="syncStatus()"
              [lastSyncAt]="connection()?.lastSyncAt ?? primaryAccount()?.lastSyncAt ?? null"
              [repoCount]="connection()?.repoCount ?? repos().length"
            />
            @if (demoMode()) {
              <p class="demo-badge">Modo demo — {{ repos().length }} repositorios ficticios disponibles</p>
            }
            <div class="connect-card__actions">
              <button mat-flat-button color="primary" type="button" (click)="openAddAccount()">
                <mat-icon>person_add</mat-icon> Añadir cuenta
              </button>
              @if (primaryAccount()) {
                <button mat-stroked-button type="button" (click)="handleValidate()">
                  <mat-icon>verified</mat-icon> Validar
                </button>
                <button mat-stroked-button type="button" (click)="handleSync()">
                  <mat-icon>sync</mat-icon> Sincronizar
                </button>
                <button mat-stroked-button type="button" (click)="handleDisconnect()">
                  <mat-icon>link_off</mat-icon> Eliminar cuenta
                </button>
              } @else {
                <button mat-stroked-button type="button" (click)="handleQuickConnect()">
                  <mat-icon>link</mat-icon> Conectar demo
                </button>
              }
            </div>
            @if (accounts().length > 1) {
              <ul class="account-list">
                @for (a of accounts(); track a.id) {
                  <li>{{ a.label }} — {{ a.username }} ({{ a.status }})</li>
                }
              </ul>
            }
          </mat-card>

          @if (repos().length || demoMode()) {
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
                      <button mat-stroked-button type="button" (click)="openDrawer(row); $event.stopPropagation()">
                        <mat-icon>info</mat-icon> Detalle
                      </button>
                      <button mat-stroked-button type="button" (click)="openDeploy(row); $event.stopPropagation()">
                        <mat-icon>rocket_launch</mat-icon> Desplegar
                      </button>
                    </td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="repoCols"></tr>
                  <tr
                    mat-row
                    *matRowDef="let row; columns: repoCols"
                    class="clickable-row"
                    (click)="openDrawer(row)"
                  ></tr>
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

        @if (needsRepo() && !repos().length) {
          <app-empty-state
            icon="folder_open"
            title="Sin repositorios"
            message="Pulsa «Conectar demo» en la pestaña GitHub para cargar repositorios ficticios."
          />
        } @else if (needsRepo() && !selectedRepoId()) {
          <app-empty-state
            icon="folder_open"
            title="Selecciona un repositorio"
            message="Elige un repositorio en la pestaña GitHub o en el selector superior."
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
              <ng-container matColumnDef="logs">
                <th mat-header-cell *matHeaderCellDef>Registros</th>
                <td mat-cell *matCellDef="let row">
                  <button mat-button type="button" (click)="viewLogs(row)">Ver logs</button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="deployCols"></tr>
              <tr mat-row *matRowDef="let row; columns: deployCols"></tr>
            </table>
            <app-github-logs-panel
              [open]="logsOpen()"
              [logs]="logsText()"
              [title]="logsTitle()"
              (close)="closeLogs()"
            />
          </div>
        }
      }
    </div>

    <app-repository-detail-drawer
      [open]="drawerOpen()"
      [repo]="drawerRepo()"
      [branches]="branches()"
      [commits]="commits()"
      (close)="closeDrawer()"
      (sync)="handleRepoSync($event)"
      (deploy)="openDeploy($event)"
    />
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
      margin-bottom: 0.75rem;
      p { margin: 0.35rem 0 0; font-size: 0.85rem; color: var(--app-text-muted); }
    }
    .connect-card__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.85rem;
      button { display: inline-flex; align-items: center; gap: 0.35rem; }
    }
    .account-list {
      margin: 0.75rem 0 0;
      padding-left: 1.1rem;
      font-size: 0.8rem;
      color: var(--app-text-muted);
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
    .clickable-row { cursor: pointer; }
    .demo-badge {
      margin: 0.65rem 0 0;
      font-size: 0.8rem;
      color: var(--app-primary, #1565c0);
      font-weight: 500;
    }
  `,
})
export class RepositoriesPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly github = inject(GithubService)
  private readonly inventory = inject(InventoryService)
  private readonly demoActions = inject(DemoActionsService)
  private readonly dialog = inject(MatDialog)

  readonly page = createPageLoader(false)
  readonly bootstrapping = signal(true)
  readonly data = signal<Record<string, unknown> | null>(null)
  readonly connection = signal<GithubConnection | null>(null)
  readonly accounts = signal<GithubAccount[]>([])
  readonly repos = signal<GithubRepo[]>([])
  readonly selectedRepoId = signal<string | null>(null)
  readonly branches = signal<Record<string, unknown>[]>([])
  readonly commits = signal<Record<string, unknown>[]>([])
  readonly pullRequests = signal<Record<string, unknown>[]>([])
  readonly webhooks = signal<Record<string, unknown>[]>([])
  readonly deployments = signal<Record<string, unknown>[]>([])
  readonly drawerOpen = signal(false)
  readonly drawerRepo = signal<GithubRepo | null>(null)
  readonly logsOpen = signal(false)
  readonly logsText = signal('')
  readonly logsTitle = signal('')
  readonly demoMode = signal(false)

  readonly repoControl = new FormControl<string>('', { nonNullable: true })

  readonly repoCols = ['name', 'language', 'branch', 'visibility', 'actions']
  readonly webhookCols = ['repo', 'event', 'url', 'active']
  readonly branchCols = ['name', 'protected', 'commit']
  readonly commitCols = ['sha', 'message', 'author', 'branch', 'date']
  readonly prCols = ['number', 'title', 'state', 'author', 'branches']
  readonly deployCols = ['repo', 'branch', 'target', 'status', 'date', 'logs']

  readonly section = computed(() => this.route.snapshot.paramMap.get('section') ?? 'github')

  readonly headerMeta = computed(() => SECTION_TITLES[this.section()] ?? SECTION_TITLES['github'])

  readonly primaryAccount = computed(() => {
    const connected = this.accounts().find((a) => a.status === 'connected')
    return connected ?? this.accounts()[0] ?? null
  })

  readonly syncStatus = computed((): 'connected' | 'pending' | 'invalid' | 'disconnected' => {
    if (this.connection()?.connected) return 'connected'
    const acc = this.primaryAccount()
    if (!acc) return 'disconnected'
    if (acc.status === 'connected') return 'connected'
    if (acc.status === 'invalid') return 'invalid'
    return 'pending'
  })

  readonly needsRepo = (): boolean =>
    ['branches', 'commits', 'pull-requests'].includes(this.section())

  ngOnInit(): void {
    this.bootstrapGithubDemo()
    this.repoControl.valueChanges.subscribe((id) => {
      if (id) {
        this.selectRepo(id)
        this.loadRepoDetails(id)
      }
    })
    this.route.paramMap.subscribe(() => {
      const repoId = this.repoControl.value || this.repos()[0]?.id
      if (repoId && this.needsRepo()) this.loadRepoDetails(repoId)
    })
  }

  bootstrapGithubDemo = (): void => {
    this.bootstrapping.set(true)
    this.github
      .connectDemo()
      .pipe(
        catchError(() =>
          this.github.demoRepos().pipe(
            switchMap((r) =>
              of({
                demoMode: true,
                account: {
                  id: 'demo-github-account-001',
                  label: 'GitHub Demo Account',
                  username: 'cloudops-demo',
                  organization: 'cloudops-lab',
                  accountType: 'demo',
                  accountTypeLabel: 'Demo',
                  status: 'connected',
                  statusLabel: 'Conectada',
                  avatarUrl: 'https://github.com/cloudops-demo.png',
                  lastSyncAt: new Date().toISOString(),
                  createdAt: new Date().toISOString(),
                },
                connection: {
                  connected: true,
                  username: 'cloudops-demo',
                  repoCount: r.count,
                  accountId: 'demo-github-account-001',
                  demoMode: true,
                  lastSyncAt: new Date().toISOString(),
                },
                repos: r.items,
                synced: r.count,
                message: 'Modo demo (sin API)',
              } as GithubDemoConnectResult),
            ),
          ),
        ),
        finalize(() => this.bootstrapping.set(false)),
      )
      .subscribe((state) => {
        this.applyDemoBootstrap(state)
        this.load()
        this.reloadAuxiliaryTables()
      })
  }

  applyDemoBootstrap = (state: GithubDemoConnectResult): void => {
    this.demoMode.set(true)
    this.accounts.set([state.account])
    this.connection.set(state.connection)
    this.repos.set(state.repos)
    if (state.repos.length) {
      this.repoControl.setValue(state.repos[0].id)
      this.selectedRepoId.set(state.repos[0].id)
      this.loadRepoDetails(state.repos[0].id)
    }
    this.data.set({
      connected: true,
      username: state.account.username,
      demoMode: true,
      repoCount: state.synced,
      branchCount: state.synced * 4,
      commitCount: state.synced * 4,
      openPullRequests: state.synced * 2,
      webhookCount: 4,
      deploymentCount: 4,
      repoItems: state.repos,
      lastSyncAt: state.connection.lastSyncAt,
    })
  }

  reloadAuxiliaryTables = (): void => {
    this.github
      .webhooks()
      .pipe(catchError(() => of({ items: [] })))
      .subscribe((w) => this.webhooks.set(w.items))
    this.github
      .deployments()
      .pipe(catchError(() => of({ items: [] })))
      .subscribe((d) => this.deployments.set(d.items))
  }

  n = (key: string): number => invNum(this.data(), key)

  load = (): void => {
    this.page.run(this.inventory.github(), {
      onSuccess: (d) => this.mergeInventory(d),
      fallback: () => {
        const base = buildGithubInventoryFallback()
        base['repoItems'] = this.repos().length ? this.repos() : base['repoItems']
        return base
      },
      errorMessage: 'No se pudo cargar el inventario de repositorios',
    })
  }

  mergeInventory = (d: Record<string, unknown>): void => {
    const items = (d['repoItems'] as GithubRepo[]) ?? []
    if (items.length) this.repos.set(items)
    this.data.set({ ...d, repoItems: this.repos() })
    this.demoMode.set(!!d['demoMode'] || this.demoMode())
    const first = this.repos()[0]
    if (first && !this.repoControl.value) {
      this.repoControl.setValue(first.id)
      this.loadRepoDetails(first.id)
    }
  }

  refreshAccounts = (): void => {
    this.github
      .accounts()
      .pipe(catchError(() => of({ items: [] as GithubAccount[] })))
      .subscribe((r) => this.accounts.set(r.items))
  }

  loadConnection = (): void => {
    this.github
      .connection()
      .pipe(catchError(() => of({ connected: false, username: null, repoCount: 0 })))
      .subscribe((c) => {
        this.connection.set(c)
        if ((c as GithubConnection & { demoMode?: boolean }).demoMode) this.demoMode.set(true)
        if (c.connected || c.repoCount > 0) this.refreshRepos()
        else this.loadDemoRepos()
      })
  }

  refreshRepos = (): void => {
    this.github.repositories().subscribe((r) => {
      this.repos.set(r.items)
      this.demoMode.set(!!(r as { demoMode?: boolean }).demoMode || r.items.length > 0)
      if (r.items.length && !this.repoControl.value) {
        this.repoControl.setValue(r.items[0].id)
        this.loadRepoDetails(r.items[0].id)
      }
    })
  }

  loadDemoRepos = (): void => {
    this.github
      .repositories()
      .pipe(catchError(() => this.github.demoRepos()))
      .subscribe((r) => {
        if (r.items.length) {
          this.repos.set(r.items)
          this.demoMode.set(true)
          if (!this.repoControl.value) {
            this.repoControl.setValue(r.items[0].id)
            this.loadRepoDetails(r.items[0].id)
          }
        }
      })
  }

  openAddAccount = (): void => {
    const ref = this.dialog.open(GithubAccountDialogComponent, { width: '440px' })
    ref.afterClosed().subscribe((body) => {
      if (!body) return
      this.github
        .createAccount(body)
        .pipe(
          switchMap((acc) =>
            this.github.validateAccount(acc.id).pipe(switchMap(() => this.github.syncAccount(acc.id))),
          ),
        )
        .subscribe({
          next: () => {
            this.demoActions.simulate('Cuenta añadida', 500, 'Validada y sincronizada').subscribe()
            this.refreshAccounts()
            this.loadConnection()
            this.handleSync()
          },
        })
    })
  }

  handleQuickConnect = (): void => {
    this.bootstrapping.set(true)
    this.github
      .connectDemo()
      .pipe(finalize(() => this.bootstrapping.set(false)))
      .subscribe({
        next: (state) => {
          this.applyDemoBootstrap(state)
          this.demoActions.simulate('Cuenta GitHub demo', 400, state.message).subscribe()
          this.reloadAuxiliaryTables()
        },
      })
  }

  handleValidate = (): void => {
    const acc = this.primaryAccount()
    if (!acc) return
    this.github
      .validateAccount(acc.id)
      .pipe(catchError(() => of({ valid: true, message: 'Conexión demo validada' })))
      .subscribe({
        next: (r) => this.demoActions.simulate('Validación', 400, r.message ?? 'OK').subscribe(),
      })
  }

  handleDisconnect = (): void => {
    const acc = this.primaryAccount()
    if (!acc) {
      this.github.disconnect().subscribe(() => this.resetConnection())
      return
    }
    this.github.deleteAccount(acc.id).subscribe({
      next: () => {
        this.resetConnection()
        this.demoActions.simulate('Cuenta eliminada', 300).subscribe()
      },
    })
  }

  resetConnection = (): void => {
    this.connection.set({ connected: false, username: null, repoCount: 0 })
    this.repos.set([])
    this.accounts.set([])
    this.refreshAccounts()
  }

  handleSync = (): void => {
    const acc = this.primaryAccount()
    let sync$: Observable<{ synced: number; repos?: GithubRepo[] }>
    if (acc) {
      sync$ = this.github
        .syncAccount(acc.id)
        .pipe(map((r) => ({ synced: r.synced, repos: this.repos() })))
    } else {
      sync$ = this.github
        .connectDemo()
        .pipe(map((s) => ({ synced: s.synced, repos: s.repos })))
    }
    sync$
      .pipe(
        catchError(() =>
          this.github.demoRepos().pipe(map((r) => ({ synced: r.count, repos: r.items }))),
        ),
      )
      .subscribe({
        next: (res) => {
          const items = res.repos ?? this.repos()
          if (items.length) this.repos.set(items)
          this.connection.update((c) =>
            c ? { ...c, lastSyncAt: new Date().toISOString(), repoCount: res.synced } : c,
          )
          this.load()
          this.reloadAuxiliaryTables()
          this.demoActions.simulate('Sincronización', 600, `${res.synced} repositorios`).subscribe()
        },
      })
  }

  handleRepoSync = (repoId: string): void => {
    this.github.syncRepository(repoId).subscribe({
      next: () => {
        this.loadRepoDetails(repoId)
        this.demoActions.simulate('Repositorio sincronizado', 400).subscribe()
      },
    })
  }

  selectRepo = (id: string): void => {
    this.selectedRepoId.set(id)
    this.repoControl.setValue(id, { emitEvent: false })
  }

  loadRepoDetails = (repoId: string): void => {
    this.github
      .branches(repoId)
      .pipe(catchError(() => of({ items: [] })))
      .subscribe((b) => this.branches.set(b.items))
    this.github
      .commits(repoId)
      .pipe(catchError(() => of({ items: [] })))
      .subscribe((c) => this.commits.set(c.items))
    this.github
      .pullRequests(repoId)
      .pipe(catchError(() => of({ items: [] })))
      .subscribe((p) => this.pullRequests.set(p.items))
  }

  openDrawer = (repo: GithubRepo): void => {
    this.selectRepo(repo.id)
    this.loadRepoDetails(repo.id)
    this.drawerRepo.set(repo)
    this.drawerOpen.set(true)
  }

  closeDrawer = (): void => {
    this.drawerOpen.set(false)
    this.drawerRepo.set(null)
  }

  openDeploy = (repo: GithubRepo): void => {
    const ref = this.dialog.open(DeployProjectDialogComponent, {
      width: '420px',
      data: { repoName: repo.fullName, defaultBranch: repo.defaultBranch },
    })
    ref.afterClosed().subscribe((result) => {
      if (!result) return
      this.github.deployRepository(repo.id, result).subscribe({
        next: (res) => {
          this.demoActions.simulate('Despliegue', 800, res.message).subscribe()
          this.github.deployments().subscribe((d) => this.deployments.set(d.items))
          if (res.deployment?.['id']) {
            this.viewLogs({ id: res.deployment['id'], repoFullName: repo.fullName })
          }
        },
      })
    })
  }

  viewLogs = (row: Record<string, unknown>): void => {
    const id = String(row['id'] ?? '')
    this.logsTitle.set(String(row['repoFullName'] ?? ''))
    if (row['logs']) {
      this.logsText.set(String(row['logs']))
      this.logsOpen.set(true)
      return
    }
    this.github.deploymentLogs(id).subscribe({
      next: (r) => {
        this.logsText.set(r.logs)
        this.logsOpen.set(true)
      },
      error: () => {
        this.logsText.set('No hay registros para este despliegue.')
        this.logsOpen.set(true)
      },
    })
  }

  closeLogs = (): void => this.logsOpen.set(false)

  headerActions = (): { label: string; icon?: string; primary?: boolean }[] => {
    if (this.section() === 'github') {
      return [
        { label: 'Añadir cuenta', icon: 'person_add', primary: true },
        { label: 'Sincronizar', icon: 'sync' },
        { label: 'Desplegar', icon: 'rocket_launch' },
      ]
    }
    return [{ label: 'Actualizar', icon: 'refresh' }]
  }

  handleHeader = (label: string): void => {
    if (label === 'Añadir cuenta') this.openAddAccount()
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
