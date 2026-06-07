import { Component, Input, output, signal, computed } from '@angular/core'
import { RouterLink } from '@angular/router'
import { DatePipe, SlicePipe } from '@angular/common'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTabsModule } from '@angular/material/tabs'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import { type GlobalBranchRow } from '../utils/repositories-global-demo.util'
import { RepositoriesQuickLinksComponent } from '../components/repositories-quick-links.component'
import { repoRoute } from '../repositories-section.config'

const TAB_FILTERS = [
  (b: GlobalBranchRow) => true,
  (b: GlobalBranchRow) => b.provider === 'github',
  (b: GlobalBranchRow) => b.provider === 'gitlab',
  (b: GlobalBranchRow) => b.protected,
  (b: GlobalBranchRow) => b.stale,
  (b: GlobalBranchRow) => b.deployStatus !== 'none',
] as const

const TAB_LABELS = ['Todas', 'GitHub', 'GitLab', 'Protegidas', 'Sin actividad', 'Desplegables'] as const

@Component({
  selector: 'app-branches-global-section',
  standalone: true,
  imports: [RouterLink, DatePipe, SlicePipe, MatButtonModule, MatIconModule, MatTabsModule, StatusBadgeComponent, RepositoriesQuickLinksComponent],
  template: `
    <div class="repo-section repo-section--branches">
      <app-repositories-quick-links current="branches" title="Relacionado" />

      <div class="repo-toolbar">
        <button mat-flat-button color="primary" type="button" (click)="sync.emit()">
          <mat-icon>sync</mat-icon> Sincronizar ramas
        </button>
        <button mat-stroked-button type="button" (click)="compare.emit()">
          <mat-icon>compare_arrows</mat-icon> Comparar ramas
        </button>
        <a mat-button [routerLink]="routes.commits">
          <mat-icon>history_edu</mat-icon> Commits
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

      <div class="branch-summary" role="group" aria-label="Resumen de ramas">
        <div class="branch-summary__item">
          <mat-icon>account_tree</mat-icon>
          <div><strong>{{ visibleRows().length }}</strong><span>ramas</span></div>
        </div>
        <div class="branch-summary__item branch-summary__item--shield">
          <mat-icon>shield</mat-icon>
          <div><strong>{{ summaryStats().protected }}</strong><span>protegidas</span></div>
        </div>
        <div class="branch-summary__item branch-summary__item--warn">
          <mat-icon>hourglass_empty</mat-icon>
          <div><strong>{{ summaryStats().stale }}</strong><span>sin actividad</span></div>
        </div>
        <div class="branch-summary__item branch-summary__item--ok">
          <mat-icon>rocket_launch</mat-icon>
          <div><strong>{{ summaryStats().deployable }}</strong><span>desplegables</span></div>
        </div>
      </div>

      <p class="repo-tab-hint">{{ tabHint() }}</p>

      <div class="branch-list">
        @for (row of visibleRows(); track row.id) {
          <article
            class="branch-row"
            [class.branch-row--failed]="row.ciStatus === 'failed'"
            [class.branch-row--running]="row.ciStatus === 'running'"
          >
            <div class="branch-row__main">
              <header class="branch-row__head">
                <span class="prov-badge" [class]="row.provider === 'gitlab' ? 'prov-badge--gitlab' : 'prov-badge--github'">
                  {{ row.provider === 'github' ? 'GitHub' : 'GitLab' }}
                </span>
                <strong class="branch-row__name">{{ row.name }}</strong>
                @if (row.default) { <span class="branch-chip branch-chip--default">default</span> }
                @if (row.protected) { <span class="branch-chip branch-chip--shield"><mat-icon>shield</mat-icon> protegida</span> }
                @if (row.stale) { <span class="branch-chip branch-chip--warn">sin actividad</span> }
              </header>

              <p class="branch-row__repo mono">{{ row.repoOrProject }}</p>

              <div class="branch-row__commit">
                <mat-icon>commit</mat-icon>
                @if (row.lastCommitSha) {
                  <code>{{ row.lastCommitSha | slice:0:10 }}</code>
                }
                <span class="branch-row__commit-msg">{{ row.lastCommitMessage }}</span>
              </div>

              <dl class="branch-row__meta">
                @if (row.lastCommitAuthor) {
                  <div><dt><mat-icon>person</mat-icon></dt><dd>{{ row.lastCommitAuthor }}</dd></div>
                }
                <div><dt><mat-icon>schedule</mat-icon></dt><dd>{{ row.lastCommitAt | date: 'short' }}</dd></div>
                <div><dt><mat-icon>compare_arrows</mat-icon></dt><dd>+{{ row.commitsAhead ?? 0 }} / −{{ row.commitsBehind ?? 0 }}</dd></div>
                @if (row.pipelineId) {
                  <div><dt><mat-icon>bolt</mat-icon></dt><dd>{{ row.pipelineId }}</dd></div>
                }
              </dl>
            </div>

            <aside class="branch-row__panels">
              <div class="branch-panel" [class.branch-panel--fail]="row.ciStatus === 'failed'" [class.branch-panel--run]="row.ciStatus === 'running'">
                <div class="branch-panel__title">
                  <mat-icon>rule</mat-icon> CI
                  <app-status-badge [value]="ciBadge(row.ciStatus)" />
                </div>
                @if (row.ciWorkflow) { <p>{{ row.ciWorkflow }}</p> }
              </div>
              <div class="branch-panel" [class.branch-panel--pending]="row.deployStatus === 'pending'">
                <div class="branch-panel__title">
                  <mat-icon>rocket_launch</mat-icon> Deploy
                  <app-status-badge [value]="deployBadge(row.deployStatus)" />
                </div>
                @if (row.deployTarget) { <p><mat-icon>dns</mat-icon> {{ row.deployTarget }}</p> }
                @if (row.deployStatus === 'none') { <p class="branch-panel__hint">Sin pipeline de deploy</p> }
              </div>
            </aside>

            <footer class="branch-row__actions">
              <button mat-stroked-button type="button" (click)="viewCommits.emit(row)">
                <mat-icon>history</mat-icon> Commits
              </button>
              <button mat-button type="button" (click)="deployBranch.emit(row)">
                <mat-icon>rocket_launch</mat-icon> Desplegar
              </button>
            </footer>
          </article>
        } @empty {
          <div class="repo-empty"><mat-icon>account_tree</mat-icon><p>No hay ramas en esta pestaña</p></div>
        }
      </div>
    </div>
  `,
  styles: `
    .branch-summary {
      display: flex; flex-wrap: wrap; gap: 0.75rem 1.25rem;
      padding: 0.65rem 0 0.85rem;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text-muted) 8%, transparent);
    }
    .branch-summary__item {
      display: flex; align-items: center; gap: 0.45rem; min-width: 88px;
      mat-icon { font-size: 1.15rem; width: 1.15rem; height: 1.15rem; opacity: 0.7; }
      strong { display: block; font-size: 1.05rem; line-height: 1.1; }
      span { font-size: 0.68rem; color: var(--app-text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    }
    .branch-summary__item--shield mat-icon { color: #0ea5e9; opacity: 1; }
    .branch-summary__item--warn mat-icon { color: #f59e0b; opacity: 1; }
    .branch-summary__item--ok mat-icon { color: #22c55e; opacity: 1; }

    .branch-list { display: flex; flex-direction: column; padding-bottom: 1rem; }
    .branch-row {
      display: grid; grid-template-columns: 1fr minmax(200px, 240px); grid-template-rows: auto auto;
      gap: 0.65rem 1.25rem; padding: 1rem 0;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text-muted) 8%, transparent);
    }
    .branch-row--failed { border-left: 3px solid #ef4444; padding-left: 0.65rem; margin-left: -0.65rem; }
    .branch-row--running { border-left: 3px solid #f59e0b; padding-left: 0.65rem; margin-left: -0.65rem; }
    .branch-row__main { grid-column: 1; grid-row: 1; min-width: 0; }
    .branch-row__panels { grid-column: 2; grid-row: 1 / span 2; display: flex; flex-direction: column; gap: 0.45rem; }
    .branch-row__actions { grid-column: 1; grid-row: 2; display: flex; flex-wrap: wrap; gap: 0.25rem; }

    .branch-row__head { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; margin-bottom: 0.25rem; }
    .branch-row__name { font-size: 1rem; font-weight: 750; }
    .branch-row__repo { margin: 0 0 0.45rem; font-size: 0.76rem; color: var(--app-text-muted); word-break: break-all; }
    .branch-row__commit {
      display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem; margin-bottom: 0.5rem;
      font-size: 0.84rem; line-height: 1.35;
      mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; opacity: 0.65; }
      code { font-size: 0.76rem; font-weight: 700; }
    }
    .branch-row__commit-msg { color: var(--app-text); font-weight: 600; }
    .branch-row__meta {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 0.3rem 0.75rem;
      margin: 0; font-size: 0.74rem; color: var(--app-text-muted);
      div { display: flex; align-items: center; gap: 0.28rem; min-width: 0; }
      dt { margin: 0; display: flex; mat-icon { font-size: 0.82rem; width: 0.82rem; height: 0.82rem; } }
      dd { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    }

    .branch-chip {
      display: inline-flex; align-items: center; gap: 0.12rem;
      font-size: 0.62rem; padding: 0.1rem 0.38rem; border-radius: 4px; font-weight: 650;
      mat-icon { font-size: 0.78rem; width: 0.78rem; height: 0.78rem; }
    }
    .branch-chip--default { color: var(--app-accent); background: color-mix(in srgb, var(--app-accent) 10%, transparent); }
    .branch-chip--shield { color: #0369a1; background: color-mix(in srgb, #0ea5e9 12%, transparent); }
    .branch-chip--warn { color: #b45309; background: color-mix(in srgb, #f59e0b 12%, transparent); }

    .branch-panel {
      padding: 0.5rem 0.6rem; font-size: 0.72rem;
      border-left: 2px solid color-mix(in srgb, var(--app-text-muted) 18%, transparent);
      background: color-mix(in srgb, var(--app-text) 2%, transparent);
      p { margin: 0.12rem 0; display: flex; align-items: center; gap: 0.22rem; color: var(--app-text-muted); }
      mat-icon { font-size: 0.82rem; width: 0.82rem; height: 0.82rem; }
    }
    .branch-panel--fail { border-left-color: #ef4444; }
    .branch-panel--run { border-left-color: #f59e0b; }
    .branch-panel--pending { border-left-color: #94a3b8; }
    .branch-panel__title {
      display: flex; align-items: center; gap: 0.3rem; margin-bottom: 0.25rem;
      font-weight: 700; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.04em;
      app-status-badge { margin-left: auto; }
    }
    .branch-panel__hint { font-style: italic; opacity: 0.85; }

    .mono { font-family: ui-monospace, monospace; }

    @media (max-width: 860px) {
      .branch-row { grid-template-columns: 1fr; }
      .branch-row__panels { grid-column: 1; flex-direction: row; flex-wrap: wrap; }
      .branch-panel { flex: 1; min-width: 150px; }
    }
  `,
})
export class BranchesGlobalSectionComponent {
  @Input() branches: GlobalBranchRow[] = []

