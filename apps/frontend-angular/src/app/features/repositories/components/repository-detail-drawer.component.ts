import { Component, Input, inject, output } from '@angular/core'
import { DatePipe } from '@angular/common'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTabsModule } from '@angular/material/tabs'
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import { NavIconComponent } from '../../../shared/components/nav-icon/nav-icon.component'
import { DemoActionsService } from '../../../core/services/demo-actions.service'
import type { GithubRepo } from '../../../core/services/github.service'
import {
  buildRepositoryDrawerOverview,
  cicdStateBadge,
  deployStateBadge,
  prStateBadge,
  visibilityLabel,
  type RepoDrawerOverview,
} from '../utils/repository-drawer-demo.util'

@Component({
  selector: 'app-repository-detail-drawer',
  standalone: true,
  imports: [
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatProgressBarModule,
    StatusBadgeComponent,
    NavIconComponent,
  ],
  template: `
    @if (open && repo) {
      <div class="drawer-backdrop animate-fade-in" (click)="close.emit()" role="presentation"></div>
      <aside class="repo-drawer animate-slide-in" role="dialog" aria-labelledby="repo-drawer-title">
        <header class="repo-drawer__head">
          <div class="repo-drawer__brand">
            <app-nav-icon logo="github" size="md" />
            <div class="repo-drawer__titles">
              <h2 id="repo-drawer-title">{{ repo.fullName }}</h2>
              <p class="repo-drawer__desc">{{ repo.description || 'Sin descripción' }}</p>
              <div class="repo-drawer__badges">
                <app-status-badge [value]="visibilityBadge(repo.visibility)" />
                <span class="lang-chip">
                  <mat-icon>code</mat-icon>
                  {{ repo.language || '—' }}
                </span>
                @if (repo.isDemo) {
                  <span class="demo-chip">Demo</span>
                }
              </div>
              <dl class="repo-drawer__meta">
                <div>
                  <dt>Rama principal</dt>
                  <dd>{{ repo.defaultBranch }}</dd>
                </div>
                <div>
                  <dt>Última sincronización</dt>
                  <dd>{{ lastSyncLabel }}</dd>
                </div>
                <div>
                  <dt>Último push</dt>
                  <dd>{{ overview.lastPushLabel }}</dd>
                </div>
                <div>
                  <dt>Estado sync</dt>
                  <dd><app-status-badge [value]="overview.syncStatusBadge" /></dd>
                </div>
                <div>
                  <dt>Estado deploy</dt>
                  <dd><app-status-badge [value]="overview.deployStatusBadge" /></dd>
                </div>
                <div>
                  <dt>Actualizado</dt>
                  <dd>{{ repo.updatedAt | date: 'medium' }}</dd>
                </div>
              </dl>
            </div>
          </div>
          <button mat-icon-button type="button" aria-label="Cerrar detalle" (click)="close.emit()">
            <mat-icon>close</mat-icon>
          </button>
        </header>

        <section class="repo-drawer__metrics" aria-label="Métricas del repositorio">
          @for (m of overview.metrics; track m.label) {
            <div class="metric-card" [class]="'metric-card--' + (m.tone ?? 'default')">
              <mat-icon>{{ m.icon }}</mat-icon>
              <span class="metric-card__value">{{ m.value }}</span>
              <span class="metric-card__label">{{ m.label }}</span>
            </div>
          }
        </section>

        <section class="repo-drawer__health" aria-label="Salud del repositorio">
          <div class="health-row">
            <span>Salud del repositorio</span>
            <strong>{{ overview.healthScore }}% — {{ overview.healthLabel }}</strong>
          </div>
          <mat-progress-bar mode="determinate" [value]="overview.healthScore" />
        </section>

        <mat-tab-group class="soft-tabs drawer-tabs" animationDuration="200ms">
          <mat-tab label="Resumen">
            <div class="drawer-panel">
              <div class="info-banner info-banner--sync">
                <mat-icon>sync</mat-icon>
                <div>
                  <strong>{{ overview.syncStatusLabel }}</strong>
                  <p>Última sincronización: {{ lastSyncLabel }}</p>
                </div>
              </div>
              <div class="info-banner info-banner--deploy">
                <mat-icon>rocket_launch</mat-icon>
                <div>
                  <strong>Despliegue: {{ overview.deployStatusLabel }}</strong>
                  <p>{{ repoDeployments.length }} despliegue(s) registrados para este repo</p>
                </div>
              </div>
              <dl class="detail-grid">
                <div><dt>Estrellas</dt><dd>{{ repo.stars }}</dd></div>
                <div><dt>Visibilidad</dt><dd>{{ visibilityLabel(repo.visibility) }}</dd></div>
                <div><dt>PR abiertos</dt><dd>{{ overview.openPrCount }}</dd></div>
                <div><dt>Webhooks</dt><dd>{{ repoWebhooks.length }}</dd></div>
                <div><dt>Ramas</dt><dd>{{ branches.length }}</dd></div>
                <div><dt>Commits (cargados)</dt><dd>{{ commits.length }}</dd></div>
              </dl>
              <h3 class="panel-subtitle">Destinos de despliegue</h3>
              <ul class="target-list">
                @for (t of overview.targets; track t.name) {
                  <li>
                    <span class="target-type">{{ t.type }}</span>
                    <strong>{{ t.name }}</strong>
                    <span class="muted">{{ t.status }}</span>
                    <app-status-badge [value]="t.badge" />
                  </li>
                }
              </ul>
              <div class="drawer-actions">
                <button mat-stroked-button type="button" (click)="sync.emit(repo.id)">
                  <mat-icon>sync</mat-icon> Sincronizar
                </button>
                <button mat-flat-button color="primary" type="button" (click)="deploy.emit(repo)">
                  <mat-icon>rocket_launch</mat-icon> Desplegar
                </button>
              </div>
            </div>
          </mat-tab>

          <mat-tab label="Ramas">
            <div class="drawer-panel">
              @if (branches.length) {
                <ul class="mini-list">
                  @for (b of branches; track b['name']) {
                    <li>
                      <div class="row-head">
                        <strong>{{ b['name'] }}</strong>
                        @if (b['protected']) {
                          <app-status-badge value="RUNNING" />
                        }
                      </div>
                      <span class="muted">{{ b['lastCommitMessage'] }}</span>
                    </li>
                  }
                </ul>
              } @else {
                <p class="muted">Sincroniza el repositorio para ver ramas</p>
              }
            </div>
          </mat-tab>

          <mat-tab label="Commits">
            <div class="drawer-panel">
              @if (commits.length) {
                @for (c of commits.slice(0, 12); track c['sha']) {
                  <div class="commit-line">
                    <code>{{ shortSha(c['sha']) }}</code>
                    <span>{{ c['message'] }}</span>
                    <span class="muted">{{ c['author'] }} · {{ commitDate(c) | date: 'short' }}</span>
                  </div>
                }
              } @else {
                <p class="muted">No hay commits cargados. Usa Sincronizar en Resumen.</p>
              }
            </div>
          </mat-tab>

          <mat-tab label="Pull Requests">
            <div class="drawer-panel">
              @if (pullRequests.length) {
                <ul class="mini-list">
                  @for (pr of pullRequests; track pr['id']) {
                    <li>
                      <div class="row-head">
                        <strong>#{{ pr['number'] }} {{ pr['title'] }}</strong>
                        <app-status-badge [value]="prStateBadge(str(pr['state']))" />
                      </div>
                      <span class="muted">{{ pr['author'] }} · {{ pr['head'] }} → {{ pr['base'] }}</span>
                    </li>
                  }
                </ul>
              } @else {
                <p class="muted">No hay pull requests para este repositorio</p>
              }
            </div>
          </mat-tab>

          <mat-tab label="Webhooks">
            <div class="drawer-panel">
              @if (repoWebhooks.length) {
                <ul class="mini-list">
                  @for (wh of repoWebhooks; track wh['id']) {
                    <li>
                      <div class="row-head">
                        <strong>{{ wh['event'] }}</strong>
                        <app-status-badge [value]="wh['active'] ? 'SUCCESS' : 'STOPPED'" />
                      </div>
                      <span class="mono muted">{{ wh['url'] }}</span>
                    </li>
                  }
                </ul>
              } @else {
                <p class="muted">Sin webhooks configurados en este repositorio</p>
              }
            </div>
          </mat-tab>

          <mat-tab label="Despliegues">
            <div class="drawer-panel">
              @if (repoDeployments.length) {
                <ul class="mini-list">
                  @for (d of repoDeployments; track d['id']) {
                    <li>
                      <div class="row-head">
                        <strong>{{ d['targetName'] }}</strong>
                        <app-status-badge [value]="deployStateBadge(str(d['status']))" />
                      </div>
                      <span class="muted">{{ d['targetType'] }} · rama {{ d['branch'] }}</span>
                      <button mat-button type="button" (click)="viewDeploymentLogs.emit(d)">
                        Ver registros
                      </button>
                    </li>
                  }
                </ul>
              } @else {
                <p class="muted">Aún no hay despliegues para este repositorio</p>
              }
            </div>
          </mat-tab>

          <mat-tab label="CI/CD">
            <div class="drawer-panel">
              <p class="panel-lead">Pipelines y workflows asociados (vista demo)</p>
              <ul class="mini-list">
                @for (row of overview.cicd; track row.name) {
                  <li>
                    <div class="row-head">
                      <strong>{{ row.name }}</strong>
                      <app-status-badge [value]="cicdStateBadge(row.status)" />
                    </div>
                    <span class="muted">{{ row.workflow }} · {{ row.branch }} · {{ row.duration }}</span>
                  </li>
                }
              </ul>
            </div>
          </mat-tab>

          <mat-tab label="Estructura">
            <div class="drawer-panel">
              <p class="panel-lead">Árbol del proyecto (vista demo)</p>
              <ul class="tree-list">
                @for (node of overview.tree; track node.path) {
                  <li [style.padding-left.rem]="node.depth * 0.85">
                    <mat-icon>{{ node.type === 'folder' ? 'folder' : 'description' }}</mat-icon>
                    {{ node.path }}
                  </li>
                }
              </ul>
            </div>
          </mat-tab>

          <mat-tab label="Actividad">
            <div class="drawer-panel">
              <ul class="timeline">
                @for (ev of overview.activity; track ev.id) {
                  <li>
                    <mat-icon>{{ ev.icon }}</mat-icon>
                    <div>
                      <strong>{{ ev.title }}</strong>
                      <p>{{ ev.detail }}</p>
                      <span class="muted">{{ ev.when }}</span>
                    </div>
                  </li>
                }
              </ul>
            </div>
          </mat-tab>

          <mat-tab label="Registros">
            <div class="drawer-panel">
              <pre class="log-block" tabindex="0" aria-label="Registros del repositorio">{{ overview.logs }}</pre>
              <button mat-stroked-button type="button" (click)="handleCopyLogs()">
                <mat-icon>content_copy</mat-icon> Copiar registros
              </button>
            </div>
          </mat-tab>

          <mat-tab label="Acciones">
            <div class="drawer-panel">
              <p class="panel-lead">Acciones operativas (demo)</p>
              <div class="action-grid">
                <button mat-stroked-button type="button" (click)="runDemo('Sincronizar ramas')">
                  <mat-icon>account_tree</mat-icon> Sincronizar ramas
                </button>
                <button mat-stroked-button type="button" (click)="runDemo('Reindexar commits')">
                  <mat-icon>history</mat-icon> Reindexar commits
                </button>
                <button mat-stroked-button type="button" (click)="runDemo('Validar webhooks')">
                  <mat-icon>webhook</mat-icon> Validar webhooks
                </button>
                <button mat-stroked-button type="button" (click)="runDemo('Ejecutar pipeline CI')">
                  <mat-icon>play_circle</mat-icon> Ejecutar CI
                </button>
                <button mat-stroked-button type="button" (click)="runDemo('Rollback despliegue')">
                  <mat-icon>undo</mat-icon> Rollback
                </button>
                <button mat-stroked-button type="button" (click)="deploy.emit(repo)">
                  <mat-icon>rocket_launch</mat-icon> Nuevo despliegue
                </button>
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      </aside>
    }
  `,
  styles: `
    .drawer-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      z-index: 200;
      backdrop-filter: blur(2px);
    }
    .repo-drawer {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: min(680px, 100vw);
      z-index: 201;
      background: var(--app-card);
      box-shadow: var(--app-shadow-lg);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .repo-drawer__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1.1rem 1.25rem 0.75rem;
      gap: 0.75rem;
      border-bottom: 1px solid var(--app-border-subtle);
    }
    .repo-drawer__brand {
      display: flex;
      gap: 0.85rem;
      min-width: 0;
      flex: 1;
    }
    .repo-drawer__titles {
      min-width: 0;
      h2 {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 700;
        word-break: break-word;
      }
    }
    .repo-drawer__desc {
      margin: 0.3rem 0 0.5rem;
      font-size: 0.85rem;
      color: var(--app-text-muted);
      line-height: 1.4;
    }
    .repo-drawer__badges {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      align-items: center;
      margin-bottom: 0.65rem;
    }
    .lang-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      font-size: 0.72rem;
      font-weight: 600;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      background: var(--app-elevated);
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }
    .demo-chip {
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 0.2rem 0.5rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-accent) 18%, transparent);
      color: var(--app-accent);
    }
    .repo-drawer__meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.45rem 0.85rem;
      margin: 0;
      dt {
        font-size: 0.68rem;
        color: var(--app-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      dd {
        margin: 0.1rem 0 0;
        font-size: 0.8rem;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }
    }
    .repo-drawer__metrics {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
      padding: 0.65rem 1.25rem;
      border-bottom: 1px solid var(--app-border-subtle);
    }
    .metric-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.15rem;
      padding: 0.55rem 0.35rem;
      border-radius: var(--app-radius-sm);
      background: var(--app-elevated);
      mat-icon { font-size: 18px; width: 18px; height: 18px; opacity: 0.85; }
    }
    .metric-card__value { font-size: 0.95rem; font-weight: 700; }
    .metric-card__label { font-size: 0.65rem; color: var(--app-text-muted); text-align: center; }
    .metric-card--success .metric-card__value { color: var(--status-success, #16a34a); }
    .metric-card--warning .metric-card__value { color: var(--status-warning); }
    .repo-drawer__health {
      padding: 0.5rem 1.25rem 0.65rem;
      border-bottom: 1px solid var(--app-border-subtle);
    }
    .health-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.78rem;
      margin-bottom: 0.35rem;
      color: var(--app-text-muted);
      strong { color: var(--app-text); font-size: 0.8rem; }
    }
    .drawer-tabs { flex: 1; overflow: hidden; }
    .drawer-panel {
      padding: 1rem 1.25rem 1.5rem;
      overflow-y: auto;
      max-height: calc(100vh - 320px);
    }
    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem 1rem;
      margin: 0 0 1rem;
      dt { font-size: 0.72rem; color: var(--app-text-muted); text-transform: uppercase; }
      dd { margin: 0.2rem 0 0; font-size: 0.875rem; font-weight: 500; }
    }
    .info-banner {
      display: flex;
      gap: 0.65rem;
      padding: 0.75rem 0.85rem;
      border-radius: var(--app-radius-sm);
      margin-bottom: 0.65rem;
      font-size: 0.82rem;
      p { margin: 0.2rem 0 0; color: var(--app-text-muted); font-size: 0.78rem; }
      mat-icon { opacity: 0.9; }
    }
    .info-banner--sync { background: color-mix(in srgb, var(--status-info) 12%, var(--app-elevated)); }
    .info-banner--deploy { background: color-mix(in srgb, var(--status-success, #22c55e) 12%, var(--app-elevated)); }
    .panel-subtitle { margin: 0 0 0.5rem; font-size: 0.82rem; font-weight: 700; }
    .panel-lead { margin: 0 0 0.75rem; font-size: 0.82rem; color: var(--app-text-muted); }
    .drawer-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem; }
    .mini-list {
      list-style: none;
      padding: 0;
      margin: 0;
      li {
        padding: 0.65rem 0.75rem;
        margin-bottom: 0.4rem;
        border-radius: var(--app-radius-sm);
        background: var(--app-elevated);
        font-size: 0.85rem;
      }
    }
    .row-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.25rem;
    }
    .target-list li {
      display: grid;
      grid-template-columns: auto 1fr auto auto;
      gap: 0.35rem 0.5rem;
      align-items: center;
    }
    .target-type {
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--app-accent);
    }
    .commit-line {
      font-size: 0.82rem;
      padding: 0.55rem 0;
      border-bottom: 1px solid var(--app-border-subtle);
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      code { font-size: 0.72rem; font-family: 'JetBrains Mono', monospace; }
    }
    .tree-list {
      list-style: none;
      padding: 0;
      margin: 0;
      li {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        font-size: 0.82rem;
        font-family: 'JetBrains Mono', monospace;
        padding: 0.2rem 0;
        mat-icon { font-size: 16px; width: 16px; height: 16px; opacity: 0.75; }
      }
    }
    .timeline {
      list-style: none;
      padding: 0;
      margin: 0;
      li {
        display: flex;
        gap: 0.65rem;
        padding: 0.65rem 0;
        border-bottom: 1px solid var(--app-border-subtle);
        p { margin: 0.15rem 0; font-size: 0.8rem; color: var(--app-text-muted); }
      }
    }
    .log-block {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.72rem;
      line-height: 1.45;
      padding: 0.85rem;
      border-radius: var(--app-radius-sm);
      background: var(--app-elevated);
      overflow: auto;
      max-height: 280px;
      white-space: pre-wrap;
      margin: 0 0 0.75rem;
    }
    .action-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
      button { justify-content: flex-start; }
    }
    .mono { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; word-break: break-all; }
    .muted { color: var(--app-text-muted); font-size: 0.8rem; }
  `,
})
export class RepositoryDetailDrawerComponent {
  private readonly demoActions = inject(DemoActionsService)

