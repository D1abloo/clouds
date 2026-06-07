import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { ToastService } from '../../../core/services/toast.service'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import { buildPrPreview, type GithubPr } from '../utils/pr-dialog.util'

export type PrPreviewDialogData = { pr: GithubPr }

const PREVIEW_STEPS = [
  { label: 'Build imagen', status: 'success', detail: 'docker build · multi-stage', duration: '1m 32s' },
  { label: 'Push registry', status: 'success', detail: 'ghcr.io/cloudops/…', duration: '34s' },
  { label: 'Deploy K8s', status: 'success', detail: 'Helm upgrade · namespace preview', duration: '48s' },
  { label: 'Health check', status: 'success', detail: 'GET /health → 200', duration: '12s' },
] as const

@Component({
  selector: 'app-pr-preview-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, StatusBadgeComponent],
  template: `
    <div class="pr-preview">
      <header class="pr-preview__head">
        <div>
          <span class="pr-preview__eyebrow">Preview · PR #{{ data.pr['number'] }}</span>
          <h2 mat-dialog-title>Desplegar preview</h2>
          <p class="pr-preview__sub">{{ data.pr['title'] }}</p>
        </div>
        <app-status-badge [value]="previewBadge(preview().status)" />
      </header>

      <mat-dialog-content>
        @if (preview().status === 'none') {
          <div class="pr-preview__blocked">
            <mat-icon>edit_note</mat-icon>
            <p>El PR está en borrador. Publica el PR para habilitar el entorno preview.</p>
          </div>
        } @else {
          <dl class="pr-preview__meta">
            <div><dt>URL</dt><dd class="mono url">{{ preview().url }}</dd></div>
            <div><dt>Namespace</dt><dd class="mono">{{ preview().namespace }}</dd></div>
            <div><dt>Commit / ref</dt><dd class="mono">{{ preview().commit }}</dd></div>
            <div><dt>TTL</dt><dd>{{ preview().ttl }}</dd></div>
            <div><dt>Health</dt><dd>{{ preview().healthCheck }}</dd></div>
            <div><dt>Último deploy</dt><dd>{{ preview().lastDeploy }}</dd></div>
          </dl>

          <section class="pr-preview__steps">
            <h3><mat-icon>rocket_launch</mat-icon> Pipeline preview</h3>
            @for (s of steps; track s.label) {
              <div class="step-row">
                <mat-icon>{{ s.status === 'success' ? 'check_circle' : 'hourglass_empty' }}</mat-icon>
                <div>
                  <strong>{{ s.label }}</strong>
                  <p>{{ s.detail }}</p>
                </div>
                <span>{{ s.duration }}</span>
              </div>
            }
          </section>

          <div class="pr-preview__impact">
            <mat-icon>info</mat-icon>
            Entorno efímero aislado · se destruye automáticamente tras {{ preview().ttl }}
          </div>
        }
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close type="button">Cerrar</button>
        @if (preview().status !== 'none') {
          <button mat-stroked-button type="button" (click)="handleCopy()"><mat-icon>content_copy</mat-icon> Copiar URL</button>
          <button mat-flat-button class="pr-preview__cta" type="button" (click)="handleOpen()">
            <mat-icon>open_in_new</mat-icon> Abrir preview
          </button>
        }
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .pr-preview__head { display: flex; justify-content: space-between; gap: 1rem; padding-bottom: 0.65rem; border-bottom: 2px solid #24292f22; }
    h2[mat-dialog-title] { margin: 0; padding: 0; font-size: 1.05rem; font-weight: 800; }
    .pr-preview__eyebrow { font-size: 0.62rem; font-weight: 700; text-transform: uppercase; color: #0969da; }
    .pr-preview__sub { margin: 0.2rem 0 0; font-size: 0.82rem; color: var(--app-text-muted); }
    .pr-preview__meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.45rem 1rem; margin: 0.75rem 0; font-size: 0.76rem;
      dt { font-size: 0.65rem; text-transform: uppercase; color: var(--app-text-muted); }
      dd { margin: 0.12rem 0 0; font-weight: 600; }
      .url { word-break: break-all; color: #0969da; }
    }
    .pr-preview__steps h3 { display: flex; align-items: center; gap: 0.3rem; font-size: 0.72rem; text-transform: uppercase; color: var(--app-text-muted); margin: 0 0 0.5rem; mat-icon { font-size: 1rem; width: 1rem; height: 1rem; } }
    .step-row { display: grid; grid-template-columns: auto 1fr auto; gap: 0.5rem; align-items: start; padding: 0.4rem 0; font-size: 0.76rem; border-bottom: 1px solid #00000008;
      mat-icon { color: #22c55e; font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
      p { margin: 0.1rem 0 0; color: var(--app-text-muted); font-size: 0.72rem; }
      span { color: var(--app-text-muted); font-size: 0.68rem; }
    }
    .pr-preview__impact { display: flex; align-items: center; gap: 0.35rem; margin-top: 0.65rem; padding: 0.5rem 0.65rem; font-size: 0.74rem; background: #0969da0a; border-left: 3px solid #0969da; mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: #0969da; } }
    .pr-preview__blocked { display: flex; gap: 0.5rem; padding: 0.75rem; background: #f59e0b10; border-left: 3px solid #f59e0b; mat-icon { color: #f59e0b; } p { margin: 0; font-size: 0.82rem; } }
    .mono { font-family: ui-monospace, monospace; }
    .pr-preview__cta { background: #24292f !important; color: #fff !important; }
  `,
})
export class PrPreviewDialogComponent {
  readonly data = inject<PrPreviewDialogData>(MAT_DIALOG_DATA)
  private readonly toast = inject(ToastService)

  readonly steps = PREVIEW_STEPS
  preview = () => buildPrPreview(this.data.pr)

  previewBadge = (s: string): string => (s === 'live' ? 'SUCCESS' : s === 'deploying' ? 'RUNNING' : s === 'expired' ? 'STOPPED' : 'STOPPED')

  handleOpen = (): void => {
    const url = this.preview().url
    if (url !== '—') window.open(url, '_blank', 'noopener,noreferrer')
  }

  handleCopy = (): void => {
    const url = this.preview().url
    void navigator.clipboard.writeText(url).then(
      () => this.toast.success('URL preview copiada'),
      () => this.toast.info(url),
    )
  }
}
