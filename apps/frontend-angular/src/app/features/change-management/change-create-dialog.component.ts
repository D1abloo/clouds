import { DatePipe } from '@angular/common'
import { Component, computed, inject, OnInit, signal } from '@angular/core'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { CHANGE_RISK_LABELS, CHANGE_TYPE_LABELS } from './change-management.config'
import { CHANGE_FORM_DIALOG_STYLES } from './change-form-dialog.shared'
import type { ChangeRisk, ChangeTemplate, ChangeType, MaintenanceWindow } from './change-management.demo'
import type { CreateChangeInput } from './change-management.service'

export type ChangeCreateDialogResult = CreateChangeInput

export interface ChangeCreateDialogData {
  windows?: MaintenanceWindow[]
  templateId?: string
  template?: ChangeTemplate
}

type CreateStep = 'general' | 'schedule' | 'plans'

const CREATE_STEPS: { id: CreateStep; label: string; hint: string }[] = [
  { id: 'general', label: 'Datos generales', hint: 'Título, tipo y riesgo' },
  { id: 'schedule', label: 'Ventana', hint: 'Programación y MW' },
  { id: 'plans', label: 'Planes', hint: 'Alcance y rollback' },
]

const TYPE_ICONS: Record<ChangeType, string> = {
  standard: 'gavel',
  normal: 'sync_alt',
  emergency: 'bolt',
}

const RISK_ICONS: Record<ChangeRisk, string> = {
  critical: 'priority_high',
  high: 'warning',
  medium: 'tune',
  low: 'check_circle',
}

