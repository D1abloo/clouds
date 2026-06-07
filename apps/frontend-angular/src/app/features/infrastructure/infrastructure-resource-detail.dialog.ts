import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTabsModule } from '@angular/material/tabs'
import { MatTooltipModule } from '@angular/material/tooltip'
import type { NavLogoKey } from '../../shared/theme/nav-logo.types'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import { InfrastructureActionService } from './infrastructure-action.service'
import type { InfraOperation, InfraResourceRow } from './infrastructure-workspace.types'

export interface InfrastructureResourceDetailDialogData {
  row: InfraResourceRow
  moduleId: string
  tabId: string
  tabLabel: string
  logo?: NavLogoKey
  logos?: NavLogoKey[]
  initialTab?: number
}

@Component({
  selector: 'app-infrastructure-resource-detail-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatTabsModule, MatTooltipModule, BrandLogoComponent],
  template: `
    <div class="infra-res-dialog">
      <header class="infra-res-dialog__head">
        <div class="infra-res-dialog__title">
          @if (data.logos?.length) {
            <div class="infra-res-dialog__logos">
              @for (lg of data.logos; track lg) {
                <app-brand-logo [logo]="lg" size="md" />
              }
            </div>
          } @else if (data.logo) {
            <app-brand-logo [logo]="data.logo" size="lg" />
          } @else if (data.row.providerLogo) {
            <app-brand-logo [logo]="data.row.providerLogo" size="lg" />
          }
          <div>
            <p class="infra-res-dialog__eyebrow">{{ data.tabLabel }} · {{ data.moduleId }}</p>
            <h2 mat-dialog-title>{{ data.row.title }}</h2>
            @if (data.row.subtitle) {
              <span class="mono">{{ data.row.subtitle }}</span>
            }
          </div>
          <span class="infra-res-dialog__badge" [class]="statusClass()">{{ data.row.status }}</span>
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <mat-dialog-content>
        <mat-tab-group animationDuration="240ms" [selectedIndex]="tabIndex()" (selectedIndexChange)="tabIndex.set($event)">
          <mat-tab label="Detalle">
            <div class="infra-res-dialog__panel">
              <dl class="infra-res-dialog__dl">
                @for (field of data.row.fields; track field.label) {
                  <div>
                    <dt>{{ field.label }}</dt>
                    <dd [class.mono]="field.mono">{{ field.value }}</dd>
                  </div>
                }
                @if (data.row.sync) {
                  <div>
                    <dt>Sincronización</dt>
                    <dd>{{ data.row.sync }}</dd>
                  </div>
                }
              </dl>

              @if (data.row.metrics?.length) {
                <div class="infra-res-dialog__metrics">
                  @for (m of data.row.metrics; track m.label) {
                    <article>
                      <div class="infra-res-dialog__metric-head">
                        <span>{{ m.label }}</span>
                        <strong>{{ m.value }}%</strong>
                      </div>
                      <div class="infra-bar"><i [style.width.%]="m.value"></i></div>
                    </article>
                  }
                </div>
              }

              @if (data.row.tags?.length) {
                <div class="infra-res-dialog__tags">
                  @for (tag of data.row.tags; track tag) {
                    <span>{{ tag }}</span>
                  }
                </div>
              }

              @if (data.row.detail) {
                <p class="infra-res-dialog__detail">{{ data.row.detail }}</p>
              }
            </div>
          </mat-tab>

          <mat-tab label="Logs">
            <div class="infra-res-dialog__panel">
              <pre class="infra-res-dialog__logs mono">{{ data.row.logs ?? 'Sin logs disponibles.' }}</pre>
            </div>
          </mat-tab>

          <mat-tab label="Acciones">
            <div class="infra-res-dialog__panel infra-res-dialog__ops">
              @for (op of data.row.operations ?? []; track op.id) {
                <button
                  mat-stroked-button
                  type="button"
                  class="infra-res-dialog__op"
                  [class.infra-res-dialog__op--disabled]="op.disabled"
                  [disabled]="op.disabled"
                  [matTooltip]="op.disabledReason ?? ''"
                  [matTooltipDisabled]="!op.disabled"
                  (click)="handleOperation(op)"
                >
                  <mat-icon>{{ op.icon }}</mat-icon>
                  <span>
                    <strong>{{ op.label }}</strong>
                    <em>{{ op.description }}</em>
                  </span>
                </button>
              }
            </div>
          </mat-tab>
        </mat-tab-group>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cerrar</button>
        <button mat-flat-button color="primary" type="button" (click)="tabIndex.set(2)">
          <mat-icon>bolt</mat-icon>
          Operaciones
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .infra-res-dialog__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.5rem;
    }
    .infra-res-dialog__title {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 0.55rem;
    }
    .infra-res-dialog__logos {
      display: flex;
      gap: 0.25rem;
    }
    .infra-res-dialog__eyebrow {
      margin: 0;
      font-size: 0.62rem;
      font-weight: 750;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--app-text-muted);
    }
    h2[mat-dialog-title] {
      margin: 0.1rem 0 0;
      padding: 0;
      font-size: 1.05rem;
      font-weight: 850;
    }
    .infra-res-dialog__badge {
      font-size: 0.58rem;
      font-weight: 800;
      text-transform: uppercase;
      padding: 0.15rem 0.45rem;
      border-radius: 6px;
      background: color-mix(in srgb, var(--app-text) 6%, transparent);
    }
    .infra-res-dialog__badge.tone-ok {
      background: color-mix(in srgb, #10b981 14%, transparent);
      color: #059669;
    }
    .infra-res-dialog__badge.tone-warn {
      background: color-mix(in srgb, #f59e0b 14%, transparent);
      color: #b45309;
    }
    .infra-res-dialog__badge.tone-crit {
      background: color-mix(in srgb, #ef4444 14%, transparent);
      color: #dc2626;
    }
    .infra-res-dialog__panel {
      padding: 0.65rem 0 0.25rem;
    }
    .infra-res-dialog__dl {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.45rem 0.75rem;
      margin: 0 0 0.65rem;
    }
    .infra-res-dialog__dl dt {
      font-size: 0.58rem;
      font-weight: 750;
      text-transform: uppercase;
      color: var(--app-text-muted);
    }
    .infra-res-dialog__dl dd {
      margin: 0.08rem 0 0;
      font-size: 0.72rem;
      font-weight: 650;
    }
    .infra-res-dialog__metrics {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.45rem;
      margin-bottom: 0.55rem;
    }
    .infra-res-dialog__metric-head {
      display: flex;
      justify-content: space-between;
      font-size: 0.62rem;
      margin-bottom: 0.15rem;
    }
    .infra-bar {
      height: 5px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-text) 8%, transparent);
      overflow: hidden;
    }
    .infra-bar i {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--infra-accent, #ff9900), #ffb84d);
    }
    .infra-res-dialog__tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      margin-bottom: 0.5rem;
    }
    .infra-res-dialog__tags span {
      font-size: 0.58rem;
      font-weight: 700;
      padding: 0.1rem 0.35rem;
      border-radius: 5px;
      background: color-mix(in srgb, var(--infra-accent, #ff9900) 10%, transparent);
      color: var(--infra-accent-deep, #c2410c);
    }
    .infra-res-dialog__detail {
      margin: 0;
      padding: 0.55rem 0.6rem;
      border-radius: 8px;
      font-size: 0.72rem;
      line-height: 1.45;
      background: color-mix(in srgb, var(--app-surface) 30%, var(--app-card));
    }
    .infra-res-dialog__logs {
      margin: 0;
      padding: 0.65rem 0.75rem;
      border-radius: 10px;
      background: #0f172a;
      color: #e2e8f0;
      max-height: 360px;
      overflow: auto;
      font-size: 0.64rem;
      line-height: 1.5;
      border: 1px solid #334155;
    }
    .infra-res-dialog__ops {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }
    .infra-res-dialog__op {
      justify-content: flex-start !important;
      text-align: left;
      height: auto !important;
      padding: 0.55rem 0.65rem !important;
      border-radius: 10px !important;
      border-color: color-mix(in srgb, var(--infra-accent, #ff9900) 18%, transparent) !important;
    }
    .infra-res-dialog__op:hover:not(:disabled) {
      background: color-mix(in srgb, var(--infra-accent, #ff9900) 8%, var(--app-card)) !important;
    }
    .infra-res-dialog__op--disabled {
      opacity: 0.55;
    }
    .infra-res-dialog__op mat-icon {
      margin-right: 0.45rem;
      color: var(--infra-accent-deep, #c2410c);
    }
    .infra-res-dialog__op span {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.1rem;
    }
    .infra-res-dialog__op strong {
      font-size: 0.72rem;
    }
    .infra-res-dialog__op em {
      font-style: normal;
      font-size: 0.64rem;
      color: var(--app-text-muted);
      font-weight: 550;
    }
    .mono {
      font-family: ui-monospace, 'JetBrains Mono', monospace;
      font-size: 0.65rem;
    }
  `,
})
export class InfrastructureResourceDetailDialogComponent {
  readonly data = inject<InfrastructureResourceDetailDialogData>(MAT_DIALOG_DATA)
  private readonly infraActions = inject(InfrastructureActionService)

  readonly tabIndex = signal(this.data.initialTab ?? 0)

  statusClass = (): string => {
    const s = this.data.row.status.toLowerCase()
    if (s.includes('run') || s.includes('ok') || s.includes('activ') || s.includes('success')) return 'tone-ok'
    if (s.includes('warn') || s.includes('pend')) return 'tone-warn'
    if (s.includes('fail') || s.includes('error') || s.includes('stop')) return 'tone-crit'
    return ''
  }

  handleOperation = (op: InfraOperation): void => {
    this.infraActions.runRowOperation(op, this.data.row, {
      moduleId: this.data.moduleId,
      tabId: this.data.tabId,
      logo: this.data.logo,
      logos: this.data.logos,
    })
  }
}
