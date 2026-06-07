import { Component, Input, inject, output } from '@angular/core'
import { DatePipe } from '@angular/common'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTabsModule } from '@angular/material/tabs'
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import { DemoActionsService } from '../../../core/services/demo-actions.service'
import type { GitlabProject } from '../utils/gitlab-demo-catalog'
import {
  buildGitlabDrawerOverview,
  gitlabMrBadge,
  gitlabPipeBadge,
  gitlabVisibilityBadge,
  gitlabVisibilityLabel,
  type GitlabDrawerOverview,
} from '../utils/gitlab-drawer-demo.util'

@Component({
  selector: 'app-gitlab-project-detail-drawer',
  standalone: true,
  imports: [
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatProgressBarModule,
    BrandLogoComponent,
    StatusBadgeComponent,
  ],
  template: `
    @if (open && project) {
      <div class="drawer-backdrop animate-fade-in" (click)="close.emit()" role="presentation"></div>
      <aside class="gl-drawer animate-slide-in" role="dialog" aria-labelledby="gl-drawer-title">
        <header class="gl-drawer__head">
          <div class="gl-drawer__brand">
            <div class="gl-drawer__logo" aria-hidden="true">
              <app-brand-logo logo="gitlab" size="lg" />
            </div>
            <div class="gl-drawer__titles">
              <span class="gl-drawer__name">{{ project.name }}</span>
              <h2 id="gl-drawer-title">{{ project.fullPath }}</h2>
              <p class="gl-drawer__desc">{{ project.description || 'Sin descripción' }}</p>
              <div class="gl-drawer__badges">
                <app-status-badge [value]="gitlabVisibilityBadge(project.visibility)" />
                <span class="lang-chip">
                  <mat-icon>code</mat-icon>
                  {{ project.language }}
                </span>
                <span class="group-chip">
                  <mat-icon>groups</mat-icon>
                  Grupo: {{ project.group }}
                </span>
                @if (project.subgroup) {
                  <span class="subgroup-chip">Subgrupo: {{ project.subgroup }}</span>
                }
                @if (project.isDemo) {
                  <span class="demo-chip">Demo</span>
                }
              </div>
              <dl class="gl-drawer__meta">
                <div>
                  <dt>Rama principal</dt>
                  <dd>{{ project.defaultBranch }}</dd>
                </div>
                <div>
                  <dt>Visibilidad</dt>
                  <dd>{{ gitlabVisibilityLabel(project.visibility) }}</dd>
                </div>
                <div>
                  <dt>Última sincronización</dt>
                  <dd>{{ overview.lastSyncLabel }}</dd>
                </div>
                <div>
                  <dt>Último push</dt>
                  <dd>{{ overview.lastPushLabel }}</dd>
                </div>
                <div>
                  <dt>Último pipeline</dt>
                  <dd>
                    {{ overview.lastPipelineLabel }}
                    <app-status-badge [value]="overview.pipelineBadge" />
                  </dd>
                </div>
                <div>
                  <dt>Estado despliegue</dt>
                  <dd><app-status-badge [value]="overview.deployStatusBadge" /></dd>
                </div>
              </dl>
            </div>
          </div>
          <button mat-icon-button type="button" aria-label="Cerrar detalle del proyecto" (click)="close.emit()">
            <mat-icon>close</mat-icon>
          </button>
        </header>

        <section class="gl-drawer__metrics" aria-label="Métricas del proyecto GitLab">
          @for (m of overview.metrics; track m.label) {
            <div class="metric-card" [class]="'metric-card--' + (m.tone ?? 'default')">
              <mat-icon>{{ m.icon }}</mat-icon>
              <span class="metric-card__value">{{ m.value }}</span>
              <span class="metric-card__label">{{ m.label }}</span>
            </div>
          }
        </section>

        <section class="gl-drawer__health" aria-label="Salud del proyecto">
          <div class="health-row">
            <span>Salud del proyecto</span>
            <strong>{{ overview.healthScore }}% — {{ overview.healthLabel }}</strong>
          </div>
          <mat-progress-bar mode="determinate" [value]="overview.healthScore" class="health-bar" />
          <p class="pipeline-line">
            <mat-icon>timeline</mat-icon>
            {{ overview.pipelineStatusLabel }}
          </p>
        </section>

        <mat-tab-group class="soft-tabs drawer-tabs" animationDuration="200ms">
          <mat-tab label="Resumen">
            <div class="drawer-panel">
              <div class="info-banner info-banner--sync">
                <mat-icon>sync</mat-icon>
                <div>
                  <strong>{{ overview.syncStatusLabel }}</strong>
                  <p>Última sincronización: {{ overview.lastSyncLabel }}</p>
                </div>
                <app-status-badge [value]="overview.syncStatusBadge" />
              </div>
              <div class="info-banner info-banner--pipe">
                <mat-icon>timeline</mat-icon>
                <div>
                  <strong>{{ overview.pipelineStatusLabel }}</strong>
                  <p>{{ overview.lastPipelineLabel }} · {{ overview.pipelines.length }} pipelines recientes</p>
                </div>
                <app-status-badge [value]="overview.pipelineBadge" />
              </div>
              <div class="info-banner info-banner--deploy">
                <mat-icon>rocket_launch</mat-icon>
                <div>
                  <strong>Despliegue: {{ overview.deployStatusLabel }}</strong>
                  <p>{{ overview.deployments.length }} despliegue(s) · {{ overview.environments.length }} environments</p>
                </div>
                <app-status-badge [value]="overview.deployStatusBadge" />
              </div>
              <dl class="detail-grid">
                <div><dt>Stars</dt><dd>{{ project.stars }}</dd></div>
                <div><dt>Forks</dt><dd>{{ project.forks }}</dd></div>
                <div><dt>MR abiertos</dt><dd>{{ overview.openMrs }}</dd></div>
                <div><dt>Webhooks</dt><dd>{{ webhooks.length }}</dd></div>
                <div><dt>Releases</dt><dd>{{ overview.releases.length }}</dd></div>
                <div><dt>Actualizado</dt><dd>{{ project.updatedAt | date: 'medium' }}</dd></div>
              </dl>
              <h3 class="panel-subtitle">Destinos y environments</h3>
              <ul class="target-list">
                @for (t of overview.deployTargets; track t.name) {
                  <li>
                    <span class="target-type">{{ t.type }}</span>
                    <strong>{{ t.name }}</strong>
                    <span class="muted">{{ t.status }}</span>
                    <app-status-badge [value]="t.badge" />
                  </li>
                }
              </ul>
              <div class="drawer-actions">
                <button mat-stroked-button type="button" (click)="sync.emit(project.id)">
                  <mat-icon>sync</mat-icon> Sincronizar proyecto
                </button>
                <button mat-flat-button class="gl-btn" type="button" (click)="deploy.emit(project)">
                  <mat-icon>rocket_launch</mat-icon> Desplegar proyecto
                </button>
                <button mat-stroked-button type="button" (click)="openExternal.emit(project)">
                  <mat-icon>open_in_new</mat-icon> Abrir en GitLab
                </button>
              </div>
            </div>
          </mat-tab>

          <mat-tab label="Merge Requests">
            <div class="drawer-panel">
              @if (overview.mergeRequests.length) {
                <ul class="mini-list">
                  @for (mr of overview.mergeRequests; track mr.id) {
                    <li>
                      <div class="row-head">
                        <strong>!{{ mr.iid }} {{ mr.title }}</strong>
                        <app-status-badge [value]="gitlabMrBadge(mr.state)" />
                      </div>
                      <span class="muted">{{ mr.author }} · {{ mr.sourceBranch }} → {{ mr.targetBranch }}</span>
                      <span class="muted">Revisores: {{ mr.reviewers }} · Pipeline: {{ mr.pipelineStatus }}</span>
                    </li>
                  }
                </ul>
              } @else {
                <p class="muted">No hay Merge Requests en este proyecto</p>
              }
            </div>
          </mat-tab>

          <mat-tab label="Pipelines">
            <div class="drawer-panel">
              <p class="panel-lead">Pipelines CI/CD del proyecto (vista GitLab)</p>
              <ul class="mini-list">
                @for (p of overview.pipelines; track p.id) {
                  <li>
                    <div class="row-head">
                      <strong>{{ p.stage }} — ref {{ p.ref }}</strong>
                      <app-status-badge [value]="gitlabPipeBadge(p.status)" />
                    </div>
                    <span class="muted">Duración: {{ p.duration }}</span>
                    @if (p.coverage) {
                      <span class="muted">Cobertura: {{ p.coverage }}</span>
                    }
                  </li>
                }
              </ul>
              <button mat-stroked-button type="button" (click)="runDemo('Ver pipeline en GitLab')">
                <mat-icon>play_circle</mat-icon> Ejecutar pipeline
              </button>
            </div>
          </mat-tab>

          <mat-tab label="Runners">
            <div class="drawer-panel">
              <p class="panel-lead">Runners asignados al grupo / proyecto</p>
              <ul class="mini-list">
                @for (r of overview.runners; track r.name) {
                  <li>
                    <div class="row-head">
                      <strong>{{ r.name }}</strong>
                      <app-status-badge [value]="r.status === 'online' ? 'SUCCESS' : 'STOPPED'" />
                    </div>
                    <span class="muted">Tags: {{ r.tags }} · Jobs activos: {{ r.jobs }}</span>
                  </li>
                }
              </ul>
            </div>
          </mat-tab>

          <mat-tab label="Environments">
            <div class="drawer-panel">
              <ul class="mini-list">
                @for (e of overview.environments; track e.name) {
                  <li>
                    <div class="row-head">
                      <strong>{{ e.name }}</strong>
                      <span class="tier-chip">{{ e.tier }}</span>
                    </div>
                    <span class="muted">Último deploy: {{ e.lastDeploy }}</span>
                    <span class="mono muted">{{ e.url }}</span>
                  </li>
                }
              </ul>
            </div>
          </mat-tab>

          <mat-tab label="Releases">
            <div class="drawer-panel">
              @for (rel of overview.releases; track rel.tag) {
                <div class="release-row">
                  <strong>{{ rel.tag }}</strong>
                  <span>{{ rel.name }}</span>
                  <span class="muted">{{ rel.releasedAt }}</span>
                </div>
              }
            </div>
          </mat-tab>

          <mat-tab label="Despliegues">
            <div class="drawer-panel">
              @if (overview.deployments.length) {
                <ul class="mini-list">
                  @for (d of overview.deployments; track d.id) {
                    <li>
                      <div class="row-head">
                        <strong>{{ d.targetName }}</strong>
                        <app-status-badge [value]="gitlabPipeBadge(d.status)" />
                      </div>
                      <span class="muted">{{ d.targetType }} · rama {{ d.branch }} · {{ d.environment }}</span>
                      <button mat-button type="button" (click)="viewDeploymentLogs.emit(d)">Ver registros</button>
                    </li>
                  }
                </ul>
              } @else {
                <p class="muted">Sin despliegues registrados — usa Desplegar proyecto</p>
              }
            </div>
          </mat-tab>

          <mat-tab label="Issues">
            <div class="drawer-panel">
              <ul class="mini-list">
                @for (iss of overview.issues; track iss.iid) {
                  <li>
                    <div class="row-head">
                      <strong>#{{ iss.iid }} {{ iss.title }}</strong>
                      <app-status-badge [value]="iss.state === 'opened' ? 'RUNNING' : 'SUCCESS'" />
                    </div>
                    <span class="muted">Etiquetas: {{ iss.labels }}</span>
                  </li>
                }
              </ul>
            </div>
          </mat-tab>

          <mat-tab label="Webhooks GitLab">
            <div class="drawer-panel">
              @if (webhooks.length) {
                <ul class="mini-list">
                  @for (wh of webhooks; track wh['id']) {
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
                <p class="muted">Sin webhooks GitLab en este proyecto</p>
              }
              <button mat-stroked-button type="button" (click)="runDemo('Crear webhook GitLab')">
                Crear webhook GitLab
              </button>
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
              <pre class="log-block" tabindex="0" aria-label="Registros del proyecto GitLab">{{ overview.logs }}</pre>
              <button mat-stroked-button type="button" (click)="handleCopyLogs()">
                <mat-icon>content_copy</mat-icon> Copiar registros
              </button>
            </div>
          </mat-tab>

          <mat-tab label="Acciones">
            <div class="drawer-panel">
              <p class="panel-lead">Acciones operativas GitLab (demo)</p>
              <div class="action-grid">
                <button mat-stroked-button type="button" (click)="runDemo('Sincronizar pipelines')">
                  <mat-icon>timeline</mat-icon> Sincronizar pipelines
                </button>
                <button mat-stroked-button type="button" (click)="runDemo('Validar runners')">
                  <mat-icon>directions_run</mat-icon> Validar runners
                </button>
                <button mat-stroked-button type="button" (click)="runDemo('Crear Merge Request')">
                  <mat-icon>call_merge</mat-icon> Crear Merge Request
                </button>
                <button mat-stroked-button type="button" (click)="runDemo('Promover a production')">
                  <mat-icon>upgrade</mat-icon> Promover environment
                </button>
                <button mat-stroked-button type="button" (click)="runDemo('Crear release')">
                  <mat-icon>sell</mat-icon> Crear release
                </button>
                <button mat-stroked-button type="button" (click)="deploy.emit(project)">
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
    .gl-drawer {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: min(700px, 100vw);
      z-index: 201;
      background: var(--app-card);
      box-shadow: var(--app-shadow-lg);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border-left: 4px solid #fc6d26;
    }
    .gl-drawer__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1.1rem 1.25rem 0.75rem;
      gap: 0.75rem;
      border-bottom: 1px solid var(--app-border-subtle);
    }
    .gl-drawer__brand { display: flex; gap: 0.85rem; min-width: 0; flex: 1; }
    .gl-drawer__logo {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 3rem;
      height: 3rem;
      padding: 0.35rem;
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 2px 10px color-mix(in srgb, #fc6d26 22%, transparent);
      flex-shrink: 0;
    }
    .gl-drawer__logo ::ng-deep .brand-logo { width: 2rem; height: 2rem; }
    .gl-drawer__titles { min-width: 0; }
    .gl-drawer__name {
      display: block;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      color: #c2410c;
      letter-spacing: 0.04em;
    }
    .gl-drawer__titles h2 {
      margin: 0.15rem 0 0;
      font-size: 1.05rem;
      font-weight: 700;
      word-break: break-word;
    }
    .gl-drawer__desc {
      margin: 0.3rem 0 0.5rem;
      font-size: 0.85rem;
      color: var(--app-text-muted);
      line-height: 1.4;
    }
    .gl-drawer__badges {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      align-items: center;
      margin-bottom: 0.65rem;
    }
    .lang-chip, .group-chip {
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
    .group-chip { color: #6b4fbb; }
    .subgroup-chip {
      font-size: 0.68rem;
      padding: 0.15rem 0.45rem;
      border-radius: 999px;
      background: color-mix(in srgb, #6b4fbb 12%, transparent);
    }
    .demo-chip {
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 0.2rem 0.5rem;
      border-radius: 999px;
      background: color-mix(in srgb, #fc6d26 18%, transparent);
      color: #c2410c;
    }
    .gl-drawer__meta {
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
        flex-wrap: wrap;
        align-items: center;
        gap: 0.25rem;
      }
    }
    .gl-drawer__metrics {
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
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: #fc6d26; }
    }
    .metric-card__value { font-size: 0.95rem; font-weight: 700; }
    .metric-card__label { font-size: 0.65rem; color: var(--app-text-muted); text-align: center; }
    .metric-card--success .metric-card__value { color: #16a34a; }
    .metric-card--warning .metric-card__value { color: var(--status-warning); }
    .gl-drawer__health {
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
    .health-bar { --mdc-linear-progress-active-indicator-color: #fc6d26; }
    .pipeline-line {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0.4rem 0 0;
      font-size: 0.78rem;
      color: var(--app-text-muted);
      mat-icon { font-size: 16px; width: 16px; height: 16px; color: #fc6d26; }
    }
    .drawer-tabs { flex: 1; overflow: hidden; }
    .drawer-panel {
      padding: 1rem 1.25rem 1.5rem;
      overflow-y: auto;
      max-height: calc(100vh - 340px);
    }
    .info-banner {
      display: flex;
      gap: 0.65rem;
      align-items: flex-start;
      padding: 0.75rem 0.85rem;
      border-radius: var(--app-radius-sm);
      margin-bottom: 0.65rem;
      font-size: 0.82rem;
      p { margin: 0.2rem 0 0; color: var(--app-text-muted); font-size: 0.78rem; }
    }
    .info-banner--sync { background: color-mix(in srgb, #6b4fbb 10%, var(--app-elevated)); }
    .info-banner--pipe { background: color-mix(in srgb, #fc6d26 12%, var(--app-elevated)); }
    .info-banner--deploy { background: color-mix(in srgb, #22c55e 10%, var(--app-elevated)); }
    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem 1rem;
      margin: 0 0 1rem;
      dt { font-size: 0.72rem; color: var(--app-text-muted); text-transform: uppercase; }
      dd { margin: 0.2rem 0 0; font-size: 0.875rem; font-weight: 500; }
    }
    .panel-subtitle, .panel-lead { margin: 0 0 0.65rem; font-size: 0.82rem; }
    .panel-lead { color: var(--app-text-muted); }
    .target-list {
      list-style: none;
      padding: 0;
      margin: 0 0 1rem;
      li {
        display: grid;
        grid-template-columns: auto 1fr auto auto;
        gap: 0.35rem 0.5rem;
        align-items: center;
        padding: 0.55rem 0;
        border-bottom: 1px solid var(--app-border-subtle);
        font-size: 0.85rem;
      }
    }
    .target-type {
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      color: #fc6d26;
    }
    .drawer-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .gl-btn { background: #fc6d26 !important; color: #fff !important; }
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
        mat-icon { color: #fc6d26; }
      }
    }
    .release-row {
      padding: 0.55rem 0;
      border-bottom: 1px solid var(--app-border-subtle);
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      font-size: 0.85rem;
    }
    .tier-chip {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
      background: color-mix(in srgb, #6b4fbb 15%, transparent);
      color: #6b4fbb;
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
    .mono { font-family: ui-monospace, monospace; font-size: 0.75rem; word-break: break-all; }
    .muted { color: var(--app-text-muted); font-size: 0.8rem; }
  `,
})
export class GitlabProjectDetailDrawerComponent {
  private readonly demoActions = inject(DemoActionsService)

