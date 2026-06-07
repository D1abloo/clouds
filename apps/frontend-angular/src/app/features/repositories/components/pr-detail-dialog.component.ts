import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { DatePipe, SlicePipe } from '@angular/common'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { NavIconComponent } from '../../../shared/components/nav-icon/nav-icon.component'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import {
  buildPrCheckJobs,
  buildPrDemoCommits,
  buildPrPreview,
  buildPrReviewers,
  prGithubUrl,
  type GithubPr,
} from '../utils/pr-dialog.util'

export type PrDetailDialogData = { pr: GithubPr }

@Component({
  selector: 'app-pr-detail-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, DatePipe, SlicePipe, NavIconComponent, StatusBadgeComponent],
  template: `
    <div class="pr-dlg">
      <header class="pr-dlg__head">
        <div class="pr-dlg__brand">
          <app-nav-icon logo="github" size="md" />
          <div>
            <span class="pr-dlg__eyebrow">Pull Request #{{ data.pr['number'] }}</span>
            <h2 mat-dialog-title>{{ data.pr['title'] }}</h2>
            <p class="pr-dlg__repo mono">{{ data.pr['repoFullName'] }}</p>
          </div>
        </div>
        <app-status-badge [value]="stateBadge(data.pr['state'])" />
      </header>

      <mat-dialog-content>
        <p class="pr-dlg__desc">{{ data.pr['description'] }}</p>

        <dl class="pr-dlg__meta">
          <div><dt>Autor</dt><dd>{{ data.pr['author'] }}</dd></div>
          <div><dt>Rama</dt><dd>{{ data.pr['head'] }} → {{ data.pr['base'] }}</dd></div>
          <div><dt>Commits</dt><dd>{{ data.pr['commits'] ?? commits().length }}</dd></div>
          <div><dt>Actualizado</dt><dd>{{ dateStr(data.pr['updatedAt']) | date: 'short' }}</dd></div>
          <div><dt>+/−</dt><dd class="diff"><span class="add">+{{ data.pr['additions'] ?? 0 }}</span> <span class="del">−{{ data.pr['deletions'] ?? 0 }}</span></dd></div>
          <div><dt>Checks</dt><dd><app-status-badge [value]="checksBadge(data.pr['checks'])" /></dd></div>
        </dl>

        @if (labelList().length) {
          <div class="pr-dlg__labels">
            @for (l of labelList(); track l) { <span class="label">{{ l }}</span> }
          </div>
        }

        <div class="pr-dlg__panels">
          <article class="pr-dlg__panel">
            <h3><mat-icon>rule</mat-icon> Checks CI</h3>
            @for (j of checkJobs().slice(0, 4); track j.id) {
              <div class="pr-dlg__job">
                <span>{{ j.name }}</span>
                <app-status-badge [value]="jobBadge(j.status)" />
                <small>{{ j.duration }}</small>
              </div>
            }
          </article>
          <article class="pr-dlg__panel">
            <h3><mat-icon>rate_review</mat-icon> Revisiones</h3>
            @for (r of reviewers().slice(0, 3); track r.user) {
              <div class="pr-dlg__review">
                <span>{{ r.user }}</span>
                <small>{{ r.team }}</small>
                <app-status-badge [value]="reviewBadge(r.status)" />
              </div>
            }
          </article>
          <article class="pr-dlg__panel">
            <h3><mat-icon>rocket_launch</mat-icon> Preview</h3>
            @if (preview().status === 'none') {
              <p class="muted">No disponible (borrador)</p>
            } @else {
              <p class="mono preview-url">{{ preview().url }}</p>
              <small>{{ preview().status }} · TTL {{ preview().ttl }}</small>
            }
          </article>
        </div>

        <section class="pr-dlg__commits-preview">
          <h3>Últimos commits ({{ commits().length }})</h3>
          @for (c of commits().slice(0, 3); track c.sha) {
            <div class="pr-dlg__commit">
              <code>{{ c.sha | slice:0:8 }}</code>
              <span>{{ c.message }}</span>
              <small>{{ c.author }}</small>
            </div>
          }
        </section>

        @if (data.pr['conflicts']) {
          <div class="pr-dlg__alert"><mat-icon>warning</mat-icon> Conflictos en values.yaml y package-lock.json</div>
        }
        @if (data.pr['draft']) {
          <div class="pr-dlg__alert pr-dlg__alert--info"><mat-icon>edit_note</mat-icon> Borrador — no listo para revisión formal</div>
        }
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close type="button">Cerrar</button>
        <button mat-stroked-button type="button" (click)="handleOpen()">
          <mat-icon>open_in_new</mat-icon> Abrir en GitHub
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .pr-dlg { --gh-accent: #24292f; --gh-link: #0969da; }
    .pr-dlg__head { display: flex; justify-content: space-between; gap: 1rem; padding-bottom: 0.75rem; border-bottom: 2px solid #24292f22; }
    h2[mat-dialog-title] { margin: 0; padding: 0; font-size: 1.1rem; font-weight: 800; }
    .pr-dlg__brand { display: flex; gap: 0.75rem; align-items: flex-start; min-width: 0; }
    .pr-dlg__eyebrow { display: block; font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--gh-link); margin-bottom: 0.15rem; }
    .pr-dlg__repo { margin: 0.2rem 0 0; font-size: 0.76rem; color: var(--app-text-muted); }
    .pr-dlg__desc { font-size: 0.82rem; line-height: 1.45; color: var(--app-text-muted); margin: 0.75rem 0; }
    .pr-dlg__meta { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.45rem 1rem; margin: 0 0 0.75rem; font-size: 0.76rem;
      dt { font-size: 0.65rem; text-transform: uppercase; color: var(--app-text-muted); margin: 0; }
      dd { margin: 0.12rem 0 0; font-weight: 600; }
    }
    .diff .add { color: #22c55e; } .diff .del { color: #ef4444; }
    .pr-dlg__labels { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 0.75rem; }
    .label { font-size: 0.65rem; padding: 0.1rem 0.45rem; border-radius: 999px; background: #24292f12; font-weight: 600; }
    .pr-dlg__panels { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.5rem; margin-bottom: 0.85rem; }
    .pr-dlg__panel { padding: 0.55rem 0.65rem; border-left: 3px solid var(--gh-accent); background: #24292f06; font-size: 0.74rem;
      h3 { display: flex; align-items: center; gap: 0.3rem; margin: 0 0 0.45rem; font-size: 0.68rem; text-transform: uppercase; color: var(--app-text-muted); mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; } }
    }
    .pr-dlg__job, .pr-dlg__review { display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem; margin-bottom: 0.3rem; small { color: var(--app-text-muted); } }
    .preview-url { font-size: 0.72rem; word-break: break-all; margin: 0 0 0.2rem; }
    .pr-dlg__commits-preview h3 { font-size: 0.72rem; text-transform: uppercase; color: var(--app-text-muted); margin: 0 0 0.45rem; }
    .pr-dlg__commit { display: grid; grid-template-columns: auto 1fr auto; gap: 0.5rem; align-items: center; padding: 0.35rem 0; font-size: 0.76rem; border-bottom: 1px solid #00000008;
      code { font-size: 0.68rem; } small { color: var(--app-text-muted); }
    }
    .pr-dlg__alert { display: flex; align-items: center; gap: 0.35rem; margin-top: 0.65rem; padding: 0.5rem 0.65rem; font-size: 0.78rem; color: #ef4444; background: #ef444410; border-left: 3px solid #ef4444; }
    .pr-dlg__alert--info { color: var(--status-warning); background: #f59e0b10; border-color: #f59e0b; }
    .mono { font-family: ui-monospace, monospace; }
    .muted { color: var(--app-text-muted); font-size: 0.78rem; margin: 0; }
    @media (max-width: 640px) { .pr-dlg__meta, .pr-dlg__panels { grid-template-columns: 1fr; } }
  `,
})
export class PrDetailDialogComponent {
  readonly data = inject<PrDetailDialogData>(MAT_DIALOG_DATA)

  commits = () => buildPrDemoCommits(this.data.pr)
  checkJobs = () => buildPrCheckJobs(this.data.pr)
  reviewers = () => buildPrReviewers(this.data.pr)
  preview = () => buildPrPreview(this.data.pr)
  labelList = (): string[] => (this.data.pr['labels'] as string[]) ?? []

  dateStr = (v: unknown): string => String(v ?? '')

  stateBadge = (s: unknown): string => (s === 'open' ? 'RUNNING' : s === 'merged' ? 'SUCCESS' : 'STOPPED')
  checksBadge = (c: unknown): string => (c === 'success' ? 'SUCCESS' : c === 'pending' ? 'RUNNING' : 'ERROR')
  jobBadge = (s: string): string => (s === 'success' ? 'SUCCESS' : s === 'running' || s === 'pending' ? 'RUNNING' : s === 'skipped' ? 'STOPPED' : 'ERROR')
  reviewBadge = (s: string): string => (s === 'approved' ? 'SUCCESS' : s === 'changes_requested' ? 'ERROR' : 'RUNNING')

  handleOpen = (): void => {
    window.open(prGithubUrl(this.data.pr), '_blank', 'noopener,noreferrer')
  }
}