  readonly routes = {
    commits: repoRoute('commits'),
    deployments: repoRoute('deployments'),
    github: repoRoute('github'),
    gitlab: repoRoute('gitlab'),
  }

  readonly tabLabels = TAB_LABELS
  readonly tabIndex = signal(0)

  readonly sync = output<void>()
  readonly compare = output<void>()
  readonly viewCommits = output<GlobalBranchRow>()
  readonly deployBranch = output<GlobalBranchRow>()

  visibleRows = computed(() => {
    const fn = TAB_FILTERS[this.tabIndex()] ?? TAB_FILTERS[0]
    return this.branches.filter(fn)
  })

  summaryStats = computed(() => {
    const rows = this.visibleRows()
    return {
      protected: rows.filter((b) => b.protected).length,
      stale: rows.filter((b) => b.stale).length,
      deployable: rows.filter((b) => b.deployStatus !== 'none').length,
    }
  })

  tabHint = computed(() => {
    const hints = [
      'Todas las ramas sincronizadas de GitHub y GitLab',
      'Ramas de repositorios GitHub conectados',
      'Ramas de proyectos GitLab conectados',
      'Ramas con reglas de protección activas',
      'Sin commits recientes — candidatas a limpieza',
      'Ramas con pipeline de despliegue configurado',
    ]
    return hints[this.tabIndex()] ?? hints[0]
  })

  ciBadge = (s: string): string => (s === 'success' ? 'SUCCESS' : s === 'running' ? 'RUNNING' : 'ERROR')
  deployBadge = (s: string): string => {
    if (s === 'success') return 'SUCCESS'
    if (s === 'pending' || s === 'running') return 'RUNNING'
    return 'STOPPED'
  }
}
