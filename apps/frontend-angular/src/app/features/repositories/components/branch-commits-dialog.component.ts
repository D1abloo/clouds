import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { DatePipe, SlicePipe } from '@angular/common'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import { ToastService } from '../../../core/services/toast.service'
import {
  buildBranchDemoCommits,
  type GlobalBranchRow,
  type GlobalCommitRow,
} from '../utils/repositories-global.util'

export type BranchCommitsDialogData = {
  branch: GlobalBranchRow
}

@Component({
  selector: 'app-branch-commits-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatMenuModule, DatePipe, SlicePipe, StatusBadgeComponent],
  template: `
    <div class="branch-commits">
      <header class="branch-commits__head">
        <div>
          <span class="branch-commits__eyebrow">Commits · {{ data.branch.name }}</span>
          <h2 mat-dialog-title>{{ data.branch.repoOrProject }}</h2>
          <p class="branch-commits__sub">
            <span class="prov-badge" [class]="data.branch.provider === 'gitlab' ? 'prov-badge--gitlab' : 'prov-badge--github'">
              {{ data.branch.provider === 'github' ? 'GitHub' : 'GitLab' }}
            </span>
            @if (data.branch.default) { <span class="chip">default</span> }
            @if (data.branch.protected) { <span class="chip chip--shield">protegida</span> }
            @if (data.branch.stale) { <span class="chip chip--warn">sin actividad</span> }
          </p>
        </div>
        <dl class="branch-commits__stats">
          <div><dt>Commits</dt><dd>{{ commits().length }}</dd></div>
          <div><dt>Autores</dt><dd>{{ authorCount() }}</dd></div>
          <div><dt>Ahead</dt><dd>+{{ data.branch.commitsAhead ?? 0 }}</dd></div>
          <div><dt>Behind</dt><dd>−{{ data.branch.commitsBehind ?? 0 }}</dd></div>
        </dl>
      </header>

      <mat-dialog-content>
        <div class="branch-commits__summary">
          <div class="branch-commits__summary-item">
            <mat-icon>rule</mat-icon>
            <span>CI · <strong>{{ data.branch.ciStatus }}</strong></span>
            @if (data.branch.ciWorkflow) {
              <small>{{ data.branch.ciWorkflow }}</small>
            }
          </div>
          @if (data.branch.pipelineId) {
            <div class="branch-commits__summary-item">
              <mat-icon>bolt</mat-icon>
              <span>Pipeline <code>{{ data.branch.pipelineId }}</code></span>
            </div>
          }
          @if (data.branch.deployTarget) {
            <div class="branch-commits__summary-item">
              <mat-icon>rocket_launch</mat-icon>
              <span>Deploy → {{ data.branch.deployTarget }}</span>
              <app-status-badge [value]="deployBadge(data.branch.deployStatus)" />
            </div>
          }
        </div>

        <div class="branch-commits__list">
          @for (c of commits(); track c.id) {
            <article
              class="bc-row"
              [class.bc-row--failed]="c.ciStatus === 'failed'"
              [class.bc-row--running]="c.ciStatus === 'running'"
            >
              <div class="bc-row__main">
                <header class="bc-row__head">
                  <code>{{ c.sha | slice:0:10 }}</code>
                  @if (c.verified) {
                    <span class="bc-chip bc-chip--verified"><mat-icon>verified</mat-icon> Verificado</span>
                  } @else if (c.verificationStatus === 'partial') {
                    <span class="bc-chip bc-chip--partial"><mat-icon>gpp_maybe</mat-icon> Parcial</span>
                  }
                  @if (c.tags?.length) {
                    @for (t of c.tags; track t) {
                      <span class="bc-chip bc-chip--tag">{{ t }}</span>
                    }
                  }
                  @if (c.relatedReview) {
                    <span class="bc-chip bc-chip--review"><mat-icon>merge</mat-icon> {{ c.relatedReview }}</span>
                  }
                </header>

                <h4 class="bc-row__message">{{ c.message }}</h4>

                <dl class="bc-row__meta">
                  <div><dt><mat-icon>person</mat-icon></dt><dd>{{ c.author }}</dd></div>
                  <div><dt><mat-icon>schedule</mat-icon></dt><dd>{{ c.date | date: 'short' }}</dd></div>
                  <div><dt><mat-icon>description</mat-icon></dt><dd>{{ c.filesChanged }} archivos</dd></div>
                  @if (c.pipelineId) {
                    <div><dt><mat-icon>bolt</mat-icon></dt><dd>{{ c.pipelineId }}</dd></div>
                  }
                  @if (c.linkedDeploy) {
                    <div><dt><mat-icon>rocket_launch</mat-icon></dt><dd>{{ c.linkedDeploy }}</dd></div>
                  }
                </dl>

                <div class="bc-row__diff">
                  <div class="bc-row__diff-bar" [style.--add-pct]="diffAddPct(c)">
                    <span class="add" [style.width.%]="diffAddPct(c)"></span>
                    <span class="del"></span>
                  </div>
                  <div class="bc-row__diff-stats">
                    <span class="stat stat--add">+{{ c.additions }}</span>
                    <span class="stat stat--del">−{{ c.deletions }}</span>
                  </div>
                </div>
              </div>

              <aside class="bc-row__panels">
                <div class="bc-panel" [class.bc-panel--fail]="c.ciStatus === 'failed'" [class.bc-panel--run]="c.ciStatus === 'running'">
                  <div class="bc-panel__title">
                    <mat-icon>rule</mat-icon> CI
                    <app-status-badge [value]="ciBadge(c.ciStatus)" />
                  </div>
                  @if (c.ciWorkflow) { <p>{{ c.ciWorkflow }}</p> }
                  @if (c.ciDuration) { <p><mat-icon>timer</mat-icon> {{ c.ciDuration }}</p> }
                  @if (c.ciJobsTotal) {
                    <small>{{ c.ciJobsPassed ?? 0 }}/{{ c.ciJobsTotal }} jobs</small>
                  }
                </div>
                <div class="bc-panel" [class.bc-panel--pending]="c.deployStatus === 'pending'">
                  <div class="bc-panel__title">
                    <mat-icon>rocket_launch</mat-icon> Deploy
                    <app-status-badge [value]="commitDeployBadge(c.deployStatus)" />
                  </div>
                  @if (c.deployEnvironment) {
                    <p><span class="env-pill" [class]="envClass(c.deployEnvironment)">{{ c.deployEnvironment }}</span></p>
                  }
                  @if (c.deployTarget) { <p>{{ c.deployTarget }}</p> }
                  @if (c.deployVersion) { <p><mat-icon>label</mat-icon> {{ c.deployVersion }}</p> }
                </div>
              </aside>

              <footer class="bc-row__actions">
                <button mat-stroked-button type="button" (click)="handleCopySha(c)">
                  <mat-icon>content_copy</mat-icon> SHA
                </button>
                <button mat-button type="button" (click)="handleViewDiff(c)">
                  <mat-icon>difference</mat-icon> Diff
                </button>
                <button mat-icon-button type="button" [matMenuTriggerFor]="rowMenu" aria-label="Más acciones" (click)="selected.set(c)">
                  <mat-icon>more_vert</mat-icon>
                </button>
              </footer>
            </article>
          } @empty {
            <p class="branch-commits__empty">No hay commits en esta rama</p>
          }
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close type="button">Cerrar</button>
        <button mat-stroked-button type="button" (click)="handleExport()">
          <mat-icon>download</mat-icon> Exportar lista
        </button>
      </mat-dialog-actions>

      <mat-menu #rowMenu="matMenu">
        <button mat-menu-item type="button" (click)="handleCopySha(selected()!)"><mat-icon>content_copy</mat-icon> Copiar SHA</button>
        <button mat-menu-item type="button" (click)="handleViewDiff(selected()!)"><mat-icon>difference</mat-icon> Ver diff</button>
      </mat-menu>
    </div>
  `,
  styles: `
    .branch-commits { --bc-accent: #0ea5e9; min-width: 0; }
    .branch-commits__head {
      display: grid; grid-template-columns: 1fr auto; gap: 1rem; align-items: start;
      padding-bottom: 0.75rem;
      border-bottom: 2px solid color-mix(in srgb, var(--bc-accent) 35%, transparent);
      background: linear-gradient(135deg, color-mix(in srgb, var(--bc-accent) 6%, var(--app-card)), transparent);
    }
    h2[mat-dialog-title] { margin: 0; padding: 0; font-size: 1.05rem; font-weight: 850; }
    .branch-commits__eyebrow {
      display: block; font-size: 0.62rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.06em; color: var(--bc-accent); margin-bottom: 0.15rem;
    }
    .branch-commits__sub { display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem; margin: 0.35rem 0 0; }
    .prov-badge {
      display: inline-flex; font-size: 0.65rem; font-weight: 750; text-transform: uppercase;
      padding: 0.12rem 0.42rem; border-radius: 4px;
    }
    .prov-badge--github { background: color-mix(in srgb, #24292f 14%, transparent); color: #24292f; }
    .prov-badge--gitlab { background: color-mix(in srgb, #fc6d26 16%, transparent); color: #c2410c; }
    .chip { font-size: 0.62rem; font-weight: 700; padding: 0.1rem 0.38rem; border-radius: 4px; color: var(--app-accent); background: color-mix(in srgb, var(--app-accent) 10%, transparent); }
    .chip--shield { color: #0369a1; background: color-mix(in srgb, #0ea5e9 12%, transparent); }
    .chip--warn { color: #b45309; background: color-mix(in srgb, #f59e0b 12%, transparent); }
    .branch-commits__stats {
      display: grid; grid-template-columns: repeat(2, minmax(64px, auto)); gap: 0.45rem 0.85rem;
      margin: 0; font-size: 0.72rem;
      dt { margin: 0; font-size: 0.58rem; text-transform: uppercase; color: var(--app-text-muted); }
      dd { margin: 0.08rem 0 0; font-weight: 800; font-size: 0.95rem; }
    }
    .branch-commits__summary {
      display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; padding: 0.65rem 0;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text-muted) 8%, transparent);
    }
    .branch-commits__summary-item {
      display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem; font-size: 0.76rem;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; opacity: 0.75; }
      small { flex: 1 1 100%; font-size: 0.68rem; color: var(--app-text-muted); margin-left: 1.35rem; }
      code { font-size: 0.72rem; }
    }
    .branch-commits__list { display: flex; flex-direction: column; padding-top: 0.35rem; }
    .bc-row {
      display: grid; grid-template-columns: 1fr minmax(180px, 220px); grid-template-rows: auto auto;
      gap: 0.55rem 1rem; padding: 0.85rem 0;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text-muted) 8%, transparent);
    }
    .bc-row--failed { border-left: 3px solid #ef4444; padding-left: 0.55rem; margin-left: -0.55rem; }
    .bc-row--running { border-left: 3px solid #f59e0b; padding-left: 0.55rem; margin-left: -0.55rem; }
    .bc-row__main { grid-column: 1; grid-row: 1; min-width: 0; }
    .bc-row__panels { grid-column: 2; grid-row: 1 / span 2; display: flex; flex-direction: column; gap: 0.4rem; }
    .bc-row__actions { grid-column: 1; grid-row: 2; display: flex; gap: 0.25rem; align-items: center; }
    .bc-row__head { display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem; margin-bottom: 0.3rem; }
    .bc-row__head code { font-size: 0.78rem; font-weight: 700; }
    .bc-row__message { margin: 0 0 0.45rem; font-size: 0.92rem; font-weight: 650; line-height: 1.35; }
    .bc-row__meta {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.3rem 0.65rem;
      margin: 0 0 0.5rem; font-size: 0.72rem; color: var(--app-text-muted);
      div { display: flex; align-items: center; gap: 0.25rem; min-width: 0; }
      dt { margin: 0; display: flex; mat-icon { font-size: 0.82rem; width: 0.82rem; height: 0.82rem; } }
      dd { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    }
    .bc-row__diff { max-width: 360px; }
    .bc-row__diff-bar {
      display: flex; height: 4px; border-radius: 2px; overflow: hidden;
      background: color-mix(in srgb, var(--app-text-muted) 12%, transparent);
      .add { background: #22c55e; }
      .del { background: #ef4444; flex: 1; }
    }
    .bc-row__diff-stats { display: flex; gap: 0.55rem; font-size: 0.72rem; margin-top: 0.25rem; }
    .stat--add { color: #22c55e; font-weight: 700; }
    .stat--del { color: #ef4444; font-weight: 700; }
    .bc-chip {
      display: inline-flex; align-items: center; gap: 0.12rem;
      font-size: 0.62rem; padding: 0.1rem 0.35rem; border-radius: 4px; font-weight: 650;
      mat-icon { font-size: 0.82rem; width: 0.82rem; height: 0.82rem; }
    }
    .bc-chip--verified { color: #16a34a; background: color-mix(in srgb, #22c55e 12%, transparent); }
    .bc-chip--partial { color: #b45309; background: color-mix(in srgb, #f59e0b 12%, transparent); }
    .bc-chip--tag { color: #7c3aed; background: color-mix(in srgb, #8b5cf6 14%, transparent); }
    .bc-chip--review { color: var(--app-accent); background: color-mix(in srgb, var(--app-accent) 10%, transparent); }
    .bc-panel {
      padding: 0.45rem 0.55rem; font-size: 0.7rem;
      border-left: 2px solid color-mix(in srgb, var(--app-text-muted) 18%, transparent);
      background: color-mix(in srgb, var(--app-text) 2%, transparent);
      p { margin: 0.12rem 0; display: flex; align-items: center; gap: 0.2rem; color: var(--app-text-muted); }
      mat-icon { font-size: 0.82rem; width: 0.82rem; height: 0.82rem; }
      small { font-size: 0.62rem; color: var(--app-text-muted); }
    }
    .bc-panel--fail { border-left-color: #ef4444; }
    .bc-panel--run { border-left-color: #f59e0b; }
    .bc-panel--pending { border-left-color: #94a3b8; }
    .bc-panel__title {
      display: flex; align-items: center; gap: 0.3rem; margin-bottom: 0.25rem;
      font-weight: 700; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.04em;
      app-status-badge { margin-left: auto; }
    }
    .env-pill {
      display: inline-block; padding: 0.08rem 0.4rem; border-radius: 4px;
      font-size: 0.62rem; font-weight: 700; text-transform: uppercase;
    }
    .env-pill--prod { color: #b91c1c; background: color-mix(in srgb, #ef4444 12%, transparent); }
    .env-pill--staging { color: #0369a1; background: color-mix(in srgb, #0ea5e9 12%, transparent); }
    .branch-commits__empty { text-align: center; padding: 2rem; color: var(--app-text-muted); font-size: 0.85rem; }
    @media (max-width: 720px) {
      .branch-commits__head { grid-template-columns: 1fr; }
      .bc-row { grid-template-columns: 1fr; }
      .bc-row__panels { grid-column: 1; flex-direction: row; flex-wrap: wrap; }
      .bc-panel { flex: 1; min-width: 140px; }
    }
  `,
})
export class BranchCommitsDialogComponent {
  readonly data = inject<BranchCommitsDialogData>(MAT_DIALOG_DATA)
  private readonly toast = inject(ToastService)

