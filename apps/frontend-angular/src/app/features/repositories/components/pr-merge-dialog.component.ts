import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatRadioModule } from '@angular/material/radio'
import { ToastService } from '../../../core/services/toast.service'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import { buildPrMergeInfo, prGithubUrl, type GithubPr } from '../utils/pr-dialog.util'

export type PrMergeDialogData = { pr: GithubPr }

@Component({
  selector: 'app-pr-merge-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatRadioModule, StatusBadgeComponent],
  template: `
    <div class="pr-merge">
      <header class="pr-merge__head">
        <div>
          <span class="pr-merge__eyebrow">Fusionar · PR #{{ data.pr['number'] }}</span>
          <h2 mat-dialog-title>{{ data.pr['title'] }}</h2>
          <p class="pr-merge__sub">{{ data.pr['head'] }} → {{ data.pr['base'] }} · {{ data.pr['repoFullName'] }}</p>
        </div>
        @if (mergeInfo().blocked) {
          <app-status-badge [value]="'ERROR'" />
        } @else {
          <app-status-badge [value]="'SUCCESS'" />
        }
      </header>

      <mat-dialog-content>
        @if (mergeInfo().blocked) {
          <div class="pr-merge__alert"><mat-icon>block</mat-icon> {{ mergeInfo().blockReason }}</div>
        }

        <dl class="pr-merge__meta">
          <div><dt>Commits</dt><dd>{{ data.pr['commits'] ?? '—' }}</dd></div>
          <div><dt>Checks</dt><dd><app-status-badge [value]="checksBadge(data.pr['checks'])" /></dd></div>
          <div><dt>Aprobaciones</dt><dd>{{ mergeInfo().currentApprovals }} / {{ mergeInfo().requiredApprovals }}</dd></div>
          <div><dt>Conflictos</dt><dd>{{ data.pr['conflicts'] ? 'Sí' : 'No' }}</dd></div>
        </dl>

        <section class="pr-merge__strategies">
          <h3><mat-icon>merge</mat-icon> Estrategia de merge</h3>
          @for (s of mergeInfo().strategies; track s.id) {
            <label class="strategy-row" [class.strategy-row--rec]="s.recommended">
              <input type="radio" name="strategy" [value]="s.id" [checked]="strategy() === s.id" (change)="strategy.set(s.id)" />
              <div>
                <strong>{{ s.label }}</strong>
                @if (s.recommended) { <span class="rec">Recomendado</span> }
                <p>{{ s.detail }}</p>
              </div>
            </label>
          }
        </section>

        <div class="pr-merge__impact">
          <mat-icon>info</mat-icon> {{ mergeInfo().impact }}
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close type="button">Cancelar</button>
        <button mat-stroked-button type="button" (click)="handleOpen()"><mat-icon>open_in_new</mat-icon> Ver en GitHub</button>
        <button
          mat-flat-button
          class="pr-merge__cta"
          type="button"
          [disabled]="mergeInfo().blocked"
          (click)="handleMerge()"
        >
          <mat-icon>merge</mat-icon> Fusionar PR
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .pr-merge__head { display: flex; justify-content: space-between; gap: 1rem; padding-bottom: 0.65rem; border-bottom: 2px solid #24292f22; }
    h2[mat-dialog-title] { margin: 0; padding: 0; font-size: 1.05rem; font-weight: 800; }
    .pr-merge__eyebrow { font-size: 0.62rem; font-weight: 700; text-transform: uppercase; color: #0969da; }
    .pr-merge__sub { margin: 0.2rem 0 0; font-size: 0.74rem; color: var(--app-text-muted); }
    .pr-merge__alert { display: flex; align-items: center; gap: 0.35rem; margin: 0.75rem 0; padding: 0.55rem 0.65rem; font-size: 0.78rem; color: #ef4444; background: #ef444410; border-left: 3px solid #ef4444; }
    .pr-merge__meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.45rem 1rem; margin-bottom: 0.75rem; font-size: 0.76rem;
      dt { font-size: 0.65rem; text-transform: uppercase; color: var(--app-text-muted); }
      dd { margin: 0.12rem 0 0; font-weight: 600; }
    }
    .pr-merge__strategies h3 { display: flex; align-items: center; gap: 0.3rem; font-size: 0.72rem; text-transform: uppercase; color: var(--app-text-muted); margin: 0 0 0.5rem; mat-icon { font-size: 1rem; width: 1rem; height: 1rem; } }
    .strategy-row { display: flex; gap: 0.55rem; padding: 0.55rem 0; border-bottom: 1px solid #0000000a; cursor: pointer;
      strong { font-size: 0.82rem; }
      p { margin: 0.15rem 0 0; font-size: 0.72rem; color: var(--app-text-muted); }
      .rec { margin-left: 0.35rem; font-size: 0.62rem; font-weight: 700; color: #22c55e; text-transform: uppercase; }
    }
    .strategy-row--rec { background: #22c55e06; padding-left: 0.35rem; border-left: 2px solid #22c55e; }
    .pr-merge__impact { display: flex; align-items: center; gap: 0.35rem; margin-top: 0.65rem; padding: 0.5rem 0.65rem; font-size: 0.74rem; background: #24292f08; border-left: 3px solid #24292f; mat-icon { font-size: 1rem; width: 1rem; height: 1rem; } }
    .pr-merge__cta { background: #24292f !important; color: #fff !important; }
    .pr-merge__cta[disabled] { opacity: 0.5; }
  `,
})
export class PrMergeDialogComponent {
  readonly data = inject<PrMergeDialogData>(MAT_DIALOG_DATA)
  private readonly toast = inject(ToastService)
  private readonly dialogRef = inject(MatDialogRef<PrMergeDialogComponent>)

  readonly strategy = signal('squash')
  mergeInfo = () => buildPrMergeInfo(this.data.pr)

  checksBadge = (c: unknown): string => (c === 'success' ? 'SUCCESS' : c === 'pending' ? 'RUNNING' : 'ERROR')

  handleOpen = (): void => {
    window.open(prGithubUrl(this.data.pr), '_blank', 'noopener,noreferrer')
  }

  handleMerge = (): void => {
    const strat = this.mergeInfo().strategies.find((s) => s.id === this.strategy())?.label ?? 'Squash and merge'
    this.toast.success(`PR #${this.data.pr['number']} fusionado (${strat})`)
    this.dialogRef.close(true)
  }
}
