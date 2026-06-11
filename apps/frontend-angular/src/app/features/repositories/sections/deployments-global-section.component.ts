import { Component, input, output, signal, computed } from '@angular/core'
import { RouterLink } from '@angular/router'
import { DatePipe, SlicePipe } from '@angular/common'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTabsModule } from '@angular/material/tabs'
import { MatMenuModule } from '@angular/material/menu'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import { RepositoriesQuickLinksComponent } from '../components/repositories-quick-links.component'
import { repoRoute } from '../repositories-section.config'

const DEPLOY_TABS = ['all', 'github', 'gitlab', 'jenkins', 'docker', 'kubernetes', 'failed', 'history'] as const
const TAB_LABELS = ['Resumen', 'GitHub', 'GitLab', 'Jenkins', 'Docker', 'Kubernetes', 'Fallidos', 'Historial'] as const

type DeployStage = { label: string; status: 'ok' | 'run' | 'fail' | 'wait' }

@Component({
  selector: 'app-deployments-global-section',
  standalone: true,
  imports: [RouterLink, DatePipe, SlicePipe, MatButtonModule, MatIconModule, MatTabsModule, MatMenuModule, StatusBadgeComponent, RepositoriesQuickLinksComponent],
  template: `
    <div class="repo-section repo-section--deployments">
      <app-repositories-quick-links current="deployments" title="Relacionado" />

      <div class="repo-toolbar">
        <button mat-flat-button color="primary" type="button" (click)="newDeploy.emit()">
          <mat-icon>add</mat-icon> Nuevo despliegue
        </button>
        <button mat-stroked-button type="button" (click)="viewHistory.emit()">
          <mat-icon>history</mat-icon> Ver historial
        </button>
        <a mat-button [routerLink]="routes.commits"><mat-icon>history_edu</mat-icon> Commits</a>
        <a mat-button [routerLink]="routes.webhooks"><mat-icon>webhook</mat-icon> Webhooks</a>
      </div>

      <mat-tab-group class="soft-tabs" animationDuration="200ms" (selectedIndexChange)="tabIndex.set($event)">
        @for (label of tabLabels; track label) {
          <mat-tab [label]="label" />
        }
      </mat-tab-group>

      @if (tabIndex() === 0) {
        <div class="deploy-overview">
          <div class="deploy-stats" role="group" aria-label="Métricas de despliegues">
            <div class="deploy-stats__item">
              <strong>{{ deployStats().total }}</strong><span>total</span>
            </div>
            <div class="deploy-stats__item deploy-stats__item--ok">
              <strong>{{ deployStats().success }}</strong><span>éxito</span>
            </div>
            <div class="deploy-stats__item deploy-stats__item--run">
              <strong>{{ deployStats().running }}</strong><span>en curso</span>
            </div>
            <div class="deploy-stats__item deploy-stats__item--fail">
              <strong>{{ deployStats().failed }}</strong><span>fallidos</span>
            </div>
            <div class="deploy-stats__item">
              <strong>{{ deployStats().prod }}</strong><span>producción</span>
            </div>
          </div>
          <div class="summary-pipeline">
            @for (step of pipelineSteps; track step.label) {
              <div class="step" [class.done]="step.done" [class.active]="step.active">
                <mat-icon>{{ step.icon }}</mat-icon>
                <span>{{ step.label }}</span>
                <small>{{ step.detail }}</small>
              </div>
            }
          </div>
        </div>
      }

      <p class="repo-tab-hint">{{ tabHint() }} · {{ visibleDeploys().length }} despliegues</p>

      <div class="deploy-list">
        @for (d of visibleDeploys(); track d['id']) {
          <article
            class="deploy-row"
            [class.deploy-row--failed]="d['status'] === 'failed'"
            [class.deploy-row--running]="d['status'] === 'running'"
          >
            <div class="deploy-row__main">
              <header class="deploy-row__head">
                <span class="prov-badge" [class]="provBadgeClass(d)">{{ providerLabel(d) }}</span>
                @if (d['environment']) {
                  <span class="env-pill" [class]="envClass(d['environment'])">{{ d['environment'] }}</span>
                }
                @if (d['version']) {
                  <span class="version-pill">{{ d['version'] }}</span>
                }
                <app-status-badge [value]="statusBadge(d['status'])" />
              </header>

              <h4 class="deploy-row__source">{{ sourceLabel(d) }}</h4>

              @if (d['commitMessage']) {
                <p class="deploy-row__commit-msg">
                  <mat-icon>commit</mat-icon>
                  <code>{{ shaShort(d['commitSha']) }}</code>
                  {{ d['commitMessage'] }}
                </p>
              }

              <dl class="deploy-row__meta">
                <div><dt><mat-icon>dns</mat-icon></dt><dd>{{ targetLine(d) }}</dd></div>
                <div><dt><mat-icon>account_tree</mat-icon></dt><dd>rama {{ d['branch'] }}</dd></div>
                <div><dt><mat-icon>schedule</mat-icon></dt><dd>{{ dateStr(d['createdAt']) | date: 'short' }}</dd></div>
                @if (d['duration']) {
                  <div><dt><mat-icon>timer</mat-icon></dt><dd>{{ d['duration'] }}</dd></div>
                }
                @if (d['triggeredBy']) {
                  <div><dt><mat-icon>person</mat-icon></dt><dd>{{ d['triggeredBy'] }}</dd></div>
                }
                @if (d['strategy']) {
                  <div><dt><mat-icon>swap_horiz</mat-icon></dt><dd>{{ d['strategy'] }}</dd></div>
                }
                @if (d['pipelineId']) {
                  <div><dt><mat-icon>bolt</mat-icon></dt><dd>{{ d['pipelineId'] }}</dd></div>
                }
              </dl>

              @if (d['healthCheck']) {
                <p class="deploy-row__health" [class.deploy-row__health--fail]="d['status'] === 'failed'">
                  <mat-icon>{{ d['status'] === 'failed' ? 'heart_broken' : d['status'] === 'running' ? 'monitor_heart' : 'favorite' }}</mat-icon>
                  {{ d['healthCheck'] }}
                  @if (d['previousVersion']) {
                    <span class="deploy-row__prev">← {{ d['previousVersion'] }}</span>
                  }
                </p>
              }

              @if (d['error']) {
                <p class="deploy-row__error"><mat-icon>error</mat-icon> {{ d['error'] }}</p>
              }
            </div>

            <aside class="deploy-row__pipeline">
              <span class="deploy-row__pipeline-label">Pipeline</span>
              <div class="stage-track">
                @for (stage of deployStages(d); track stage.label) {
                  <div class="stage" [class]="'stage--' + stage.status" [title]="stage.label">
                    <span class="stage__dot"></span>
                    <span class="stage__label">{{ stage.label }}</span>
                  </div>
                }
              </div>
            </aside>

            <footer class="deploy-row__actions">
              <button mat-stroked-button type="button" (click)="viewLogs.emit(d)">
                <mat-icon>terminal</mat-icon> Logs
              </button>
              <button mat-button type="button" (click)="viewPipeline.emit(d)"><mat-icon>timeline</mat-icon> Pipeline</button>
              <button mat-button type="button" (click)="viewTarget.emit(d)"><mat-icon>dns</mat-icon> Destino</button>
              <button mat-button type="button" (click)="viewCommit.emit(d)"><mat-icon>commit</mat-icon> Commit</button>
              @if (d['status'] === 'failed') {
                <button mat-flat-button color="warn" type="button" (click)="retry.emit(d)"><mat-icon>replay</mat-icon> Reintentar</button>
                <button mat-stroked-button type="button" (click)="rollback.emit(d)"><mat-icon>undo</mat-icon> Rollback</button>
              }
              <button mat-icon-button type="button" [matMenuTriggerFor]="depMenu" aria-label="Más" (click)="selected.set(d)">
                <mat-icon>more_vert</mat-icon>
              </button>
            </footer>
          </article>
        } @empty {
          <div class="repo-empty"><mat-icon>rocket_launch</mat-icon><p>No hay despliegues en esta pestaña</p></div>
        }
      </div>

      <mat-menu #depMenu="matMenu">
        <button mat-menu-item type="button" (click)="viewLogs.emit(selected()!)"><mat-icon>terminal</mat-icon> Ver logs completos</button>
        <button mat-menu-item type="button" (click)="viewPipeline.emit(selected()!)"><mat-icon>bolt</mat-icon> Ver stages</button>
      </mat-menu>
    </div>
  `,
  styles: `
    .deploy-overview {
      padding: 0.65rem 0 0.85rem;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text-muted) 8%, transparent);
    }
    .deploy-stats {
      display: flex; flex-wrap: wrap; gap: 0.75rem 1.25rem; margin-bottom: 0.75rem;
    }
    .deploy-stats__item {
      min-width: 72px;
      strong { display: block; font-size: 1.05rem; line-height: 1.1; }
      span { font-size: 0.68rem; color: var(--app-text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    }
    .deploy-stats__item--ok strong { color: #22c55e; }
    .deploy-stats__item--run strong { color: #3b82f6; }
    .deploy-stats__item--fail strong { color: #ef4444; }

    .summary-pipeline { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .step {
      flex: 1; min-width: 110px; padding: 0.55rem 0.45rem; text-align: center;
      font-size: 0.74rem; opacity: 0.55;
      border-left: 2px solid color-mix(in srgb, var(--app-text-muted) 15%, transparent);
      mat-icon { display: block; margin: 0 auto 0.2rem; font-size: 1.25rem; width: 1.25rem; height: 1.25rem; }
      small { display: block; margin-top: 0.15rem; font-size: 0.64rem; color: var(--app-text-muted); }
    }
    .step.done { opacity: 1; border-left-color: #22c55e; }
    .step.active { opacity: 1; color: var(--app-accent); border-left-color: var(--app-accent); }

    .deploy-list { display: flex; flex-direction: column; padding-bottom: 1rem; }
    .deploy-row {
      display: grid;
      grid-template-columns: 1fr minmax(180px, 240px);
      grid-template-rows: auto auto;
      gap: 0.65rem 1.25rem;
      padding: 1rem 0;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text-muted) 8%, transparent);
    }
    .deploy-row--failed { border-left: 3px solid #ef4444; padding-left: 0.65rem; margin-left: -0.65rem; }
    .deploy-row--running { border-left: 3px solid #3b82f6; padding-left: 0.65rem; margin-left: -0.65rem; }
    .deploy-row__main { grid-column: 1; grid-row: 1; min-width: 0; }
    .deploy-row__pipeline {
      grid-column: 2; grid-row: 1 / span 2;
      padding: 0.5rem 0.65rem;
      border-left: 2px solid color-mix(in srgb, var(--app-text-muted) 15%, transparent);
      background: color-mix(in srgb, var(--app-text) 2%, transparent);
    }
    .deploy-row__actions { grid-column: 1; grid-row: 2; display: flex; flex-wrap: wrap; gap: 0.25rem; align-items: center; }

    .deploy-row__head { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; margin-bottom: 0.35rem; }
    .deploy-row__source { margin: 0 0 0.35rem; font-size: 0.95rem; font-weight: 600; color: var(--app-text); }
    .deploy-row__commit-msg {
      display: flex; align-items: baseline; gap: 0.35rem; flex-wrap: wrap;
      margin: 0 0 0.55rem; font-size: 0.8rem; color: var(--app-text-muted); line-height: 1.35;
      mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; flex-shrink: 0; }
      code { font-size: 0.72rem; font-weight: 700; color: var(--app-text); }
    }
    .deploy-row__meta {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 0.3rem 0.65rem;
      margin: 0 0 0.5rem; font-size: 0.74rem; color: var(--app-text-muted);
      div { display: flex; align-items: center; gap: 0.25rem; min-width: 0; }
      dt { margin: 0; display: flex; mat-icon { font-size: 0.82rem; width: 0.82rem; height: 0.82rem; } }
      dd { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    }
    .deploy-row__health {
      display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;
      margin: 0.35rem 0 0; font-size: 0.76rem; color: #16a34a;
      mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; }
    }
    .deploy-row__health--fail { color: #ef4444; }
    .deploy-row__prev { font-size: 0.68rem; opacity: 0.75; margin-left: 0.25rem; }
    .deploy-row__error {
      display: flex; align-items: center; gap: 0.25rem; font-size: 0.76rem; color: #ef4444; margin: 0.35rem 0 0;
      mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; }
    }

    .env-pill {
      display: inline-block; padding: 0.1rem 0.45rem; border-radius: 4px;
      font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em;
    }
    .env-pill--prod { color: #b91c1c; background: color-mix(in srgb, #ef4444 12%, transparent); }
    .env-pill--staging { color: #0369a1; background: color-mix(in srgb, #0ea5e9 12%, transparent); }
    .version-pill {
      font-size: 0.65rem; font-weight: 700; padding: 0.1rem 0.4rem; border-radius: 4px;
      background: color-mix(in srgb, var(--app-accent) 10%, transparent); color: var(--app-accent);
    }
    .prov-badge--jenkins { background: color-mix(in srgb, #d33833 16%, transparent); color: #b91c1c; }

    .deploy-row__pipeline-label {
      display: block; font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.04em; margin-bottom: 0.45rem; color: var(--app-text-muted);
    }
    .stage-track { display: flex; flex-direction: column; gap: 0.35rem; }
    .stage {
      display: flex; align-items: center; gap: 0.4rem; font-size: 0.72rem;
      opacity: 0.45;
    }
    .stage--ok { opacity: 1; }
    .stage--run { opacity: 1; color: #3b82f6; }
    .stage--fail { opacity: 1; color: #ef4444; }
    .stage--wait { opacity: 0.35; }
    .stage__dot {
      width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
      background: color-mix(in srgb, var(--app-text-muted) 40%, transparent);
    }
    .stage--ok .stage__dot { background: #22c55e; }
    .stage--run .stage__dot { background: #3b82f6; box-shadow: 0 0 0 2px color-mix(in srgb, #3b82f6 25%, transparent); }
    .stage--fail .stage__dot { background: #ef4444; }
    .stage__label { text-transform: capitalize; }

    @media (max-width: 860px) {
      .deploy-row { grid-template-columns: 1fr; }
      .deploy-row__pipeline { grid-column: 1; }
      .stage-track { flex-direction: row; flex-wrap: wrap; }
    }
  `,
})
export class DeploymentsGlobalSectionComponent {
  readonly deployments = input<Record<string, unknown>[]>([])

