import { DatePipe } from '@angular/common'
import { Component, Input, signal } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import type { JenkinsLaunchDetailData, JenkinsLaunchParams } from './jenkins-launch-dialog.component'

@Component({
  selector: 'app-jenkins-launch-detail-panel',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatIconModule, StatusBadgeComponent, BrandLogoComponent],
  template: `
    @if (data) {
      <div class="launch-detail">
        <div class="launch-detail__brand">
          <app-brand-logo logo="jenkins" size="lg" />
          <p class="launch-detail__context mono">{{ data.server }}</p>
        </div>
        <div class="launch-detail__chips">
          @if (data.params.dryRun) {
            <span class="launch-detail__tag launch-detail__tag--dry">Dry-run</span>
          }
          <span class="launch-detail__tag">{{ data.params.environment }}</span>
          <span class="launch-detail__tag">{{ priorityLabel(data.params.buildPriority) }}</span>
        </div>

        <div class="launch-detail__facts">
          @for (fact of facts(); track fact.label) {
            <div class="fact">
              <mat-icon>{{ fact.icon }}</mat-icon>
              <div>
                <span class="fact__lbl">{{ fact.label }}</span>
                <span class="fact__val" [class.mono]="fact.mono">{{ fact.value }}</span>
              </div>
            </div>
          }
        </div>

        <div class="launch-detail__grid">
          <section class="card">
            <header class="card__head">
              <mat-icon>flag</mat-icon>
              <h4>Causas del lanzamiento</h4>
            </header>
            <ul class="causes">
              @for (cause of data.causes; track cause) {
                <li>
                  <mat-icon>chevron_right</mat-icon>
                  {{ cause }}
                </li>
              }
            </ul>
          </section>

          <section class="card">
            <header class="card__head">
              <mat-icon>cloud_upload</mat-icon>
              <h4>Contexto de despliegue</h4>
            </header>
            <dl class="deploy-dl">
              <div><dt>Rama</dt><dd class="mono">{{ data.params.branch }}</dd></div>
              <div><dt>Revisión</dt><dd class="mono">{{ data.params.gitRevision }}</dd></div>
              <div><dt>Entorno</dt><dd>{{ data.params.environment }}</dd></div>
              <div><dt>Destino</dt><dd class="mono">{{ data.params.deployTarget }}</dd></div>
              <div><dt>Namespace</dt><dd class="mono">{{ data.params.namespace }}</dd></div>
              <div><dt>Helm / imagen</dt><dd class="mono">{{ data.params.helmChart }} · {{ data.params.dockerTag }}</dd></div>
              @if (data.params.changeTicket) {
                <div><dt>Ticket</dt><dd class="mono">{{ data.params.changeTicket }}</dd></div>
              }
            </dl>
          </section>
        </div>

        <section class="card">
          <header class="card__head">
            <mat-icon>tune</mat-icon>
            <h4>Parámetros enviados</h4>
            <span class="card__count">{{ data.parameters.length }}</span>
          </header>
          <div class="params-table-wrap">
            <table class="params-table">
              <thead>
                <tr>
                  <th scope="col">Parámetro</th>
                  <th scope="col">Valor</th>
                </tr>
              </thead>
              <tbody>
                @for (p of data.parameters; track p.key) {
                  <tr [class.params-table__highlight]="isHighlightParam(p.key)">
                    <td class="mono">{{ p.key }}</td>
                    <td class="mono">{{ p.value }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>

        <section class="card">
          <header class="card__head">
            <mat-icon>account_tree</mat-icon>
            <h4>Pipeline</h4>
            <span class="card__count">{{ data.stages.length }} etapas</span>
          </header>
          <ol class="stage-timeline">
            @for (stage of data.stages; track stage.name; let i = $index) {
              <li class="stage-timeline__item" [class]="'stage-timeline__item--' + stageTone(stage.status)">
                <span class="stage-timeline__idx">{{ i + 1 }}</span>
                <div class="stage-timeline__body">
                  <span class="stage-timeline__name">{{ stage.name }}</span>
                  @if (stage.duration) {
                    <span class="stage-timeline__dur">{{ stage.duration }}</span>
                  }
                </div>
                <app-status-badge [value]="stage.status" />
              </li>
            }
          </ol>
        </section>

        <section class="card card--console">
          <header class="card__head">
            <mat-icon>terminal</mat-icon>
            <h4>Consola y enlaces</h4>
            <div class="card__actions">
              <button mat-stroked-button type="button" (click)="handleCopyUrl()">
                <mat-icon>link</mat-icon>
                {{ copied() === 'url' ? 'Copiado' : 'URL build' }}
              </button>
              <button mat-stroked-button type="button" (click)="handleCopyLog()">
                <mat-icon>content_copy</mat-icon>
                {{ copied() === 'log' ? 'Copiado' : 'Log' }}
              </button>
            </div>
          </header>
          <a class="launch-detail__url mono" [href]="data.buildUrl" target="_blank" rel="noopener noreferrer">
            {{ data.buildUrl }}
          </a>
          <pre class="launch-detail__log mono">{{ data.logHead }}</pre>
          @if (data.params.description) {
            <p class="launch-detail__desc">
              <strong>Descripción:</strong> {{ data.params.description }}
            </p>
          }
        </section>
      </div>
    }
  `,
  styles: `
    .launch-detail {
      --ld: #d33833;
      --ld-soft: color-mix(in srgb, #d33833 10%, transparent);
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .launch-detail__brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .launch-detail__context {
      margin: 0;
      font-size: 0.75rem;
      color: var(--app-text-muted);
    }
    .launch-detail__chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 0.15rem;
    }
    .launch-detail__tag {
      font-size: 0.65rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.12rem 0.45rem;
      border-radius: 4px;
      background: var(--app-elevated);
      color: var(--app-text-muted);
    }
    .launch-detail__tag--dry {
      color: var(--app-text);
    }

    .launch-detail__facts {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 0.5rem;
    }
    @media (max-width: 800px) {
      .launch-detail__facts { grid-template-columns: repeat(2, 1fr); }
    }
    .fact {
      display: flex;
      gap: 0.5rem;
      align-items: flex-start;
      padding: 0.55rem 0.65rem;
      border-radius: var(--app-radius-md);
      background: var(--app-elevated);
    }
    .fact mat-icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
      color: var(--app-text-muted);
      margin-top: 0.1rem;
    }
    .fact__lbl {
      display: block;
      font-size: 0.62rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--app-text-muted);
    }
    .fact__val {
      display: block;
      font-size: 0.8rem;
      font-weight: 600;
      margin-top: 0.1rem;
    }

    .launch-detail__grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    @media (max-width: 720px) {
      .launch-detail__grid { grid-template-columns: 1fr; }
    }
    .card {
      padding: 0.85rem 0;
    }
    .card--console { background: color-mix(in srgb, #0f172a 4%, var(--app-elevated)); }
    .card__head {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-bottom: 0.65rem;
    }
    .card__head mat-icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
      color: var(--ld);
    }
    .card__head h4 {
      margin: 0;
      flex: 1;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--app-text-muted);
    }
    .card__count {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
      background: var(--ld-soft);
      color: var(--ld);
    }
    .card__actions {
      display: flex;
      gap: 0.35rem;
      margin-left: auto;
    }
    .card__actions button mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      margin-right: 0.2rem;
    }
    .causes {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .causes li {
      display: flex;
      align-items: flex-start;
      gap: 0.25rem;
      font-size: 0.8rem;
      padding: 0.2rem 0;
    }
    .causes mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: var(--ld);
      margin-top: 0.1rem;
    }
    .deploy-dl {
      margin: 0;
      display: grid;
      gap: 0.45rem;
    }
    .deploy-dl div {
      display: grid;
      grid-template-columns: 88px 1fr;
      gap: 0.5rem;
      font-size: 0.8rem;
    }
    .deploy-dl dt {
      color: var(--app-text-muted);
      font-weight: 600;
      font-size: 0.72rem;
    }
    .deploy-dl dd { margin: 0; word-break: break-word; }

    .params-table-wrap {
      max-height: 200px;
      overflow: auto;
      border-radius: var(--app-radius-md);
    }
    .params-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.78rem;
    }
    .params-table th {
      position: sticky;
      top: 0;
      text-align: left;
      padding: 0.4rem 0.6rem;
      font-size: 0.62rem;
      text-transform: uppercase;
      background: var(--app-card);
      color: var(--app-text-muted);
    }
    .params-table td {
      padding: 0.35rem 0.6rem;
    }
    .params-table__highlight td {
      background: color-mix(in srgb, var(--ld) 6%, transparent);
      font-weight: 600;
    }

    .stage-timeline {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .stage-timeline__item {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 0.65rem;
      align-items: center;
      padding: 0.45rem 0.55rem;
      border-radius: var(--app-radius-md);
      background: var(--app-elevated);
    }
    .stage-timeline__item--ok { background: color-mix(in srgb, #22c55e 8%, var(--app-elevated)); }
    .stage-timeline__item--run { background: color-mix(in srgb, #f59e0b 10%, var(--app-elevated)); }
    .stage-timeline__item--fail { background: color-mix(in srgb, #dc2626 8%, var(--app-elevated)); }
    .stage-timeline__item--skip { opacity: 0.85; }
    .stage-timeline__idx {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.65rem;
      font-weight: 700;
      background: var(--ld-soft);
      color: var(--ld);
    }
    .stage-timeline__name { display: block; font-size: 0.82rem; font-weight: 600; }
    .stage-timeline__dur {
      display: block;
      font-size: 0.68rem;
      color: var(--app-text-muted);
    }

    .launch-detail__url {
      display: block;
      margin-bottom: 0.5rem;
      font-size: 0.75rem;
      color: var(--ld);
      word-break: break-all;
    }
    .launch-detail__log {
      margin: 0;
      padding: 0.85rem 1rem;
      border-radius: var(--app-radius-md);
      background: #0f172a;
      color: #e2e8f0;
      font-size: 0.72rem;
      line-height: 1.45;
      max-height: 160px;
      overflow: auto;
      white-space: pre-wrap;
    }
    .launch-detail__desc {
      margin: 0.65rem 0 0;
      font-size: 0.8rem;
      color: var(--app-text-muted);
    }
    .mono { font-family: var(--app-font-mono, ui-monospace, monospace); }

    :host ::ng-deep .launch-detail .status-badge--running {
      background: var(--app-surface);
      box-shadow: var(--app-shadow-xs);
    }
  `,
})
export class JenkinsLaunchDetailPanelComponent {
  @Input({ required: true }) data!: JenkinsLaunchDetailData | null

