import { DatePipe } from '@angular/common'
import { Component, Input, computed, output } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import type { JenkinsBuild, JenkinsInventory, JenkinsJob } from './jenkins.models'

@Component({
  selector: 'app-jenkins-overview',
  standalone: true,
  imports: [
    DatePipe,
    MatIconModule,
    MatProgressBarModule,
    BrandLogoComponent,
    StatusBadgeComponent,
  ],
  template: `
    <section class="ops" aria-label="Centro de operaciones CI/CD">
      <header class="ops__head">
        <div class="ops__brand">
          <app-brand-logo logo="jenkins" size="md" />
          <div>
            <div class="ops__title-row">
              <h2>Centro de operaciones</h2>
              @if (inventory.buildsRunning > 0) {
                <span class="ops__live" role="status">
                  <span class="ops__live-dot"></span>
                  En vivo
                </span>
              }
            </div>
            <p class="ops__meta">
              {{ inventory.version }}
              · {{ inventory.serverCount }} controladores
              · {{ inventory.jobCount }} jobs
              @if (inventory.demoMode) {
                <span class="ops__demo">Demo</span>
              }
            </p>
          </div>
        </div>
      </header>

      <div class="ops__body">
        <section class="ops__main" aria-labelledby="ops-activity-title">
          <div class="ops__main-head">
            <h3 id="ops-activity-title">Actividad reciente</h3>
            @if (activityMix().total > 0) {
              <ul class="ops__mix" aria-label="Resumen de builds visibles">
                @if (activityMix().ok > 0) {
                  <li class="ops__mix-item ops__mix-item--ok">{{ activityMix().ok }} OK</li>
                }
                @if (activityMix().fail > 0) {
                  <li class="ops__mix-item ops__mix-item--fail">{{ activityMix().fail }} KO</li>
                }
                @if (activityMix().run > 0) {
                  <li class="ops__mix-item ops__mix-item--run">{{ activityMix().run }} activos</li>
                }
              </ul>
            }
          </div>
          @if (recentBuilds().length === 0) {
            <p class="ops__empty">No hay builds recientes.</p>
          } @else {
            <ul class="ops__feed">
              @for (b of recentBuilds(); track b.buildNum + b.jobName) {
                <li>
                  <button
                    type="button"
                    class="feed-row"
                    [class]="'feed-row feed-row--' + statusTone(b.status)"
                    (click)="buildSelect.emit(b)"
                    [attr.aria-label]="'Abrir ' + b.jobName + ' #' + b.buildNum"
                  >
                    <app-status-badge [value]="b.status" />
                    <span class="feed-row__job">{{ b.jobName }}</span>
                    <span class="mono feed-row__meta">#{{ b.buildNum }} · {{ b.branch }}</span>
                    <span class="feed-row__time">{{ b.createdAt | date: 'dd MMM, HH:mm' }}</span>
                    <span class="feed-row__dur">{{ b.duration }}</span>
                    <mat-icon>chevron_right</mat-icon>
                  </button>
                </li>
              }
            </ul>
          }
        </section>

        <aside class="ops__side" aria-label="Estado del clúster">
          @if (runningJobs().length > 0) {
            <div class="side-block">
              <h4>Ahora</h4>
              <ul class="side-list">
                @for (job of runningJobs(); track job.name) {
                  <li>
                    <button type="button" class="side-chip" (click)="jobSelect.emit(job)">
                      <mat-icon>play_arrow</mat-icon>
                      <span>{{ job.name }}</span>
                      <span class="mono">#{{ job.buildNum }}</span>
                    </button>
                  </li>
                }
              </ul>
            </div>
          }

          @if (inventory.queue.length > 0) {
            <div class="side-block">
              <h4>Cola <span class="side-count">{{ inventory.queue.length }}</span></h4>
              <ul class="side-list">
                @for (q of queuePreview(); track q.id) {
                  <li class="side-queue">
                    <strong>{{ q.jobName }}</strong>
                    <span class="mono">#{{ q.buildNum }}</span>
                    <small>{{ q.inQueueSince }}</small>
                  </li>
                }
              </ul>
            </div>
          }

          <div class="side-block side-block--capacity">
            <h4>Capacidad</h4>
            <div class="capacity-row">
              <span>Executors</span>
              <mat-progress-bar mode="determinate" [value]="executorPercent" />
              <span class="mono">{{ executorPercent }}%</span>
            </div>
            <div class="capacity-row">
              <span>Disco</span>
              <mat-progress-bar mode="determinate" [value]="inventory.diskUsagePercent" />
              <span class="mono">{{ inventory.diskUsagePercent }}%</span>
            </div>
            <p class="capacity-foot">
              <span class="capacity-foot--ok">{{ inventory.buildsSuccess }} OK</span>
              ·
              <span class="capacity-foot--fail">{{ inventory.buildsFailed }} KO</span>
              · {{ successRate() }}% éxito
            </p>
          </div>
        </aside>
      </div>
    </section>
  `,
  styles: `
    .ops {
      --ops: #d33833;
      --ops-soft: color-mix(in srgb, #d33833 11%, transparent);
      --ops-border: color-mix(in srgb, #d33833 18%, transparent);
      margin-bottom: 1rem;
      border-radius: var(--app-radius-lg);
      border: 1px solid var(--ops-border);
      background: var(--app-card);
      box-shadow: var(--app-shadow-sm);
      overflow: hidden;
    }
    .ops::before {
      content: '';
      display: block;
      height: 3px;
      background: linear-gradient(90deg, var(--ops), #ea580c);
    }
    .ops__head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.25rem;
    }
    .ops__brand {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }
    .ops__title-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .ops__brand h2 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .ops__live {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #16a34a;
    }
    .ops__live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #22c55e;
      animation: ops-pulse 1.6s ease-in-out infinite;
    }
    @keyframes ops-pulse {
      50% { opacity: 0.45; transform: scale(0.9); }
    }
    .ops__meta {
      margin: 0.2rem 0 0;
      font-size: 0.78rem;
      color: var(--app-text-muted);
    }
    .ops__demo {
      margin-left: 0.35rem;
      padding: 0.08rem 0.4rem;
      border-radius: 4px;
      font-size: 0.62rem;
      font-weight: 700;
      text-transform: uppercase;
      background: var(--ops-soft);
      color: var(--ops);
    }
    .ops__kpis {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
    }
    .kpi {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 72px;
      padding: 0.5rem 0.65rem;
      border-radius: var(--app-radius-md);
      background: var(--app-elevated);
      border: 1px solid color-mix(in srgb, var(--app-text-muted) 8%, transparent);
    }
    .kpi mat-icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
      color: var(--ops);
      margin-bottom: 0.15rem;
    }
    .kpi__val {
      font-size: 1.05rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      line-height: 1;
    }
    .kpi__lbl {
      margin-top: 0.15rem;
      font-size: 0.6rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--app-text-muted);
    }
    .kpi--active { border-color: color-mix(in srgb, #22c55e 30%, transparent); }
    .kpi--active .kpi__val { color: #16a34a; }
    .kpi--active mat-icon { color: #16a34a; }
    .kpi--warn .kpi__val { color: #d97706; }
    .kpi--warn mat-icon { color: #d97706; }
    .kpi--ok .kpi__val { color: #16a34a; }

    .ops__body {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(200px, 260px);
      gap: 0;
      border-top: 1px solid color-mix(in srgb, var(--app-text-muted) 8%, transparent);
    }
    @media (max-width: 860px) {
      .ops__body { grid-template-columns: 1fr; }
      .ops__side {
        border-top: 1px solid color-mix(in srgb, var(--app-text-muted) 8%, transparent);
        border-left: none !important;
      }
    }
    .ops__main {
      padding: 0.85rem 1.25rem 1rem;
      min-width: 0;
    }
    .ops__main-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 0.6rem;
    }
    .ops__main-head h3 {
      margin: 0;
      font-size: 0.82rem;
      font-weight: 700;
    }
    .ops__mix {
      display: flex;
      gap: 0.35rem;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .ops__mix-item {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 0.12rem 0.4rem;
      border-radius: 4px;
    }
    .ops__mix-item--ok { background: color-mix(in srgb, #22c55e 14%, transparent); color: #15803d; }
    .ops__mix-item--fail { background: color-mix(in srgb, #dc2626 12%, transparent); color: #b91c1c; }
    .ops__mix-item--run { background: color-mix(in srgb, #f59e0b 14%, transparent); color: #b45309; }
    .ops__empty {
      margin: 0;
      font-size: 0.8rem;
      color: var(--app-text-muted);
    }
    .ops__feed {
      list-style: none;
      margin: 0;
      padding: 0;
      max-height: 260px;
      overflow-y: auto;
    }
    .feed-row {
      display: grid;
      grid-template-columns: auto 1fr auto auto auto auto;
      gap: 0.45rem 0.6rem;
      align-items: center;
      width: 100%;
      padding: 0.5rem 0.55rem;
      margin-bottom: 0.25rem;
      border: none;
      border-left: 3px solid transparent;
      border-radius: var(--app-radius-md);
      background: var(--app-elevated);
      cursor: pointer;
      text-align: left;
      font: inherit;
      color: inherit;
      transition: background 0.12s ease, border-color 0.12s ease;
    }
    .feed-row:hover {
      background: var(--ops-soft);
      border-left-color: var(--ops);
    }
    .feed-row--ok { border-left-color: #22c55e; }
    .feed-row--fail { border-left-color: #dc2626; }
    .feed-row--run { border-left-color: #f59e0b; }
    .feed-row__job {
      font-size: 0.82rem;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .feed-row__meta, .feed-row__time, .feed-row__dur {
      font-size: 0.72rem;
      color: var(--app-text-muted);
      white-space: nowrap;
    }
    .feed-row mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: var(--app-text-muted);
    }

    .ops__side {
      padding: 0.85rem 1rem 1rem;
      border-left: 1px solid color-mix(in srgb, var(--app-text-muted) 8%, transparent);
      background: color-mix(in srgb, var(--app-elevated) 40%, var(--app-card));
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .side-block h4 {
      margin: 0 0 0.45rem;
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--app-text-muted);
    }
    .side-count {
      color: var(--ops);
      font-variant-numeric: tabular-nums;
    }
    .side-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .side-chip {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      width: 100%;
      padding: 0.35rem 0.45rem;
      margin-bottom: 0.25rem;
      border: 1px solid var(--ops-border);
      border-radius: var(--app-radius-md);
      background: var(--app-card);
      font: inherit;
      font-size: 0.75rem;
      cursor: pointer;
      color: inherit;
      text-align: left;
    }
    .side-chip:hover { background: var(--ops-soft); }
    .side-chip mat-icon {
      font-size: 0.95rem;
      width: 0.95rem;
      height: 0.95rem;
      color: var(--ops);
    }
    .side-chip span:first-of-type {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 600;
    }
    .side-queue {
      padding: 0.35rem 0;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text-muted) 6%, transparent);
      font-size: 0.75rem;
    }
    .side-queue:last-child { border-bottom: none; }
    .side-queue strong { display: block; font-size: 0.78rem; }
    .side-queue small {
      display: block;
      color: var(--app-text-muted);
      font-size: 0.68rem;
    }
    .capacity-row {
      display: grid;
      grid-template-columns: 58px 1fr 36px;
      gap: 0.4rem;
      align-items: center;
      margin-bottom: 0.45rem;
      font-size: 0.72rem;
      color: var(--app-text-muted);
    }
    .capacity-row mat-progress-bar { height: 5px; border-radius: 999px; }
    .capacity-foot {
      margin: 0.35rem 0 0;
      font-size: 0.72rem;
      color: var(--app-text-muted);
    }
    .capacity-foot--ok { color: #16a34a; font-weight: 600; }
    .capacity-foot--fail { color: #dc2626; font-weight: 600; }
    .mono { font-family: var(--app-font-mono, ui-monospace, monospace); }
    @media (max-width: 720px) {
      .feed-row {
        grid-template-columns: auto 1fr auto auto;
      }
      .feed-row__meta, .feed-row__dur { display: none; }
    }
  `,
})
export class JenkinsOverviewComponent {
  @Input({ required: true }) inventory!: JenkinsInventory
  @Input() executorPercent = 0

