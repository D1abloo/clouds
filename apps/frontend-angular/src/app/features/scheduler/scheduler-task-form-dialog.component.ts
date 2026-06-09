import { Component, computed, inject, signal } from '@angular/core'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatSelectModule } from '@angular/material/select'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { MatTooltipModule } from '@angular/material/tooltip'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import type { NavLogoKey } from '../../shared/theme/nav-logo.types'
import {
  SCHEDULER_TYPE_LABELS,
  type SchedulerCloudProvider,
  type SchedulerEnvironment,
  type SchedulerPriority,
  type SchedulerTask,
  type SchedulerTaskType,
  type SchedulerTimeoutAction,
  type SchedulerRetryBackoff,
} from './scheduler.data'
import {
  ENVIRONMENT_HINTS,
  EXECUTOR_OPTIONS,
  FORM_SECTIONS,
  NOTIFY_CHANNEL_DEFS,
  OWNER_PRESETS,
  RETRY_BACKOFF_OPTIONS,
  CLOUD_PROVIDERS,
  CLOUD_PROVIDER_LABELS,
  SCHEDULER_TYPE_LOGO,
  CREDENTIAL_PROFILE_LOGO,
  EXECUTOR_LOGO,
  inferTargetLogo,
  TYPE_FORM_DEFAULTS,
} from './scheduler-form.config'
import {
  buildNotifyChannels,
  buildTaskFromForm,
  cronToHuman,
  ENVIRONMENT_LABELS,
  formatNextRunFromCron,
  inferCloudProvider,
  parseNotifyChannels,
  PRIORITY_LABELS,
  TIMEOUT_ACTION_LABELS,
  validateCron,
  type SchedulerTaskFormValue,
} from './scheduler.util'

export type SchedulerTaskFormDialogMode = 'create' | 'edit'

export interface SchedulerTaskFormDialogData {
  mode: SchedulerTaskFormDialogMode
  task?: SchedulerTask
}

export interface SchedulerTaskFormDialogResult {
  task: SchedulerTask
  runOnceAfterSave: boolean
}

const TYPES: SchedulerTaskType[] = [
  'instance',
  'jenkins',
  'ssh',
  'backup',
  'sync',
  'report',
  'docker',
  'runbook',
]

const TYPE_ICON: Record<SchedulerTaskType, string> = {
  instance: 'dns',
  jenkins: 'build',
  ssh: 'terminal',
  backup: 'backup',
  sync: 'sync',
  report: 'assessment',
  docker: 'view_in_ar',
  runbook: 'auto_stories',
}

const TYPE_HINTS: Record<SchedulerTaskType, string> = {
  instance: 'Acciones sobre VMs, ASG o instancias cloud.',
  jenkins: 'Dispara jobs o pipelines en Jenkins.',
  ssh: 'Ejecuta scripts remotos vía SSH en inventario.',
  backup: 'Snapshots, copias y verificación de integridad.',
  sync: 'Sincroniza catálogos, inventario o metadatos.',
  report: 'Genera informes programados (PDF, CSV, API).',
  docker: 'Operaciones en hosts o registros Docker.',
  runbook: 'Encadena pasos aprobados desde un runbook.',
}

const CRON_OPTIONS = [
  { value: '*/30 * * * *', label: 'Cada 30 minutos' },
  { value: '*/15 * * * *', label: 'Cada 15 minutos' },
  { value: '0 */6 * * *', label: 'Cada 6 horas' },
  { value: '15 */2 * * *', label: 'Cada 2 h (min 15)' },
  { value: '0 2 * * *', label: 'Diario 02:00' },
  { value: '0 3 * * *', label: 'Diario 03:00' },
  { value: '0 7 * * 1-5', label: 'Lun–Vie 07:00' },
  { value: '0 22 * * 1-5', label: 'Lun–Vie 22:00' },
  { value: '0 4 * * 0', label: 'Domingo 04:00' },
  { value: '0 8 * * 1', label: 'Lunes 08:00' },
  { value: '0 6 * * 6', label: 'Sábado 06:00' },
  { value: '30 3 1 * *', label: 'Mensual día 1' },
]

const CREDENTIAL_PROFILES = [
  { value: '', label: 'Por defecto del agente' },
  { value: 'aws-prod-readonly', label: 'AWS prod (solo lectura)' },
  { value: 'aws-prod-ops', label: 'AWS prod (operaciones)' },
  { value: 'gcp-shared-sa', label: 'GCP cuenta compartida' },
  { value: 'jenkins-deploy', label: 'Jenkins deploy token' },
  { value: 'ssh-bastion-root', label: 'SSH bastion (restringido)' },
  { value: 'vault-app-role', label: 'Vault AppRole' },
]

const TIMEZONES = [
  'Europe/Madrid',
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Asia/Tokyo',
]

const SECTION_ICON: Record<string, string> = {
  identity: 'fingerprint',
  schedule: 'event_repeat',
  target: 'ads_click',
  exec: 'terminal',
  owners: 'group',
  policy: 'tune',
}