@Component({
  selector: 'app-change-create-dialog',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <div class="chg-form-dialog">
      <header class="chg-form-dialog__top">
        <div class="chg-form-dialog__brand">
          <span class="chg-form-dialog__glyph" aria-hidden="true">
            <mat-icon>note_add</mat-icon>
          </span>
          <div>
            <h2 mat-dialog-title>Nuevo cambio (RFC)</h2>
            <p>
              @if (data?.template) {
                Prefill desde plantilla «{{ data!.template!.name }}». Revisa cada paso antes de crear.
              } @else {
                Solicitud de cambio con ventana, alcance, planes de implementación y criterios de éxito.
              }
            </p>
          </div>
        </div>
        <div class="chg-form-dialog__progress" aria-live="polite">
          <span>Paso {{ stepIndex() + 1 }} de {{ steps.length }}</span>
          <strong>{{ currentStep().label }}</strong>
          <div class="chg-form-dialog__bar" role="progressbar" [attr.aria-valuenow]="progressPct()" aria-valuemin="0" aria-valuemax="100">
            <i [style.width.%]="progressPct()"></i>
          </div>
        </div>
      </header>

      <form [formGroup]="form" class="chg-form-dialog__shell" (ngSubmit)="handleSubmit()">
        <nav class="chg-form-dialog__nav" aria-label="Pasos del formulario">
          @for (s of steps; track s.id; let i = $index) {
            <button
              type="button"
              class="chg-form-dialog__nav-item"
              [class.chg-form-dialog__nav-item--on]="activeStep() === s.id"
              [class.chg-form-dialog__nav-item--done]="i < stepIndex()"
              (click)="goToStep(s.id)"
            >
              <span class="chg-form-dialog__nav-num">{{ i + 1 }}</span>
              <span class="chg-form-dialog__nav-text">
                <strong>{{ s.label }}</strong>
                <span>{{ s.hint }}</span>
              </span>
            </button>
          }
        </nav>

        <mat-dialog-content class="chg-form-dialog__body">
          @if (activeStep() === 'general') {
            <section class="chg-form-dialog__section">
              <header class="chg-form-dialog__section-head">
                <h3>Identificación del cambio</h3>
                <p>Define el título, servicio afectado, clasificación y nivel de riesgo operativo.</p>
              </header>

              <mat-form-field appearance="outline" class="chg-form-dialog__field" subscriptSizing="dynamic">
                <mat-label>Título del RFC</mat-label>
                <input matInput formControlName="title" placeholder="Ej. Terraform apply — VPC prod" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="chg-form-dialog__field" subscriptSizing="dynamic">
                <mat-label>Servicio principal</mat-label>
                <input matInput formControlName="service" placeholder="Ej. payments-api, db-primary" />
              </mat-form-field>

              <div class="chg-form-dialog__block">
                <span class="chg-form-dialog__label">Tipo de cambio</span>
                <div class="chg-form-dialog__chips" role="radiogroup" aria-label="Tipo de cambio">
                  @for (t of types; track t.id) {
                    <button
                      type="button"
                      class="chg-form-dialog__chip"
                      [class.chg-form-dialog__chip--on]="form.controls.type.value === t.id"
                      (click)="form.controls.type.setValue(t.id)"
                    >
                      <mat-icon>{{ typeIcons[t.id] }}</mat-icon>
                      {{ t.label }}
                    </button>
                  }
                </div>
              </div>

              <div class="chg-form-dialog__block">
                <span class="chg-form-dialog__label">Nivel de riesgo</span>
                <div class="chg-form-dialog__chips" role="radiogroup" aria-label="Nivel de riesgo">
                  @for (r of risks; track r.id) {
                    <button
                      type="button"
                      class="chg-form-dialog__chip"
                      [class.chg-form-dialog__chip--on]="form.controls.risk.value === r.id"
                      [attr.data-risk]="r.id"
                      (click)="form.controls.risk.setValue(r.id)"
                    >
                      <mat-icon>{{ riskIcons[r.id] }}</mat-icon>
                      {{ r.label }}
                    </button>
                  }
                </div>
              </div>
            </section>
          }

          @if (activeStep() === 'schedule') {
            <section class="chg-form-dialog__section">
              <header class="chg-form-dialog__section-head">
                <h3>Ventana de ejecución</h3>
                <p>Vincula a una ventana de mantenimiento existente o define fechas propias para el RFC.</p>
              </header>

              <mat-form-field appearance="outline" class="chg-form-dialog__field" subscriptSizing="dynamic">
                <mat-label>Ventana de mantenimiento</mat-label>
                <mat-select formControlName="maintenanceWindowId" (selectionChange)="handleMwChange($event.value)">
                  <mat-option value="">Sin ventana vinculada</mat-option>
                  @for (mw of windows; track mw.id) {
                    <mat-option [value]="mw.id">
                      <span class="chg-form-dialog__mw-option">
                        <strong>{{ mw.title }}</strong>
                        <span>{{ mw.environment }} · {{ mw.start | date: 'dd MMM HH:mm' }} – {{ mw.end | date: 'HH:mm' }}</span>
                      </span>
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>

              @if (selectedWindow(); as mw) {
                <div class="chg-form-dialog__card">
                  <strong>{{ mw.id }} · {{ mw.owner }}</strong>
                  <p>{{ mw.description }}</p>
                </div>
              }

              <div class="chg-form-dialog__row">
                <mat-form-field appearance="outline" class="chg-form-dialog__field" subscriptSizing="dynamic">
                  <mat-label>Inicio ventana</mat-label>
                  <input matInput type="datetime-local" formControlName="windowStart" />
                </mat-form-field>

                <mat-form-field appearance="outline" class="chg-form-dialog__field" subscriptSizing="dynamic">
                  <mat-label>Fin ventana</mat-label>
                  <input matInput type="datetime-local" formControlName="windowEnd" />
                </mat-form-field>
              </div>
            </section>
          }

          @if (activeStep() === 'plans') {
            <section class="chg-form-dialog__section">
              <header class="chg-form-dialog__section-head">
                <h3>Planes y criterios</h3>
                <p>Documenta alcance, pasos de implementación, rollback y validaciones post-cambio.</p>
              </header>

              <mat-form-field appearance="outline" class="chg-form-dialog__field" subscriptSizing="dynamic">
                <mat-label>Descripción</mat-label>
                <textarea matInput formControlName="description" rows="3" placeholder="Describe el cambio y su impacto…"></textarea>
              </mat-form-field>

              <mat-form-field appearance="outline" class="chg-form-dialog__field" subscriptSizing="dynamic">
                <mat-label>Alcance</mat-label>
                <textarea matInput formControlName="scope" rows="2" placeholder="Recursos, cuentas y servicios afectados…"></textarea>
              </mat-form-field>

              <mat-form-field appearance="outline" class="chg-form-dialog__field" subscriptSizing="dynamic">
                <mat-label>Plan de implementación</mat-label>
                <textarea matInput formControlName="implementationPlan" rows="3" placeholder="Pasos de ejecución…"></textarea>
              </mat-form-field>

              <div class="chg-form-dialog__row">
                <mat-form-field appearance="outline" class="chg-form-dialog__field" subscriptSizing="dynamic">
                  <mat-label>Plan de rollback</mat-label>
                  <textarea matInput formControlName="rollbackPlan" rows="3" placeholder="Procedimiento de reversión…"></textarea>
                </mat-form-field>

                <mat-form-field appearance="outline" class="chg-form-dialog__field" subscriptSizing="dynamic">
                  <mat-label>Criterios de éxito</mat-label>
                  <textarea matInput formControlName="successCriteria" rows="3" placeholder="Métricas y validaciones post-cambio…"></textarea>
                </mat-form-field>
              </div>
            </section>
          }
        </mat-dialog-content>

        <footer class="chg-form-dialog__foot">
          <span class="chg-form-dialog__foot-hint">
            @if (activeStep() === 'plans') {
              Revisa los planes antes de enviar a aprobación CAB.
            } @else {
              {{ stepHint() }}
            }
          </span>
          <div class="chg-form-dialog__foot-actions">
            <button type="button" mat-button (click)="handleCancel()">Cancelar</button>
            @if (stepIndex() > 0) {
              <button type="button" mat-stroked-button (click)="handleBack()">
                <mat-icon>arrow_back</mat-icon>
                Anterior
              </button>
            }
            @if (activeStep() !== 'plans') {
              <button type="button" mat-flat-button color="primary" [disabled]="!canAdvance()" (click)="handleNext()">
                Siguiente
                <mat-icon>arrow_forward</mat-icon>
              </button>
            } @else {
              <button type="submit" mat-flat-button color="primary" [disabled]="form.invalid">
                <mat-icon>check</mat-icon>
                Crear RFC
              </button>
            }
          </div>
        </footer>
      </form>
    </div>
  `,
  styles: [CHANGE_FORM_DIALOG_STYLES],
})
export class ChangeCreateDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<ChangeCreateDialogComponent, ChangeCreateDialogResult>)
  private readonly fb = inject(FormBuilder)
  readonly data = inject<ChangeCreateDialogData>(MAT_DIALOG_DATA, { optional: true })

  readonly steps = CREATE_STEPS
  readonly activeStep = signal<CreateStep>('general')
  readonly windows = this.data?.windows ?? []

  readonly typeIcons = TYPE_ICONS
  readonly riskIcons = RISK_ICONS

  readonly types = (Object.entries(CHANGE_TYPE_LABELS) as [ChangeType, string][]).map(([id, label]) => ({
    id,
    label,
  }))

  readonly risks = (Object.entries(CHANGE_RISK_LABELS) as [ChangeRisk, string][]).map(([id, label]) => ({
    id,
    label,
  }))

  readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    type: ['normal' as ChangeType, Validators.required],
    risk: ['medium' as ChangeRisk, Validators.required],
    service: ['', Validators.required],
    maintenanceWindowId: [''],
    windowStart: ['', Validators.required],
    windowEnd: ['', Validators.required],
    description: ['', Validators.required],
    scope: ['', Validators.required],
    implementationPlan: ['', Validators.required],
    rollbackPlan: ['', Validators.required],
    successCriteria: ['', Validators.required],
  })

  readonly stepIndex = computed(() => this.steps.findIndex((s) => s.id === this.activeStep()))
  readonly currentStep = computed(() => this.steps[this.stepIndex()] ?? this.steps[0])
  readonly progressPct = computed(() => Math.round(((this.stepIndex() + 1) / this.steps.length) * 100))

  readonly selectedWindow = computed(() => {
    const id = this.form.controls.maintenanceWindowId.value
    if (!id) return null
    return this.windows.find((w) => w.id === id) ?? null
  })

  ngOnInit(): void {
    const tpl = this.data?.template
    if (!tpl) return

    const start = new Date()
    start.setDate(start.getDate() + 2)
    start.setHours(2, 0, 0, 0)
    const end = new Date(start)
    end.setHours(5, 0, 0, 0)

    this.form.patchValue({
      title: tpl.name,
      type: tpl.type,
      risk: tpl.defaultRisk,
      service: tpl.services[0] ?? '',
      description: tpl.description,
      scope: tpl.scopeTemplate,
      implementationPlan: tpl.implementationTemplate,
      rollbackPlan: tpl.rollbackTemplate,
      successCriteria: tpl.successCriteriaTemplate,
      windowStart: this.toLocalDatetime(start),
      windowEnd: this.toLocalDatetime(end),
    })
  }

  stepHint = (): string => {
    const map: Record<CreateStep, string> = {
      general: 'Completa título, servicio, tipo y riesgo para continuar.',
      schedule: 'Define la ventana de ejecución o vincula una MW existente.',
      plans: '',
    }
    return map[this.activeStep()]
  }

  goToStep = (step: CreateStep): void => {
    const targetIdx = this.steps.findIndex((s) => s.id === step)
    if (targetIdx <= this.stepIndex() || this.canAdvance()) {
      this.activeStep.set(step)
    }
  }

  canAdvance = (): boolean => {
    const step = this.activeStep()
    if (step === 'general') {
      return this.form.controls.title.valid && this.form.controls.service.valid
    }
    if (step === 'schedule') {
      return this.form.controls.windowStart.valid && this.form.controls.windowEnd.valid
    }
    return true
  }

  handleNext = (): void => {
    if (!this.canAdvance()) return
    const idx = this.stepIndex()
    if (idx < this.steps.length - 1) {
      this.activeStep.set(this.steps[idx + 1].id)
    }
  }

  handleBack = (): void => {
    const idx = this.stepIndex()
    if (idx > 0) {
      this.activeStep.set(this.steps[idx - 1].id)
    }
  }

  handleMwChange = (windowId: string): void => {
    if (!windowId) return
    const mw = this.windows.find((w) => w.id === windowId)
    if (!mw) return
    this.form.patchValue({
      windowStart: this.toLocalDatetime(new Date(mw.start)),
      windowEnd: this.toLocalDatetime(new Date(mw.end)),
    })
  }

  handleSubmit = (): void => {
    if (this.form.invalid) return
    const v = this.form.getRawValue()
    this.dialogRef.close({
      title: v.title,
      type: v.type,
      risk: v.risk,
      service: v.service,
      description: v.description,
      scope: v.scope,
      implementationPlan: v.implementationPlan,
      rollbackPlan: v.rollbackPlan,
      successCriteria: v.successCriteria,
      windowStart: new Date(v.windowStart).toISOString(),
      windowEnd: new Date(v.windowEnd).toISOString(),
      maintenanceWindowId: v.maintenanceWindowId || undefined,
      templateId: this.data?.templateId ?? this.data?.template?.id,
    })
  }

  handleCancel = (): void => {
    this.dialogRef.close()
  }

  private toLocalDatetime = (d: Date): string => {
    const pad = (n: number): string => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
}