  readonly routes = {
    commits: repoRoute('commits'),
    branches: repoRoute('branches'),
    webhooks: repoRoute('webhooks'),
    github: repoRoute('github'),
    gitlab: repoRoute('gitlab'),
  }

  readonly tabLabels = TAB_LABELS
  readonly tabIndex = signal(0)
  readonly selected = signal<Record<string, unknown> | null>(null)

  readonly pipelineSteps = [
    { label: 'Build', icon: 'build', done: true, active: false, detail: 'Artefacto v2.4' },
    { label: 'Test', icon: 'science', done: true, active: false, detail: '142 tests OK' },
    { label: 'Publish', icon: 'cloud_upload', done: true, active: false, detail: 'Registry push' },
    { label: 'Deploy', icon: 'rocket_launch', done: false, active: true, detail: '2 en curso' },
  ]

  readonly newDeploy = output<void>()
  readonly viewHistory = output<void>()
  readonly viewLogs = output<Record<string, unknown>>()
  readonly viewTarget = output<Record<string, unknown>>()
  readonly viewCommit = output<Record<string, unknown>>()
  readonly viewPipeline = output<Record<string, unknown>>()
  readonly retry = output<Record<string, unknown>>()
  readonly rollback = output<Record<string, unknown>>()

  visibleDeploys = computed(() => {
    const d = this.deployments()
    const i = this.tabIndex()
    const key = DEPLOY_TABS[i] ?? 'all'
    if (key === 'all') return d
    if (key === 'history') return [...d].reverse()
    if (key === 'failed') return d.filter((x) => x['status'] === 'failed')
    if (key === 'github') return d.filter((x) => x['provider'] === 'github')
    if (key === 'gitlab') return d.filter((x) => x['provider'] === 'gitlab')
    if (key === 'jenkins') return d.filter((x) => x['provider'] === 'jenkins' || x['targetType'] === 'jenkins')
    if (key === 'docker') return d.filter((x) => x['targetType'] === 'docker')
    if (key === 'kubernetes') return d.filter((x) => x['targetType'] === 'kubernetes')
    return d
  })