@Component({
  selector: 'app-scheduler-task-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTooltipModule,
    BrandLogoComponent,
  ],
  template: `
    <div class="sch-form" [class.sch-form--create]="data.mode === 'create'" [formGroup]="form">
      <header class="sch-form__header">
        <div class="sch-form__header-row">
          <div class="sch-form__header-copy">
            <span class="sch-form__eyebrow">{{ data.mode === 'create' ? 'Programador' : 'Edición' }}</span>
            <h2>{{ data.mode === 'create' ? 'Nueva programación' : 'Editar programación' }}</h2>
            <div class="sch-form__header-meta">
              <span class="sch-form__step-badge">Paso {{ activeStepNum() }}/{{ sections.length }}</span>
              <span>{{ activeSectionLabel() }}</span>
            </div>
          </div>
          <div class="sch-form__header-brand">
            @if (typeLogo(selectedType()); as logo) {
              <app-brand-logo [logo]="logo" size="md" />
            } @else {
              <mat-icon>{{ typeIcon(selectedType()) }}</mat-icon>
            }
            <div class="sch-form__header-clouds" aria-label="Proveedores cloud">
              @for (cloud of cloudProviders; track cloud.id) {
                <span
                  class="sch-form__header-cloud"
                  [class.sch-form__header-cloud--on]="selectedCloud() === cloud.id"
                  [attr.aria-label]="cloud.label"
                  [attr.aria-current]="selectedCloud() === cloud.id ? 'true' : null"
                >
                  <app-brand-logo [logo]="cloud.id" size="sm" />
                </span>
              }
            </div>
          </div>
        </div>
        <div class="sch-form__progress" role="progressbar" [attr.aria-valuenow]="activeStepNum()" aria-valuemin="1" [attr.aria-valuemax]="sections.length">
          <span class="sch-form__progress-fill" [style.width.%]="progressPct()"></span>
        </div>
      </header>

      <mat-dialog-content class="sch-form__layout">
        <nav class="sch-form__rail" aria-label="Secciones del formulario">
          @for (sec of sections; track sec.id) {
            <button
              type="button"
              class="sch-form__rail-item"
              [class.sch-form__rail-item--on]="activeSection() === sec.id"
              [class.sch-form__rail-item--done]="sectionDone(sec.id)"
              (click)="scrollToSection(sec.id)"
            >
              <span class="sch-form__rail-icon">
                @if (sectionDone(sec.id)) {
                  <mat-icon>check</mat-icon>
                } @else {
                  <mat-icon>{{ sectionIcon(sec.id) }}</mat-icon>
                }
              </span>
              <span class="sch-form__rail-text">
                <span class="sch-form__rail-num">{{ sec.num }}</span>
                {{ sec.label }}
              </span>
            </button>
          }
        </nav>

        <div class="sch-form__main" (scroll)="handleMainScroll()">
          <section class="sch-form__panel" id="sch-sec-identity" aria-labelledby="sch-sec-identity-title">
            <div class="sch-form__panel-head">
              <h3 id="sch-sec-identity-title">Identidad y alcance</h3>
              <p>Nombre, tipo de acción, proveedor cloud, entorno y etiquetas.</p>
            </div>
            <div class="sch-form__grid">
              <mat-form-field appearance="outline" class="sch-form__full">
                <mat-label>Nombre de la programación</mat-label>
                <input matInput formControlName="name" placeholder="ej. Backup RDS producción" />
                <mat-hint>Máx. 80 caracteres · visible en listados y alertas</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline" class="sch-form__full">
                <mat-label>Descripción operativa</mat-label>
                <textarea matInput rows="3" formControlName="description" placeholder="Qué hace, impacto y dependencias…"></textarea>
              </mat-form-field>
            </div>

            <p class="sch-form__field-label">Tipo de tarea</p>
            <div class="sch-form__type-matrix" role="radiogroup" aria-label="Tipo de tarea">
              @for (t of types; track t) {
                <button
                  type="button"
                  class="sch-form__type-opt"
                  [class.sch-form__type-opt--on]="selectedType() === t"
                  [attr.aria-pressed]="selectedType() === t"
                  (click)="selectType(t)"
                >
                  <span class="sch-form__type-opt-logo">
                    @if (typeLogo(t); as logo) {
                      <app-brand-logo [logo]="logo" size="md" />
                    } @else {
                      <mat-icon>{{ typeIcon(t) }}</mat-icon>
                    }
                  </span>
                  <span class="sch-form__type-opt-copy">
                    <strong>{{ typeLabels[t] }}</strong>
                    <span>{{ typeHint(t) }}</span>
                  </span>
                </button>
              }
            </div>

            <div class="sch-form__cloud-block">
              <p class="sch-form__field-label">Proveedor cloud</p>
              <div class="sch-form__cloud-grid" role="radiogroup" aria-label="Proveedor cloud">
                @for (cloud of cloudProviders; track cloud.id) {
                  <button
                    type="button"
                    class="sch-form__cloud-card"
                    [class.sch-form__cloud-card--on]="selectedCloud() === cloud.id"
                    [attr.aria-pressed]="selectedCloud() === cloud.id"
                    (click)="selectCloud(cloud.id)"
                  >
                    <span class="sch-form__cloud-card-logo">
                      <app-brand-logo [logo]="cloud.id" size="lg" />
                    </span>
                    <span class="sch-form__cloud-card-copy">
                      <strong>{{ cloud.shortLabel }}</strong>
                      <span>{{ cloud.services }}</span>
                      <span class="sch-form__cloud-card-hint">{{ cloud.hint }}</span>
                    </span>
                    @if (selectedCloud() === cloud.id) {
                      <mat-icon class="sch-form__cloud-card-check" aria-hidden="true">check_circle</mat-icon>
                    }
                  </button>
                }
              </div>

              <div class="sch-form__scope-row">
                <div class="sch-form__scope-col">
                  <p class="sch-form__field-label">Entorno</p>
                  <div class="sch-form__env-picks" role="radiogroup" aria-label="Entorno de despliegue">
                    @for (env of environments; track env) {
                      <button
                        type="button"
                        class="sch-form__env-pick"
                        [class.sch-form__env-pick--on]="form.get('environment')?.value === env"
                        [attr.aria-pressed]="form.get('environment')?.value === env"
                        (click)="selectEnvironment(env)"
                      >
                        {{ envLabels[env] }}
                      </button>
                    }
                  </div>
                </div>
                <mat-form-field appearance="outline" class="sch-form__scope-priority">
                  <mat-label>Prioridad</mat-label>
                  <mat-select formControlName="priority">
                    @for (p of priorities; track p) {
                      <mat-option [value]="p">{{ prioLabels[p] }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline" class="sch-form__full sch-form__tags-field">
                <mat-label>Etiquetas</mat-label>
                <input matInput formControlName="tags" placeholder="prod, nightly, dba" />
                <mat-hint>Separadas por coma</mat-hint>
              </mat-form-field>

              <p class="sch-form__scope-summary">
                <app-brand-logo [logo]="selectedCloud()" size="sm" />
                <span class="sch-form__scope-summary-main">
                  {{ cloudLabel(selectedCloud()) }} · {{ envLabel(form.get('environment')?.value) }}
                </span>
                <span class="sch-form__scope-summary-hint">{{ environmentHint(form.get('environment')?.value) }}</span>
              </p>
            </div>
          </section>

          <section class="sch-form__panel" id="sch-sec-schedule" aria-labelledby="sch-sec-schedule-title">
            <div class="sch-form__panel-head">
              <h3 id="sch-sec-schedule-title">Calendario</h3>
              <p>Cron, zona horaria y ventana de mantenimiento.</p>
            </div>
            <div class="sch-form__grid">
              <mat-form-field appearance="outline">
                <mat-label>Modo cron</mat-label>
                <mat-select formControlName="cronMode">
                  <mat-option value="preset">Plantilla predefinida</mat-option>
                  <mat-option value="custom">Expresión personalizada</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Zona horaria</mat-label>
                <mat-select formControlName="timezone">
                  @for (tz of timezones; track tz) {
                    <mat-option [value]="tz">{{ tz }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              @if (form.get('cronMode')?.value === 'preset') {
                <mat-form-field appearance="outline" class="sch-form__full">
                  <mat-label>Plantilla cron</mat-label>
                  <mat-select formControlName="cron">
                    @for (c of cronOptions; track c.value) {
                      <mat-option [value]="c.value">{{ c.label }} · <span class="mono">{{ c.value }}</span></mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              } @else {
                <mat-form-field appearance="outline" class="sch-form__full">
                  <mat-label>Expresión cron (5 campos)</mat-label>
                  <input matInput formControlName="cronCustom" class="mono" placeholder="0 2 * * *" />
                  <mat-hint>minuto hora día-mes mes día-semana</mat-hint>
                </mat-form-field>
              }
              <mat-form-field appearance="outline" class="sch-form__full">
                <mat-label>Ventana de mantenimiento</mat-label>
                <input matInput formControlName="maintenanceWindow" placeholder="ej. Dom 02:00–05:00 Europe/Madrid" />
                <mat-hint>Opcional · la ejecución se pospone fuera de ventana</mat-hint>
              </mat-form-field>
            </div>
            <div class="sch-form__cron-preview" [class.sch-form__cron-preview--err]="!cronValid().valid">
              <mat-icon>{{ cronValid().valid ? 'schedule' : 'error_outline' }}</mat-icon>
              <div>
                <span class="sch-form__cron-preview-label">Próxima ejecución estimada</span>
                @if (cronValid().valid) {
                  <strong>{{ cronPreview() }} · {{ nextRunEstimate() }}</strong>
                  <span class="mono sch-form__cron-expr">{{ effectiveCron() }} · {{ form.get('timezone')?.value }}</span>
                } @else {
                  <strong class="sch-form__cron-err">{{ cronValid().error }}</strong>
                }
              </div>
            </div>
          </section>

          <section class="sch-form__panel" id="sch-sec-target" aria-labelledby="sch-sec-target-title">
            <div class="sch-form__panel-head">
              <h3 id="sch-sec-target-title">Objetivo</h3>
              <p>Recurso, credenciales y documentación.</p>
            </div>

            <p class="sch-form__field-label">Objetivos frecuentes ({{ typeLabels[selectedType()] }})</p>
            <div class="sch-form__target-picks">
              @for (opt of targetOptions(); track opt) {
                <button
                  type="button"
                  class="sch-form__target-pick"
                  [class.sch-form__target-pick--on]="form.get('target')?.value === opt"
                  (click)="pickTarget(opt)"
                >
                  @if (targetLogo(opt); as logo) {
                    <app-brand-logo [logo]="logo" size="sm" />
                  }
                  {{ opt }}
                </button>
              }
            </div>

            <div class="sch-form__grid">
              <mat-form-field appearance="outline" class="sch-form__full">
                <mat-label>Objetivo / destino</mat-label>
                <input matInput formControlName="target" placeholder="host, cluster, bucket, job name…" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="sch-form__full">
                <mat-label>Recurso vinculado en plataforma</mat-label>
                <input matInput formControlName="linkedResource" placeholder="Runbook, RDS, inventario…" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Perfil de credenciales</mat-label>
                <mat-select formControlName="credentialProfile">
                  @for (c of credentialProfiles; track c.value) {
                    <mat-option [value]="c.value">
                      <span class="sch-form__select-opt">
                        @if (credentialLogo(c.value); as logo) {
                          <app-brand-logo [logo]="logo" size="sm" />
                        }
                        {{ c.label }}
                      </span>
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Directorio de trabajo</mat-label>
                <input matInput formControlName="workingDirectory" class="mono" placeholder="/opt/scripts" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="sch-form__full">
                <mat-label>URL documentación / runbook</mat-label>
                <input matInput formControlName="documentationUrl" placeholder="https://wiki…/procedimiento" />
              </mat-form-field>
            </div>
          </section>

          <section class="sch-form__panel" id="sch-sec-exec" aria-labelledby="sch-sec-exec-title">
            <div class="sch-form__panel-head">
              <h3 id="sch-sec-exec-title">Ejecución</h3>
              <p>Comando, límites, agente y reintentos.</p>
            </div>
            <div class="sch-form__grid">
              <mat-form-field appearance="outline" class="sch-form__full">
                <mat-label>Comando o script</mat-label>
                <textarea matInput rows="2" formControlName="command" class="mono" placeholder="jenkins build … / ./backup.sh"></textarea>
              </mat-form-field>
              <mat-form-field appearance="outline" class="sch-form__full">
                <mat-label>Parámetros</mat-label>
                <textarea matInput rows="2" formControlName="parameters" class="mono" placeholder="KEY=value o JSON"></textarea>
                <mat-hint>Variables de entorno o argumentos del runner</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Reintentos</mat-label>
                <input matInput type="number" min="0" max="10" formControlName="retries" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Duración máxima</mat-label>
                <input matInput formControlName="maxDuration" placeholder="30m, 1h30m" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Concurrencia</mat-label>
                <input matInput type="number" min="1" max="20" formControlName="concurrency" />
                <mat-hint>Ejecuciones simultáneas</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Si excede tiempo</mat-label>
                <mat-select formControlName="timeoutAction">
                  @for (a of timeoutActions; track a) {
                    <mat-option [value]="a">{{ timeoutLabels[a] }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Executor / agente</mat-label>
                <mat-select formControlName="executor">
                  @for (ex of executors; track ex.value) {
                    <mat-option [value]="ex.value">
                      <span class="sch-form__select-opt">
                        @if (executorLogo(ex.value); as logo) {
                          <app-brand-logo [logo]="logo" size="sm" />
                        }
                        {{ ex.label }}
                      </span>
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Backoff reintentos</mat-label>
                <mat-select formControlName="retryBackoff">
                  @for (rb of retryBackoffOptions; track rb.value) {
                    <mat-option [value]="rb.value">{{ rb.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>
          </section>

          <section class="sch-form__panel" id="sch-sec-owners" aria-labelledby="sch-sec-owners-title">
            <div class="sch-form__panel-head">
              <h3 id="sch-sec-owners-title">Responsables</h3>
              <p>Propietario funcional y contacto operativo.</p>
            </div>
            <div class="sch-form__owner-picks">
              @for (o of ownerPresets; track o) {
                <button
                  type="button"
                  class="sch-form__owner-pick"
                  [class.sch-form__owner-pick--on]="form.get('owner')?.value === o"
                  (click)="form.patchValue({ owner: o })"
                >
                  {{ o }}
                </button>
              }
            </div>
            <div class="sch-form__grid">
              <mat-form-field appearance="outline">
                <mat-label>Propietario / equipo</mat-label>
                <input matInput formControlName="owner" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Asignado a (email)</mat-label>
                <input matInput type="email" formControlName="assignee" />
              </mat-form-field>
            </div>
          </section>

          <section class="sch-form__panel sch-form__panel--last" id="sch-sec-policy" aria-labelledby="sch-sec-policy-title">
            <div class="sch-form__panel-head">
              <h3 id="sch-sec-policy-title">Política y alertas</h3>
              <p>Estado, notificaciones y comportamiento en solapamiento.</p>
            </div>
            <div class="sch-form__policy-list">
              <div class="sch-form__toggle-row">
                <mat-slide-toggle formControlName="enabled">Programación activa</mat-slide-toggle>
                <span>Disparos automáticos según cron</span>
              </div>
              <div class="sch-form__toggle-row">
                <mat-slide-toggle formControlName="skipIfRunning">Omitir si ya está en ejecución</mat-slide-toggle>
                <span>Evita solapamientos</span>
              </div>
              <div class="sch-form__toggle-row">
                <mat-slide-toggle formControlName="notifyOnFailure">Notificar si falla</mat-slide-toggle>
                <span>Alerta al equipo asignado</span>
              </div>
              <div class="sch-form__toggle-row">
                <mat-slide-toggle formControlName="notifyOnSuccess">Notificar al completar</mat-slide-toggle>
                <span>Confirmación de éxito</span>
              </div>
            </div>

            <p class="sch-form__field-label">Canales de notificación</p>
            <div class="sch-form__channels">
              @for (ch of channelDefs; track ch.id) {
                <div class="sch-form__channel" [class.sch-form__channel--on]="channelState[ch.id].enabled">
                  <button type="button" class="sch-form__channel-toggle" (click)="toggleChannel(ch.id)">
                    <mat-icon>{{ ch.icon }}</mat-icon>
                    {{ ch.label }}
                  </button>
                  @if (channelState[ch.id].enabled) {
                    <input
                      class="sch-form__channel-input mono"
                      [value]="channelState[ch.id].dest"
                      [placeholder]="ch.placeholder"
                      (input)="updateChannelDest(ch.id, $any($event.target).value)"
                    />
                  }
                </div>
              }
            </div>
            <p class="sch-form__channels-preview mono">{{ notifyChannelsPreview() || 'Sin canales activos' }}</p>

            @if (data.mode === 'create') {
              <div class="sch-form__toggle-row sch-form__toggle-row--highlight">
                <mat-slide-toggle formControlName="runOnceAfterSave">Ejecutar una vez al crear</mat-slide-toggle>
                <span>Lanza ejecución justo después de guardar</span>
              </div>
            }
          </section>
        </div>

        <aside class="sch-form__aside" aria-label="Vista previa">
          <div class="sch-form__preview">
            <div class="sch-form__preview-head">
              @if (typeLogo(selectedType()); as logo) {
                <span class="sch-form__preview-logo"><app-brand-logo [logo]="logo" size="md" /></span>
              }
              <div class="sch-form__preview-titles">
                <strong class="sch-form__preview-name">{{ form.get('name')?.value || 'Sin nombre' }}</strong>
                <span>{{ typeLabels[selectedType()] }} · {{ cloudShortLabel(selectedCloud()) }} · {{ envLabel(form.get('environment')?.value) }}</span>
              </div>
            </div>

            <div class="sch-form__preview-clouds" aria-label="Cloud seleccionado">
              @for (cloud of cloudProviders; track cloud.id) {
                <span
                  class="sch-form__preview-cloud-chip"
                  [class.sch-form__preview-cloud-chip--on]="selectedCloud() === cloud.id"
                >
                  <app-brand-logo [logo]="cloud.id" size="sm" />
                  {{ cloud.shortLabel }}
                </span>
              }
            </div>

            <ul class="sch-form__preview-rows">
              <li>
                <span>Cron</span>
                <code class="mono">{{ effectiveCron() || '—' }}</code>
              </li>
              <li>
                <span>Próxima</span>
                <strong>{{ cronValid().valid ? nextRunEstimate() : '—' }}</strong>
              </li>
              <li>
                <span>Objetivo</span>
                <code class="mono">{{ form.get('target')?.value || '—' }}</code>
              </li>
              <li>
                <span>Prioridad</span>
                <strong>{{ prioLabel(form.get('priority')?.value) }}</strong>
              </li>
              <li>
                <span>Estado</span>
                <strong>{{ form.get('enabled')?.value ? 'Activa' : 'Pausada' }}</strong>
              </li>
            </ul>

            @if (form.get('command')?.value) {
              <div class="sch-form__preview-cmd">
                <span>Comando</span>
                <code class="mono">{{ form.get('command')?.value }}</code>
              </div>
            }

            <div class="sch-form__checklist">
              <span class="sch-form__checklist-title">Validación</span>
              <ul>
                <li [class.sch-form__check--ok]="!!form.get('name')?.value">
                  <mat-icon>{{ form.get('name')?.value ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                  Nombre
                </li>
                <li [class.sch-form__check--ok]="!!form.get('target')?.value">
                  <mat-icon>{{ form.get('target')?.value ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                  Objetivo
                </li>
                <li [class.sch-form__check--ok]="cronValid().valid">
                  <mat-icon>{{ cronValid().valid ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                  Cron
                </li>
                <li [class.sch-form__check--ok]="form.valid && cronValid().valid">
                  <mat-icon>{{ form.valid && cronValid().valid ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                  Listo
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </mat-dialog-content>

      <mat-dialog-actions class="sch-form__actions">
        <div class="sch-form__actions-left">
          <span class="sch-form__actions-progress">{{ checklistOkCount() }}/4 requisitos</span>
          <div class="sch-form__actions-nav">
            @if (hasPrevSection()) {
              <button type="button" mat-stroked-button class="sch-form__nav-btn" (click)="prevSection()">
                <mat-icon>chevron_left</mat-icon>
                Anterior
              </button>
            }
            @if (hasNextSection()) {
              <button type="button" mat-stroked-button class="sch-form__nav-btn" (click)="nextSection()">
                Siguiente
                <mat-icon>chevron_right</mat-icon>
              </button>
            }
          </div>
        </div>
        <div class="sch-form__actions-btns">
          <button type="button" mat-button (click)="dialogRef.close()">Cancelar</button>
          <button
            type="button"
            mat-flat-button
            color="primary"
            class="sch-form__submit"
            [disabled]="!canSave()"
            (click)="handleSave()"
          >
            <mat-icon>{{ data.mode === 'create' ? 'add' : 'save' }}</mat-icon>
            {{ data.mode === 'create' ? 'Crear programación' : 'Guardar cambios' }}
          </button>
        </div>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    :host {
      display: block;
      font-size: 0.8125rem;
      line-height: 1.45;
      -webkit-font-smoothing: antialiased;
    }
    .sch-form {
      --sch-border: #e2e8f0;
      --sch-text: #0f172a;
      --sch-muted: #64748b;
      --sch-surface: #f8fafc;
      --sch-fs-2xs: 0.5rem;
      --sch-fs-xs: 0.5625rem;
      --sch-fs-sm: 0.625rem;
      --sch-fs-md: 0.6875rem;
      --sch-fs-base: 0.75rem;
      --sch-fs-lg: 0.8125rem;
      --sch-fs-xl: 0.875rem;
      color: var(--sch-text);
      display: flex;
      flex-direction: column;
      max-height: min(92vh, 820px);
      overflow: hidden;
      background: #fff;
    }
    .sch-form ::ng-deep .mat-mdc-form-field {
      font-size: var(--sch-fs-base);
    }
    .sch-form ::ng-deep .mat-mdc-form-field-infix {
      min-height: 36px;
      padding-top: 6px !important;
      padding-bottom: 6px !important;
    }
    .sch-form ::ng-deep .mat-mdc-form-field-subscript-wrapper {
      font-size: var(--sch-fs-xs);
    }
    .sch-form ::ng-deep .mat-mdc-floating-label {
      font-size: var(--sch-fs-base);
    }
    .sch-form ::ng-deep .mat-mdc-slide-toggle .mdc-label {
      font-size: var(--sch-fs-base);
      font-weight: 600;
    }
    .sch-form ::ng-deep .mat-mdc-button,
    .sch-form ::ng-deep .mat-mdc-unelevated-button {
      font-size: var(--sch-fs-base);
    }
    .sch-form__header {
      flex-shrink: 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .sch-form__header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.65rem 1rem 0.55rem;
    }
    .sch-form__eyebrow {
      display: block;
      margin-bottom: 0.12rem;
      font-size: var(--sch-fs-2xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #94a3b8;
    }
    .sch-form__header-copy h2 {
      margin: 0;
      font-size: var(--sch-fs-xl);
      font-weight: 700;
      letter-spacing: -0.02em;
      line-height: 1.25;
    }
    .sch-form__header-copy p {
      margin: 0.15rem 0 0;
      font-size: var(--sch-fs-sm);
      color: var(--sch-muted);
    }
    .sch-form__header-meta {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-top: 0.2rem;
      font-size: var(--sch-fs-sm);
      color: var(--sch-muted);
    }
    .sch-form__step-badge {
      padding: 0.1rem 0.38rem;
      border-radius: 999px;
      font-size: var(--sch-fs-2xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--sch-text);
      background: var(--sch-surface);
    }
    .sch-form__header-brand {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.35rem 0.45rem;
      border-radius: 8px;
      background: var(--sch-surface);
      flex-shrink: 0;
    }
    .sch-form__header-clouds {
      display: flex;
      align-items: center;
      gap: 0.2rem;
      padding-left: 0.35rem;
      border-left: 1px solid #e2e8f0;
    }
    .sch-form__header-cloud {
      display: grid;
      place-items: center;
      width: 1.35rem;
      height: 1.35rem;
      border-radius: 6px;
      opacity: 0.35;
      filter: grayscale(0.6);
      transition: opacity 0.15s, filter 0.15s, background 0.15s;
    }
    .sch-form__header-cloud--on {
      opacity: 1;
      filter: none;
      background: #fff;
      box-shadow: 0 0 0 1px #cbd5e1;
    }
    .sch-form__header-brand mat-icon {
      font-size: 1.25rem;
      width: 1.25rem;
      height: 1.25rem;
      color: var(--sch-muted);
    }
    .sch-form__progress {
      height: 2px;
      background: #f1f5f9;
    }
    .sch-form__progress-fill {
      display: block;
      height: 100%;
      background: #334155;
      transition: width 0.2s ease;
    }
    .sch-form__layout {
      display: grid !important;
      grid-template-columns: 136px minmax(0, 1fr) minmax(196px, 220px);
      grid-template-rows: minmax(0, 1fr);
      flex: 1 1 auto;
      min-height: 0;
      padding: 0 !important;
      margin: 0 !important;
      max-height: none !important;
      overflow: hidden !important;
      background: #fafbfc;
    }
    .sch-form__rail {
      display: flex;
      flex-direction: column;
      gap: 0;
      padding: 0.55rem 0.4rem;
      background: #fff;
      min-height: 0;
      overflow-y: auto;
      scrollbar-width: thin;
      border-right: 1px solid #f1f5f9;
    }
    .sch-form__rail-item {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      width: 100%;
      padding: 0.38rem 0.42rem;
      border: none;
      border-radius: 7px;
      border-left: 2px solid transparent;
      background: transparent;
      text-align: left;
      font: inherit;
      cursor: pointer;
      color: var(--sch-muted);
      transition: background 0.12s, border-color 0.12s, color 0.12s;
    }
    .sch-form__rail-item:hover {
      background: #eef2f6;
      color: var(--sch-text);
    }
    .sch-form__rail-item--on {
      background: #fff;
      color: var(--sch-text);
      border-left-color: #334155;
    }
    .sch-form__rail-item--done:not(.sch-form__rail-item--on) {
      color: var(--sch-text);
    }
    .sch-form__rail-icon {
      display: grid;
      place-items: center;
      width: 1.25rem;
      height: 1.25rem;
      flex-shrink: 0;
    }
    .sch-form__rail-icon mat-icon {
      font-size: 0.875rem;
      width: 0.875rem;
      height: 0.875rem;
    }
    .sch-form__rail-text {
      display: flex;
      flex-direction: column;
      gap: 0.02rem;
      font-size: var(--sch-fs-sm);
      font-weight: 600;
      line-height: 1.25;
    }
    .sch-form__rail-num {
      font-size: var(--sch-fs-2xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #94a3b8;
    }
    .sch-form__main {
      padding: 0.55rem 0.65rem 0.75rem;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      scrollbar-width: thin;
    }
    .sch-form__panel {
      margin-bottom: 0.55rem;
      padding: 0.65rem 0.7rem 0.7rem;
      border-radius: 10px;
      background: #fff;
      box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
    }
    .sch-form__panel--last {
      margin-bottom: 0;
    }
    .sch-form__panel-head {
      margin-bottom: 0.5rem;
    }
    .sch-form__panel-head h3 {
      margin: 0;
      font-size: var(--sch-fs-lg);
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .sch-form__panel-head p {
      margin: 0.1rem 0 0;
      font-size: var(--sch-fs-sm);
      color: var(--sch-muted);
    }
    .sch-form__field-label {
      margin: 0.35rem 0 0.28rem;
      font-size: var(--sch-fs-2xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #94a3b8;
    }
    .sch-form__type-matrix {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.35rem;
      margin-bottom: 0.35rem;
    }
    .sch-form__type-opt {
      display: flex;
      align-items: flex-start;
      gap: 0.4rem;
      padding: 0.45rem 0.5rem;
      border: none;
      border-radius: 8px;
      background: var(--sch-surface);
      text-align: left;
      font: inherit;
      cursor: pointer;
      transition: background 0.12s, box-shadow 0.12s;
    }
    .sch-form__type-opt:hover {
      background: #eef2f6;
    }
    .sch-form__type-opt--on {
      background: #fff;
      box-shadow: inset 0 0 0 1.5px #334155;
    }
    .sch-form__type-opt-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.5rem;
      height: 1.5rem;
      flex-shrink: 0;
    }
    .sch-form__type-opt-logo mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: var(--sch-muted);
    }
    .sch-form__type-opt-copy {
      flex: 1;
      min-width: 0;
    }
    .sch-form__type-opt-copy strong {
      display: block;
      font-size: var(--sch-fs-sm);
      font-weight: 650;
      line-height: 1.25;
    }
    .sch-form__type-opt-copy span {
      display: block;
      margin-top: 0.08rem;
      font-size: var(--sch-fs-2xs);
      color: var(--sch-muted);
      line-height: 1.35;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .sch-form__select-opt {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: var(--sch-fs-base);
    }
    .sch-form__grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 0.45rem;
    }
    .sch-form__grid--after-types {
      margin-top: 0.4rem;
    }
    .sch-form__cloud-block {
      margin-top: 0.45rem;
      padding: 0.55rem 0.6rem 0.6rem;
      border-radius: 10px;
      background: linear-gradient(180deg, #f8fafc 0%, #fff 100%);
      box-shadow: inset 0 0 0 1px #e2e8f0;
    }
    .sch-form__cloud-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.35rem;
      margin-bottom: 0.5rem;
    }
    .sch-form__cloud-card {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.35rem;
      padding: 0.5rem 0.45rem 0.55rem;
      border: none;
      border-radius: 9px;
      background: #fff;
      text-align: left;
      font: inherit;
      cursor: pointer;
      box-shadow: inset 0 0 0 1px #e2e8f0;
      transition: box-shadow 0.15s, background 0.15s, transform 0.12s;
    }
    .sch-form__cloud-card:hover {
      background: #f8fafc;
      box-shadow: inset 0 0 0 1px #cbd5e1;
    }
    .sch-form__cloud-card--on {
      background: #fff;
      box-shadow: inset 0 0 0 2px #334155;
    }
    .sch-form__cloud-card-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
    }
    .sch-form__cloud-card-copy {
      display: flex;
      flex-direction: column;
      gap: 0.06rem;
      min-width: 0;
    }
    .sch-form__cloud-card-copy strong {
      font-size: var(--sch-fs-base);
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .sch-form__cloud-card-copy span {
      font-size: var(--sch-fs-2xs);
      color: var(--sch-muted);
      line-height: 1.3;
    }
    .sch-form__cloud-card-hint {
      display: none;
    }
    .sch-form__cloud-card-check {
      position: absolute;
      top: 0.35rem;
      right: 0.35rem;
      font-size: 0.75rem !important;
      width: 0.75rem !important;
      height: 0.75rem !important;
      color: #334155;
    }
    .sch-form__scope-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 140px;
      gap: 0.45rem;
      align-items: end;
      margin-bottom: 0.15rem;
    }
    .sch-form__scope-col {
      min-width: 0;
    }
    .sch-form__scope-priority {
      width: 100%;
    }
    .sch-form__env-picks {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
    }
    .sch-form__env-pick {
      padding: 0.22rem 0.55rem;
      border: none;
      border-radius: 999px;
      background: #fff;
      box-shadow: inset 0 0 0 1px #e2e8f0;
      font: inherit;
      font-size: var(--sch-fs-xs);
      font-weight: 600;
      color: var(--sch-muted);
      cursor: pointer;
      transition: background 0.12s, box-shadow 0.12s, color 0.12s;
    }
    .sch-form__env-pick:hover {
      color: var(--sch-text);
      box-shadow: inset 0 0 0 1px #cbd5e1;
    }
    .sch-form__env-pick--on {
      background: #334155;
      color: #fff;
      box-shadow: none;
      font-weight: 700;
    }
    .sch-form__tags-field {
      margin-top: 0.15rem;
    }
    .sch-form__scope-summary {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.35rem;
      margin: 0.35rem 0 0;
      padding: 0.35rem 0.45rem;
      border-radius: 7px;
      background: #fff;
      box-shadow: inset 0 0 0 1px #f1f5f9;
      font-size: var(--sch-fs-sm);
      color: var(--sch-muted);
    }
    .sch-form__scope-summary-main {
      font-weight: 650;
      color: var(--sch-text);
    }
    .sch-form__scope-summary-hint {
      flex: 1 1 100%;
      font-size: var(--sch-fs-xs);
      line-height: 1.35;
    }
    .sch-form__full {
      grid-column: 1 / -1;
    }
    .sch-form__env-hint {
      display: flex;
      gap: 0.3rem;
      align-items: center;
      margin: 0.28rem 0 0;
      font-size: var(--sch-fs-sm);
      color: var(--sch-muted);
    }
    .sch-form__target-picks,
    .sch-form__owner-picks {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      margin-bottom: 0.35rem;
    }
    .sch-form__target-pick,
    .sch-form__owner-pick {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.18rem 0.42rem;
      border: none;
      border-radius: 999px;
      background: var(--sch-surface);
      font: inherit;
      font-size: var(--sch-fs-xs);
      font-weight: 600;
      color: var(--sch-muted);
      cursor: pointer;
    }
    .sch-form__target-pick--on,
    .sch-form__owner-pick--on {
      background: #e2e8f0;
      color: var(--sch-text);
      font-weight: 700;
    }
    .sch-form__cron-preview {
      display: flex;
      gap: 0.4rem;
      margin-top: 0.4rem;
      padding: 0.45rem 0.55rem;
      border-radius: 7px;
      background: var(--sch-surface);
    }
    .sch-form__cron-preview mat-icon {
      font-size: 0.9rem;
      width: 0.9rem;
      height: 0.9rem;
      color: var(--sch-muted);
      flex-shrink: 0;
    }
    .sch-form__cron-preview--err {
      background: #fef2f2;
    }
    .sch-form__cron-preview-label {
      display: block;
      font-size: var(--sch-fs-2xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--sch-muted);
    }
    .sch-form__cron-preview strong {
      display: block;
      font-size: var(--sch-fs-base);
      font-weight: 650;
      margin-top: 0.06rem;
    }
    .sch-form__cron-expr {
      display: block;
      margin-top: 0.1rem;
      font-size: var(--sch-fs-xs);
      color: var(--sch-muted);
    }
    .sch-form__cron-err {
      color: #b91c1c;
      font-size: var(--sch-fs-sm);
    }
    .sch-form__policy-list {
      display: flex;
      flex-direction: column;
      gap: 0.05rem;
      margin-bottom: 0.5rem;
    }
    .sch-form__toggle-row {
      display: flex;
      flex-direction: column;
      gap: 0.06rem;
      padding: 0.32rem 0;
    }
    .sch-form__toggle-row span {
      font-size: var(--sch-fs-xs);
      color: var(--sch-muted);
      padding-left: 2.5rem;
      line-height: 1.35;
    }
    .sch-form__toggle-row--highlight {
      margin-top: 0.25rem;
      padding-top: 0.45rem;
      border-top: 1px solid #f1f5f9;
    }
    .sch-form__channels {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.28rem;
      margin-bottom: 0.28rem;
    }
    .sch-form__channel {
      padding: 0.28rem 0.35rem;
      border-radius: 7px;
      background: var(--sch-surface);
    }
    .sch-form__channel--on {
      background: #eef2f6;
    }
    .sch-form__channel-toggle {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      width: 100%;
      padding: 0.12rem 0.15rem;
      border: none;
      background: transparent;
      font: inherit;
      font-size: var(--sch-fs-sm);
      font-weight: 650;
      cursor: pointer;
      color: var(--sch-text);
    }
    .sch-form__channel-toggle mat-icon {
      font-size: 0.8rem;
      width: 0.8rem;
      height: 0.8rem;
      color: var(--sch-muted);
    }
    .sch-form__channel-input {
      width: 100%;
      margin-top: 0.15rem;
      padding: 0.22rem 0.32rem;
      border: none;
      border-radius: 5px;
      font-size: var(--sch-fs-xs);
      background: #fff;
    }
    .sch-form__channels-preview {
      margin: 0 0 0.28rem;
      font-size: var(--sch-fs-xs);
      color: var(--sch-muted);
      word-break: break-all;
    }
    .sch-form__aside {
      padding: 0.55rem 0.6rem;
      min-height: 0;
      overflow-y: auto;
      background: #fff;
      border-left: 1px solid #f1f5f9;
      scrollbar-width: thin;
    }
    .sch-form__preview {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
    }
    .sch-form__preview-head {
      display: flex;
      gap: 0.45rem;
      align-items: flex-start;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #f1f5f9;
    }
    .sch-form__preview-logo {
      flex-shrink: 0;
    }
    .sch-form__preview-name {
      display: block;
      font-size: var(--sch-fs-base);
      font-weight: 700;
      line-height: 1.3;
      word-break: break-word;
    }
    .sch-form__preview-titles span {
      display: block;
      margin-top: 0.12rem;
      font-size: var(--sch-fs-xs);
      color: var(--sch-muted);
    }
    .sch-form__preview-clouds {
      display: flex;
      gap: 0.25rem;
    }
    .sch-form__preview-cloud-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      padding: 0.15rem 0.35rem;
      border-radius: 999px;
      font-size: var(--sch-fs-2xs);
      font-weight: 600;
      color: var(--sch-muted);
      background: var(--sch-surface);
      opacity: 0.55;
      filter: grayscale(0.5);
      transition: opacity 0.15s, filter 0.15s, background 0.15s;
    }
    .sch-form__preview-cloud-chip--on {
      opacity: 1;
      filter: none;
      color: var(--sch-text);
      background: #eef2f6;
      font-weight: 700;
    }
    .sch-form__preview-rows {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .sch-form__preview-rows li {
      display: grid;
      grid-template-columns: 3.2rem 1fr;
      gap: 0.35rem;
      align-items: start;
      font-size: var(--sch-fs-sm);
    }
    .sch-form__preview-rows li > span:first-child {
      font-size: var(--sch-fs-2xs);
      font-weight: 650;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #94a3b8;
      padding-top: 0.08rem;
    }
    .sch-form__preview-rows code {
      font-size: var(--sch-fs-xs);
      word-break: break-all;
      line-height: 1.35;
    }
    .sch-form__preview-cmd {
      padding: 0.4rem 0.45rem;
      border-radius: 7px;
      background: var(--sch-surface);
    }
    .sch-form__preview-cmd span {
      display: block;
      margin-bottom: 0.2rem;
      font-size: var(--sch-fs-2xs);
      font-weight: 650;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #94a3b8;
    }
    .sch-form__preview-cmd code {
      display: block;
      font-size: var(--sch-fs-xs);
      line-height: 1.4;
      word-break: break-all;
    }
    .sch-form__checklist {
      margin-top: 0.6rem;
      padding-top: 0.55rem;
      border-top: 1px solid var(--sch-border);
    }
    .sch-form__checklist-title {
      font-size: var(--sch-fs-2xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--sch-muted);
    }
    .sch-form__checklist ul {
      list-style: none;
      margin: 0.28rem 0 0;
      padding: 0;
    }
    .sch-form__checklist li {
      display: flex;
      align-items: center;
      gap: 0.22rem;
      font-size: var(--sch-fs-sm);
      color: var(--sch-muted);
      margin-bottom: 0.15rem;
    }
    .sch-form__checklist li mat-icon {
      font-size: 0.8rem;
      width: 0.8rem;
      height: 0.8rem;
    }
    .sch-form__check--ok {
      color: var(--sch-text);
      font-weight: 600;
    }
    .sch-form__actions {
      display: flex !important;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
      padding: 0.5rem 1rem 0.65rem !important;
      border-top: 1px solid #f1f5f9;
      background: #fff;
    }
    .sch-form__actions-left {
      display: flex;
      flex-direction: column;
      gap: 0.28rem;
    }
    .sch-form__actions-progress {
      font-size: var(--sch-fs-sm);
      font-weight: 600;
      color: var(--sch-muted);
    }
    .sch-form__actions-nav {
      display: flex;
      gap: 0.28rem;
    }
    .sch-form__nav-btn mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }
    .sch-form__actions-btns {
      display: flex;
      gap: 0.3rem;
    }
    .sch-form__submit mat-icon {
      margin-right: 0.15rem;
      font-size: 0.95rem;
      width: 0.95rem;
      height: 0.95rem;
      vertical-align: -2px;
    }
    .mono {
      font-family: var(--app-font-mono, ui-monospace, monospace);
      font-size: 0.9em;
    }
    @media (max-width: 900px) {
      .sch-form__type-matrix {
        grid-template-columns: 1fr;
      }
      .sch-form__cloud-grid {
        grid-template-columns: 1fr;
      }
      .sch-form__scope-row {
        grid-template-columns: 1fr;
      }
      .sch-form__layout {
        grid-template-columns: 1fr;
      }
      .sch-form__rail {
        flex-direction: row;
        overflow-x: auto;
        overflow-y: hidden;
        padding: 0.35rem 0.55rem;
      }
      .sch-form__rail-item {
        flex: 0 0 auto;
        width: auto;
        border-left: none;
        border-bottom: 2px solid transparent;
      }
      .sch-form__rail-item--on {
        border-bottom-color: #334155;
      }
      .sch-form__rail-text {
        white-space: nowrap;
      }
      .sch-form__aside {
        max-height: 26vh;
      }
      .sch-form__grid,
      .sch-form__channels {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class SchedulerTaskFormDialogComponent {
  readonly data = inject<SchedulerTaskFormDialogData>(MAT_DIALOG_DATA)
  readonly dialogRef = inject(MatDialogRef<SchedulerTaskFormDialogComponent, SchedulerTaskFormDialogResult | undefined>)
  private readonly fb = inject(FormBuilder)

  readonly sections = FORM_SECTIONS
  readonly activeSection = signal<string>('identity')

  readonly activeStepNum = computed(() => {
    const idx = this.sections.findIndex((s) => s.id === this.activeSection())
    return idx >= 0 ? idx + 1 : 1
  })

  readonly activeSectionLabel = computed(() => {
    const sec = this.sections.find((s) => s.id === this.activeSection())
    return sec?.label ?? 'Identidad'
  })

  readonly progressPct = computed(() => (this.activeStepNum() / this.sections.length) * 100)

  readonly checklistOkCount = computed(() => {
    let n = 0
    if (this.form.get('name')?.value) n++
    if (this.form.get('target')?.value) n++
    if (this.cronValid().valid) n++
    if (this.form.valid && this.cronValid().valid) n++
    return n
  })

  readonly types = TYPES
  readonly typeLabels = SCHEDULER_TYPE_LABELS
  readonly cronOptions = CRON_OPTIONS
  readonly credentialProfiles = CREDENTIAL_PROFILES
  readonly timezones = TIMEZONES
  readonly environments: SchedulerEnvironment[] = ['production', 'staging', 'development']
  readonly cloudProviders = CLOUD_PROVIDERS
  readonly priorities: SchedulerPriority[] = ['low', 'normal', 'high', 'critical']
  readonly timeoutActions: SchedulerTimeoutAction[] = ['abort', 'retry', 'notify_only']
  readonly envLabels = ENVIRONMENT_LABELS
  readonly prioLabels = PRIORITY_LABELS
  readonly timeoutLabels = TIMEOUT_ACTION_LABELS
  readonly executors = EXECUTOR_OPTIONS
  readonly retryBackoffOptions = RETRY_BACKOFF_OPTIONS
  readonly ownerPresets = OWNER_PRESETS
  readonly channelDefs = NOTIFY_CHANNEL_DEFS

  channelState: Record<string, { enabled: boolean; dest: string }> = Object.fromEntries(
    NOTIFY_CHANNEL_DEFS.map((c) => [c.id, { enabled: c.id === 'email', dest: c.defaultDest }]),
  )

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    description: ['', Validators.maxLength(500)],
    type: ['instance' as SchedulerTaskType, Validators.required],
    cloudProvider: ['aws' as SchedulerCloudProvider, Validators.required],
    environment: ['production' as SchedulerEnvironment, Validators.required],
    priority: ['normal' as SchedulerPriority, Validators.required],
    cronMode: ['preset' as 'preset' | 'custom', Validators.required],
    cron: ['0 2 * * *', Validators.required],
    cronCustom: [''],
    timezone: ['Europe/Madrid', Validators.required],
    target: ['', Validators.required],
    owner: ['Plataforma', Validators.required],
    assignee: ['ops@cloudops.local', [Validators.required, Validators.email]],
    retries: [2, [Validators.required, Validators.min(0), Validators.max(10)]],
    maxDuration: ['30m', Validators.required],
    tags: [''],
    linkedResource: [''],
    notifyOnFailure: [true],
    notifyOnSuccess: [false],
    enabled: [true],
    skipIfRunning: [true],
    maintenanceWindow: [''],
    command: [''],
    parameters: [''],
    concurrency: [1, [Validators.required, Validators.min(1), Validators.max(20)]],
    credentialProfile: [''],
    workingDirectory: [''],
    notifyChannels: [''],
    timeoutAction: ['retry' as SchedulerTimeoutAction, Validators.required],
    documentationUrl: [''],
    executor: ['default'],
    retryBackoff: ['fixed' as SchedulerRetryBackoff, Validators.required],
    runOnceAfterSave: [false],
  })

  constructor() {
    if (this.data.mode === 'create') {
      this.selectType('instance', true)
    }
    if (this.data.mode === 'edit' && this.data.task) {
      const v = this.data.task
      const isPreset = CRON_OPTIONS.some((c) => c.value === v.cron)
      this.form.patchValue({
        name: v.name,
        description: v.description,
        type: v.type,
        cloudProvider: inferCloudProvider(v),
        environment: v.environment ?? 'production',
        priority: v.priority ?? 'normal',
        cronMode: isPreset ? 'preset' : 'custom',
        cron: isPreset ? v.cron : '0 2 * * *',
        cronCustom: isPreset ? '' : v.cron,
        timezone: v.timezone,
        target: v.target,
        owner: v.owner,
        assignee: v.assignee,
        retries: v.retries,
        maxDuration: v.maxDuration,
        tags: v.tags.join(', '),
        linkedResource: v.linkedResource,
        notifyOnFailure: v.notifyOnFailure,
        notifyOnSuccess: v.notifyOnSuccess ?? false,
        enabled: v.enabled,
        skipIfRunning: v.skipIfRunning ?? true,
        maintenanceWindow: v.maintenanceWindow ?? '',
        command: v.command ?? '',
        parameters: v.parameters ?? '',
        concurrency: v.concurrency ?? 1,
        credentialProfile: v.credentialProfile ?? '',
        workingDirectory: v.workingDirectory ?? '',
        notifyChannels: v.notifyChannels ?? '',
        timeoutAction: v.timeoutAction ?? 'retry',
        documentationUrl: v.documentationUrl ?? '',
        executor: v.executor ?? 'default',
        retryBackoff: v.retryBackoff ?? 'fixed',
      })
      this.loadChannelsFromString(v.notifyChannels ?? '')
    }
    this.syncChannelsToForm()
  }

  typeIcon = (t: SchedulerTaskType): string => TYPE_ICON[t] ?? 'event'
  sectionIcon = (id: string): string => SECTION_ICON[id] ?? 'chevron_right'
  sectionDone = (id: string): boolean => {
    const v = this.form.getRawValue()
    switch (id) {
      case 'identity':
        return !!v.name?.trim()
      case 'schedule':
        return this.cronValid().valid
      case 'target':
        return !!v.target?.trim()
      case 'exec':
        return !!v.command?.trim()
      case 'owners':
        return !!v.owner?.trim()
      case 'policy':
        return true
      default:
        return false
    }
  }
  typeLogo = (t: SchedulerTaskType): NavLogoKey | null => SCHEDULER_TYPE_LOGO[t] ?? null
  credentialLogo = (v: string): NavLogoKey | null => CREDENTIAL_PROFILE_LOGO[v] ?? null
  executorLogo = (v: string): NavLogoKey | null => EXECUTOR_LOGO[v] ?? null
  targetLogo = (target: string): NavLogoKey | null => inferTargetLogo(target)
  typeHint = (t: SchedulerTaskType): string => TYPE_HINTS[t]
  selectedType = (): SchedulerTaskType => this.form.get('type')?.value ?? 'instance'
  selectedCloud = (): SchedulerCloudProvider => this.form.get('cloudProvider')?.value ?? 'aws'
  targetOptions = (): string[] => TYPE_FORM_DEFAULTS[this.selectedType()].targets
  envLabel = (v: unknown): string =>
    ENVIRONMENT_LABELS[(v as SchedulerEnvironment) ?? 'production'] ?? '—'
  cloudLabel = (id: SchedulerCloudProvider): string => CLOUD_PROVIDER_LABELS[id] ?? id
  cloudShortLabel = (id: SchedulerCloudProvider): string =>
    CLOUD_PROVIDERS.find((c) => c.id === id)?.shortLabel ?? id.toUpperCase()
  prioLabel = (v: unknown): string => PRIORITY_LABELS[(v as SchedulerPriority) ?? 'normal'] ?? '—'
  environmentHint = (v: unknown): string =>
    ENVIRONMENT_HINTS[(v as SchedulerEnvironment) ?? 'production'] ?? ''

  selectCloud = (id: SchedulerCloudProvider): void => {
    this.form.patchValue({ cloudProvider: id })
  }

  selectEnvironment = (env: SchedulerEnvironment): void => {
    this.form.patchValue({ environment: env })
  }

  effectiveCron = (): string => {
    const raw = this.form.getRawValue()
    if (raw.cronMode === 'custom') return (raw.cronCustom?.trim() || raw.cron || '').trim()
    return raw.cron ?? ''
  }

  cronValid = () => validateCron(this.effectiveCron())
  cronPreview = (): string => cronToHuman(this.effectiveCron())
  nextRunEstimate = (): string =>
    formatNextRunFromCron(this.effectiveCron(), this.form.get('timezone')?.value ?? 'UTC')

  notifyChannelsPreview = (): string => this.form.get('notifyChannels')?.value ?? ''

  canSave = (): boolean => this.form.valid && this.cronValid().valid

  selectType = (t: SchedulerTaskType, forceDefaults = false): void => {
    this.form.patchValue({ type: t })
    if (this.data.mode === 'create' || forceDefaults) {
      const d = TYPE_FORM_DEFAULTS[t]
      this.form.patchValue({
        command: d.command,
        parameters: d.parameters,
        target: d.target,
        linkedResource: d.linkedResource,
        workingDirectory: d.workingDirectory,
        tags: d.tags,
        maxDuration: d.maxDuration,
        retries: d.retries,
        cloudProvider: inferCloudProvider({
          target: d.target,
          tags: d.tags.split(',').map((tag) => tag.trim()),
          environment: this.form.get('environment')?.value ?? 'production',
        }),
      })
    }
  }

  pickTarget = (value: string): void => {
    this.form.patchValue({ target: value })
  }

  scrollToSection = (id: string): void => {
    this.activeSection.set(id)
    document.getElementById(`sch-sec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  hasPrevSection = (): boolean => {
    const idx = this.sections.findIndex((s) => s.id === this.activeSection())
    return idx > 0
  }

  hasNextSection = (): boolean => {
    const idx = this.sections.findIndex((s) => s.id === this.activeSection())
    return idx >= 0 && idx < this.sections.length - 1
  }

  prevSection = (): void => {
    const idx = this.sections.findIndex((s) => s.id === this.activeSection())
    if (idx > 0) this.scrollToSection(this.sections[idx - 1].id)
  }

  nextSection = (): void => {
    const idx = this.sections.findIndex((s) => s.id === this.activeSection())
    if (idx >= 0 && idx < this.sections.length - 1) {
      this.scrollToSection(this.sections[idx + 1].id)
    }
  }

  handleMainScroll = (): void => {
    for (const sec of this.sections) {
      const el = document.getElementById(`sch-sec-${sec.id}`)
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (rect.top >= 80 && rect.top <= 280) {
        this.activeSection.set(sec.id)
        break
      }
    }
  }

  toggleChannel = (id: string): void => {
    const cur = this.channelState[id]
    if (!cur) return
    cur.enabled = !cur.enabled
    this.syncChannelsToForm()
  }

  updateChannelDest = (id: string, dest: string): void => {
    const cur = this.channelState[id]
    if (!cur) return
    cur.dest = dest
    this.syncChannelsToForm()
  }

  private loadChannelsFromString = (raw: string): void => {
    const parsed = parseNotifyChannels(raw)
    for (const ch of NOTIFY_CHANNEL_DEFS) {
      if (parsed[ch.id]) {
        this.channelState[ch.id] = { enabled: true, dest: parsed[ch.id] }
      } else {
        this.channelState[ch.id] = { enabled: false, dest: ch.defaultDest }
      }
    }
  }

  private syncChannelsToForm = (): void => {
    const active: Record<string, string> = {}
    for (const ch of NOTIFY_CHANNEL_DEFS) {
      const state = this.channelState[ch.id]
      if (state?.enabled && state.dest.trim()) active[ch.id] = state.dest.trim()
    }
    this.form.patchValue({ notifyChannels: buildNotifyChannels(active) })
  }

  handleSave = (): void => {
    if (!this.canSave()) return
    this.syncChannelsToForm()
    const raw = this.form.getRawValue() as SchedulerTaskFormValue
    const task = buildTaskFromForm(raw, this.data.task)
    this.dialogRef.close({
      task,
      runOnceAfterSave: !!raw.runOnceAfterSave && this.data.mode === 'create',
    })
  }
}