  readonly buildSelect = output<JenkinsBuild>()
  readonly jobSelect = output<JenkinsJob>()

  recentBuilds = computed(() => this.inventory.builds.slice(0, 10))

  runningJobs = computed(() =>
    this.inventory.jobItems
      .filter((j) => j.status === 'RUNNING' || j.status === 'PENDING')
      .slice(0, 3),
  )

  queuePreview = computed(() => this.inventory.queue.slice(0, 3))

  activityMix = computed(() => {
    const builds = this.recentBuilds()
    let ok = 0
    let fail = 0
    let run = 0
    for (const b of builds) {
      if (b.status === 'SUCCESS') ok++
      else if (b.status === 'FAILURE' || b.status === 'UNSTABLE') fail++
      else if (b.status === 'RUNNING' || b.status === 'PENDING') run++
    }
    return { ok, fail, run, total: builds.length }
  })

  statusTone = (status: string): string => {
    if (status === 'SUCCESS') return 'ok'
    if (status === 'FAILURE' || status === 'UNSTABLE') return 'fail'
    if (status === 'RUNNING' || status === 'PENDING') return 'run'
    return 'default'
  }

  successRate = (): number => {
    const { buildsSuccess, buildsFailed } = this.inventory
    const total = buildsSuccess + buildsFailed
    if (total === 0) return 0
    return Math.round((buildsSuccess / total) * 100)
  }
}