  readonly selected = signal<GlobalCommitRow | null>(null)
  readonly commits = computed(() => buildBranchDemoCommits(this.data.branch))
  readonly authorCount = computed(() => new Set(this.commits().map((c) => c.author)).size)

  ciBadge = (s: string): string => {
    if (s === 'success') return 'SUCCESS'
    if (s === 'running') return 'PENDING'
    return 'ERROR'
  }

  deployBadge = (s: string): string => {
    if (s === 'success') return 'SUCCESS'
    if (s === 'pending' || s === 'running') return 'RUNNING'
    return 'STOPPED'
  }

  commitDeployBadge = (s: string): string => {
    if (s === 'deployed') return 'SUCCESS'
    if (s === 'pending') return 'PENDING'
    return 'STOPPED'
  }

  diffAddPct = (c: GlobalCommitRow): number => {
    const total = c.additions + c.deletions
    if (total <= 0) return 50
    return Math.round((c.additions / total) * 100)
  }

  envClass = (env: string): string =>
    env === 'production' ? 'env-pill--prod' : 'env-pill--staging'

  handleCopySha = (c: GlobalCommitRow): void => {
    void navigator.clipboard.writeText(c.sha).then(
      () => this.toast.success(`SHA copiado · ${c.sha.slice(0, 10)}`),
      () => this.toast.info(`SHA: ${c.sha.slice(0, 10)}`),
    )
  }

  handleViewDiff = (c: GlobalCommitRow): void => {
    this.toast.info(`Diff · ${c.sha.slice(0, 7)} · ${c.filesChanged} archivos (+${c.additions}/−${c.deletions})`)
  }

  handleExport = (): void => {
    const lines = [
      `Commits · ${this.data.branch.name}`,
      this.data.branch.repoOrProject,
      '',
      ...this.commits().map(
        (c) =>
          `${c.sha.slice(0, 10)} · ${c.author} · ${c.message}\n  CI: ${c.ciStatus} · Deploy: ${c.deployStatus} · +${c.additions}/−${c.deletions}`,
      ),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `commits-${this.data.branch.name}.txt`
    a.click()
    URL.revokeObjectURL(url)
    this.toast.success('Lista de commits exportada')
  }
}
