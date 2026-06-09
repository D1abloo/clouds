import { Component, Input, output, signal, computed } from '@angular/core'
import { RouterLink } from '@angular/router'
import { DatePipe, SlicePipe } from '@angular/common'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTabsModule } from '@angular/material/tabs'
import { MatMenuModule } from '@angular/material/menu'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import { type GlobalCommitRow } from '../utils/repositories-global.util'
import { repoRoute } from '../repositories-section.config'
import { RepositoriesQuickLinksComponent } from '../components/repositories-quick-links.component'

const COMMIT_TAB_FILTERS = [
  (c: GlobalCommitRow) => true,
  (c: GlobalCommitRow) => c.provider === 'github',
  (c: GlobalCommitRow) => c.provider === 'gitlab',
  (c: GlobalCommitRow) => c.ciStatus === 'failed',
  (c: GlobalCommitRow) => c.deployStatus === 'deployed',
  (c: GlobalCommitRow) => c.deployStatus === 'pending',
] as const

const TAB_LABELS = ['Recientes', 'GitHub', 'GitLab', 'Con error CI', 'Desplegados', 'Pendientes'] as const

@Component({
  selector: 'app-commits-global-section',
  standalone: true,
  imports: [RouterLink, DatePipe, SlicePipe, MatButtonModule, MatIconModule, MatTabsModule, MatMenuModule, StatusBadgeComponent, RepositoriesQuickLinksComponent],
  template: `
    <div class="repo-section repo-section--commits">
      <app-repositories-quick-links current="commits" title="Relacionado" />

      <div class="repo-toolbar">
        <button mat-flat-button color="primary" type="button" (click)="refresh.emit()">
          <mat-icon>refresh</mat-icon> Actualizar
        </button>
        <button mat-stroked-button type="button" (click)="deployLatest.emit()">
          <mat-icon>rocket_launch</mat-icon> Desplegar commit
        </button>
        <a mat-button [routerLink]="routes.branches">
          <mat-icon>account_tree</mat-icon> Ramas
        </a>
        <a mat-button [routerLink]="routes.deployments">
          <mat-icon>rocket_launch</mat-icon> Despliegues
        </a>
      </div>

      <mat-tab-group class="soft-tabs" animationDuration="200ms" (selectedIndexChange)="tabIndex.set($event)">
        @for (label of tabLabels; track label) {
          <mat-tab [label]="label" />
        }
      </mat-tab-group>

      <div class="commits-summary" role="group" aria-label="Resumen de commits">
        <div class="commits-summary__item">
          <mat-icon>commit</mat-icon>
          <div>
            <strong>{{ visibleRows().length }}</strong>
            <span>commits</span>
          </div>
        </div>
        <div class="commits-summary__item commits-summary__item--ok">
          <mat-icon>check_circle</mat-icon>
          <div>
            <strong>{{ summaryStats().ciOk }}</strong>
            <span>CI OK</span>
          </div>
        </div>
        <div class="commits-summary__item commits-summary__item--warn">
          <mat-icon>error</mat-icon>
          <div>
            <strong>{{ summaryStats().ciFail }}</strong>
            <span>CI fallido</span>
          </div>
        </div>
        <div class="commits-summary__item commits-summary__item--accent">
          <mat-icon>rocket_launch</mat-icon>
          <div>
            <strong>{{ summaryStats().deployed }}</strong>
            <span>desplegados</span>
          </div>
        </div>
        <div class="commits-summary__item">
          <mat-icon>hourglass_empty</mat-icon>
          <div>
            <strong>{{ summaryStats().pending }}</strong>
            <span>pendientes</span>
          </div>
        </div>
      </div>

      <p class="repo-tab-hint">{{ tabHint() }}</p>

      <div class="commit-list">
        @for (c of visibleRows(); track c.id) {
          <article
            class="commit-row"
            [class.commit-row--failed]="c.ciStatus === 'failed'"
            [class.commit-row--running]="c.ciStatus === 'running'"
            [class.commit-row--pending]="c.deployStatus === 'pending'"
          >
            <div class="commit-row__body">
              <header class="commit-row__head">
                <code class="commit-row__sha">{{ c.sha | slice:0:10 }}</code>
                <span class="prov-badge" [class]="c.provider === 'gitlab' ? 'prov-badge--gitlab' : 'prov-badge--github'">
                  {{ c.provider === 'github' ? 'GitHub' : 'GitLab' }}
                </span>
                @if (c.verified) {
                  <span class="commit-chip commit-chip--verified" title="Commit verificado">
                    <mat-icon>verified</mat-icon> Verificado
                  </span>
                } @else if (c.verificationStatus === 'partial') {
                  <span class="commit-chip commit-chip--partial" title="Verificación parcial">
                    <mat-icon>gpp_maybe</mat-icon> Parcial
                  </span>
                } @else if (c.verificationStatus === 'unverified') {
                  <span class="commit-chip commit-chip--muted" title="Sin verificar">
                    <mat-icon>shield</mat-icon> Sin verificar
                  </span>
                }
                @if (c.tags?.length) {
                  @for (t of c.tags; track t) {
                    <span class="commit-chip commit-chip--tag">{{ t }}</span>
                  }
                }
                @if (c.relatedReview) {
                  <span class="commit-chip commit-chip--review">
                    <mat-icon>merge</mat-icon> {{ c.relatedReview }}
                  </span>
                }
              </header>

              <h4 class="commit-row__message">{{ c.message }}</h4>

              <dl class="commit-row__meta">
                <div><dt><mat-icon>person</mat-icon></dt><dd>{{ c.author }}</dd></div>
                <div><dt><mat-icon>folder</mat-icon></dt><dd>{{ c.repoOrProject }}</dd></div>
                <div><dt><mat-icon>account_tree</mat-icon></dt><dd>{{ c.branch }}</dd></div>
                <div><dt><mat-icon>schedule</mat-icon></dt><dd>{{ c.date | date: 'short' }}</dd></div>
                @if (c.signature) {
                  <div><dt><mat-icon>key</mat-icon></dt><dd>{{ c.signature }}</dd></div>
                }
                @if (c.pipelineId) {
                  <div><dt><mat-icon>bolt</mat-icon></dt><dd>{{ c.pipelineId }}</dd></div>
                }
                @if (c.linkedDeploy) {
                  <div><dt><mat-icon>link</mat-icon></dt><dd>{{ c.linkedDeploy }}</dd></div>
                }
              </dl>

              <div class="commit-row__diff">
                <div class="commit-row__diff-bar" [style.--add-pct]="diffAddPct(c)">
                  <span class="add" [style.width.%]="diffAddPct(c)"></span>
                  <span class="del" [style.width.%]="100 - diffAddPct(c)"></span>
                </div>
                <div class="commit-row__diff-stats">
                  <span class="stat stat--add">+{{ c.additions }}</span>
                  <span class="stat stat--del">−{{ c.deletions }}</span>
                  <span>{{ c.filesChanged }} archivos</span>
                </div>
              </div>
            </div>

            <aside class="commit-row__panels">
              <div class="commit-panel" [class.commit-panel--fail]="c.ciStatus === 'failed'" [class.commit-panel--run]="c.ciStatus === 'running'">
                <div class="commit-panel__title">
                  <mat-icon>rule</mat-icon>
                  <span>Pipeline CI</span>
                  <app-status-badge [value]="ciBadge(c.ciStatus)" />
                </div>
                @if (c.ciWorkflow) {
                  <p class="commit-panel__line">{{ c.ciWorkflow }}</p>
                }
                @if (c.ciDuration) {
                  <p class="commit-panel__line"><mat-icon>timer</mat-icon> {{ c.ciDuration }}</p>
                }
                @if (c.ciJobsTotal) {
                  <div class="commit-panel__progress">
                    <div class="commit-panel__progress-track">
                      <span [style.width.%]="ciProgressPct(c)"></span>
                    </div>
                    <small>{{ c.ciJobsPassed ?? 0 }}/{{ c.ciJobsTotal }} jobs</small>
                  </div>
                }
              </div>

              <div class="commit-panel" [class.commit-panel--pending]="c.deployStatus === 'pending'">
                <div class="commit-panel__title">
                  <mat-icon>rocket_launch</mat-icon>
                  <span>Despliegue</span>
                  <app-status-badge [value]="deployBadge(c.deployStatus)" />
                </div>
                @if (c.deployEnvironment) {
                  <p class="commit-panel__line">
                    <span class="env-pill" [class]="envClass(c.deployEnvironment)">{{ c.deployEnvironment }}</span>
                  </p>
                }
                @if (c.deployTarget) {
                  <p class="commit-panel__line"><mat-icon>dns</mat-icon> {{ c.deployTarget }}</p>
                }
                @if (c.deployVersion) {
                  <p class="commit-panel__line"><mat-icon>label</mat-icon> {{ c.deployVersion }}</p>
                }
                @if (c.linkedDeploy) {
                  <p class="commit-panel__line"><mat-icon>link</mat-icon> {{ c.linkedDeploy }}</p>
                }
                @if (!c.deployEnvironment && c.deployStatus === 'pending') {
                  <p class="commit-panel__hint">Sin promoción a entorno</p>
                }
              </div>

              @if (c.verificationStatus || c.pipelineId) {
                <div class="commit-panel commit-panel--meta">
                  <div class="commit-panel__title">
                    <mat-icon>info</mat-icon>
                    <span>Verificación</span>
                  </div>
                  @if (c.verificationStatus) {
                    <p class="commit-panel__line">
                      Estado:
                      @if (c.verificationStatus === 'verified') { GPG verificado }
                      @else if (c.verificationStatus === 'partial') { Firma parcial }
                      @else { Sin verificar }
                    </p>
                  }
                  @if (c.pipelineId) {
                    <p class="commit-panel__line"><mat-icon>bolt</mat-icon> {{ c.pipelineId }}</p>
                  }
                </div>
              }
            </aside>

            <footer class="commit-row__actions">
              <button mat-stroked-button type="button" (click)="viewDetail.emit(c)">
                <mat-icon>visibility</mat-icon> Detalle
              </button>
              <button mat-button type="button" (click)="viewDiff.emit(c)">
                <mat-icon>difference</mat-icon> Diff
              </button>
              <button mat-button type="button" (click)="viewCi.emit(c)">
                <mat-icon>rule</mat-icon> CI
              </button>
              <button mat-button type="button" (click)="deploy.emit(c)">
                <mat-icon>rocket_launch</mat-icon> Desplegar
              </button>
              <button mat-icon-button type="button" [matMenuTriggerFor]="moreMenu" aria-label="Más acciones" (click)="selected.set(c)">
                <mat-icon>more_vert</mat-icon>
              </button>
            </footer>
          </article>
        } @empty {
          <div class="repo-empty"><mat-icon>inbox</mat-icon><p>No hay commits en esta pestaña</p></div>
        }
      </div>

      <mat-menu #moreMenu="matMenu">
        <button mat-menu-item type="button" (click)="copySha.emit(selected()!)"><mat-icon>content_copy</mat-icon> Copiar SHA</button>
        <button mat-menu-item type="button" (click)="openSource.emit(selected()!)"><mat-icon>open_in_new</mat-icon> Abrir origen</button>
      </mat-menu>
    </div>
  `,
  styles: `
    .commits-summary {
      display: flex; flex-wrap: wrap; gap: 0.75rem 1.25rem;
      padding: 0.65rem 0 0.85rem;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text-muted) 8%, transparent);
    }
    .commits-summary__item {
      display: flex; align-items: center; gap: 0.45rem; min-width: 88px;
      mat-icon { font-size: 1.15rem; width: 1.15rem; height: 1.15rem; opacity: 0.7; }
      strong { display: block; font-size: 1.05rem; line-height: 1.1; }
      span { font-size: 0.68rem; color: var(--app-text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    }
    .commits-summary__item--ok mat-icon { color: #22c55e; opacity: 1; }
    .commits-summary__item--warn mat-icon { color: #ef4444; opacity: 1; }
    .commits-summary__item--accent mat-icon { color: var(--app-accent); opacity: 1; }

    .commit-list { display: flex; flex-direction: column; padding-bottom: 1rem; }
    .commit-row {
      display: grid;
      grid-template-columns: 1fr minmax(220px, 280px);
      grid-template-rows: auto auto;
      gap: 0.65rem 1.25rem;
      padding: 1rem 0;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text-muted) 8%, transparent);
    }
    .commit-row--failed { border-left: 3px solid #ef4444; padding-left: 0.65rem; margin-left: -0.65rem; }
    .commit-row--running { border-left: 3px solid #f59e0b; padding-left: 0.65rem; margin-left: -0.65rem; }
    .commit-row__body { grid-column: 1; grid-row: 1; min-width: 0; }
    .commit-row__panels { grid-column: 2; grid-row: 1 / span 2; display: flex; flex-direction: column; gap: 0.5rem; }
    .commit-row__actions { grid-column: 1; grid-row: 2; display: flex; flex-wrap: wrap; gap: 0.25rem; align-items: center; }

    .commit-row__head { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; margin-bottom: 0.35rem; }
    .commit-row__sha { font-size: 0.8rem; font-weight: 700; letter-spacing: 0.02em; color: var(--app-text); }
    .commit-row__message { margin: 0 0 0.5rem; font-size: 0.98rem; line-height: 1.4; font-weight: 600; color: var(--app-text); }
    .commit-row__meta {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.35rem 0.75rem;
      margin: 0 0 0.65rem; font-size: 0.76rem; color: var(--app-text-muted);
      div { display: flex; align-items: center; gap: 0.3rem; min-width: 0; }
      dt { margin: 0; display: flex; mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; } }
      dd { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    }

    .commit-row__diff { display: flex; flex-direction: column; gap: 0.3rem; max-width: 420px; }
    .commit-row__diff-bar {
      display: flex; height: 4px; border-radius: 2px; overflow: hidden;
      background: color-mix(in srgb, var(--app-text-muted) 12%, transparent);
      .add { background: #22c55e; }
      .del { background: #ef4444; flex: 1; }
    }
    .commit-row__diff-stats { display: flex; gap: 0.65rem; font-size: 0.74rem; }
    .stat--add { color: #22c55e; font-weight: 700; }
    .stat--del { color: #ef4444; font-weight: 700; }

    .commit-chip {
      display: inline-flex; align-items: center; gap: 0.15rem;
      font-size: 0.65rem; padding: 0.12rem 0.4rem; border-radius: 4px; font-weight: 600;
      mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; }
    }
    .commit-chip--verified { color: #16a34a; background: color-mix(in srgb, #22c55e 12%, transparent); }
    .commit-chip--partial { color: #b45309; background: color-mix(in srgb, #f59e0b 12%, transparent); }
    .commit-chip--muted { color: var(--app-text-muted); background: color-mix(in srgb, var(--app-text) 6%, transparent); }
    .commit-chip--tag { color: #7c3aed; background: color-mix(in srgb, #8b5cf6 14%, transparent); }
    .commit-chip--review { color: var(--app-accent); background: color-mix(in srgb, var(--app-accent) 10%, transparent); }

    .commit-panel {
      padding: 0.55rem 0.65rem;
      border-left: 2px solid color-mix(in srgb, var(--app-text-muted) 18%, transparent);
      font-size: 0.74rem;
      background: color-mix(in srgb, var(--app-text) 2%, transparent);
    }
    .commit-panel--fail { border-left-color: #ef4444; }
    .commit-panel--run { border-left-color: #f59e0b; }
    .commit-panel--pending { border-left-color: #94a3b8; }
    .commit-panel--meta { border-left-color: color-mix(in srgb, #8b5cf6 40%, transparent); }
    .commit-panel__title {
      display: flex; align-items: center; gap: 0.35rem; margin-bottom: 0.35rem; font-weight: 700; font-size: 0.72rem;
      text-transform: uppercase; letter-spacing: 0.04em;
      mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; opacity: 0.75; }
      app-status-badge { margin-left: auto; }
    }
    .commit-panel__line {
      display: flex; align-items: center; gap: 0.25rem; margin: 0.15rem 0; color: var(--app-text-muted);
      mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; }
    }
    .commit-panel__hint { margin: 0.2rem 0 0; font-style: italic; color: var(--app-text-muted); opacity: 0.85; }
    .commit-panel__progress { margin-top: 0.35rem; }
    .commit-panel__progress-track {
      height: 3px; border-radius: 2px; overflow: hidden; margin-bottom: 0.2rem;
      background: color-mix(in srgb, var(--app-text-muted) 12%, transparent);
      span { display: block; height: 100%; background: #22c55e; transition: width 0.2s; }
    }
    .commit-panel--fail .commit-panel__progress-track span { background: #ef4444; }
    .commit-panel--run .commit-panel__progress-track span { background: #f59e0b; }
    .commit-panel__progress small { font-size: 0.65rem; color: var(--app-text-muted); }

    .env-pill {
      display: inline-block; padding: 0.1rem 0.45rem; border-radius: 4px;
      font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em;
    }
    .env-pill--prod { color: #b91c1c; background: color-mix(in srgb, #ef4444 12%, transparent); }
    .env-pill--staging { color: #0369a1; background: color-mix(in srgb, #0ea5e9 12%, transparent); }

    @media (max-width: 860px) {
      .commit-row { grid-template-columns: 1fr; }
      .commit-row__panels { grid-column: 1; grid-row: auto; flex-direction: row; flex-wrap: wrap; }
      .commit-panel { flex: 1; min-width: 160px; }
    }
  `,
})
export class CommitsGlobalSectionComponent {
  @Input() commits: GlobalCommitRow[] = []

