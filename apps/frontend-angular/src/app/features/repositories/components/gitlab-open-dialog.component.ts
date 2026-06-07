import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { ToastService } from '../../../core/services/toast.service'
import { NavIconComponent } from '../../../shared/components/nav-icon/nav-icon.component'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import {
  buildGitlabQuickLinks,
  gitlabProjectBaseUrl,
  projectMrsPreview,
  projectPipelinePreview,
  type GitlabOpenDialogData,
  type GitlabQuickLink,
} from '../utils/gitlab-open.util'

@Component({
  selector: 'app-gitlab-open-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, NavIconComponent, StatusBadgeComponent],
  template: `
    <div class="gl-open">
      <header class="gl-open__head">
        <div class="gl-open__brand">
          <app-nav-icon logo="gitlab" size="md" />
          <div>
            <span class="gl-open__eyebrow">Abrir en GitLab</span>
            <h2 mat-dialog-title>{{ data.project.name }}</h2>
            <p class="gl-open__path mono">{{ data.project.fullPath }}</p>
          </div>
        </div>
        <span class="gl-open__vis">{{ data.project.visibility }}</span>
      </header>

      <mat-dialog-content>
        @if (data.project.description) {
          <p class="gl-open__desc">{{ data.project.description }}</p>
        }

        <dl class="gl-open__meta">
          <div><dt>Grupo</dt><dd>{{ data.project.group }}</dd></div>
          <div><dt>Lenguaje</dt><dd>{{ data.project.language }}</dd></div>
          <div><dt>Rama default</dt><dd>{{ data.project.defaultBranch }}</dd></div>
          <div><dt>Stars / forks</dt><dd>{{ data.project.stars }} · {{ data.project.forks }}</dd></div>
        </dl>

        @if (pipeline(); as pipe) {
          <div class="gl-open__status">
            <mat-icon>timeline</mat-icon>
            <span>
              Último pipeline: <strong>{{ pipe['status'] }}</strong>
              · ref {{ pipe['ref'] }} · {{ pipe['duration'] }}
            </span>
            <app-status-badge [value]="pipeBadge(pipe['status'])" />
          </div>
        }

        @if (mergeRequests().length) {
          <div class="gl-open__mrs">
            <span class="gl-open__mrs-label">MRs recientes</span>
            @for (mr of mergeRequests(); track mr['id']) {
              <span class="gl-open__mr-chip">!{{ mr['iid'] }} {{ mr['title'] }}</span>
            }
          </div>
        }

        <section class="gl-open__links">
          <h3>Accesos directos</h3>
          <div class="gl-open__grid">
            @for (link of quickLinks(); track link.id) {
              <button
                type="button"
                class="gl-open__link"
                (click)="handleOpenLink(link)"
                [attr.aria-label]="'Abrir ' + link.label + ' en GitLab'"
              >
                <mat-icon>{{ link.icon }}</mat-icon>
                <span class="gl-open__link-label">{{ link.label }}</span>
                <span class="gl-open__link-desc">{{ link.description }}</span>
                <code class="gl-open__link-path">{{ link.path }}</code>
              </button>
            }
          </div>
        </section>

        <div class="gl-open__url-box">
          <label for="gl-main-url">URL del proyecto</label>
          <div class="gl-open__url-row">
            <code id="gl-main-url" class="mono">{{ mainUrl() }}</code>
            <button mat-icon-button type="button" aria-label="Copiar URL" (click)="handleCopyUrl()">
              <mat-icon>content_copy</mat-icon>
            </button>
          </div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close type="button">Cerrar</button>
        <button mat-stroked-button type="button" (click)="handleCopyUrl()">
          <mat-icon>content_copy</mat-icon> Copiar URL
        </button>
        <button mat-flat-button class="gl-open__cta" type="button" (click)="handleOpenMain()">
          <mat-icon>open_in_new</mat-icon> Abrir proyecto
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .gl-open { --gl-accent: #fc6d26; --gl-accent-deep: #c2410c; }
    .gl-open__head {
      display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;
      padding-bottom: 0.75rem;
      border-bottom: 2px solid color-mix(in srgb, var(--gl-accent) 35%, transparent);
      background: linear-gradient(135deg, color-mix(in srgb, var(--gl-accent) 7%, var(--app-card)), transparent);
    }
    h2[mat-dialog-title] { margin: 0; padding: 0; font-size: 1.15rem; font-weight: 800; }
    .gl-open__brand { display: flex; gap: 0.75rem; align-items: flex-start; min-width: 0; }
    .gl-open__eyebrow {
      display: block; font-size: 0.62rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.06em; color: var(--gl-accent-deep); margin-bottom: 0.15rem;
    }
    .gl-open__path { margin: 0.2rem 0 0; font-size: 0.76rem; color: var(--app-text-muted); word-break: break-all; }
    .gl-open__vis {
      flex-shrink: 0; font-size: 0.62rem; font-weight: 700; text-transform: uppercase;
      padding: 0.2rem 0.5rem; border-radius: 4px;
      color: var(--gl-accent-deep); background: color-mix(in srgb, var(--gl-accent) 12%, transparent);
    }
    .gl-open__desc {
      margin: 0.75rem 0 0.65rem; font-size: 0.82rem; line-height: 1.45; color: var(--app-text-muted);
    }
    .gl-open__meta {
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.45rem 1rem;
      margin: 0 0 0.75rem; font-size: 0.76rem;
      dt { font-size: 0.65rem; text-transform: uppercase; color: var(--app-text-muted); margin: 0; }
      dd { margin: 0.12rem 0 0; font-weight: 600; }
    }
    .gl-open__status {
      display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem;
      padding: 0.55rem 0.65rem; margin-bottom: 0.65rem; font-size: 0.76rem;
      border-left: 3px solid var(--gl-accent);
      background: color-mix(in srgb, var(--gl-accent) 6%, transparent);
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: var(--gl-accent-deep); }
    }
    .gl-open__mrs { margin-bottom: 0.85rem; }
    .gl-open__mrs-label {
      display: block; font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
      color: var(--app-text-muted); margin-bottom: 0.35rem;
    }
    .gl-open__mr-chip {
      display: inline-block; margin: 0 0.35rem 0.35rem 0; padding: 0.15rem 0.45rem;
      font-size: 0.68rem; border-radius: 4px;
      background: color-mix(in srgb, var(--app-text) 5%, transparent);
    }
    .gl-open__links h3 {
      margin: 0 0 0.55rem; font-size: 0.72rem; font-weight: 750;
      text-transform: uppercase; letter-spacing: 0.04em; color: var(--app-text-muted);
    }
    .gl-open__grid {
      display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.5rem;
      margin-bottom: 0.85rem;
    }
    .gl-open__link {
      display: flex; flex-direction: column; align-items: flex-start; gap: 0.15rem;
      padding: 0.65rem 0.55rem; text-align: left; cursor: pointer;
      border: 1px solid color-mix(in srgb, var(--gl-accent) 22%, transparent);
      border-radius: 8px; background: transparent;
      transition: background 0.15s, border-color 0.15s;
      mat-icon { font-size: 1.2rem; width: 1.2rem; height: 1.2rem; color: var(--gl-accent-deep); }
      &:hover {
        background: color-mix(in srgb, var(--gl-accent) 8%, transparent);
        border-color: var(--gl-accent);
      }
    }
    .gl-open__link-label { font-size: 0.78rem; font-weight: 700; color: var(--app-text); }
    .gl-open__link-desc { font-size: 0.65rem; color: var(--app-text-muted); line-height: 1.3; }
    .gl-open__link-path { font-size: 0.58rem; color: var(--gl-accent-deep); margin-top: 0.15rem; word-break: break-all; }
    .gl-open__url-box {
      padding: 0.65rem 0; border-top: 1px solid color-mix(in srgb, var(--app-text-muted) 10%, transparent);
      label { display: block; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; color: var(--app-text-muted); margin-bottom: 0.35rem; }
    }
    .gl-open__url-row {
      display: flex; align-items: center; gap: 0.35rem;
      code { flex: 1; font-size: 0.72rem; word-break: break-all; padding: 0.45rem 0.55rem;
        background: color-mix(in srgb, var(--app-text) 4%, transparent); border-radius: 6px; }
    }
    .mono { font-family: ui-monospace, monospace; }
    .gl-open__cta {
      background: var(--gl-accent) !important; color: #fff !important;
      mat-icon { margin-right: 0.15rem; }
    }
    @media (max-width: 640px) {
      .gl-open__grid { grid-template-columns: 1fr 1fr; }
      .gl-open__meta { grid-template-columns: 1fr; }
    }
  `,
})
export class GitlabOpenDialogComponent {
  readonly data = inject<GitlabOpenDialogData>(MAT_DIALOG_DATA)
  private readonly toast = inject(ToastService)
  private readonly dialogRef = inject(MatDialogRef<GitlabOpenDialogComponent>)

