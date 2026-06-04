import { Component, Input, output, signal, computed } from '@angular/core'
import { DatePipe } from '@angular/common'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTabsModule } from '@angular/material/tabs'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'

const DEPLOY_TABS = ['all', 'github', 'gitlab', 'jenkins', 'docker', 'kubernetes', 'failed', 'history'] as const

@Component({
  selector: 'app-deployments-global-section',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatIconModule, MatTabsModule, StatusBadgeComponent],
  template: `
    <div class="deploy-page">
      <div class="deploy-toolbar">
        <button mat-flat-button color="primary" type="button" (click)="newDeploy.emit()">
          <mat-icon>add</mat-icon> Nuevo despliegue
        </button>
      </div>

      <mat-tab-group class="soft-tabs" animationDuration="200ms" (selectedIndexChange)="tabIndex.set($event)">
        <mat-tab label="Resumen" />
        <mat-tab label="GitHub" />
        <mat-tab label="GitLab" />
        <mat-tab label="Jenkins" />
        <mat-tab label="Docker" />
        <mat-tab label="Kubernetes" />
        <mat-tab label="Fallidos" />
        <mat-tab label="Historial" />
      </mat-tab-group>

      @if (tabIndex() === 0) {
        <div class="summary-pipeline">
          @for (step of pipelineSteps; track step.label) {
            <div class="step" [class.done]="step.done">
              <mat-icon>{{ step.icon }}</mat-icon>
              <span>{{ step.label }}</span>
            </div>
          }
        </div>
      }

      <div class="deploy-list">
        @for (d of visibleDeploys(); track d['id']) {
          <div class="deploy-row">
            <div class="deploy-row__main">
              <strong>{{ sourceLabel(d) }}</strong>
              <span class="muted">{{ targetLine(d) }}</span>
              <app-status-badge [value]="statusBadge(d['status'])" />
            </div>
            <p class="muted">Rama {{ d['branch'] }} · {{ dateStr(d['createdAt']) | date: 'short' }}</p>
            <div class="deploy-row__actions">
              <button mat-button type="button" (click)="viewLogs.emit(d)">Ver logs</button>
              <button mat-button type="button" (click)="viewTarget.emit(d)">Ver destino</button>
              <button mat-button type="button" (click)="viewCommit.emit(d)">Ver commit</button>
              <button mat-button type="button" (click)="viewPipeline.emit(d)">Ver pipeline</button>
              @if (d['status'] === 'failed') {
                <button mat-stroked-button type="button" (click)="retry.emit(d)">Reintentar</button>
                <button mat-stroked-button type="button" (click)="rollback.emit(d)">Rollback demo</button>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .deploy-page { border-top: 3px solid #22c55e; }
    .deploy-toolbar { margin-bottom: 1rem; }
    .summary-pipeline {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      padding: 1rem 0;
    }
    .step {
      flex: 1;
      min-width: 100px;
      padding: 0.65rem;
      text-align: center;
      border-radius: var(--app-radius-sm);
      background: var(--app-elevated);
      font-size: 0.75rem;
      opacity: 0.7;
      mat-icon { display: block; margin: 0 auto 0.25rem; font-size: 1.25rem; }
    }
    .step.done { opacity: 1; border: 1px solid color-mix(in srgb, #22c55e 40%, transparent); }
    .deploy-list { display: flex; flex-direction: column; gap: 0.5rem; padding-bottom: 1rem; }
    .deploy-row {
      padding: 0.85rem 1rem;
      border-radius: var(--app-radius-sm);
      background: var(--app-card);
      box-shadow: var(--app-shadow-xs);
    }
    .deploy-row__main { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
    .deploy-row__actions { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.5rem; }
    .muted { font-size: 0.8rem; color: var(--app-text-muted); }
  `,
})
export class DeploymentsGlobalSectionComponent {
  @Input() deployments: Record<string, unknown>[] = []

  readonly tabIndex = signal(0)

  readonly pipelineSteps = [
    { label: 'Build', icon: 'build', done: true },
    { label: 'Test', icon: 'science', done: true },
    { label: 'Publish', icon: 'cloud_upload', done: true },
    { label: 'Deploy', icon: 'rocket_launch', done: false },
  ]

  readonly newDeploy = output<void>()
  readonly viewLogs = output<Record<string, unknown>>()
  readonly viewTarget = output<Record<string, unknown>>()
  readonly viewCommit = output<Record<string, unknown>>()
  readonly viewPipeline = output<Record<string, unknown>>()
  readonly retry = output<Record<string, unknown>>()
  readonly rollback = output<Record<string, unknown>>()

  visibleDeploys = computed(() => {
    const d = this.deployments
    const i = this.tabIndex()
    const key = DEPLOY_TABS[i] ?? 'all'
    if (key === 'all' || key === 'history') return d
    if (key === 'failed') return d.filter((x) => x['status'] === 'failed')
    if (key === 'github') return d.filter((x) => x['provider'] === 'github')
    if (key === 'gitlab') return d.filter((x) => x['provider'] === 'gitlab')
    if (key === 'jenkins') return d.filter((x) => x['provider'] === 'jenkins' || x['targetType'] === 'jenkins')
    if (key === 'docker') return d.filter((x) => x['targetType'] === 'docker')
    if (key === 'kubernetes') return d.filter((x) => x['targetType'] === 'kubernetes')
    return d
  })

  sourceLabel = (d: Record<string, unknown>): string =>
    String(d['repoFullName'] ?? d['projectPath'] ?? 'Despliegue')

  targetLine = (d: Record<string, unknown>): string =>
    `${d['targetName']} (${d['targetType']})`

  statusBadge = (s: unknown): string => {
    if (s === 'success') return 'SUCCESS'
    if (s === 'running') return 'RUNNING'
    return 'ERROR'
  }

  dateStr = (v: unknown): string => String(v ?? '')
}
