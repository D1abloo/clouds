import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { toSignal } from '@angular/core/rxjs-interop'
import { startWith } from 'rxjs'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import { ToastService } from '../../core/services/toast.service'
import { DemoActionsService } from '../../core/services/demo-actions.service'
import { resolveReportCloud, cloudMeta } from '../../shared/platform/report-cloud.util'
import {
  REPORT_SCHEDULE_FREQUENCIES,
  REPORT_TYPE_ICONS,
  REPORT_TYPE_LABELS,
  type ReportScheduleFrequencyId,
} from './reports.config'
import {
  buildScheduleSummary,
  computeNextRuns,
  REPORT_TIMEZONES,
  REPORT_WEEKDAYS,
  type ReportScheduleForm,
} from './report-schedule.util'

export type ReportScheduleDialogData = {
  row?: Record<string, unknown>
}

@Component({
  selector: 'app-report-schedule-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    BrandLogoComponent,
  ],
  template: `
    <article class="rpt-sched">
      <header class="rpt-sched__head">
        <div class="rpt-sched__head-main">
          <span class="rpt-sched__icon" aria-hidden="true"><mat-icon>event_repeat</mat-icon></span>
          <div>
            <span class="rpt-sched__eyebrow">Informes · Automatización</span>
            <h2 mat-dialog-title>Programar informe automático</h2>
            <p>Define cada cuánto tiempo se generará y enviará el informe sin intervención manual.</p>
          </div>
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar programación">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <mat-dialog-content class="rpt-sched__body">
        <section class="rpt-sched__report">
          <app-brand-logo [logo]="cloud().logo" size="lg" />
          <div>
            <span class="rpt-sched__report-type">
              <mat-icon>{{ typeIcon() }}</mat-icon>
              {{ typeLabel() }}
            </span>
            <strong>{{ reportName() }}</strong>
            <span class="rpt-sched__report-meta">{{ cloud().shortLabel }} · Ref. {{ reportRef() }}</span>
          </div>
        </section>

        <form class="rpt-sched__form" [formGroup]="form">
          <fieldset class="rpt-sched__section">
            <legend><mat-icon>schedule</mat-icon> Frecuencia y horario</legend>
            <p class="rpt-sched__hint">El informe se generará de forma automática según la cadencia seleccionada.</p>

            <div class="rpt-sched__freq-grid">
              @for (f of frequencies; track f.id) {
                <button
                  type="button"
                  class="rpt-sched__freq"
                  [class.rpt-sched__freq--on]="formValue().frequency === f.id"
                  (click)="setFrequency(f.id)"
                >
                  <mat-icon>{{ f.icon }}</mat-icon>
                  <span>{{ f.label }}</span>
                </button>
              }
            </div>

            <div class="rpt-sched__row">
              <label class="rpt-sched__field">
                <span>Hora de ejecución</span>
                <input type="time" formControlName="time" />
              </label>
              <label class="rpt-sched__field">
                <span>Zona horaria</span>
                <select formControlName="timezone">
                  @for (tz of timezones; track tz) {
                    <option [value]="tz">{{ tz }}</option>
                  }
                </select>
              </label>
            </div>

            @if (formValue().frequency === 'weekly') {
              <label class="rpt-sched__field">
                <span>Día de la semana</span>
                <select formControlName="weekday">
                  @for (d of weekdays; track d.id) {
                    <option [value]="d.id">{{ d.label }}</option>
                  }
                </select>
              </label>
            }

            @if (formValue().frequency === 'monthly' || formValue().frequency === 'quarterly') {
              <label class="rpt-sched__field">
                <span>Día del mes</span>
                <select formControlName="monthDay">
                  @for (d of monthDays; track d) {
                    <option [value]="d">{{ d }}</option>
                  }
                </select>
              </label>
            }
          </fieldset>

          <fieldset class="rpt-sched__section">
            <legend><mat-icon>send</mat-icon> Entrega y destinatarios</legend>
            <div class="rpt-sched__row">
              <label class="rpt-sched__field">
                <span>Formato</span>
                <select formControlName="format">
                  <option value="pdf">PDF</option>
                  <option value="csv">CSV</option>
                  <option value="both">PDF + CSV</option>
                </select>
              </label>
              <label class="rpt-sched__field">
                <span>Canal</span>
                <select formControlName="channel">
                  <option value="email">Email</option>
                  <option value="slack">Slack</option>
                  <option value="both">Email + Slack</option>
                </select>
              </label>
              <label class="rpt-sched__field">
                <span>Retención (ejecuciones)</span>
                <select formControlName="retention">
                  @for (n of retentionOptions; track n) {
                    <option [value]="n">{{ n }}</option>
                  }
                </select>
              </label>
            </div>
            <label class="rpt-sched__field rpt-sched__field--full">
              <span>Destinatarios</span>
              <input
                type="text"
                formControlName="recipients"
                placeholder="finops@empresa.com, ops-leads@empresa.com"
              />
            </label>
          </fieldset>

          <section class="rpt-sched__preview">
            <h3><mat-icon>upcoming</mat-icon> Próximas ejecuciones</h3>
            <ul>
              @for (run of nextRuns(); track run) {
                <li>{{ run }}</li>
              }
            </ul>
          </section>

          <aside class="rpt-sched__summary">
            <mat-icon>info</mat-icon>
            <p>{{ summary() }}</p>
          </aside>

          <label class="rpt-sched__toggle">
            <mat-slide-toggle formControlName="enabled" color="primary" />
            <span>Activar programación al guardar</span>
          </label>
        </form>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="rpt-sched__actions">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button
          mat-flat-button
          type="button"
          color="primary"
          [disabled]="saving() || form.invalid"
          (click)="handleSave()"
        >
          <mat-icon>event_available</mat-icon>
          {{ saving() ? 'Guardando…' : 'Guardar programación' }}
        </button>
      </mat-dialog-actions>
    </article>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
    }
    .rpt-sched {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
      overflow: hidden;
      background: #fff;
      color: #0f172a;
    }
    .rpt-sched__head {
      flex-shrink: 0;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.85rem 0 0.75rem;
      border-bottom: 1px solid #e2e8f0;
    }
    .rpt-sched__head-main {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      min-width: 0;
    }
    .rpt-sched__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 10px;
      background: #f1f5f9;
      color: #334155;
      flex-shrink: 0;
    }
    .rpt-sched__eyebrow {
      display: block;
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #94a3b8;
      margin-bottom: 0.15rem;
    }
    h2[mat-dialog-title] {
      margin: 0 0 0.25rem;
      padding: 0;
      font-size: 1.05rem;
      font-weight: 700;
      line-height: 1.25;
    }
    .rpt-sched__head p {
      margin: 0;
      font-size: 0.72rem;
      color: #64748b;
      line-height: 1.45;
      max-width: 34rem;
    }
    .rpt-sched__body {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      scrollbar-width: thin;
      padding: 0.75rem 0 0.25rem !important;
    }
    .rpt-sched__report {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.65rem 0.75rem;
      margin-bottom: 0.85rem;
      border-radius: 10px;
      background: #f8fafc;
    }
    .rpt-sched__report-type {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
      margin-bottom: 0.15rem;
    }
    .rpt-sched__report-type mat-icon {
      font-size: 0.8rem;
      width: 0.8rem;
      height: 0.8rem;
    }
    .rpt-sched__report strong {
      display: block;
      font-size: 0.82rem;
      line-height: 1.35;
    }
    .rpt-sched__report-meta {
      display: block;
      font-size: 0.65rem;
      color: #64748b;
      margin-top: 0.1rem;
    }
    .rpt-sched__form {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .rpt-sched__section {
      margin: 0;
      padding: 0;
      border: none;
    }
    .rpt-sched__section legend {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.72rem;
      font-weight: 700;
      color: #334155;
      margin-bottom: 0.35rem;
    }
    .rpt-sched__section legend mat-icon {
      font-size: 0.95rem;
      width: 0.95rem;
      height: 0.95rem;
    }
    .rpt-sched__hint {
      margin: 0 0 0.55rem;
      font-size: 0.68rem;
      color: #64748b;
      line-height: 1.45;
    }
    .rpt-sched__freq-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 0.35rem;
      margin-bottom: 0.65rem;
    }
    .rpt-sched__freq {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.2rem;
      padding: 0.45rem 0.25rem;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #fff;
      font: inherit;
      font-size: 0.62rem;
      font-weight: 600;
      color: #475569;
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s;
    }
    .rpt-sched__freq mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }
    .rpt-sched__freq:hover { background: #f8fafc; }
    .rpt-sched__freq--on {
      border-color: #334155;
      background: #f1f5f9;
      color: #0f172a;
    }
    .rpt-sched__row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.5rem;
    }
    .rpt-sched__field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      margin-bottom: 0.5rem;
    }
    .rpt-sched__field--full { grid-column: 1 / -1; }
    .rpt-sched__field span {
      font-size: 0.62rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .rpt-sched__field input,
    .rpt-sched__field select {
      width: 100%;
      padding: 0.45rem 0.55rem;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font: inherit;
      font-size: 0.75rem;
      color: #0f172a;
      background: #fff;
    }
    .rpt-sched__preview {
      padding: 0.65rem 0.75rem;
      border-radius: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }
    .rpt-sched__preview h3 {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0 0 0.45rem;
      font-size: 0.72rem;
      font-weight: 700;
      color: #334155;
    }
    .rpt-sched__preview h3 mat-icon {
      font-size: 0.95rem;
      width: 0.95rem;
      height: 0.95rem;
    }
    .rpt-sched__preview ul {
      margin: 0;
      padding-left: 1.1rem;
      font-size: 0.72rem;
      color: #475569;
      line-height: 1.65;
    }
    .rpt-sched__summary {
      display: flex;
      gap: 0.5rem;
      align-items: flex-start;
      padding: 0.6rem 0.7rem;
      border-radius: 8px;
      background: #fff;
      border: 1px solid #cbd5e1;
    }
    .rpt-sched__summary mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: #64748b;
      flex-shrink: 0;
      margin-top: 0.1rem;
    }
    .rpt-sched__summary p {
      margin: 0;
      font-size: 0.72rem;
      line-height: 1.55;
      color: #334155;
    }
    .rpt-sched__toggle {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.72rem;
      font-weight: 600;
      color: #334155;
    }
    .rpt-sched__actions {
      flex-shrink: 0;
      border-top: 1px solid #e2e8f0;
      padding-top: 0.65rem;
    }
    @media (max-width: 720px) {
      .rpt-sched__freq-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .rpt-sched__row { grid-template-columns: 1fr; }
    }
  `,
})
export class ReportScheduleDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ReportScheduleDialogComponent>)
  private readonly fb = inject(FormBuilder)
  private readonly toast = inject(ToastService)
  private readonly demo = inject(DemoActionsService)
  readonly data = inject<ReportScheduleDialogData>(MAT_DIALOG_DATA)

  readonly frequencies = REPORT_SCHEDULE_FREQUENCIES
  readonly weekdays = REPORT_WEEKDAYS
  readonly timezones = REPORT_TIMEZONES
  readonly retentionOptions = [6, 12, 24, 36, 52]
  readonly monthDays = Array.from({ length: 28 }, (_, i) => String(i + 1))

  readonly saving = signal(false)

  readonly form = this.fb.nonNullable.group({
    frequency: ['monthly' as ReportScheduleFrequencyId, Validators.required],
    time: ['08:00', Validators.required],
    weekday: ['mon'],
    monthDay: ['1'],
    timezone: ['Europe/Madrid', Validators.required],
    format: ['pdf' as ReportScheduleForm['format'], Validators.required],
    channel: ['email' as ReportScheduleForm['channel'], Validators.required],
    recipients: ['finops@empresa.com, ops-leads@empresa.com', Validators.required],
    retention: [12, Validators.required],
    enabled: [true],
  })

  private readonly formTick = toSignal(this.form.valueChanges.pipe(startWith(null)), {
    initialValue: null,
  })

  formValue = computed((): ReportScheduleForm => {
    this.formTick()
    const v = this.form.getRawValue()
    return {
      frequency: v.frequency,
      time: v.time,
      weekday: v.weekday,
      monthDay: v.monthDay,
      timezone: v.timezone,
      format: v.format,
      channel: v.channel,
      recipients: v.recipients,
      retention: Number(v.retention),
      enabled: v.enabled,
    }
  })

  cloud = computed(() => cloudMeta(resolveReportCloud(this.data.row)))

  reportName = (): string =>
    String(this.data.row?.['name'] ?? 'Resumen ejecutivo de costes')

  reportRef = (): string => String(this.data.row?.['id'] ?? 'rpt-new')

  typeLabel = (): string => REPORT_TYPE_LABELS[String(this.data.row?.['type'] ?? 'cost')] ?? 'Informe'

  typeIcon = (): string => REPORT_TYPE_ICONS[String(this.data.row?.['type'] ?? 'cost')] ?? 'description'

  nextRuns = computed(() => computeNextRuns(this.formValue(), 3))

  summary = computed(() => buildScheduleSummary(this.formValue(), this.reportName()))

  setFrequency = (id: ReportScheduleFrequencyId): void => {
    this.form.patchValue({ frequency: id })
  }

  handleSave = (): void => {
    if (this.form.invalid) return
    this.saving.set(true)
    const label = `Programación · ${this.reportName()}`
    this.demo.simulate(label, 700, 'Programación guardada').subscribe({
      next: () => {
        this.saving.set(false)
        this.toast.success(
          this.formValue().enabled
            ? `Informe programado (${this.frequencies.find((f) => f.id === this.formValue().frequency)?.label})`
            : 'Programación guardada como borrador',
        )
        this.dialogRef.close(this.formValue())
      },
      error: () => {
        this.saving.set(false)
        this.toast.info('Programación guardada (demo)')
        this.dialogRef.close(this.formValue())
      },
    })
  }
}
