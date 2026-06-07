import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { ToastService } from '../../../core/services/toast.service'
import { NavIconComponent } from '../../../shared/components/nav-icon/nav-icon.component'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import { prGithubUrl, prQuickLinks, repoWorkflows, type GithubPr } from '../utils/pr-dialog.util'

export type PrOpenGithubDialogData = { pr: GithubPr }

@Component({
  selector: 'app-pr-open-github-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, NavIconComponent, StatusBadgeComponent],
  template: `
    <div class="pr-open">
      <header class="pr-open__head">
        <div class="pr-open__brand">
          <app-nav-icon logo="github" size="md" />
          <div>
            <span class="pr-open__eyebrow">Abrir en GitHub</span>
            <h2 mat-dialog-title>PR #{{ data.pr['number'] }} · {{ data.pr['title'] }}</h2>
            <p class="mono">{{ data.pr['repoFullName'] }}</p>
          </div>
        </div>
        <app-status-badge [value]="stateBadge(data.pr['state'])" />
      </header>

      <mat-dialog-content>
        <section class="pr-open__links">
          <h3>Accesos directos</h3>
          <div class="pr-open__grid">
            @for (link of links(); track link.id) {
              <button type="button" class="pr-open__link" (click)="handleOpen(link.url, link.label)" [attr.aria-label]="'Abrir ' + link.label">
                <mat-icon>{{ link.icon }}</mat-icon>
                <span class="pr-open__link-label">{{ link.label }}</span>
                <code class="pr-open__link-path">{{ link.path }}</code>
              </button>
            }
          </div>
        </section>

        @if (workflows().length) {
          <section class="pr-open__workflows">
            <h3><mat-icon>bolt</mat-icon> GitHub Actions</h3>
            @for (w of workflows(); track w['id']) {
              <div class="wf-row">
                <strong>{{ w['workflow'] }}</strong>
                <app-status-badge [value]="wfBadge(w['status'])" />
                <span>{{ w['runs'] }} runs</span>
              </div>
            }
          </section>
        }

        <div class="pr-open__url-box">
          <label>URL del Pull Request</label>
          <div class="pr-open__url-row">
            <code class="mono">{{ mainUrl() }}</code>
            <button mat-icon-button type="button" aria-label="Copiar URL" (click)="handleCopy()">
              <mat-icon>content_copy</mat-icon>
            </button>
          </div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close type="button">Cerrar</button>
        <button mat-stroked-button type="button" (click)="handleCopy()"><mat-icon>content_copy</mat-icon> Copiar URL</button>
        <button mat-flat-button class="pr-open__cta" type="button" (click)="handleOpenMain()">
          <mat-icon>open_in_new</mat-icon> Abrir PR
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .pr-open__head { display: flex; justify-content: space-between; gap: 1rem; padding-bottom: 0.65rem; border-bottom: 2px solid #24292f22; }
    h2[mat-dialog-title] { margin: 0; padding: 0; font-size: 1.05rem; font-weight: 800; }
    .pr-open__brand { display: flex; gap: 0.75rem; align-items: flex-start; min-width: 0; }
    .pr-open__eyebrow { font-size: 0.62rem; font-weight: 700; text-transform: uppercase; color: #0969da; }
    .mono { font-family: ui-monospace, monospace; font-size: 0.74rem; color: var(--app-text-muted); }
    .pr-open__links h3, .pr-open__workflows h3 { font-size: 0.72rem; text-transform: uppercase; color: var(--app-text-muted); margin: 0.75rem 0 0.5rem; }
    .pr-open__grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.5rem; }
    .pr-open__link { display: flex; flex-direction: column; align-items: flex-start; gap: 0.15rem; padding: 0.6rem 0.5rem; text-align: left; cursor: pointer; border: 1px solid #24292f22; border-radius: 8px; background: transparent;
      mat-icon { color: #24292f; }
      &:hover { background: #24292f08; border-color: #24292f; }
    }
    .pr-open__link-label { font-size: 0.78rem; font-weight: 700; }
    .pr-open__link-path { font-size: 0.58rem; color: #0969da; word-break: break-all; }
    .wf-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; padding: 0.4rem 0; font-size: 0.76rem; border-bottom: 1px solid #00000008; strong { flex: 1; min-width: 120px; } }
    .pr-open__url-box { margin-top: 0.85rem; padding-top: 0.65rem; border-top: 1px solid #0000000a;
      label { display: block; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; color: var(--app-text-muted); margin-bottom: 0.35rem; }
    }
    .pr-open__url-row { display: flex; align-items: center; gap: 0.35rem; code { flex: 1; word-break: break-all; padding: 0.45rem 0.55rem; background: #24292f06; border-radius: 6px; font-size: 0.72rem; } }
    .pr-open__cta { background: #24292f !important; color: #fff !important; }
    @media (max-width: 640px) { .pr-open__grid { grid-template-columns: 1fr 1fr; } }
  `,
})
export class PrOpenGithubDialogComponent {
  readonly data = inject<PrOpenGithubDialogData>(MAT_DIALOG_DATA)
  private readonly toast = inject(ToastService)

  links = () => prQuickLinks(this.data.pr)
  workflows = () => repoWorkflows(String(this.data.pr['repoFullName']))
  mainUrl = () => prGithubUrl(this.data.pr)

  stateBadge = (s: unknown): string => (s === 'open' ? 'RUNNING' : s === 'merged' ? 'SUCCESS' : 'STOPPED')
  wfBadge = (s: unknown): string => {
    const v = String(s ?? '')
    return v === 'success' ? 'SUCCESS' : v === 'running' ? 'RUNNING' : 'ERROR'
  }

  handleOpen = (url: string, label: string): void => {
    window.open(url, '_blank', 'noopener,noreferrer')
    this.toast.info(`Abriendo ${label}`)
  }

  handleOpenMain = (): void => {
    window.open(this.mainUrl(), '_blank', 'noopener,noreferrer')
  }

  handleCopy = (): void => {
    void navigator.clipboard.writeText(this.mainUrl()).then(
      () => this.toast.success('URL copiada'),
      () => this.toast.info(this.mainUrl()),
    )
  }
}