  readonly routes = {
    branches: repoRoute('branches'),
    deployments: repoRoute('deployments'),
    pullRequests: repoRoute('pull-requests'),
    webhooks: repoRoute('webhooks'),
  }

  readonly tabLabels = TAB_LABELS
  readonly tabIndex = signal(0)
  readonly selected = signal<GlobalCommitRow | null>(null)

  readonly refresh = output<void>()
  readonly deployLatest = output<void>()
  readonly viewDetail = output<GlobalCommitRow>()
  readonly viewDiff = output<GlobalCommitRow>()
  readonly viewCi = output<GlobalCommitRow>()
  readonly copySha = output<GlobalCommitRow>()
  readonly deploy = output<GlobalCommitRow>()
  readonly openSource = output<GlobalCommitRow>()

  visibleRows = computed(() => {
    const fn = COMMIT_TAB_FILTERS[this.tabIndex()] ?? COMMIT_TAB_FILTERS[0]
    return this.commits.filter(fn)
  })

  summaryStats = computed(() => {
    const rows = this.visibleRows()
    return {
      ciOk: rows.filter((c) => c.ciStatus === 'success').length,
      ciFail: rows.filter((c) => c.ciStatus === 'failed').length,
      deployed: rows.filter((c) => c.deployStatus === 'deployed').length,
      pending: rows.filter((c) => c.deployStatus === 'pending').length,
    }
  })

