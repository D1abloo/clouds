import { Component, computed, inject, signal } from '@angular/core'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { CHANGE_FORM_DIALOG_STYLES } from './change-form-dialog.shared'
import type { MaintenanceWindow } from './change-management.data'

export type MaintenanceWindowDialogResult = Omit<
  MaintenanceWindow,
  'id' | 'changesCount' | 'status' | 'linkedChangeIds'
>

const linesToArray = (text: string): string[] =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

type MwStep = 'identity' | 'schedule' | 'checks' | 'policy'

const MW_STEPS: { id: MwStep; label: string; hint: string }[] = [
  { id: 'identity', label: 'Identidad', hint: 'Título y alcance' },
  { id: 'schedule', label: 'Programación', hint: 'Equipo y horario' },
  { id: 'checks', label: 'Checks', hint: 'Pre/post y avisos' },
  { id: 'policy', label: 'Políticas', hint: 'Blackout y rollback' },
]

@Component({
  selector: 'app-change-maintenance-window-dialog',
  standalone: true,
  imports: [
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
          <span class="chg-form-dialog__glyph chg-form-dialog__glyph--mw" aria-hidden="true">
            <mat-icon>event_available</mat-icon>
          </span>
          <div>
            <h2 mat-dialog-title>Ventana de mantenimiento</h2>
            <p>Programa una ventana con alcance, checks operativos, canales de aviso y políticas de rollback.</p>
          </div>
        </div>
        <div class="chg-form-dialog__progress" aria-live="polite">
          <span>Paso {{ stepIndex() + 1 }} de {{ steps.length }}</span>
          <strong>{{ currentStep().label }}</strong>
          <div class="chg-form-dialog__bar chg-form-dialog__bar--mw" role="progressbar" [attr.aria-valuenow]="progressPct()" aria-valuemin="0" aria-valuemax="100">
            <i [style.width.%]="progressPct()"></i>
          </div>
        </div>
      </header>

      <form [formGroup]="form" class="chg-form-dialog__shell" (ngSubmit)="handleSubmit()">
        <nav class="chg-form-dialog__nav" aria-label="Pasos del formulario">
          @for (s of steps; track s.id; let i = $index) {
            <button
              type="button"
              class="chg-form-dialog__nav-item chg-form-dialog__nav-item--mw"
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
          @if (activeStep() === 'identity') {
            <section class="chg-form-dialog__section">
              <header class="chg-form-dialog__section-head">
                <h3>Identidad de la ventana</h3>
                <p>Nombre, descripción, entorno y alcance de recursos afectados.</p>
              </header>

              <mat-form-field appearance="outline" class="chg-form-dialog__field" subscriptSizing="dynamic">
                <mat-label>Título</mat-label>
                <input matInput formControlName="title" placeholder="Ej. Ventana semanal — producción" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="chg-form-dialog__field" subscriptSizing="dynamic">
                <mat-label>Descripción</mat-label>
                <textarea matInput formControlName="description" rows="3" placeholder="Propósito de la ventana y tipo de cambios permitidos…"></textarea>
              </mat-form-field>

              <mat-form-field appearance="outline" class="chg-form-dialog__field" subscriptSizing="dynamic">
                <mat-label>Entorno</mat-label>
                <mat-select formControlName="environment">
                  @for (env of environments; track env) {
                    <mat-option [value]="env">{{ env }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="chg-form-dialog__field" subscriptSizing="dynamic">
                <mat-label>Alcance</mat-label>
                <textarea matInput formControlName="scope" rows="3" placeholder="Cuentas, servicios y recursos en alcance…"></textarea>
              </mat-form-field>
            </section>
          }

          @if (activeStep() === 'schedule') {
            <section class="chg-form-dialog__section">
              <header class="chg-form-dialog__section-head">
                <h3>Equipo y horario</h3>
                <p>Responsables, zona horaria, recurrencia y franja de ejecución.</p>
              </header>

              <div class="chg-form-dialog__row">
                <mat-form-field appearance="outline" class="chg-form-dialog__field" subscriptSizing="dynamic">
                  <mat-label>Responsable</mat-label>
                  <input matInput formControlName="owner" placeholder="Ej. SRE Team" />
                </mat-form-field>

                <mat-form-field appearance="outline" class="chg-form-dialog__field" subscriptSizing="dynamic">
                  <mat-label>Contacto</mat-label>
                  <input matInput formControlName="ownerContact" placeholder="email@empresa.io · Slack #canal" />
                </mat-form-field>
              </div>

              <div class="chg-form-dialog__row">
                <mat-form-field appearance="outline" class="chg-form-dialog__field" subscriptSizing="dynamic">
                  <mat-label>Zona horaria</mat-label>
                  <input matInput formControlName="timezone" placeholder="Europe/Madrid (UTC+2)" />
                </mat-form-field>

                <mat-form-field appearance="outline" class="chg-form-dialog__field" subscriptSizing="dynamic">
                  <mat-label>Recurrencia (opcional)</mat-label>
                  <input matInput formControlName="recurrence" placeholder="Semanal · domingo 02:00–05:00" />
                </mat-form-field>
              </div>

              <div class="chg-form-dialog__card">
                <strong>Franja de ejecución</strong>
                <p>Define inicio y fin. Los RFCs vinculados heredarán estas fechas automáticamente.</p>
              </div>

              <div class="chg-form-dialog__row">
                <mat-form-field appearance="outline" class="chg-form-dialog__field" subscriptSizing="dynamic">
                  <mat-label>Inicio</mat-label>
                  <input matInput type="datetime-local" formControlName="start" />
                </mat-form-field>

                <mat-form-field appearance="outline" class="chg-form-dialog__field" subscriptSizing="dynamic">
                  <mat-label>Fin</mat-label>
                  <input matInput type="datetime-local" formControlName="end" />
                </mat-form-field>
              </div>
            </section>
          }

          @if (activeStep() === 'checks') {
            <section class="chg-form-dialog__section">
              <header class="chg-form-dialog__section-head">
                <h3>Checks y notificaciones</h3>
                <p>Validaciones pre/post ventana y canales donde se comunicará el estado.</p>
              </header>

              <div class="chg-form-dialog__row">
                <mat-form-field appearance="outline" class="chg-form-dialog__field" subscriptSizing="dynamic">
                  <mat-label>Checks pre-ventana</mat-label>
                  <textarea matInput formControlName="preChecks" rows="4" placeholder="Uno por línea&#10;Confirmar backups…"></textarea>
                </mat-form-field>

                <mat-form-field appearance="outline" class="chg-form-dialog__field" subscriptSizing="dynamic">
                  <mat-label>Checks post-ventana</mat-label>
                  <textarea matInput formControlName="postChecks" rows="4" placeholder="Uno por línea&#10;Smoke tests…"></textarea>
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline" class="chg-form-dialog__field" subscriptSizing="dynamic">
                <mat-label>Canales de notificación</mat-label>
                <textarea matInput formControlName="notificationChannels" rows="3" placeholder="Uno por línea&#10;Slack #changes-prod&#10;PagerDuty — platform-oncall"></textarea>
              </mat-form-field>
            </section>
          }

          @if (activeStep() === 'policy') {
            <section class="chg-form-dialog__section">
              <header class="chg-form-dialog__section-head">
                <h3>Políticas operativas</h3>
                <p>Restricciones de blackout y procedimiento de rollback ante incidencias.</p>
              </header>

              <mat-form-field appearance="outline" class="chg-form-dialog__field" subscriptSizing="dynamic">
                <mat-label>Reglas de blackout</mat-label>
                <textarea matInput formControlName="blackoutRules" rows="3" placeholder="Restricciones, freezes y ventanas prohibidas…"></textarea>
              </mat-form-field>

              <mat-form-field appearance="outline" class="chg-form-dialog__field" subscriptSizing="dynamic">
                <mat-label>Política de rollback</mat-label>
                <textarea matInput formControlName="rollbackPolicy" rows="3" placeholder="Condiciones, responsables y procedimiento de reversión…"></textarea>
              </mat-form-field>
            </section>
          }
        </mat-dialog-content>

        <footer class="chg-form-dialog__foot">
          <span class="chg-form-dialog__foot-hint">{{ stepHint() }}</span>
          <div class="chg-form-dialog__foot-actions">
            <button type="button" mat-button (click)="handleCancel()">Cancelar</button>
            @if (stepIndex() > 0) {
              <button type="button" mat-stroked-button (click)="handleBack()">
                <mat-icon>arrow_back</mat-icon>
                Anterior
              </button>
            }
            @if (activeStep() !== 'policy') {
              <button type="button" mat-flat-button color="primary" [disabled]="!canAdvance()" (click)="handleNext()">
                Siguiente
                <mat-icon>arrow_forward</mat-icon>
              </button>
            } @else {
              <button type="submit" mat-flat-button color="primary" [disabled]="form.invalid">
                <mat-icon>event</mat-icon>
                Programar ventana
              </button>
            }
          </div>
        </footer>
      </form>
    </div>
  `,
  styles: [
    CHANGE_FORM_DIALOG_STYLES,
    `
      .chg-form-dialog__nav-item--mw.chg-form-dialog__nav-item--on {
        background: color-mix(in srgb, #14b8a6 8%, #f8fafc);
        border-color: color-mix(in srgb, #14b8a6 28%, #e2e8f0);
      }
    `,
  ],
})
export class ChangeMaintenanceWindowDialogComponent {
  private readonly dialogRef = inject(
    MatDialogRef<ChangeMaintenanceWindowDialogComponent, MaintenanceWindowDialogResult>,
  )
  private readonly fb = inject(FormBuilder)

  readonly steps = MW_STEPS
  readonly activeStep = signal<MwStep>('identity')
  readonly environments = ['Producción', 'Staging', 'Development']

  readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: ['', Validators.required],
    environment: ['Producción', Validators.required],
    owner: ['', Validators.required],
    ownerContact: ['', Validators.required],
    timezone: ['Europe/Madrid (UTC+2)', Validators.required],
    recurrence: [''],
    start: ['', Validators.required],
    end: ['', Validators.required],
    scope: ['', Validators.required],
    preChecks: [''],
    postChecks: [''],
    notificationChannels: [''],
    blackoutRules: ['', Validators.required],
    rollbackPolicy: ['', Validators.required],
  })

  readonly stepIndex = computed(() => this.steps.findIndex((s) => s.id === this.activeStep()))
  readonly currentStep = computed(() => this.steps[this.stepIndex()] ?? this.steps[0])
  readonly progressPct = computed(() => Math.round(((this.stepIndex() + 1) / this.steps.length) * 100))

  stepHint = (): string => {
    const map: Record<MwStep, string> = {
      identity: 'Identifica la ventana y su alcance operativo.',
      schedule: 'Asigna responsables y define la franja horaria.',
      checks: 'Lista validaciones y canales de comunicación.',
      policy: 'Documenta blackout y rollback antes de programar.',
    }
    return map[this.activeStep()]
  }

  goToStep = (step: MwStep): void => {
    const targetIdx = this.steps.findIndex((s) => s.id === step)
    if (targetIdx <= this.stepIndex() || this.canAdvance()) {
      this.activeStep.set(step)
    }
  }

  canAdvance = (): boolean => {
    const step = this.activeStep()
    if (step === 'identity') {
      return (
        this.form.controls.title.valid &&
        this.form.controls.description.valid &&
        this.form.controls.scope.valid
      )
    }
    if (step === 'schedule') {
      return (
        this.form.controls.owner.valid &&
        this.form.controls.ownerContact.valid &&
        this.form.controls.start.valid &&
        this.form.controls.end.valid
      )
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

  handleSubmit = (): void => {
    if (this.form.invalid) return
    const v = this.form.getRawValue()
    this.dialogRef.close({
      title: v.title,
      description: v.description,
      environment: v.environment,
      owner: v.owner,
      ownerContact: v.ownerContact,
      timezone: v.timezone,
      recurrence: v.recurrence.trim() || undefined,
      start: new Date(v.start).toISOString(),
      end: new Date(v.end).toISOString(),
      scope: v.scope,
      preChecks: linesToArray(v.preChecks),
      postChecks: linesToArray(v.postChecks),
      notificationChannels: linesToArray(v.notificationChannels),
      blackoutRules: v.blackoutRules,
      rollbackPolicy: v.rollbackPolicy,
    })
  }

  handleCancel = (): void => {
    this.dialogRef.close()
  }
}