  @Input() open = false
  @Input() project: GitlabProject | null = null
  @Input() webhooks: Record<string, unknown>[] = []
  @Input() lastSyncAt: string | null = null

  readonly close = output<void>()
  readonly sync = output<string>()
  readonly deploy = output<GitlabProject>()
  readonly openExternal = output<GitlabProject>()
  readonly viewDeploymentLogs = output<{ id: string }>()

  readonly gitlabVisibilityLabel = gitlabVisibilityLabel
  readonly gitlabVisibilityBadge = gitlabVisibilityBadge
  readonly gitlabMrBadge = gitlabMrBadge
  readonly gitlabPipeBadge = gitlabPipeBadge

  get overview(): GitlabDrawerOverview {
    if (!this.project) {
      return buildGitlabDrawerOverview(
        {
          id: '',
          name: '',
          fullPath: '',
          description: '',
          defaultBranch: 'main',
          language: '',
          visibility: 'private',
          group: '',
          stars: 0,
          forks: 0,
          updatedAt: new Date().toISOString(),
          isDemo: true,
        },
        { webhooks: 0 },
      )
    }
    return buildGitlabDrawerOverview(this.project, {
      webhooks: this.webhooks.length,
      lastSyncAt: this.lastSyncAt,
    })
  }

  runDemo = (label: string): void => {
    this.demoActions.simulate(label, 450, `${label} (demo GitLab)`).subscribe()
  }

  handleCopyLogs = (): void => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(this.overview.logs).catch(() => undefined)
    }
    this.runDemo('Registros copiados')
  }
}
