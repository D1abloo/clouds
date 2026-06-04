import { Component, Input, inject, output } from '@angular/core'
import { DatePipe } from '@angular/common'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTabsModule } from '@angular/material/tabs'
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import { DemoActionsService } from '../../../core/services/demo-actions.service'
import type { GitlabProject } from '../utils/gitlab-demo-catalog'
import { buildGitlabDrawerOverview } from '../utils/gitlab-drawer-demo.util'
import { CLIENT_DEMO_GITLAB_MRS, CLIENT_DEMO_GITLAB_PIPELINES } from '../utils/gitlab-demo-catalog'

@Component({
  selector: 'app-gitlab-project-detail-drawer',
  standalone: true,
  imports: [
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatProgressBarModule,
    StatusBadgeComponent,
  ],
  template: `
    @if (open && project) {
      <div class="drawer-backdrop animate-fade-in" (click)="close.emit()" role="presentation"></div>
      <aside class="gl-drawer animate-slide-in" role="dialog" aria-labelledby="gl-drawer-title">
        <header class="gl-drawer__head">
          <span class="gitlab-mark">GL</span>
          <div>
            <h2 id="gl-drawer-title">{{ project.fullPath }}</h2>
            <p>{{ project.description }}</p>
            <div class="badges">
              <span class="badge">{{ project.visibility }}</span>
              <span class="badge">{{ project.language }}</span>
              <span class="badge">Grupo: {{ project.group }}</span>
            </div>
            <p class="meta">Rama por defecto: <strong>{{ project.defaultBranch }}</strong></p>
            <p class="meta">Pipeline: <app-status-badge [value]="overview.pipelineBadge" /></p>
          </div>
          <button mat-icon-button type="button" aria-label="Cerrar" (click)="close.emit()">
            <mat-icon>close</mat-icon>
          </button>
        </header>

        <section class="metrics">
          @for (m of overview.metrics; track m.label) {
            <div class="metric"><mat-icon>{{ m.icon }}</mat-icon><strong>{{ m.value }}</strong><small>{{ m.label }}</small></div>
          }
        </section>

        <mat-progress-bar mode="determinate" [value]="overview.healthScore" />

        <mat-tab-group class="soft-tabs drawer-tabs" animationDuration="200ms">
          <mat-tab label="Resumen">
            <div class="panel">
              <p>Salud del proyecto: <strong>{{ overview.healthScore }}% — {{ overview.healthLabel }}</strong></p>
              <p>{{ overview.pipelineStatus }}</p>
              <div class="actions">
                <button mat-stroked-button type="button" (click)="sync.emit(project.id)"><mat-icon>sync</mat-icon> Sincronizar</button>
                <button mat-flat-button class="gl-btn" type="button" (click)="deploy.emit(project)"><mat-icon>rocket_launch</mat-icon> Desplegar proyecto</button>
              </div>
            </div>
          </mat-tab>
          <mat-tab label="Merge Requests">
            <div class="panel">
              @for (mr of projectMrs; track mr['id']) {
                <div class="line">!{{ mr['iid'] }} {{ mr['title'] }} <app-status-badge value="RUNNING" /></div>
              } @empty { <p class="muted">Sin MR en este proyecto</p> }
            </div>
          </mat-tab>
          <mat-tab label="Pipelines">
            <div class="panel">
              @for (p of overview.pipelines; track p.name) {
                <div class="line">{{ p.name }} — {{ p.duration }} <app-status-badge [value]="p.status === 'success' ? 'SUCCESS' : 'RUNNING'" /></div>
              }
            </div>
          </mat-tab>
          <mat-tab label="Runners">
            <div class="panel"><p class="muted">Runners compartidos: shared-runner-01, k8s-runner-02 (demo)</p></div>
          </mat-tab>
          <mat-tab label="Environments">
            <div class="panel"><p>production, staging (demo)</p></div>
          </mat-tab>
          <mat-tab label="Releases">
            <div class="panel"><p>Último tag: v2.4.0 (demo)</p></div>
          </mat-tab>
          <mat-tab label="Webhooks GitLab">
            <div class="panel">
              @for (wh of webhooks; track wh['id']) {
                <div class="line">{{ wh['event'] }} — {{ wh['url'] }}</div>
              }
            </div>
          </mat-tab>
          <mat-tab label="Actividad">
            <div class="panel">
              @for (a of overview.activity; track a.title) {
                <div class="line"><strong>{{ a.title }}</strong> — {{ a.detail }} <span class="muted">{{ a.when }}</span></div>
              }
            </div>
          </mat-tab>
        </mat-tab-group>
      </aside>
    }
  `,
  styles: `
    .drawer-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.45); z-index: 200; }
    .gl-drawer {
      position: fixed; top: 0; right: 0; bottom: 0; width: min(640px, 100vw); z-index: 201;
      background: var(--app-card); display: flex; flex-direction: column; overflow: hidden;
      box-shadow: var(--app-shadow-lg); border-left: 4px solid #fc6d26;
    }
    .gl-drawer__head { display: flex; gap: 0.75rem; padding: 1rem 1.2rem; border-bottom: 1px solid var(--app-border-subtle); }
    .gitlab-mark {
      width: 2.5rem; height: 2.5rem; border-radius: 8px; display: flex; align-items: center; justify-content: center;
      font-weight: 800; color: #fff; background: linear-gradient(135deg, #fc6d26, #6b4fbb); flex-shrink: 0;
    }
    h2 { margin: 0; font-size: 1rem; word-break: break-word; }
    p { margin: 0.25rem 0; font-size: 0.85rem; color: var(--app-text-muted); }
    .badges { display: flex; flex-wrap: wrap; gap: 0.35rem; margin: 0.35rem 0; }
    .badge { font-size: 0.68rem; padding: 0.15rem 0.45rem; border-radius: 999px; background: color-mix(in srgb, #fc6d26 15%, transparent); }
    .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.4rem; padding: 0.65rem 1.2rem; }
    .metric { text-align: center; font-size: 0.72rem; background: var(--app-elevated); padding: 0.45rem; border-radius: 6px; }
    .drawer-tabs { flex: 1; overflow: hidden; }
    .panel { padding: 1rem 1.2rem; overflow-y: auto; max-height: 50vh; font-size: 0.85rem; }
    .line { padding: 0.45rem 0; border-bottom: 1px solid var(--app-border-subtle); display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center; }
    .actions { display: flex; gap: 0.5rem; margin-top: 0.75rem; flex-wrap: wrap; }
    .gl-btn { background: #fc6d26 !important; color: #fff !important; }
    .muted { color: var(--app-text-muted); }
  `,
})
export class GitlabProjectDetailDrawerComponent {
  private readonly demo = inject(DemoActionsService)

  @Input() open = false
  @Input() project: GitlabProject | null = null
  @Input() webhooks: Record<string, unknown>[] = []

  readonly close = output<void>()
  readonly sync = output<string>()
  readonly deploy = output<GitlabProject>()

  get overview() {
    if (!this.project) return buildGitlabDrawerOverview(
      { id: '', name: '', fullPath: '', description: '', defaultBranch: 'main', language: '', visibility: '', group: '', stars: 0, forks: 0, updatedAt: '', isDemo: true },
      { mrs: 0, pipelines: 0, runners: 0, webhooks: 0 },
    )
    return buildGitlabDrawerOverview(this.project, {
      mrs: this.projectMrs.length,
      pipelines: 3,
      runners: 2,
      webhooks: this.webhooks.length,
    })
  }

  get projectMrs(): Record<string, unknown>[] {
    if (!this.project) return []
    return CLIENT_DEMO_GITLAB_MRS.filter((m) => m['projectPath'] === this.project!.fullPath)
  }
}