  tabHint = computed(() => {
    const hints = [
      'Todos los commits recientes ordenados por fecha',
      'Solo repositorios conectados vía GitHub',
      'Solo proyectos sincronizados desde GitLab',
      'Commits cuya última ejecución de CI falló',
      'Commits ya promovidos a un entorno',
      'Commits pendientes de despliegue manual o automático',
    ]
    return hints[this.tabIndex()] ?? hints[0]
  })

  ciBadge = (s: string): string => {
    if (s === 'success') return 'SUCCESS'
    if (s === 'running') return 'PENDING'
    return 'ERROR'
  }

  deployBadge = (s: string): string => {
    if (s === 'deployed') return 'SUCCESS'
    if (s === 'pending') return 'PENDING'
    return 'STOPPED'
  }

  ciProgressPct = (c: GlobalCommitRow): number => {
    if (!c.ciJobsTotal) return c.ciStatus === 'success' ? 100 : c.ciStatus === 'failed' ? 100 : 50
    return Math.round(((c.ciJobsPassed ?? 0) / c.ciJobsTotal) * 100)
  }

  diffAddPct = (c: GlobalCommitRow): number => {
    const total = c.additions + c.deletions
    if (total <= 0) return 50
    return Math.round((c.additions / total) * 100)
  }

  envClass = (env: string): string =>
    env === 'production' ? 'env-pill--prod' : 'env-pill--staging'
}
