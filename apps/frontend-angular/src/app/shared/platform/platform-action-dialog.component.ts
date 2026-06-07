import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { ToastService } from '../../core/services/toast.service'
import { NavIconComponent } from '../components/nav-icon/nav-icon.component'
import {
  exportPlatformReportText,
  type PlatformActionReport,
  type PlatformArea,
  type PlatformOpSection,
  type PlatformOpStatus,
} from './platform-action-reports.util'

const statusLabel: Record<PlatformOpStatus, string> = { ok: 'Completado', warn: 'Atención', fail: 'Fallo' }
const statusIcon: Record<PlatformOpStatus, string> = { ok: 'check_circle', warn: 'warning', fail: 'error' }

const areaAccent: Record<PlatformArea, { accent: string; deep: string; label: string }> = {
  observability: { accent: '#10b981', deep: '#047857', label: 'Observabilidad' },
  security: { accent: '#ec4899', deep: '#be185d', label: 'Seguridad' },
  admin: { accent: '#64748b', deep: '#334155', label: 'Administración' },
}

@Component({
  selector: 'app-platform-action-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, NavIconComponent],
  template: `
    <div class="plat-op-dialog" [style.--accent]="accent().accent" [style.--accent-deep]="accent().deep">
      <header class="plat-op-dialog__hero">
        @if (data.primaryLogo) {
          <div class="plat-op-dialog__brand-logo">
            <app-nav-icon [logo]="data.primaryLogo" size="lg" />
          </div>
        } @else {
          <div class="plat-op-dialog__icon" [attr.data-status]="data.status">
            <mat-icon>{{ data.actionId === 'payload' || data.actionId === 'detail' ? 'data_object' : 'insights' }}</mat-icon>
          </div>
        }
        <div>
          <div class="plat-op-dialog__chips">
            <span class="chip">{{ accent().label }}</span>
            <span class="chip chip--muted">{{ data.moduleId }}</span>
          </div>
          <h2 mat-dialog-title>{{ data.title }}</h2>
          <p class="sub">{{ data.subtitle }}</p>
          @if (data.stackLabel) {
            <p class="stack-label">{{ data.stackLabel }}</p>
          }
          @if (data.resourceName) {
            <p class="resource mono">{{ data.resourceName }}</p>
          }
        </div>
        <span class="badge" [attr.data-status]="data.status">
          <mat-icon>{{ statusIcon[data.status] }}</mat-icon>
          {{ statusLabel[data.status] }}
        </span>
      </header>

      @if (data.integrationLogos?.length) {
        <div class="plat-op-dialog__integrations">
          <span class="plat-op-dialog__integrations-label">Integraciones</span>
          @for (logo of data.integrationLogos; track logo) {
            <span class="plat-op-dialog__integration-chip" [attr.title]="logo">
              <app-nav-icon [logo]="logo" size="sm" />
            </span>
          }
        </div>
      }

      <mat-dialog-content>
        @if (data.summary) {
          <p class="summary">{{ data.summary }}</p>
        }
        @if (data.alerts?.length) {
          <ul class="alerts">
            @for (a of data.alerts; track a.message) {
              <li [attr.data-severity]="a.severity">
                <mat-icon>{{ statusIcon[a.severity] }}</mat-icon>
                {{ a.message }}
              </li>
            }
          </ul>
        }
        @if (data.kpis.length) {
          <div class="kpi-row">
            @for (k of data.kpis; track k.label) {
              <article [attr.data-tone]="k.tone">
                @if (k.icon) { <mat-icon>{{ k.icon }}</mat-icon> }
                <div><span>{{ k.label }}</span><strong>{{ k.value }}</strong></div>
              </article>
            }
          </div>
        }
        @for (section of data.sections; track section.title) {
          <section class="panel">
            <header>
              @if (section.icon) { <mat-icon>{{ section.icon }}</mat-icon> }
              <h3>{{ section.title }}</h3>
            </header>
            <div class="panel__body">
              @if (section.items?.length) {
                <ul>@for (item of section.items; track item) { <li>{{ item }}</li> }</ul>
              }
              @if (section.table) {
                <div class="table-wrap">
                  <table>
                    <thead><tr>@for (h of section.table.headers; track h) { <th>{{ h }}</th> }</tr></thead>
                    <tbody>
                      @for (row of section.table.rows; track $index) {
                        <tr>@for (cell of row; track $index) { <td [class.mono]="cell.length > 20">{{ cell }}</td> }</tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
              @if (section.code) {
                <div class="terminal" [class.terminal--plain]="!isCodeBlock(section)">
                  @if (isCodeBlock(section)) {
                    <div class="terminal__bar"><span></span><span></span><span></span><em>{{ section.title }}</em></div>
                  }
                  <pre class="mono">{{ section.code }}</pre>
                </div>
              }
              @if (section.steps?.length) {
                <ol class="steps">
                  @for (step of section.steps; track step.label) {
                    <li [attr.data-status]="step.status">
                      <mat-icon>{{ statusIcon[step.status] }}</mat-icon>
                      <div><strong>{{ step.label }}</strong><span>{{ step.detail }}</span></div>
                      @if (step.durationMs) { <em class="mono">{{ formatMs(step.durationMs) }}</em> }
                    </li>
                  }
                </ol>
              }
            </div>
          </section>
        }
        @if (data.recommendations.length) {
          <section class="panel panel--rec">
            <header><mat-icon>lightbulb</mat-icon><h3>Recomendaciones</h3></header>
            <ul class="rec">@for (r of data.recommendations; track r) { <li>{{ r }}</li> }</ul>
          </section>
        }
        <footer class="meta">
          <span>Generado: {{ data.generatedAt }}</span>
          <span>· {{ data.durationSec }}s</span>
          @if (data.impact) { <span class="impact"><mat-icon>info</mat-icon>{{ data.impact }}</span> }
        </footer>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close type="button">Cerrar</button>
        <button mat-stroked-button type="button" (click)="handleExport()">
          <mat-icon>download</mat-icon> Exportar
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .plat-op-dialog__hero {
      display: grid; grid-template-columns: auto 1fr auto; gap: 0.75rem; align-items: start;
      padding-bottom: 0.75rem; margin-bottom: 0.25rem;
      border-bottom: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
      background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 6%, var(--app-card)), var(--app-card));
    }
    .plat-op-dialog__icon {
      width: 42px; height: 42px; border-radius: 10px; display: grid; place-items: center;
      background: color-mix(in srgb, var(--accent) 14%, transparent);
      border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent);
    }
    .plat-op-dialog__icon mat-icon { color: var(--accent-deep); }
    .plat-op-dialog__brand-logo {
      width: 48px; height: 48px; display: grid; place-items: center;
      border-radius: 12px; background: #fff;
      border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
      box-shadow: 0 1px 3px #00000012;
    }
    .stack-label { margin: 0.2rem 0 0; font-size: 0.65rem; color: var(--accent-deep); font-weight: 600; }
    .plat-op-dialog__integrations {
      display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem;
      padding: 0.45rem 0 0.55rem; margin-bottom: 0.35rem;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
    }
    .plat-op-dialog__integrations-label {
      font-size: 0.58rem; font-weight: 700; text-transform: uppercase;
      color: var(--app-text-muted); margin-right: 0.25rem;
    }
    .plat-op-dialog__integration-chip {
      display: inline-flex; align-items: center; justify-content: center;
      padding: 0.2rem 0.35rem; border-radius: 6px;
      background: color-mix(in srgb, var(--app-text) 4%, transparent);
      border: 1px solid color-mix(in srgb, var(--app-text) 8%, transparent);
    }
    .plat-op-dialog__chips { display: flex; gap: 0.3rem; margin-bottom: 0.2rem; }
    .chip { font-size: 0.58rem; font-weight: 700; text-transform: uppercase; padding: 0.1rem 0.4rem; border-radius: 999px; background: color-mix(in srgb, var(--accent) 12%, transparent); color: var(--accent-deep); }
    .chip--muted { background: color-mix(in srgb, var(--app-text) 6%, transparent); color: var(--app-text-muted); }
    h2[mat-dialog-title] { margin: 0; padding: 0; font-size: 1.02rem; font-weight: 850; }
    .sub { margin: 0.15rem 0 0; font-size: 0.72rem; color: var(--app-text-muted); }
    .resource { margin: 0.2rem 0 0; font-size: 0.68rem; color: var(--accent-deep); }
    .badge { display: inline-flex; align-items: center; gap: 0.2rem; padding: 0.25rem 0.5rem; border-radius: 999px; font-size: 0.62rem; font-weight: 700; }
    .badge mat-icon { width: 14px; height: 14px; font-size: 14px; }
    .badge[data-status='ok'] { background: color-mix(in srgb, #10b981 16%, transparent); color: #047857; }
    .badge[data-status='warn'] { background: color-mix(in srgb, #f59e0b 16%, transparent); color: #92400e; }
    .badge[data-status='fail'] { background: color-mix(in srgb, #ef4444 16%, transparent); color: #b91c1c; }
    .summary { margin: 0 0 0.6rem; padding: 0.5rem 0.6rem; border-radius: 8px; font-size: 0.72rem; border-left: 3px solid var(--accent); background: color-mix(in srgb, var(--accent) 5%, var(--app-card)); }
    .alerts { list-style: none; margin: 0 0 0.6rem; padding: 0; display: grid; gap: 0.3rem; }
    .alerts li { display: flex; gap: 0.35rem; align-items: flex-start; padding: 0.4rem 0.5rem; border-radius: 8px; font-size: 0.68rem; }
    .alerts li[data-severity='warn'] { background: color-mix(in srgb, #f59e0b 10%, transparent); color: #92400e; }
    .alerts li mat-icon { width: 16px; height: 16px; font-size: 16px; }
    .kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.4rem; margin-bottom: 0.65rem; }
    .kpi-row article { display: flex; gap: 0.35rem; padding: 0.45rem 0.5rem; border-radius: 8px; border: 1px solid color-mix(in srgb, var(--app-text) 8%, transparent); }
    .kpi-row article mat-icon { width: 16px; height: 16px; font-size: 16px; color: var(--accent-deep); }
    .kpi-row span { display: block; font-size: 0.55rem; text-transform: uppercase; color: var(--app-text-muted); }
    .kpi-row strong { display: block; font-size: 0.78rem; margin-top: 0.05rem; }
    .panel { margin-bottom: 0.65rem; border: 1px solid color-mix(in srgb, var(--app-text) 7%, transparent); border-radius: 10px; overflow: hidden; }
    .panel header { display: flex; align-items: center; gap: 0.3rem; padding: 0.4rem 0.55rem; background: color-mix(in srgb, var(--app-text) 4%, var(--app-card)); border-bottom: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent); }
    .panel header h3 { margin: 0; font-size: 0.72rem; font-weight: 750; }
    .panel header mat-icon { width: 16px; height: 16px; font-size: 16px; color: var(--accent-deep); }
    .panel__body { padding: 0.5rem 0.55rem; font-size: 0.68rem; }
    .panel__body ul { margin: 0; padding-left: 1.1rem; color: var(--app-text-muted); line-height: 1.45; }
    .table-wrap { overflow-x: auto; border-radius: 6px; border: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent); }
    .table-wrap table { width: 100%; border-collapse: collapse; font-size: 0.67rem; }
    .table-wrap th, .table-wrap td { padding: 0.35rem 0.45rem; text-align: left; border-bottom: 1px solid color-mix(in srgb, var(--app-text) 5%, transparent); }
    .table-wrap th { font-size: 0.58rem; text-transform: uppercase; color: var(--app-text-muted); }
    .terminal { border-radius: 8px; overflow: hidden; border: 1px solid #334155; }
    .terminal__bar { display: flex; align-items: center; gap: 0.3rem; padding: 0.3rem 0.5rem; background: #1e293b; border-bottom: 1px solid #334155; }
    .terminal__bar span { width: 8px; height: 8px; border-radius: 50%; }
    .terminal__bar span:nth-child(1) { background: #ef4444; }
    .terminal__bar span:nth-child(2) { background: #f59e0b; }
    .terminal__bar span:nth-child(3) { background: #22c55e; }
    .terminal__bar em { margin-left: auto; font-style: normal; font-size: 0.58rem; color: #94a3b8; }
    .terminal pre { margin: 0; padding: 0.6rem 0.7rem; max-height: 260px; overflow: auto; font-size: 0.63rem; line-height: 1.45; white-space: pre-wrap; background: #0f172a; color: #e2e8f0; }
    .terminal--plain pre { background: color-mix(in srgb, var(--app-text) 5%, var(--app-card)); color: inherit; }
    .steps { list-style: none; margin: 0; padding: 0; }
    .steps li { display: grid; grid-template-columns: auto 1fr auto; gap: 0.4rem; padding: 0.4rem 0; border-bottom: 1px solid color-mix(in srgb, var(--app-text) 5%, transparent); align-items: start; }
    .steps li mat-icon { width: 16px; height: 16px; font-size: 16px; }
    .steps li[data-status='ok'] mat-icon { color: #059669; }
    .steps li[data-status='warn'] mat-icon { color: #b45309; }
    .steps li[data-status='fail'] mat-icon { color: #dc2626; }
    .steps strong { display: block; font-size: 0.68rem; }
    .steps span { display: block; font-size: 0.62rem; color: var(--app-text-muted); }
    .steps em { font-style: normal; font-size: 0.58rem; color: var(--app-text-muted); }
    .panel--rec { border-color: color-mix(in srgb, #f59e0b 25%, transparent); }
    .rec { margin: 0; padding: 0.5rem 0.55rem 0.55rem 1.6rem; color: #92400e; font-size: 0.68rem; }
    .meta { display: flex; flex-wrap: wrap; gap: 0.35rem; font-size: 0.6rem; color: var(--app-text-muted); padding: 0.45rem 0; }
    .impact { display: flex; align-items: center; gap: 0.25rem; flex: 1 1 100%; }
    .impact mat-icon { width: 14px; height: 14px; font-size: 14px; color: var(--accent-deep); }
    .mono { font-family: ui-monospace, monospace; }
  `,
})
export class PlatformActionDialogComponent {
  readonly data = inject<PlatformActionReport>(MAT_DIALOG_DATA)
  private readonly toast = inject(ToastService)
  readonly statusIcon = statusIcon
  readonly statusLabel = statusLabel

  accent = () => areaAccent[this.data.area] ?? areaAccent.observability

  isCodeBlock = (s: PlatformOpSection): boolean => /payload|json|log|terminal|registro|metadatos|contexto|entrada/i.test(s.title)

  formatMs = (ms: number): string => (ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`)

  handleExport = (): void => {
    const text = exportPlatformReportText(this.data)
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${this.data.exportBase}.txt`
    a.click()
    URL.revokeObjectURL(url)
    this.toast.success(`Descargado · ${this.data.exportBase}.txt`)
  }
}
