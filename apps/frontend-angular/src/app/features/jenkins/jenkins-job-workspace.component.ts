import { DatePipe } from '@angular/common'
import { Component, Input, output } from '@angular/core'
import { MatTabsModule } from '@angular/material/tabs'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTableModule } from '@angular/material/table'
import { MatSelectModule } from '@angular/material/select'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { JenkinsPipelineStagesComponent } from './jenkins-pipeline-stages.component'
import { launchDetailKey } from './jenkins-launch-detail-panel.component'
import type { JenkinsAgent, JenkinsBuild, JenkinsInventory, JenkinsJob } from './jenkins.models'
import type { JenkinsLaunchDetailData } from './jenkins-launch-dialog.component'

@Component({
  selector: 'app-jenkins-job-workspace',
  standalone: true,
  imports: [
    DatePipe,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressBarModule,
    StatusBadgeComponent,
    JenkinsPipelineStagesComponent,
  ],
  template: `
    @if (!job) {
      <div class="workspace-empty">
        <mat-icon>work_outline</mat-icon>
        <h3>Selecciona un job</h3>
        <p>Elige un pipeline en el panel izquierdo para ver builds, consola, artefactos y parámetros.</p>
      </div>
    } @else {
      <header class="workspace-header">
        <div class="workspace-header__main">
          <mat-icon class="workspace-header__weather">{{ healthIcon(job.health) }}</mat-icon>
          <div>
            <p class="workspace-header__folder mono">{{ job.folder }}</p>
            <h2 class="workspace-header__title">{{ job.name }}</h2>
            <p class="workspace-header__desc">{{ job.description }}</p>
          </div>
        </div>
        <div class="workspace-header__actions">
          <button mat-flat-button color="primary" type="button" (click)="buildNow.emit(job)">
            <mat-icon>play_arrow</mat-icon>
            Build with Parameters
          </button>
          <button mat-stroked-button type="button" (click)="action.emit({ job, type: 'poll' })">
            <mat-icon>sync</mat-icon>
            Poll SCM
          </button>
          <button mat-stroked-button type="button" (click)="action.emit({ job, type: 'stop' })">
            <mat-icon>stop</mat-icon>
            Detener
          </button>
          <button mat-stroked-button type="button" (click)="action.emit({ job, type: 'replay' })">
            <mat-icon>replay</mat-icon>
            Replay
          </button>
        </div>
      </header>

      <div class="workspace-meta">
        <span><app-status-badge [value]="job.status" /></span>
        <span class="mono">#{{ job.buildNum }}</span>
        <span>{{ job.lastRun }}</span>
        <span>{{ job.duration }}</span>
        <span class="workspace-meta__type">{{ jobTypeLabel(job.type) }}</span>
      </div>

      @if (jobLaunch; as launch) {
        <div class="launch-banner" role="status">
          <div class="launch-banner__info">
            <app-status-badge [value]="launch.status" />
            <span class="launch-banner__title">
              Build <span class="mono">#{{ launch.buildNum }}</span> lanzado
            </span>
            <span class="launch-banner__meta">
              {{ launch.startedAt | date: 'dd MMM, HH:mm' }} · {{ launch.node }}
            </span>
          </div>
          <button
            mat-flat-button
            color="primary"
            type="button"
            (click)="openLaunchDetail.emit(launch)"
          >
            <mat-icon>info</mat-icon>
            Ver detalle del lanzamiento
          </button>
        </div>
      }

      <mat-tab-group
        class="workspace-tabs soft-tabs"
        [selectedIndex]="workspaceTab"
        (selectedIndexChange)="workspaceTabChange.emit($event)"
        animationDuration="200ms"
      >
        <mat-tab label="Resumen">
          <div class="workspace-panel">
            <div class="overview-grid">
              <section class="overview-card">
                <h4>SCM</h4>
                <dl>
                  <dt>Tipo</dt><dd>{{ job.scm.type }}</dd>
                  <dt>Repositorio</dt><dd class="mono">{{ job.scm.url }}</dd>
                  <dt>Rama</dt><dd class="mono">{{ job.scm.branch }}</dd>
                  <dt>Commit</dt><dd class="mono">{{ job.scm.commit }}</dd>
                  <dt>Autor</dt><dd>{{ job.scm.author }}</dd>
                </dl>
              </section>
              <section class="overview-card">
                <h4>Disparadores</h4>
                <ul>
                  @for (t of job.triggers; track t) {
                    <li>{{ t }}</li>
                  }
                </ul>
                <h4>Upstream / Downstream</h4>
                <p><strong>Upstream:</strong> {{ job.upstream.join(', ') || '—' }}</p>
                <p><strong>Downstream:</strong> {{ job.downstream.join(', ') || '—' }}</p>
              </section>
              <section class="overview-card overview-card--wide">
                <h4>Último pipeline</h4>
                <app-jenkins-pipeline-stages [stages]="job.stages" />
              </section>
            </div>
          </div>
        </mat-tab>

        <mat-tab label="Builds">
          <div class="workspace-panel">
            <table mat-table [dataSource]="jobBuilds()" class="premium-table">
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Estado</th>
                <td mat-cell *matCellDef="let row"><app-status-badge [value]="row.status" /></td>
              </ng-container>
              <ng-container matColumnDef="buildNum">
                <th mat-header-cell *matHeaderCellDef>#</th>
                <td mat-cell *matCellDef="let row" class="mono">{{ row.buildNum }}</td>
              </ng-container>
              <ng-container matColumnDef="branch">
                <th mat-header-cell *matHeaderCellDef>Rama</th>
                <td mat-cell *matCellDef="let row" class="mono">{{ row.branch }}</td>
              </ng-container>
              <ng-container matColumnDef="triggeredBy">
                <th mat-header-cell *matHeaderCellDef>Disparado por</th>
                <td mat-cell *matCellDef="let row">{{ row.triggeredBy }}</td>
              </ng-container>
              <ng-container matColumnDef="duration">
                <th mat-header-cell *matHeaderCellDef>Duración</th>
                <td mat-cell *matCellDef="let row">{{ row.duration }}</td>
              </ng-container>
              <ng-container matColumnDef="createdAt">
                <th mat-header-cell *matHeaderCellDef>Fecha</th>
                <td mat-cell *matCellDef="let row">{{ row.createdAt | date: 'short' }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="buildCols"></tr>
              <tr
                mat-row
                *matRowDef="let row; columns: buildCols"
                class="table-row-hover"
                (click)="buildSelect.emit(row)"
              ></tr>
            </table>
          </div>
        </mat-tab>

        <mat-tab label="Pipeline">
          <div class="workspace-panel">
            @if (selectedBuild; as build) {
              <p class="workspace-panel__lead">Build #{{ build.buildNum }} · {{ build.branch }}</p>
            }
            <app-jenkins-pipeline-stages [stages]="job.stages" />
          </div>
        </mat-tab>

        <mat-tab label="Lanzamientos">
          <div class="workspace-panel">
            @if (jobLaunches.length === 0) {
              <p class="workspace-panel__hint">
                Usa «Build with Parameters» para lanzar este job. El detalle se abrirá en una ventana emergente.
              </p>
            } @else {
              <ul class="launch-history">
                @for (launch of jobLaunches; track launchDetailKey(launch)) {
                  <li>
                    <button
                      type="button"
                      class="launch-history__row"
                      (click)="openLaunchDetail.emit(launch)"
                    >
                      <app-status-badge [value]="launch.status" />
                      <span class="mono">#{{ launch.buildNum }}</span>
                      <span>{{ launch.startedAt | date: 'medium' }}</span>
                      <span class="launch-history__by">{{ launch.triggeredBy }}</span>
                      <mat-icon>open_in_new</mat-icon>
                    </button>
                  </li>
                }
              </ul>
            }
          </div>
        </mat-tab>

        <mat-tab label="Consola">
          <div class="workspace-panel">
            <pre class="console mono">{{ consoleLog }}</pre>
          </div>
        </mat-tab>

        <mat-tab label="Parámetros">
          <div class="workspace-panel">
            <table class="params-table">
              <thead>
                <tr><th>Parámetro</th><th>Default</th><th>Descripción</th></tr>
              </thead>
              <tbody>
                @for (p of job.parameters; track p.key) {
                  <tr>
                    <td class="mono">{{ p.key }}</td>
                    <td class="mono">{{ p.default }}</td>
                    <td>{{ p.description }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </mat-tab>

        <mat-tab label="Artefactos">
          <div class="workspace-panel">
            @if (job.artifacts.length === 0) {
              <p class="workspace-panel__hint">Sin artefactos archivados en el último build.</p>
            } @else {
              <ul class="artifact-list">
                @for (a of job.artifacts; track a.name) {
                  <li>
                    <mat-icon>inventory_2</mat-icon>
                    <span class="artifact-list__name">{{ a.name }}</span>
                    <span class="artifact-list__size">{{ a.size }}</span>
                    <span class="mono artifact-list__path">{{ a.path }}</span>
                  </li>
                }
              </ul>
            }
          </div>
        </mat-tab>

        <mat-tab label="Tests">
          <div class="workspace-panel">
            <div class="test-summary">
              <div><strong>{{ job.tests.total }}</strong><span>Total</span></div>
              <div class="ok"><strong>{{ job.tests.passed }}</strong><span>Passed</span></div>
              <div class="fail"><strong>{{ job.tests.failed }}</strong><span>Failed</span></div>
              <div><strong>{{ job.tests.skipped }}</strong><span>Skipped</span></div>
              <div><strong>{{ job.tests.duration }}</strong><span>Duración</span></div>
            </div>
            @if (job.tests.total === 0) {
              <p class="workspace-panel__hint">Este job no publica resultados JUnit.</p>
            }
          </div>
        </mat-tab>

        <mat-tab label="Nodos">
          <div class="workspace-panel">
            <ul class="agent-list">
              @for (agent of agents; track agent.name) {
                <li>
                  <span class="agent-list__dot" [class]="agent.status"></span>
                  <strong>{{ agent.name }}</strong>
                  <span class="mono">{{ agent.labels.join(', ') }}</span>
                  @if (agent.currentJob) {
                    <small>{{ agent.currentJob }}</small>
                  } @else if (agent.idle) {
                    <small>Idle</small>
                  }
                </li>
              }
            </ul>
          </div>
        </mat-tab>
      </mat-tab-group>
    }
  `,
  styles: `
    .workspace-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 320px;
      text-align: center;
      color: var(--app-text-muted);
      mat-icon { font-size: 3rem; width: 3rem; height: 3rem; opacity: 0.4; }
      h3 { margin: 0.5rem 0 0.25rem; color: var(--app-text); }
    }
    .workspace-header {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text-muted) 12%, transparent);
    }
    .workspace-header__main { display: flex; gap: 1rem; align-items: flex-start; flex: 1; min-width: 240px; }
    .workspace-header__weather { font-size: 2rem; width: 2rem; height: 2rem; color: #eab308; }
    .workspace-header__folder { margin: 0; font-size: 0.72rem; color: var(--app-text-muted); }
    .workspace-header__title { margin: 0.15rem 0; font-size: 1.35rem; font-weight: 700; }
    .workspace-header__desc { margin: 0; font-size: 0.85rem; color: var(--app-text-muted); max-width: 520px; }
    .workspace-header__actions { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    .workspace-header__actions button mat-icon { margin-right: 0.2rem; }
    .workspace-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem 1.25rem;
      padding: 0.65rem 1.25rem;
      font-size: 0.85rem;
      align-items: center;
    }
    .workspace-meta__type {
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--jenkins-brand, #d33833);
    }
    .workspace-tabs { padding: 0 0.5rem 1rem; }
    .workspace-panel { padding: 1rem 0.75rem; }
    .workspace-panel__lead { margin: 0 0 1rem; font-size: 0.85rem; color: var(--app-text-muted); }
    .workspace-panel__hint { font-size: 0.875rem; color: var(--app-text-muted); }
    .overview-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .overview-card--wide { grid-column: 1 / -1; }
    @media (max-width: 800px) { .overview-grid { grid-template-columns: 1fr; } }
    .overview-card {
      padding: 1rem;
      border-radius: var(--app-radius-md);
      background: var(--app-elevated);
    }
    .overview-card h4 {
      margin: 0 0 0.65rem;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--app-text-muted);
    }
    .overview-card dl { display: grid; grid-template-columns: 100px 1fr; gap: 0.35rem; margin: 0; font-size: 0.85rem; }
    .overview-card dt { color: var(--app-text-muted); font-weight: 600; }
    .overview-card dd { margin: 0; }
    .overview-card ul { margin: 0; padding-left: 1.1rem; font-size: 0.85rem; }
    .overview-card p { margin: 0.35rem 0; font-size: 0.85rem; }
    .console {
      margin: 0;
      padding: 1rem;
      background: #1e293b;
      color: #e2e8f0;
      border-radius: var(--app-radius-md);
      font-size: 0.72rem;
      line-height: 1.45;
      max-height: 420px;
      overflow: auto;
      white-space: pre-wrap;
    }
    .params-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    .params-table th, .params-table td { padding: 0.5rem 0.75rem; text-align: left; border-bottom: 1px solid color-mix(in srgb, var(--app-text-muted) 12%, transparent); }
    .params-table th { font-size: 0.72rem; text-transform: uppercase; color: var(--app-text-muted); }
    .artifact-list { list-style: none; margin: 0; padding: 0; }
    .artifact-list li {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 0.35rem 0.75rem;
      align-items: center;
      padding: 0.65rem 0;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text-muted) 10%, transparent);
    }
    .artifact-list__name { font-weight: 600; }
    .artifact-list__size { color: var(--app-text-muted); font-size: 0.8rem; }
    .artifact-list__path { grid-column: 2 / -1; font-size: 0.75rem; color: var(--app-text-muted); }
    .test-summary {
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
    }
    .test-summary div { display: flex; flex-direction: column; }
    .test-summary strong { font-size: 1.5rem; }
    .test-summary span { font-size: 0.72rem; color: var(--app-text-muted); text-transform: uppercase; }
    .test-summary .ok strong { color: #22c55e; }
    .test-summary .fail strong { color: var(--status-error); }
    .agent-list { list-style: none; margin: 0; padding: 0; }
    .agent-list li {
      display: grid;
      grid-template-columns: auto 140px 1fr;
      gap: 0.5rem;
      align-items: center;
      padding: 0.5rem 0;
      font-size: 0.85rem;
    }
    .agent-list__dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #94a3b8;
    }
    .agent-list__dot.online { background: #22c55e; }
    .agent-list__dot.busy { background: var(--app-accent); }
    .agent-list__dot.offline { background: var(--status-error); }
    .launch-banner {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin: 0 1rem 0.75rem;
      padding: 0.65rem 0.85rem;
      border-radius: var(--app-radius-md);
      border: 1px solid color-mix(in srgb, #d33833 22%, transparent);
      background: color-mix(in srgb, #d33833 6%, var(--app-elevated));
    }
    .launch-banner__info {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem 0.75rem;
      min-width: 0;
    }
    .launch-banner__title { font-weight: 700; font-size: 0.88rem; }
    .launch-banner__meta { font-size: 0.75rem; color: var(--app-text-muted); }
    .launch-banner button mat-icon {
      margin-right: 0.25rem;
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
    }
    .launch-history {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .launch-history__row {
      display: grid;
      grid-template-columns: auto auto 1fr auto auto;
      gap: 0.65rem;
      align-items: center;
      width: 100%;
      padding: 0.55rem 0.5rem;
      margin-bottom: 0.3rem;
      border: none;
      border-radius: var(--app-radius-md);
      background: var(--app-elevated);
      cursor: pointer;
      text-align: left;
      font: inherit;
      color: inherit;
    }
    .launch-history__row:hover {
      background: color-mix(in srgb, #d33833 8%, var(--app-elevated));
    }
    .launch-history__by {
      font-size: 0.78rem;
      color: var(--app-text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .launch-history__row mat-icon {
      color: var(--app-text-muted);
      font-size: 1.1rem;
    }
    .mono { font-family: var(--app-font-mono, monospace); }
  `,
})
export class JenkinsJobWorkspaceComponent {
  @Input() job: JenkinsJob | null = null
  @Input() inventory!: JenkinsInventory
  @Input() agents: JenkinsAgent[] = []
  @Input() workspaceTab = 0
  @Input() selectedBuild: JenkinsBuild | null = null
  @Input() jobLaunches: JenkinsLaunchDetailData[] = []
  @Input() jobLaunch: JenkinsLaunchDetailData | null = null
  @Input() consoleLog = ''

  readonly buildNow = output<JenkinsJob>()
  readonly action = output<{ job: JenkinsJob; type: 'poll' | 'stop' | 'replay' }>()
  readonly workspaceTabChange = output<number>()
  readonly buildSelect = output<JenkinsBuild>()
  readonly openLaunchDetail = output<JenkinsLaunchDetailData>()

  readonly launchDetailKey = launchDetailKey

  readonly buildCols = ['status', 'buildNum', 'branch', 'triggeredBy', 'duration', 'createdAt']

  jobBuilds = (): JenkinsBuild[] =>
    this.inventory.builds.filter((b) => b.jobName === this.job?.name)

  healthIcon = (h: JenkinsJob['health']): string => {
    if (h === 'stormy') return 'thunderstorm'
    if (h === 'cloudy') return 'cloud'
    return 'wb_sunny'
  }

  jobTypeLabel = (t: JenkinsJob['type']): string => {
    if (t === 'pipeline') return 'Pipeline declarativo'
    if (t === 'multibranch') return 'Multibranch Pipeline'
    return 'Freestyle project'
  }
}