  @Input() open = false
  @Input() repo: GithubRepo | null = null
  @Input() branches: Record<string, unknown>[] = []
  @Input() commits: Record<string, unknown>[] = []
  @Input() pullRequests: Record<string, unknown>[] = []
  @Input() webhooks: Record<string, unknown>[] = []
  @Input() deployments: Record<string, unknown>[] = []
  @Input() lastSyncAt: string | null = null
  @Input() demoMode = true

  readonly close = output<void>()
  readonly sync = output<string>()
  readonly deploy = output<GithubRepo>()
  readonly viewDeploymentLogs = output<Record<string, unknown>>()

  readonly visibilityLabel = visibilityLabel
  readonly prStateBadge = prStateBadge
  readonly deployStateBadge = deployStateBadge
  readonly cicdStateBadge = cicdStateBadge

  get overview(): RepoDrawerOverview {
    if (!this.repo) {
      return buildRepositoryDrawerOverview(
        {
          id: '',
          name: '',
          fullName: '',
          description: '',
          defaultBranch: 'main',
          language: '',
          stars: 0,
          visibility: 'private',
          updatedAt: new Date().toISOString(),
        },
        { branches: 0, commits: 0, pullRequests: 0, webhooks: 0, deployments: 0 },
      )
    }
    const openPrs = this.pullRequests.filter((p) => String(p['state']) === 'open').length
    return buildRepositoryDrawerOverview(this.repo, {
      branches: this.branches.length,
      commits: this.commits.length,
      pullRequests: this.pullRequests.length,
      webhooks: this.repoWebhooks.length,
      deployments: this.repoDeployments.length,
      openPrs,
    })
  }

  get repoWebhooks(): Record<string, unknown>[] {
    return this.webhooks
  }

  get repoDeployments(): Record<string, unknown>[] {
    if (!this.repo) return []
    return this.deployments.filter((d) => String(d['repoFullName']) === this.repo!.fullName)
  }

  get lastSyncLabel(): string {
    if (this.lastSyncAt) {
      try {
        return new Date(this.lastSyncAt).toLocaleString('es-ES')
      } catch {
        return this.lastSyncAt
      }
    }
    return 'hace 5 minutos (demo)'
  }

  visibilityBadge = (v: string): string => (v === 'public' ? 'SUCCESS' : 'STOPPED')

  shortSha = (sha: unknown): string => {
    const s = String(sha ?? '')
    return s.length > 7 ? s.slice(0, 7) : s
  }

  str = (v: unknown): string => String(v ?? '')

  commitDate = (c: Record<string, unknown>): string => String(c['date'] ?? '')

  runDemo = (label: string): void => {
    this.demoActions.simulate(label, 500, `${label} completado (demo)`).subscribe()
  }

  handleCopyLogs = (): void => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(this.overview.logs).catch(() => undefined)
    }
    this.demoActions.simulate('Registros copiados', 300).subscribe()
  }
}
