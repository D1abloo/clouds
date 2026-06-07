import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { DatePipe, SlicePipe } from '@angular/common'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { ToastService } from '../../../core/services/toast.service'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import { buildPrDemoCommits, prCommitsUrl, type GithubPr } from '../utils/pr-dialog.util'

export type PrCommitsDialogData = { pr: GithubPr }

@Component({
  selector: 'app-pr-commits-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, DatePipe, SlicePipe, StatusBadgeComponent],
  template: `
    <div class="pr-commits">
      <header class="pr-commits__head">
        <div>
          <span class="pr-commits__eyebrow">Commits · PR #{{ data.pr['number'] }}</span>
          <h2 mat-dialog-title>{{ data.pr['title'] }}</h2>
          <p class="pr-commits__sub mono">{{ data.pr['head'] }} → {{ data.pr['base'] }} · {{ data.pr['repoFullName'] }}</p>
        </div>
        <dl class="pr-commits__stats">
          <div><dt>Total</dt><dd>{{ commits().length }}</dd></div>
          <div><dt>Autores</dt><dd>{{ authorCount() }}</dd></div>
          <div><dt>+/−</dt><dd><span class="add">+{{ data.pr['additions'] ?? 0 }}</span> / <span class="del">−{{ data.pr['deletions'] ?? 0 }}</span></dd></div>
        </dl>
      </header>

      <mat-dialog-content>
        <div class="pr-commits__list">
          @for (c of commits(); track c.sha) {
            <article class="pc-row">
              <header class="pc-row__head">
                <code>{{ c.sha | slice:0:10 }}</code>
                @if (c.verified) {
                  <span class="chip chip--ok"><mat-icon>verified</mat-icon> Verificado</span>
                }
              </header>
              <h4>{{ c.message }}</h4>
              <dl class="pc-row__meta">
                <div><dt><mat-icon>person</mat-icon></dt><dd>{{ c.author }}</dd></div>
                <div><dt><mat-icon>schedule</mat-icon></dt><dd>{{ c.date | date: 'short' }}</dd></div>
                <div><dt><mat-icon>description</mat-icon></dt><dd>{{ c.filesChanged }} archivos</dd></div>
              </dl>
              <div class="pc-row__diff">
                <span class="add">+{{ c.additions }}</span>
                <span class="del">−{{ c.deletions }}</span>
              </div>
            </article>
          }
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close type="button">Cerrar</button>
        <button mat-stroked-button type="button" (click)="handleExport()"><mat-icon>download</mat-icon> Exportar</button>
        <button mat-flat-button class="pr-commits__cta" type="button" (click)="handleOpen()">
          <mat-icon>open_in_new</mat-icon> Ver en GitHub
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .pr-commits__head { display: flex; justify-content: space-between; gap: 1rem; padding-bottom: 0.65rem; border-bottom: 2px solid #24292f22; }
    h2[mat-dialog-title] { margin: 0; padding: 0; font-size: 1.05rem; font-weight: 800; }
    .pr-commits__eyebrow { font-size: 0.62rem; font-weight: 700; text-transform: uppercase; color: #0969da; }
    .pr-commits__sub { margin: 0.25rem 0 0; font-size: 0.74rem; color: var(--app-text-muted); }
    .pr-commits__stats { display: flex; gap: 1rem; font-size: 0.74rem; dt { font-size: 0.62rem; text-transform: uppercase; color: var(--app-text-muted); } dd { margin: 0.1rem 0 0; font-weight: 700; } }
    .add { color: #22c55e; } .del { color: #ef4444; }
    .pr-commits__list { display: flex; flex-direction: column; }
    .pc-row { padding: 0.65rem 0; border-bottom: 1px solid #0000000a; }
    .pc-row__head { display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center; margin-bottom: 0.25rem; code { font-size: 0.72rem; } }
    .chip { display: inline-flex; align-items: center; gap: 0.15rem; font-size: 0.62rem; padding: 0.08rem 0.35rem; border-radius: 4px; mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; } }
    .chip--ok { color: #22c55e; background: #22c55e12; }
    .pc-row h4 { margin: 0 0 0.35rem; font-size: 0.88rem; font-weight: 650; }
    .pc-row__meta { display: flex; flex-wrap: wrap; gap: 0.65rem; font-size: 0.74rem; margin: 0 0 0.35rem;
      dt mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; color: var(--app-text-muted); }
      dd { margin: 0; }
    }
    .pc-row__diff { display: flex; gap: 0.65rem; font-size: 0.76rem; font-weight: 700; }
    .mono { font-family: ui-monospace, monospace; }
    .pr-commits__cta { background: #24292f !important; color: #fff !important; }
  `,
})
export class PrCommitsDialogComponent {
  readonly data = inject<PrCommitsDialogData>(MAT_DIALOG_DATA)
  private readonly toast = inject(ToastService)

  commits = () => buildPrDemoCommits(this.data.pr)
  authorCount = (): number => new Set(this.commits().map((c) => c.author)).size

  handleOpen = (): void => {
    window.open(prCommitsUrl(this.data.pr), '_blank', 'noopener,noreferrer')
  }

  handleExport = (): void => {
    const lines = this.commits().map((c) => `${c.sha.slice(0, 10)}  ${c.message}  (${c.author})`)
    const text = [`PR #${this.data.pr['number']} · ${this.data.pr['title']}`, '', ...lines].join('\n')
    void navigator.clipboard.writeText(text).then(
      () => this.toast.success('Lista de commits copiada'),
      () => this.toast.info('Export en demo'),
    )
  }
}