  readonly host = { baseUrl: this.data.hostUrl?.replace(/\/$/, '') ?? 'https://gitlab.com' }

  quickLinks = (): GitlabQuickLink[] => buildGitlabQuickLinks(this.data.project, this.host)

  mainUrl = (): string => gitlabProjectBaseUrl(this.data.project, this.host)

  pipeline = (): Record<string, unknown> | undefined =>
    projectPipelinePreview(this.data.project.fullPath)

  mergeRequests = (): Record<string, unknown>[] =>
    projectMrsPreview(this.data.project.fullPath)

  pipeBadge = (status: unknown): string => {
    const s = String(status ?? '')
    if (status === 'success') return 'SUCCESS'
    if (status === 'running') return 'RUNNING'
    return 'ERROR'
  }

  handleOpenLink = (link: GitlabQuickLink): void => {
    window.open(link.url, '_blank', 'noopener,noreferrer')
    this.toast.info(`Abriendo ${link.label} en GitLab`)
  }

  handleOpenMain = (): void => {
    window.open(this.mainUrl(), '_blank', 'noopener,noreferrer')
    this.dialogRef.close()
  }

  handleCopyUrl = (): void => {
    const url = this.mainUrl()
    void navigator.clipboard.writeText(url).then(
      () => this.toast.success('URL copiada al portapapeles'),
      () => this.toast.info(url),
    )
  }
}