  readonly copied = signal<'url' | 'log' | null>(null)

  facts = (): { label: string; value: string; icon: string; mono?: boolean }[] => {
    if (!this.data) return []
    const d = this.data
    return [
      { label: 'Inicio', value: new Date(d.startedAt).toLocaleString('es-ES'), icon: 'schedule' },
      { label: 'Duración est.', value: d.estimatedDuration, icon: 'timelapse' },
      { label: 'Cola', value: d.queueId, icon: 'hourglass_top', mono: true },
      { label: 'Agente', value: d.node, icon: 'dns' },
      { label: 'Executor', value: String(d.executor), icon: 'memory', mono: true },
    ]
  }

  priorityLabel = (p: JenkinsLaunchParams['buildPriority']): string => {
    const map = { low: 'Prioridad baja', normal: 'Prioridad normal', high: 'Prioridad alta' }
    return map[p]
  }

  isHighlightParam = (key: string): boolean =>
    ['ENVIRONMENT', 'DEPLOY_TARGET', 'BRANCH', 'DRY_RUN', 'CHANGE_TICKET'].includes(key)

  stageTone = (status: string): string => {
    if (status === 'SUCCESS') return 'ok'
    if (status === 'RUNNING') return 'run'
    if (status === 'FAILURE') return 'fail'
    if (status === 'SKIPPED') return 'skip'
    return 'default'
  }

  handleCopyUrl = (): void => {
    if (!this.data?.buildUrl) return
    void navigator.clipboard?.writeText(this.data.buildUrl)
    this.copied.set('url')
    setTimeout(() => this.copied.set(null), 2000)
  }

  handleCopyLog = (): void => {
    if (!this.data?.logHead) return
    void navigator.clipboard?.writeText(this.data.logHead)
    this.copied.set('log')
    setTimeout(() => this.copied.set(null), 2000)
  }
}

export const launchDetailKey = (d: JenkinsLaunchDetailData): string =>
  `${d.jobName}-${d.buildNum}-${d.startedAt}`
