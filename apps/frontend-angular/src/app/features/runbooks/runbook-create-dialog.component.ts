import { Component, inject, signal, computed } from '@angular/core'
import {
  FormArray,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import {
  RUNBOOK_CATEGORY_LABELS,
  RUNBOOK_STEP_TYPE_LABELS,
  RUNBOOK_TRIGGER_LABELS,
  type Runbook,
  type RunbookCategory,
  type RunbookStep,
  type RunbookTrigger,
} from './runbooks.demo'
import type { CloudAccount } from '../../core/models/api.models'
import {
  formatRunbookTargetLabel,
  matchInstancesForRunbook,
  type RunbookTargetInstance,
} from './runbook-target.util'
import { RunbookTargetPickerComponent } from './runbook-target-picker.component'

export interface RunbookCreateDialogData {
  instances: RunbookTargetInstance[]
  accounts: CloudAccount[]
}

export type RunbookCreateDialogResult = Pick<
  Runbook,
  'name' | 'description' | 'category' | 'linkedTo' | 'owner' | 'trigger' | 'requiresApproval' | 'tags' | 'steps'
> & {
  instanceId?: string
  defaultProvider?: string
  defaultAccountName?: string
}

type WizardStep = 'template' | 'details' | 'steps' | 'review'
type StepType = RunbookStep['type']

interface RunbookTemplate {
  id: string
  label: string
  description: string
  icon: string
  category: RunbookCategory
  trigger: RunbookTrigger
  linkedTo: string
  tags: string[]
  requiresApproval: boolean
  steps: Omit<RunbookStep, 'order'>[]
}

const RUNBOOK_TEMPLATES: RunbookTemplate[] = [
  {
    id: 'restart',
    label: 'Reinicio de servicio',
    description: 'Validar, reiniciar y comprobar salud',
    icon: 'refresh',
    category: 'app',
    trigger: 'manual',
    linkedTo: 'web-prod-01',
    tags: ['restart', 'app'],
    requiresApproval: false,
    steps: [
      { title: 'Validar configuración', type: 'command', command: 'nginx -t' },
      { title: 'Reinicio controlado', type: 'command', command: 'systemctl reload nginx' },
      { title: 'Health check HTTP', type: 'check' },
      { title: 'Notificar a ops', type: 'notify' },
    ],
  },
  {
    id: 'incident',
    label: 'Investigación incidente',
    description: 'Diagnóstico CPU/memoria y escalado',
    icon: 'bug_report',
    category: 'infra',
    trigger: 'alert',
    linkedTo: 'Alert: High CPU',
    tags: ['incident', 'cpu'],
    requiresApproval: true,
    steps: [
      { title: 'Snapshot métricas', type: 'check' },
      { title: 'Top procesos', type: 'command', command: 'top -bn1 | head -20' },
      { title: 'Aprobar scale-out', type: 'approval' },
      { title: 'Notificar incidente', type: 'notify' },
    ],
  },
  {
    id: 'backup',
    label: 'Backup base de datos',
    description: 'Dump, subida y verificación',
    icon: 'backup',
    category: 'db',
    trigger: 'schedule',
    linkedTo: 'db-primary',
    tags: ['backup', 'postgres'],
    requiresApproval: true,
    steps: [
      { title: 'Ventana de mantenimiento', type: 'approval' },
      { title: 'pg_dump', type: 'command', command: 'pg_dump -Fc -f /backup/db.dump' },
      { title: 'Verificar checksum', type: 'check' },
    ],
  },
  {
    id: 'security',
    label: 'Acceso SSH',
    description: 'Puerto, claves y auth.log',
    icon: 'vpn_key',
    category: 'security',
    trigger: 'manual',
    linkedTo: 'vps-bastion-01',
    tags: ['ssh', 'security'],
    requiresApproval: false,
    steps: [
      { title: 'Probar puerto 22', type: 'command', command: 'nc -zv host 22' },
      { title: 'Revisar authorized_keys', type: 'check' },
      { title: 'Resumen a seguridad', type: 'notify' },
    ],
  },
  {
    id: 'blank',
    label: 'En blanco',
    description: 'Define todo manualmente',
    icon: 'note_add',
    category: 'infra',
    trigger: 'manual',
    linkedTo: '',
    tags: ['custom'],
    requiresApproval: false,
    steps: [{ title: 'Primer paso', type: 'command', command: '' }],
  },
]

const CATEGORY_META: Record<
  RunbookCategory,
  { icon: string; color: string }
> = {
  infra: { icon: 'dns', color: '#38bdf8' },
  app: { icon: 'web', color: '#844fba' },
  db: { icon: 'storage', color: '#f59e0b' },
  security: { icon: 'shield', color: '#ef4444' },
  k8s: { icon: 'hub', color: '#22c55e' },
}

const buildStepGroup = (
  fb: FormBuilder,
  title: string,
  type: StepType,
  command: string,
) =>
  fb.nonNullable.group({
    title: [title, Validators.required],
    type: [type, Validators.required],
    command: [command],
  })

const STEP_TYPES: { id: StepType; label: string; icon: string }[] = [
  { id: 'command', label: 'Comando', icon: 'terminal' },
  { id: 'check', label: 'Comprobación', icon: 'fact_check' },
  { id: 'approval', label: 'Aprobación', icon: 'verified_user' },
  { id: 'notify', label: 'Notificar', icon: 'campaign' },
]

const STEP_TYPE_ICON: Record<StepType, string> = {
  command: 'terminal',
  check: 'fact_check',
  approval: 'verified_user',
  notify: 'campaign',
}

@Component({
  selector: 'app-runbook-create-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    RunbookTargetPickerComponent,
  ],
  template: `
    <div class="rb-create" [formGroup]="form">
      <header class="rb-create__top">
        <div class="rb-create__brand">
          <span class="rb-create__glyph" aria-hidden="true">
            <mat-icon>auto_stories</mat-icon>
          </span>
          <div>
            <h2 mat-dialog-title>Nuevo runbook</h2>
            <p>Asistente en 4 pasos — la vista previa a la derecha se actualiza en tiempo real</p>
          </div>
        </div>
      </header>

      <div class="rb-create__shell">
        <nav class="rb-create__sidebar" aria-label="Pasos del asistente">
          @for (s of wizardSteps; track s.id) {
            <button
              type="button"
              class="rb-create__side-item"
              [class.rb-create__side-item--on]="activeStep() === s.id"
              [class.rb-create__side-item--done]="stepIndex(s.id) < stepIndex(activeStep())"
              (click)="goToStep(s.id)"
            >
              <span class="rb-create__side-num">{{ stepIndex(s.id) + 1 }}</span>
              <span class="rb-create__side-icon">
                <mat-icon>{{ s.icon }}</mat-icon>
              </span>
              <span class="rb-create__side-text">
                <strong>{{ s.label }}</strong>
                <span>{{ stepHint(s.id) }}</span>
              </span>
              @if (stepIndex(s.id) < stepIndex(activeStep())) {
                <mat-icon class="rb-create__side-check">check_circle</mat-icon>
              }
            </button>
          }
        </nav>

        <mat-dialog-content class="rb-create__body">
        @if (activeStep() === 'template') {
          <section class="rb-create__section">
            <header class="rb-create__section-title">
              <h3>Plantilla de inicio</h3>
              <p class="rb-create__hint">Elige un punto de partida; podrás editar nombre, objetivo y pasos después.</p>
            </header>
            <div class="rb-create__templates">
              @for (tpl of templates; track tpl.id) {
                <button
                  type="button"
                  class="rb-tpl"
                  [class.rb-tpl--on]="selectedTemplate() === tpl.id"
                  (click)="applyTemplate(tpl)"
                  [attr.aria-pressed]="selectedTemplate() === tpl.id"
                >
                  <span class="rb-tpl__icon-wrap">
                    <mat-icon>{{ tpl.icon }}</mat-icon>
                  </span>
                  <strong>{{ tpl.label }}</strong>
                  <span class="rb-tpl__desc">{{ tpl.description }}</span>
                  <span class="rb-tpl__meta">
                    {{ categoryLabels[tpl.category] }} · {{ tpl.steps.length }} pasos
                    @if (tpl.requiresApproval) {
                      · Aprobación
                    }
                  </span>
                </button>
              }
            </div>
            <div class="rb-create__fields-row">
              <mat-form-field appearance="outline" class="rb-create__field">
                <mat-label>Nombre del runbook</mat-label>
                <input matInput formControlName="name" aria-label="Nombre" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="rb-create__field rb-create__field--wide">
                <mat-label>Descripción</mat-label>
                <textarea matInput formControlName="description" rows="3" aria-label="Descripción"></textarea>
              </mat-form-field>
            </div>
          </section>
        }

        @if (activeStep() === 'details') {
          <section class="rb-create__section">
            <header class="rb-create__section-title">
              <h3>Clasificación y objetivo</h3>
              <p class="rb-create__hint">
                Categoría, disparador, equipo responsable y vínculo operativo (cuenta cloud + instancia o VPS).
              </p>
            </header>
            <div class="rb-create__split">
              <div class="rb-create__col">
                <div class="rb-create__block">
                  <span class="rb-create__label">Categoría</span>
                  <div class="rb-create__categories" role="radiogroup" aria-label="Categoría">
                    @for (cat of categories; track cat) {
                      <button
                        type="button"
                        class="rb-cat"
                        [class.rb-cat--on]="form.controls.category.value === cat"
                        [style.--cat-color]="categoryMeta[cat].color"
                        (click)="form.controls.category.setValue(cat)"
                      >
                        <mat-icon>{{ categoryMeta[cat].icon }}</mat-icon>
                        {{ categoryLabels[cat] }}
                      </button>
                    }
                  </div>
                </div>
                <div class="rb-create__block">
                  <span class="rb-create__label">Disparador</span>
                  <div class="rb-create__triggers" role="radiogroup" aria-label="Disparador">
                    @for (t of triggers; track t) {
                      <button
                        type="button"
                        class="rb-trigger"
                        [class.rb-trigger--on]="form.controls.trigger.value === t"
                        (click)="form.controls.trigger.setValue(t)"
                      >
                        {{ triggerLabels[t] }}
                      </button>
                    }
                  </div>
                </div>
                <mat-form-field appearance="outline" class="rb-create__field">
                  <mat-label>Propietario / equipo</mat-label>
                  <input matInput formControlName="owner" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="rb-create__field">
                  <mat-label>Etiquetas (separadas por coma)</mat-label>
                  <input matInput formControlName="tagsText" placeholder="prod, nginx, on-call" />
                </mat-form-field>
                <div class="rb-create__toggle">
                  <mat-slide-toggle formControlName="requiresApproval" color="primary">
                    Requiere aprobación antes de ejecutar
                  </mat-slide-toggle>
                </div>
              </div>
              <div class="rb-create__col rb-create__col--panel">
                <div class="rb-create__target-panel">
                  <h4>
                    <mat-icon>cloud</mat-icon>
                    Objetivo por defecto
                  </h4>
                  <p class="rb-create__hint rb-create__hint--tight">
                    Cuenta e instancia (o VPS) donde se ejecutará este runbook si no se elige otro al lanzar.
                  </p>
                  @if (hasTargets()) {
                    <app-runbook-target-picker
                      [instanceControl]="form.controls.instanceId"
                      [instances]="data.instances"
                      [accounts]="data.accounts"
                      [linkedToHint]="form.controls.linkedTo.value"
                      (targetChange)="handleTargetChange($event)"
                    />
                    @if (form.controls.linkedTo.value) {
                      <p class="rb-create__linked-preview">
                        <mat-icon>link</mat-icon>
                        <span>
                          <span class="rb-create__linked-k">Etiqueta operativa</span>
                          <strong>{{ form.controls.linkedTo.value }}</strong>
                        </span>
                      </p>
                    }
                    @if (selectedTarget(); as inst) {
                      <dl class="rb-create__target-meta">
                        @if (inst.accountName) {
                          <div>
                            <dt>Cuenta</dt>
                            <dd>{{ inst.accountName }}</dd>
                          </div>
                        }
                        <div>
                          <dt>Proveedor</dt>
                          <dd>{{ inst.provider }}</dd>
                        </div>
                        <div>
                          <dt>ID instancia</dt>
                          <dd class="mono">{{ inst.id }}</dd>
                        </div>
                      </dl>
                    }
                  } @else {
                    <mat-form-field appearance="outline" class="rb-create__field">
                      <mat-label>Vinculado a (texto)</mat-label>
                      <input matInput formControlName="linkedTo" placeholder="host, cluster o alerta" />
                      <mat-hint>Sin instancias cloud: define el objetivo manualmente</mat-hint>
                    </mat-form-field>
                  }
                </div>
              </div>
            </div>
          </section>
        }

        @if (activeStep() === 'steps') {
          <section class="rb-create__section rb-create__section--steps">
            <div class="rb-create__section-head">
              <header class="rb-create__section-title">
                <h3>Pasos del procedimiento</h3>
                <p class="rb-create__hint">Orden de ejecución: comando, comprobación, aprobación o notificación.</p>
              </header>
              <button type="button" class="rb-create__add-step" (click)="addStep()">
                <mat-icon>add</mat-icon>
                Añadir paso
              </button>
            </div>
            <div class="rb-steps-scroll" formArrayName="steps">
            <div class="rb-steps">
              @for (step of stepsArray.controls; track $index; let i = $index) {
                <div class="rb-step" [formGroupName]="i">
                  <span class="rb-step__order">{{ i + 1 }}</span>
                  <div class="rb-step__fields">
                    <mat-form-field appearance="outline" class="rb-step__title">
                      <mat-label>Título del paso</mat-label>
                      <input matInput formControlName="title" />
                    </mat-form-field>
                    <div class="rb-step__types">
                      @for (st of stepTypes; track st.id) {
                        <button
                          type="button"
                          class="rb-step-type"
                          [class.rb-step-type--on]="step.controls.type.value === st.id"
                          (click)="step.controls.type.setValue(st.id)"
                        >
                          <mat-icon>{{ st.icon }}</mat-icon>
                          {{ st.label }}
                        </button>
                      }
                    </div>
                    @if (step.controls.type.value === 'command') {
                      <mat-form-field appearance="outline" class="rb-step__cmd">
                        <mat-label>Comando (opcional)</mat-label>
                        <input matInput formControlName="command" class="mono" placeholder="ej. systemctl status nginx" />
                      </mat-form-field>
                    }
                  </div>
                  <button
                    type="button"
                    class="rb-step__remove"
                    (click)="removeStep(i)"
                    [disabled]="stepsArray.length <= 1"
                    aria-label="Eliminar paso"
                  >
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </div>
              }
            </div>
            </div>
          </section>
        }

        @if (activeStep() === 'review') {
          <section class="rb-create__section">
            <header class="rb-create__section-title">
              <h3>Revisión final</h3>
              <p class="rb-create__hint">Comprueba todos los detalles antes de guardar el borrador en el catálogo.</p>
            </header>
            <div class="rb-review-full">
              <article class="rb-review-hero">
                <span
                  class="rb-review-hero__cat"
                  [style.background]="'color-mix(in srgb, ' + categoryMeta[form.controls.category.value].color + ' 14%, transparent)'"
                  [style.color]="categoryMeta[form.controls.category.value].color"
                >
                  <mat-icon>{{ categoryMeta[form.controls.category.value].icon }}</mat-icon>
                </span>
                <div>
                  <h4>{{ form.controls.name.value || 'Sin nombre' }}</h4>
                  <p>{{ form.controls.description.value || '—' }}</p>
                  <div class="rb-review-hero__chips">
                    <span>{{ categoryLabels[form.controls.category.value] }}</span>
                    <span>{{ triggerLabels[form.controls.trigger.value] }}</span>
                    @if (form.controls.requiresApproval.value) {
                      <span class="rb-review-hero__approval">
                        <mat-icon>verified_user</mat-icon>
                        Requiere aprobación
                      </span>
                    }
                  </div>
                </div>
              </article>
              <div class="rb-review-grid">
                <section class="rb-review-panel">
                  <h5><mat-icon>info</mat-icon> Información operativa</h5>
                  <dl class="rb-review-panel__dl">
                    <div>
                      <dt>Propietario</dt>
                      <dd>{{ form.controls.owner.value }}</dd>
                    </div>
                    <div>
                      <dt>Objetivo por defecto</dt>
                      <dd class="mono">{{ form.controls.linkedTo.value || '—' }}</dd>
                    </div>
                    @if (selectedTarget(); as inst) {
                      @if (inst.accountName) {
                        <div>
                          <dt>Cuenta cloud</dt>
                          <dd>{{ inst.accountName }}</dd>
                        </div>
                      }
                      <div>
                        <dt>Proveedor</dt>
                        <dd>{{ inst.provider }}</dd>
                      </div>
                      <div>
                        <dt>ID instancia</dt>
                        <dd class="mono">{{ inst.id }}</dd>
                      </div>
                    }
                    <div>
                      <dt>Etiquetas</dt>
                      <dd>
                        @if (previewTags().length) {
                          @for (tag of previewTags(); track tag) {
                            <span class="rb-review-tag">{{ tag }}</span>
                          }
                        } @else {
                          —
                        }
                      </dd>
                    </div>
                  </dl>
                </section>
                <section class="rb-review-panel rb-review-panel--steps">
                  <h5>
                    <mat-icon>format_list_numbered</mat-icon>
                    Pasos ({{ stepsArray.length }})
                  </h5>
                  <ol class="rb-review-timeline">
                    @for (step of stepsPreview(); track $index; let i = $index) {
                      <li class="rb-review-timeline__item" [attr.data-type]="step.type">
                        <span class="rb-review-timeline__icon">
                          <mat-icon>{{ stepTypeIcon(step.type) }}</mat-icon>
                        </span>
                        <div>
                          <strong>Paso {{ i + 1 }} — {{ step.title }}</strong>
                          <span class="rb-review-timeline__type">{{ stepTypeLabel(step.type) }}</span>
                          @if (step.command) {
                            <pre class="mono">$ {{ step.command }}</pre>
                          }
                        </div>
                      </li>
                    }
                  </ol>
                </section>
              </div>
            </div>
          </section>
        }
        </mat-dialog-content>

        <aside class="rb-create__preview" aria-label="Vista previa del runbook">
          <p class="rb-create__preview-kicker">Vista previa</p>
          <div class="rb-preview-card">
            <span
              class="rb-preview-card__cat"
              [style.background]="'color-mix(in srgb, ' + categoryMeta[form.controls.category.value].color + ' 14%, transparent)'"
              [style.color]="categoryMeta[form.controls.category.value].color"
            >
              <mat-icon>{{ categoryMeta[form.controls.category.value].icon }}</mat-icon>
            </span>
            <h4>{{ form.controls.name.value || 'Sin nombre' }}</h4>
            <p class="rb-preview-card__desc">{{ form.controls.description.value || 'Añade una descripción…' }}</p>
            <dl class="rb-preview-card__dl">
              <div>
                <dt>Categoría</dt>
                <dd>{{ categoryLabels[form.controls.category.value] }}</dd>
              </div>
              <div>
                <dt>Disparador</dt>
                <dd>{{ triggerLabels[form.controls.trigger.value] }}</dd>
              </div>
              <div>
                <dt>Propietario</dt>
                <dd>{{ form.controls.owner.value || '—' }}</dd>
              </div>
              <div>
                <dt>Objetivo</dt>
                <dd class="mono">{{ form.controls.linkedTo.value || '—' }}</dd>
              </div>
            </dl>
            @if (previewTags().length) {
              <div class="rb-preview-card__tags">
                @for (tag of previewTags(); track tag) {
                  <span>{{ tag }}</span>
                }
              </div>
            }
            @if (form.controls.requiresApproval.value) {
              <p class="rb-preview-card__approval">
                <mat-icon>verified_user</mat-icon>
                Requiere aprobación
              </p>
            }
            <div class="rb-preview-card__steps">
              <span class="rb-create__label">Pasos ({{ stepsArray.length }})</span>
              <ol>
                @for (step of stepsPreview(); track $index; let i = $index) {
                  <li>
                    <span>{{ i + 1 }}</span>
                    <span class="rb-preview-step-type" [attr.data-type]="step.type">
                      {{ stepTypeLabel(step.type) }}
                    </span>
                    {{ step.title }}
                  </li>
                }
              </ol>
            </div>
          </div>
        </aside>
      </div>

      <mat-dialog-actions class="rb-create__footer" align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        @if (activeStep() !== 'template') {
          <button mat-button type="button" (click)="prevStep()">
            <mat-icon>arrow_back</mat-icon>
            Atrás
          </button>
        }
        @if (activeStep() !== 'review') {
          <button mat-flat-button color="primary" type="button" [disabled]="!canAdvance()" (click)="nextStep()">
            Siguiente
            <mat-icon>arrow_forward</mat-icon>
          </button>
        } @else {
          <button mat-flat-button color="primary" type="button" [disabled]="form.invalid" (click)="confirm()">
            <mat-icon>save</mat-icon>
            Crear borrador
          </button>
        }
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .rb-create {
      display: flex;
      flex-direction: column;
      width: 100%;
      max-height: min(96vh, 920px);
      min-height: min(88vh, 720px);
      color: #111;
    }
    .rb-create__top {
      flex-shrink: 0;
      padding: 1rem 1.25rem 0.75rem;
      border-bottom: 1px solid color-mix(in srgb, #111 8%, transparent);
      background: linear-gradient(
        180deg,
        color-mix(in srgb, #844fba 5%, #fff) 0%,
        #fff 100%
      );
    }
    .rb-create__brand {
      display: flex;
      gap: 0.65rem;
      align-items: flex-start;
      margin-bottom: 0.75rem;
    }
    .rb-create__brand h2 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
    }
    .rb-create__brand p {
      margin: 0.2rem 0 0;
      font-size: 0.78rem;
      color: #64748b;
    }
    .rb-create__glyph {
      display: grid;
      place-items: center;
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 12px;
      background: color-mix(in srgb, #844fba 14%, transparent);
      color: #844fba;
    }
    .rb-create__shell {
      display: grid;
      grid-template-columns: 200px minmax(0, 1fr) 280px;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
    .rb-create__sidebar {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      padding: 1rem 0.75rem;
      border-right: 1px solid color-mix(in srgb, #111 8%, transparent);
      background: color-mix(in srgb, #111 2%, #fff);
    }
    .rb-create__side-item {
      display: grid;
      grid-template-columns: auto auto 1fr auto;
      align-items: center;
      gap: 0.45rem;
      width: 100%;
      padding: 0.55rem 0.5rem;
      border: 1px solid transparent;
      border-radius: 10px;
      background: transparent;
      font: inherit;
      text-align: left;
      color: #64748b;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease;
    }
    .rb-create__side-item:hover {
      background: color-mix(in srgb, #111 4%, transparent);
    }
    .rb-create__side-item--on {
      color: #111;
      border-color: color-mix(in srgb, #844fba 30%, transparent);
      background: color-mix(in srgb, #844fba 10%, transparent);
    }
    .rb-create__side-item--done {
      color: #15803d;
    }
    .rb-create__side-num {
      font-size: 0.62rem;
      font-weight: 800;
      width: 1.1rem;
      text-align: center;
    }
    .rb-create__side-icon {
      display: grid;
      place-items: center;
      width: 1.75rem;
      height: 1.75rem;
      border-radius: 8px;
      background: color-mix(in srgb, #111 6%, transparent);
    }
    .rb-create__side-item--on .rb-create__side-icon {
      background: color-mix(in srgb, #844fba 18%, transparent);
      color: #844fba;
    }
    .rb-create__side-icon mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }
    .rb-create__side-text {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
      min-width: 0;
    }
    .rb-create__side-text strong {
      font-size: 0.72rem;
      font-weight: 700;
      color: inherit;
    }
    .rb-create__side-text span {
      font-size: 0.6rem;
      color: #94a3b8;
      line-height: 1.25;
    }
    .rb-create__side-check {
      font-size: 1rem !important;
      width: 1rem !important;
      height: 1rem !important;
      color: #22c55e;
    }
    .rb-create__body {
      flex: 1;
      overflow-y: auto;
      margin: 0 !important;
      padding: 1rem 1.15rem 1rem 1rem !important;
      max-height: none !important;
      min-height: min(68vh, 560px);
    }
    .rb-create__preview {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1rem 0.85rem;
      border-left: 1px solid color-mix(in srgb, #111 8%, transparent);
      background: color-mix(in srgb, #844fba 3%, #f8fafc);
      overflow-y: auto;
      min-height: 0;
    }
    .rb-create__preview-kicker {
      margin: 0;
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #844fba;
    }
    .rb-preview-card {
      padding: 0.75rem;
      border-radius: 12px;
      border: 1px solid color-mix(in srgb, #844fba 18%, transparent);
      background: #fff;
      box-shadow: 0 4px 20px color-mix(in srgb, #111 6%, transparent);
    }
    .rb-preview-card__cat {
      display: inline-grid;
      place-items: center;
      width: 2rem;
      height: 2rem;
      border-radius: 10px;
      margin-bottom: 0.45rem;
    }
    .rb-preview-card__cat mat-icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
    }
    .rb-preview-card h4 {
      margin: 0 0 0.25rem;
      font-size: 0.88rem;
      font-weight: 700;
      line-height: 1.3;
      word-break: break-word;
    }
    .rb-preview-card__desc {
      margin: 0 0 0.65rem;
      font-size: 0.7rem;
      color: #64748b;
      line-height: 1.45;
    }
    .rb-preview-card__dl {
      display: grid;
      gap: 0.35rem;
      margin: 0 0 0.55rem;
      font-size: 0.68rem;
    }
    .rb-preview-card__dl dt {
      color: #94a3b8;
      font-weight: 600;
    }
    .rb-preview-card__dl dd {
      margin: 0;
      font-weight: 650;
      color: #111;
      word-break: break-word;
    }
    .rb-preview-card__tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      margin-bottom: 0.5rem;
    }
    .rb-preview-card__tags span {
      padding: 0.12rem 0.4rem;
      border-radius: 999px;
      font-size: 0.6rem;
      font-weight: 600;
      background: color-mix(in srgb, #111 6%, transparent);
      color: #333;
    }
    .rb-preview-card__approval {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      margin: 0 0 0.55rem;
      font-size: 0.68rem;
      font-weight: 700;
      color: #b45309;
    }
    .rb-preview-card__approval mat-icon {
      font-size: 0.95rem;
      width: 0.95rem;
      height: 0.95rem;
    }
    .rb-preview-card__steps ol {
      margin: 0.35rem 0 0;
      padding: 0;
      list-style: none;
      font-size: 0.66rem;
    }
    .rb-preview-card__steps li {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.25rem;
      padding: 0.3rem 0;
      border-top: 1px solid color-mix(in srgb, #111 6%, transparent);
      line-height: 1.35;
    }
    .rb-preview-card__steps li > span:first-child {
      font-weight: 800;
      color: #844fba;
      min-width: 1rem;
    }
    .rb-preview-step-type {
      font-size: 0.55rem;
      font-weight: 800;
      text-transform: uppercase;
      padding: 0.06rem 0.28rem;
      border-radius: 4px;
      background: color-mix(in srgb, #844fba 12%, transparent);
      color: #844fba;
    }
    .rb-create__section-title h3 {
      margin: 0 0 0.2rem;
    }
    .rb-create__label {
      display: block;
      margin-bottom: 0.35rem;
      font-size: 0.68rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .rb-create__split {
      display: grid;
      grid-template-columns: 1fr 1.05fr;
      gap: 1rem;
      align-items: start;
    }
    .rb-create__col--panel {
      min-width: 0;
    }
    .rb-create__target-panel {
      padding: 0.85rem 0.9rem;
      border-radius: 12px;
      border: 1px solid color-mix(in srgb, #844fba 22%, transparent);
      background: color-mix(in srgb, #844fba 4%, #fff);
    }
    .rb-create__target-panel h4 {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0 0 0.35rem;
      font-size: 0.82rem;
      font-weight: 700;
    }
    .rb-create__target-panel h4 mat-icon {
      color: #844fba;
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
    }
    .rb-create__hint--tight {
      margin-bottom: 0.65rem !important;
    }
    .rb-create__linked-k {
      display: block;
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
      color: #94a3b8;
      letter-spacing: 0.04em;
    }
    .rb-create__target-meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.4rem;
      margin: 0.65rem 0 0;
      padding-top: 0.55rem;
      border-top: 1px dashed color-mix(in srgb, #111 10%, transparent);
      font-size: 0.68rem;
    }
    .rb-create__target-meta dt {
      color: #94a3b8;
      font-weight: 600;
    }
    .rb-create__target-meta dd {
      margin: 0;
      font-weight: 650;
    }
    .rb-create__fields-row {
      display: grid;
      grid-template-columns: 1fr 1.4fr;
      gap: 0.65rem;
    }
    .rb-create__block {
      margin-bottom: 0.75rem;
    }
    .rb-steps-scroll {
      max-height: min(52vh, 420px);
      overflow-y: auto;
      padding-right: 0.25rem;
    }
    .rb-create__section--steps {
      display: flex;
      flex-direction: column;
      min-height: min(58vh, 500px);
    }
    .rb-create__section h3 {
      margin: 0 0 0.25rem;
      font-size: 0.95rem;
      font-weight: 700;
    }
    .rb-create__hint {
      margin: 0 0 0.85rem;
      font-size: 0.76rem;
      color: #64748b;
    }
    .rb-create__linked-preview {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0 0 0.65rem;
      padding: 0.45rem 0.6rem;
      border-radius: 10px;
      font-size: 0.72rem;
      color: #333;
      background: color-mix(in srgb, #844fba 6%, transparent);
      border: 1px solid color-mix(in srgb, #844fba 18%, transparent);
    }
    .rb-create__linked-preview mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: #844fba;
    }
    .rb-create__templates {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.55rem;
      margin-bottom: 1rem;
    }
    .rb-tpl {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
      padding: 0.75rem 0.8rem;
      min-height: 7.5rem;
      border: 1px solid color-mix(in srgb, #111 10%, transparent);
      border-radius: 12px;
      background: var(--app-card, #fff);
      text-align: left;
      font: inherit;
      color: #111;
      cursor: pointer;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .rb-tpl__icon-wrap {
      display: grid;
      place-items: center;
      width: 2rem;
      height: 2rem;
      border-radius: 10px;
      background: color-mix(in srgb, #844fba 10%, transparent);
      color: #844fba;
    }
    .rb-tpl__desc {
      flex: 1;
    }
    .rb-tpl:hover {
      border-color: color-mix(in srgb, #844fba 30%, transparent);
    }
    .rb-tpl--on {
      border-color: #844fba;
      box-shadow: 0 0 0 1px color-mix(in srgb, #844fba 25%, transparent);
      background: color-mix(in srgb, #844fba 6%, #fff);
    }
    .rb-tpl mat-icon {
      color: #844fba;
    }
    .rb-tpl strong {
      font-size: 0.78rem;
    }
    .rb-tpl span {
      font-size: 0.65rem;
      color: #64748b;
      line-height: 1.35;
    }
    .rb-tpl__meta {
      font-weight: 700;
      color: #844fba !important;
    }
    .rb-create__field {
      width: 100%;
    }
    .rb-create__row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }
    .rb-create__categories {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      margin-bottom: 0.85rem;
    }
    .rb-cat {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.4rem 0.65rem;
      border: 1px solid color-mix(in srgb, #111 10%, transparent);
      border-radius: 10px;
      background: transparent;
      font: inherit;
      font-size: 0.72rem;
      font-weight: 600;
      color: #333;
      cursor: pointer;
    }
    .rb-cat mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: var(--cat-color, #844fba);
    }
    .rb-cat--on {
      border-color: var(--cat-color, #844fba);
      background: color-mix(in srgb, var(--cat-color, #844fba) 12%, transparent);
      color: #111;
    }
    .rb-create__triggers {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-bottom: 0.75rem;
    }
    .rb-trigger {
      padding: 0.35rem 0.7rem;
      border: 1px solid color-mix(in srgb, #111 10%, transparent);
      border-radius: 999px;
      background: transparent;
      font: inherit;
      font-size: 0.72rem;
      font-weight: 600;
      color: #333;
      cursor: pointer;
    }
    .rb-trigger--on {
      background: #111;
      color: #fff;
      border-color: #111;
    }
    .rb-create__toggle {
      margin-top: 0.5rem;
    }
    .rb-create__section-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }
    .rb-create__add-step {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.35rem 0.6rem;
      border: 1px dashed color-mix(in srgb, #844fba 40%, transparent);
      border-radius: 8px;
      background: color-mix(in srgb, #844fba 6%, transparent);
      font: inherit;
      font-size: 0.72rem;
      font-weight: 600;
      color: #844fba;
      cursor: pointer;
      flex-shrink: 0;
    }
    .rb-steps {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
    }
    .rb-step {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 0.5rem;
      align-items: flex-start;
      padding: 0.65rem 0.7rem;
      border-radius: 12px;
      background: color-mix(in srgb, #111 3%, transparent);
      border: 1px solid color-mix(in srgb, #111 7%, transparent);
    }
    .rb-step__order {
      display: grid;
      place-items: center;
      width: 1.6rem;
      height: 1.6rem;
      border-radius: 8px;
      background: #844fba;
      color: #fff;
      font-size: 0.72rem;
      font-weight: 800;
      flex-shrink: 0;
      margin-top: 0.35rem;
    }
    .rb-step__fields {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      min-width: 0;
    }
    .rb-step__title {
      width: 100%;
    }
    .rb-step__types {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
    }
    .rb-step-type {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      padding: 0.22rem 0.45rem;
      border: 1px solid color-mix(in srgb, #111 10%, transparent);
      border-radius: 6px;
      background: transparent;
      font: inherit;
      font-size: 0.62rem;
      font-weight: 600;
      color: #555;
      cursor: pointer;
    }
    .rb-step-type mat-icon {
      font-size: 0.85rem;
      width: 0.85rem;
      height: 0.85rem;
    }
    .rb-step-type--on {
      border-color: #844fba;
      color: #844fba;
      background: color-mix(in srgb, #844fba 8%, transparent);
    }
    .rb-step__cmd {
      width: 100%;
    }
    .rb-step__remove {
      border: none;
      background: transparent;
      color: #94a3b8;
      cursor: pointer;
      padding: 0.25rem;
    }
    .rb-step__remove:hover:not(:disabled) {
      color: #ef4444;
    }
    .rb-step__remove:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
    .rb-review-full {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .rb-review-hero {
      display: flex;
      gap: 0.75rem;
      padding: 0.85rem 1rem;
      border-radius: 12px;
      border: 1px solid color-mix(in srgb, #111 8%, transparent);
      background: var(--app-elevated, #fff);
    }
    .rb-review-hero__cat {
      display: grid;
      place-items: center;
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 12px;
      flex-shrink: 0;
    }
    .rb-review-hero h4 {
      margin: 0 0 0.25rem;
      font-size: 1rem;
    }
    .rb-review-hero p {
      margin: 0 0 0.5rem;
      font-size: 0.78rem;
      color: #333;
      line-height: 1.45;
    }
    .rb-review-hero__chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }
    .rb-review-hero__chips > span {
      padding: 0.2rem 0.5rem;
      border-radius: 999px;
      font-size: 0.65rem;
      font-weight: 700;
      background: color-mix(in srgb, #111 6%, transparent);
      color: #333;
    }
    .rb-review-hero__approval {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      color: #b45309 !important;
      background: color-mix(in srgb, #f59e0b 14%, transparent) !important;
    }
    .rb-review-hero__approval mat-icon {
      font-size: 0.9rem;
      width: 0.9rem;
      height: 0.9rem;
    }
    .rb-review-grid {
      display: grid;
      grid-template-columns: 1fr 1.2fr;
      gap: 0.75rem;
      align-items: start;
    }
    .rb-review-panel {
      padding: 0.75rem 0.85rem;
      border-radius: 12px;
      border: 1px solid color-mix(in srgb, #111 8%, transparent);
      background: var(--app-elevated, #fff);
    }
    .rb-review-panel h5 {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0 0 0.55rem;
      font-size: 0.8rem;
      font-weight: 700;
    }
    .rb-review-panel h5 mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: #844fba;
    }
    .rb-review-panel__dl {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.45rem;
      margin: 0;
      font-size: 0.72rem;
    }
    .rb-review-panel__dl dt {
      color: #64748b;
      font-weight: 600;
    }
    .rb-review-panel__dl dd {
      margin: 0;
      color: #111;
      font-weight: 650;
    }
    .rb-review-tag {
      display: inline-block;
      margin: 0.1rem 0.2rem 0 0;
      padding: 0.1rem 0.4rem;
      border-radius: 999px;
      font-size: 0.62rem;
      font-weight: 600;
      background: color-mix(in srgb, #111 6%, transparent);
    }
    .rb-review-panel--steps {
      max-height: min(48vh, 400px);
      overflow-y: auto;
    }
    .rb-review-timeline {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .rb-review-timeline__item {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.55rem;
      padding: 0.55rem 0;
      border-top: 1px solid color-mix(in srgb, #111 6%, transparent);
    }
    .rb-review-timeline__item:first-child {
      border-top: none;
      padding-top: 0;
    }
    .rb-review-timeline__icon {
      display: grid;
      place-items: center;
      width: 2rem;
      height: 2rem;
      border-radius: 8px;
      background: color-mix(in srgb, #844fba 12%, transparent);
      color: #844fba;
    }
    .rb-review-timeline__item[data-type='check'] .rb-review-timeline__icon {
      background: color-mix(in srgb, #38bdf8 14%, transparent);
      color: #0284c7;
    }
    .rb-review-timeline__item[data-type='approval'] .rb-review-timeline__icon {
      background: color-mix(in srgb, #f59e0b 14%, transparent);
      color: #b45309;
    }
    .rb-review-timeline__item[data-type='notify'] .rb-review-timeline__icon {
      background: color-mix(in srgb, #22c55e 14%, transparent);
      color: #15803d;
    }
    .rb-review-timeline__item strong {
      display: block;
      font-size: 0.76rem;
      margin-bottom: 0.15rem;
    }
    .rb-review-timeline__type {
      font-size: 0.62rem;
      font-weight: 700;
      color: #64748b;
    }
    .rb-review-timeline__item pre {
      margin: 0.35rem 0 0;
      padding: 0.35rem 0.45rem;
      border-radius: 6px;
      font-size: 0.65rem;
      background: color-mix(in srgb, #111 5%, transparent);
      color: #334155;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .rb-create__footer {
      flex-shrink: 0;
      padding: 0.65rem 1.25rem !important;
      border-top: 1px solid color-mix(in srgb, #111 8%, transparent);
      background: #fff;
    }
    .mono {
      font-family: var(--app-font-mono, ui-monospace, monospace);
    }
    @media (max-width: 1024px) {
      .rb-create__shell {
        grid-template-columns: 180px minmax(0, 1fr);
      }
      .rb-create__preview {
        display: none;
      }
      .rb-create__templates {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 720px) {
      .rb-create__shell {
        grid-template-columns: 1fr;
      }
      .rb-create__sidebar {
        flex-direction: row;
        flex-wrap: wrap;
        border-right: none;
        border-bottom: 1px solid color-mix(in srgb, #111 8%, transparent);
      }
      .rb-create__side-text span {
        display: none;
      }
      .rb-create__split,
      .rb-create__fields-row,
      .rb-review-grid {
        grid-template-columns: 1fr;
      }
      .rb-create__templates {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class RunbookCreateDialogComponent {
  readonly data = inject<RunbookCreateDialogData>(MAT_DIALOG_DATA)
  private readonly dialogRef = inject(MatDialogRef<RunbookCreateDialogComponent, RunbookCreateDialogResult>)
  private readonly fb = inject(FormBuilder)

  readonly hasTargets = computed(() => this.data.instances.length > 0)

  readonly templates = RUNBOOK_TEMPLATES
  readonly categoryLabels = RUNBOOK_CATEGORY_LABELS
  readonly triggerLabels = RUNBOOK_TRIGGER_LABELS
  readonly categoryMeta = CATEGORY_META
  readonly categories: RunbookCategory[] = ['infra', 'app', 'db', 'security', 'k8s']
  readonly triggers: RunbookTrigger[] = ['manual', 'alert', 'schedule', 'approval']
  readonly stepTypes = STEP_TYPES

  readonly wizardSteps = [
    { id: 'template' as WizardStep, label: 'Plantilla', icon: 'dashboard' },
    { id: 'details' as WizardStep, label: 'Detalles', icon: 'tune' },
    { id: 'steps' as WizardStep, label: 'Pasos', icon: 'format_list_numbered' },
    { id: 'review' as WizardStep, label: 'Revisión', icon: 'fact_check' },
  ]

  readonly activeStep = signal<WizardStep>('template')
  readonly selectedTemplate = signal('restart')

  readonly form = this.fb.nonNullable.group({
    name: ['Reiniciar servicio demo', [Validators.required, Validators.minLength(3)]],
    description: ['Procedimiento de reinicio controlado con validación y notificación.', Validators.required],
    category: ['app' as RunbookCategory, Validators.required],
    instanceId: [
      this.data.instances[0]?.id ?? '',
      this.data.instances.length ? Validators.required : [],
    ],
    linkedTo: [
      this.data.instances[0] ? formatRunbookTargetLabel(this.data.instances[0]) : 'web-prod-01',
      Validators.required,
    ],
    owner: ['SRE', Validators.required],
    trigger: ['manual' as RunbookTrigger, Validators.required],
    tagsText: ['restart, app'],
    requiresApproval: [false],
    steps: this.fb.array([buildStepGroup(this.fb, 'Validar configuración', 'command', 'nginx -t')]),
  })

  readonly stepsArray = this.form.controls.steps

  readonly stepsPreview = computed((): RunbookStep[] =>
    this.stepsArray.controls.map((ctrl, i) => ({
      order: i + 1,
      title: ctrl.controls.title.value,
      type: ctrl.controls.type.value,
      command: ctrl.controls.command.value || undefined,
    })),
  )

  readonly stepTypeLabels = RUNBOOK_STEP_TYPE_LABELS

  stepHint = (id: WizardStep): string => {
    const hints: Record<WizardStep, string> = {
      template: 'Plantilla y nombre',
      details: 'Categoría y objetivo',
      steps: 'Procedimiento',
      review: 'Confirmar borrador',
    }
    return hints[id]
  }

  selectedTarget = (): RunbookTargetInstance | null => {
    const id = this.form.controls.instanceId.value
    return this.data.instances.find((i) => i.id === id) ?? null
  }

  previewTags = (): string[] =>
    this.form.controls.tagsText.value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

  stepTypeLabel = (type: StepType): string =>
    this.stepTypeLabels[type] ?? type

  stepTypeIcon = (type: StepType): string =>
    STEP_TYPE_ICON[type] ?? 'help'

  constructor() {
    this.applyTemplate(RUNBOOK_TEMPLATES[0])
  }

  stepIndex = (id: WizardStep): number => this.wizardSteps.findIndex((s) => s.id === id)

  goToStep = (id: WizardStep): void => {
    if (!this.canGoTo(id)) return
    this.activeStep.set(id)
  }

  nextStep = (): void => {
    const idx = this.stepIndex(this.activeStep())
    const next = this.wizardSteps[idx + 1]
    if (next && this.canAdvance()) this.activeStep.set(next.id)
  }

  prevStep = (): void => {
    const idx = this.stepIndex(this.activeStep())
    const prev = this.wizardSteps[idx - 1]
    if (prev) this.activeStep.set(prev.id)
  }

  canAdvance = (): boolean => {
    const step = this.activeStep()
    if (step === 'template') {
      return this.form.controls.name.valid && this.form.controls.description.valid
    }
    if (step === 'details') {
      const targetOk = this.hasTargets()
        ? this.form.controls.instanceId.valid
        : this.form.controls.linkedTo.valid
      return targetOk && this.form.controls.owner.valid
    }
    if (step === 'steps') {
      return this.stepsArray.valid && this.stepsArray.length > 0
    }
    return true
  }

  canGoTo = (target: WizardStep): boolean => {
    const targetIdx = this.stepIndex(target)
    const currentIdx = this.stepIndex(this.activeStep())
    if (targetIdx <= currentIdx) return true
    return this.canAdvance()
  }

  handleTargetChange = (inst: RunbookTargetInstance | null): void => {
    if (!inst) return
    this.form.controls.linkedTo.setValue(formatRunbookTargetLabel(inst))
  }

  applyTemplate = (tpl: RunbookTemplate): void => {
    this.selectedTemplate.set(tpl.id)
    const rec = tpl.linkedTo
      ? matchInstancesForRunbook(this.data.instances, tpl.linkedTo)
      : []
    const inst = rec[0] ?? this.data.instances[0]
    this.form.patchValue({
      name: tpl.id === 'blank' ? '' : tpl.label,
      description: tpl.description,
      category: tpl.category,
      linkedTo: inst ? formatRunbookTargetLabel(inst) : tpl.linkedTo || '',
      instanceId: inst?.id ?? '',
      owner: 'SRE',
      trigger: tpl.trigger,
      tagsText: tpl.tags.join(', '),
      requiresApproval: tpl.requiresApproval,
    })
    this.stepsArray.clear()
    tpl.steps.forEach((s) => {
      this.stepsArray.push(buildStepGroup(this.fb, s.title, s.type, s.command ?? ''))
    })
  }

  addStep = (): void => {
    this.stepsArray.push(buildStepGroup(this.fb, 'Nuevo paso', 'check', ''))
  }

  removeStep = (index: number): void => {
    if (this.stepsArray.length <= 1) return
    this.stepsArray.removeAt(index)
  }

  confirm = (): void => {
    if (this.form.invalid) return
    const v = this.form.getRawValue()
    const tags = v.tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    const steps: RunbookStep[] = v.steps.map((s, i) => ({
      order: i + 1,
      title: s.title.trim(),
      type: s.type,
      command: s.command?.trim() || undefined,
    }))
    const inst = this.data.instances.find((i) => i.id === v.instanceId)
    this.dialogRef.close({
      name: v.name.trim(),
      description: v.description.trim(),
      category: v.category,
      linkedTo: inst ? formatRunbookTargetLabel(inst) : v.linkedTo.trim(),
      instanceId: inst?.id,
      defaultProvider: inst ? String(inst.provider) : undefined,
      defaultAccountName: inst?.accountName,
      owner: v.owner.trim(),
      trigger: v.trigger,
      requiresApproval: v.requiresApproval,
      tags: tags.length ? tags : ['custom'],
      steps,
    })
  }

}
