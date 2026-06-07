import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { NavIconComponent } from '../../../shared/components/nav-icon/nav-icon.component'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import {
  buildPrCheckJobs,
  prActionsUrl,
  prChecksUrl,
  repoWorkflows,
  type GithubPr,
} from '../utils/pr-dialog.util'

export type PrChecksDialogData = { pr: GithubPr; mode?: 'checks' | 'actions' }

@Component({
  selector: 'app-pr-checks-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, NavIconComponent, StatusBadgeComponent],
  template: `
    <div class="pr-checks">
      <header class="pr-checks__head">
        <div class="pr-checks__brand">
          <app-nav-icon logo="github" size="md" />
          <div>
            <span class="pr-checks__eyebrow">{{ isActions() ? 'GitHub Actions' : 'Checks CI' }} · PR #{{ data.pr['number'] }}</span>
            <h2 mat-dialog-title>{{ data.pr['title'] }}</h2>
            <p class="mono">{{ data.pr['repoFullName'] }}</p>
          </div>
        </div>
        <app-status-badge [value]="checksBadge(data.pr['checks'])" />
      </header>

      <mat-dialog-content>
        @if (!isActions()) {
          <section class="pr-checks__section">
            <h3><mat-icon>rule</mat-icon> Required checks</h3>
            @for (j of jobs(); track j.id) {
              <article class="job-row" [class.job-row--fail]="j.status === 'failed'">
                <div class="job-row__main">
                  <strong>{{ j.name }}</strong>
                  <span class="job-row__wf">{{ j.workflow }}</span>
                  <p>{{ j.detail }}</p>
                </div>
                <div class="job-row__side">
                  <app-status-badge [value]="jobBadge(j.status)" />
                  <span class="job-row__dur">{{ j.duration }}</span>
                </div>
              </article>
            }
          </section>
        }

        <section class="pr-checks__section">
          <h3><mat-icon>bolt</mat-icon> Workflows del repositorio</h3>
          @for (w of workflows(); track w['id']) {
            <article class="wf-row">
              <strong>{{ w['workflow'] }}</strong>
                <app-status-badge [value]="jobBadge(w['status'])" />
              <span>{{ w['runs'] }} ejecuciones</span>
            </article>
          } @empty {
            <p class="muted">Sin workflows demo para este repo</p>
          }
        </section>

        <div class="pr-checks__summary">
          <div><mat-icon>schedule</mat-icon> Última ejecución: hace 12 min</div>
          <div><mat-icon>commit</mat-icon> Ref: {{ data.pr['head'] }}</div>
          <div><mat-icon>link</mat-icon> Trigger: pull_request</div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close type="button">Cerrar</button>
        <button mat-stroked-button type="button" (click)="handleOpenActions()">
          <mat-icon>bolt</mat-icon> Ver Actions
        </button>
        <button mat-flat-button class="pr-checks__cta" type="button" (click)="handleOpenChecks()">
          <mat-icon>open_in_new</mat-icon> Abrir checks
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .pr-checks__head { display: flex; justify-content: space-between; gap: 1rem; padding-bottom: 0.65rem; border-bottom: 2px solid #24292f22; }
    h2[mat-dialog-title] { margin: 0; padding: 0; font-size: 1.05rem; font-weight: 800; }
    .pr-checks__brand { display: flex; gap: 0.75rem; align-items: flex-start; }
    .pr-checks__eyebrow { font-size: 0.62rem; font-weight: 700; text-transform: uppercase; color: #0969da; }
    .mono { font-family: ui-monospace, monospace; font-size: 0.74rem; color: var(--app-text-muted); margin: 0.2rem 0 0; }
    .pr-checks__section { margin-bottom: 0.85rem;
      h3 { display: flex; align-items: center; gap: 0.3rem; margin: 0 0 0.5rem; font-size: 0.72rem; text-transform: uppercase; color: var(--app-text-muted); mat-icon { font-size: 1rem; width: 1rem; height: 1rem; } }
    }
    .job-row { display: flex; justify-content: space-between; gap: 0.75rem; padding: 0.55rem 0; border-bottom: 1px solid #0000000a; }
    .job-row--fail { border-left: 2px solid #ef4444; padding-left: 0.5rem; }
    .job-row__main strong { display: block; font-size: 0.82rem; }
    .job-row__wf { font-size: 0.65rem; color: var(--app-text-muted); }
    .job-row__main p { margin: 0.2rem 0 0; font-size: 0.74rem; color: var(--app-text-muted); }
    .job-row__side { display: flex; flex-direction: column; align-items: flex-end; gap: 0.2rem; }
    .job-row__dur { font-size: 0.68rem; color: var(--app-text-muted); }
    .wf-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; padding: 0.45rem 0; font-size: 0.78rem; border-bottom: 1px solid #00000008; strong { flex: 1; min-width: 140px; } }
    .pr-checks__summary { display: flex; flex-wrap: wrap; gap: 0.65rem 1rem; padding: 0.55rem 0; font-size: 0.74rem; color: var(--app-text-muted);
      div { display: flex; align-items: center; gap: 0.25rem; mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; } }
    }
    .muted { color: var(--app-text-muted); font-size: 0.78rem; }
    .pr-checks__cta { background: #24292f !important; color: #fff !important; }
  `,
})
export class PrChecksDialogComponent {
  readonly data = inject<PrChecksDialogData>(MAT_DIALOG_DATA)

  isActions = (): boolean => this.data.mode === 'actions'
  jobs = () => buildPrCheckJobs(this.data.pr)
  workflows = () => repoWorkflows(String(this.data.pr['repoFullName']))

  checksBadge = (c: unknown): string => (c === 'success' ? 'SUCCESS' : c === 'pending' ? 'RUNNING' : 'ERROR')
  jobBadge = (s: unknown): string => {
    const v = String(s ?? '')
    if (v === 'success') return 'SUCCESS'
    if (v === 'running' || v === 'pending') return 'RUNNING'
    if (v === 'skipped') return 'STOPPED'
    return 'ERROR'
  }

  handleOpenChecks = (): void => {
    window.open(prChecksUrl(this.data.pr), '_blank', 'noopener,noreferrer')
  }

  handleOpenActions = (): void => {
    window.open(prActionsUrl(this.data.pr), '_blank', 'noopener,noreferrer')
  }
}
