import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { ToastService } from '../../../core/services/toast.service'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import { buildPrReviewers, type GithubPr, type PrReviewerRow } from '../utils/pr-dialog.util'

export type PrReviewDialogData = { pr: GithubPr }

@Component({
  selector: 'app-pr-review-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatCheckboxModule, StatusBadgeComponent],
  template: `
    <div class="pr-review">
      <header class="pr-review__head">
        <div>
          <span class="pr-review__eyebrow">Solicitar revisión · PR #{{ data.pr['number'] }}</span>
          <h2 mat-dialog-title>{{ data.pr['title'] }}</h2>
          <p class="pr-review__sub mono">{{ data.pr['repoFullName'] }}</p>
        </div>
      </header>

      <mat-dialog-content>
        <p class="pr-review__lead">Selecciona revisores sugeridos según equipo y carga actual.</p>

        <div class="pr-review__list">
          @for (r of reviewers(); track r.user) {
            <label class="review-row" [class.review-row--assigned]="isAssigned(r.user)">
              <mat-checkbox [checked]="selected().includes(r.user)" (change)="handleToggle(r.user, $event.checked)" />
              <div class="review-row__main">
                <strong>{{ r.user }}</strong>
                <span>{{ r.team }}</span>
                <small>{{ r.load }}</small>
              </div>
              <app-status-badge [value]="reviewBadge(r.status)" />
              <span class="review-row__comments">{{ r.comments }} comentarios</span>
            </label>
          }
        </div>

        <article class="pr-review__notify">
          <h3><mat-icon>notifications</mat-icon> Notificación</h3>
          <ul>
            <li>Email + Slack #code-reviews</li>
            <li>Recordatorio automático en 24 h si no hay respuesta</li>
            <li>Mención en el hilo del PR en GitHub</li>
          </ul>
        </article>

        <div class="pr-review__tip">
          <mat-icon>lightbulb</mat-icon>
          Asigna al menos un revisor del área afectada y uno de plataforma para cambios de infra.
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close type="button">Cancelar</button>
        <button mat-flat-button class="pr-review__cta" type="button" [disabled]="!selected().length" (click)="handleSubmit()">
          <mat-icon>person_add</mat-icon> Solicitar revisión ({{ selected().length }})
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .pr-review__head { padding-bottom: 0.65rem; border-bottom: 2px solid #24292f22; }
    h2[mat-dialog-title] { margin: 0; padding: 0; font-size: 1.05rem; font-weight: 800; }
    .pr-review__eyebrow { font-size: 0.62rem; font-weight: 700; text-transform: uppercase; color: #0969da; }
    .pr-review__sub { margin: 0.2rem 0 0; font-size: 0.74rem; color: var(--app-text-muted); }
    .pr-review__lead { font-size: 0.82rem; color: var(--app-text-muted); margin: 0.75rem 0 0.65rem; }
    .review-row { display: grid; grid-template-columns: auto 1fr auto auto; gap: 0.5rem 0.75rem; align-items: center; padding: 0.55rem 0; border-bottom: 1px solid #0000000a; cursor: pointer; }
    .review-row--assigned { background: #0969da06; }
    .review-row__main { display: flex; flex-direction: column; gap: 0.08rem; strong { font-size: 0.82rem; } span { font-size: 0.72rem; color: var(--app-text-muted); } small { font-size: 0.65rem; color: var(--app-text-muted); } }
    .review-row__comments { font-size: 0.68rem; color: var(--app-text-muted); }
    .pr-review__notify { margin-top: 0.75rem; padding: 0.55rem 0.65rem; border-left: 3px solid #24292f; font-size: 0.76rem;
      h3 { display: flex; align-items: center; gap: 0.3rem; margin: 0 0 0.35rem; font-size: 0.72rem; text-transform: uppercase; color: var(--app-text-muted); mat-icon { font-size: 1rem; width: 1rem; height: 1rem; } }
      ul { margin: 0; padding-left: 1.1rem; }
    }
    .pr-review__tip { display: flex; gap: 0.35rem; margin-top: 0.65rem; padding: 0.5rem 0.65rem; font-size: 0.74rem; background: #f59e0b0a; border-left: 3px solid #f59e0b; mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: #f59e0b; flex-shrink: 0; } }
    .mono { font-family: ui-monospace, monospace; }
    .pr-review__cta { background: #24292f !important; color: #fff !important; }
  `,
})
export class PrReviewDialogComponent {
  readonly data = inject<PrReviewDialogData>(MAT_DIALOG_DATA)
  private readonly toast = inject(ToastService)
  private readonly dialogRef = inject(MatDialogRef<PrReviewDialogComponent>)

  readonly selected = signal<string[]>([...((this.data.pr['reviewers'] as string[]) ?? [])])

  reviewers = (): PrReviewerRow[] => buildPrReviewers(this.data.pr)

  isAssigned = (user: string): boolean => ((this.data.pr['reviewers'] as string[]) ?? []).includes(user)

  reviewBadge = (s: string): string => (s === 'approved' ? 'SUCCESS' : s === 'changes_requested' ? 'ERROR' : 'RUNNING')

  handleToggle = (user: string, checked: boolean): void => {
    this.selected.update((list) => (checked ? [...list, user] : list.filter((u) => u !== user)))
  }

  handleSubmit = (): void => {
    this.toast.success(`Revisión solicitada a ${this.selected().join(', ')}`)
    this.dialogRef.close(this.selected())
  }
}