  deployStats = computed(() => {
    const d = this.deployments()
    return {
      total: d.length,
      success: d.filter((x) => x['status'] === 'success').length,
      running: d.filter((x) => x['status'] === 'running').length,
      failed: d.filter((x) => x['status'] === 'failed').length,
      prod: d.filter((x) => x['environment'] === 'production').length,
    }
  })

  tabHint = computed(() => {
    const hints = [
      'Vista general con pipeline activo y métricas',
      'Despliegues disparados desde repositorios GitHub',
      'Despliegues desde pipelines GitLab CI',
      'Jobs orquestados por Jenkins',
      'Contenedores publicados en hosts Docker',
      'Rollouts en clusters Kubernetes',
      'Despliegues fallidos — reintento o rollback disponible',
      'Historial cronológico inverso',
    ]
    return hints[this.tabIndex()] ?? hints[0]
  })

  deployStages = (d: Record<string, unknown>): DeployStage[] => {
    const labels = (d['stages'] as string[] | undefined) ?? ['build', 'test', 'deploy']
    const status = String(d['status'] ?? 'success')
    const failIdx = status === 'failed' ? labels.length - 1 : -1
    const runIdx = status === 'running' ? labels.findIndex((s) => s === 'deploy') : -1

    return labels.map((label, i) => {
      if (status === 'success') return { label, status: 'ok' as const }
      if (i < failIdx || (failIdx === -1 && i < runIdx)) return { label, status: 'ok' as const }
      if (i === failIdx) return { label, status: 'fail' as const }
      if (i === runIdx) return { label, status: 'run' as const }
      return { label, status: 'wait' as const }
    })
  }

  sourceLabel = (d: Record<string, unknown>): string =>
    String(d['repoFullName'] ?? d['projectPath'] ?? 'Despliegue')

  targetLine = (d: Record<string, unknown>): string =>
    `${d['targetName']} (${d['targetType']})`

  providerLabel = (d: Record<string, unknown>): string => {
    const p = String(d['provider'] ?? 'github')
    if (p === 'jenkins') return 'Jenkins'
    if (p === 'gitlab') return 'GitLab'
    return 'GitHub'
  }

  provBadgeClass = (d: Record<string, unknown>): string => {
    const p = String(d['provider'] ?? 'github')
    if (p === 'jenkins') return 'prov-badge--jenkins'
    if (p === 'gitlab') return 'prov-badge--gitlab'
    return 'prov-badge--github'
  }

  envClass = (env: unknown): string =>
    String(env) === 'production' ? 'env-pill--prod' : 'env-pill--staging'

  statusBadge = (s: unknown): string => {
    if (s === 'success') return 'SUCCESS'
    if (s === 'running') return 'RUNNING'
    return 'ERROR'
  }

  dateStr = (v: unknown): string => String(v ?? '')

  shaShort = (v: unknown): string => String(v ?? '').slice(0, 7)
}
