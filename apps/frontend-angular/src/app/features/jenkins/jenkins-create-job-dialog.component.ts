import { Component, inject, computed, signal } from '@angular/core'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatDividerModule } from '@angular/material/divider'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { MatChipsModule } from '@angular/material/chips'
import { MatTooltipModule } from '@angular/material/tooltip'
import { startWith, map } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import type { CreateJenkinsJobForm, JenkinsFolder, JenkinsJobType, JenkinsServer } from './jenkins.models'
import { createJobFromForm } from './jenkins.util'
import {
  evaluateProdReadiness,
  isProdReadinessComplete,
  targetsProduction,
} from './jenkins-prod-readiness'
import type { JenkinsJob } from './jenkins.models'

export interface JenkinsCreateJobDialogData {
  servers: JenkinsServer[]
  folders: JenkinsFolder[]
}

type JobTemplateId = 'deploy-api' | 'terraform' | 'docker' | 'security' | 'blank'

interface JobTemplatePatch {
  name?: string
  folder?: string
  serverId?: string
  type?: JenkinsJobType
  scmType?: 'git' | 'gitlab' | 'bitbucket'
  scmUrl?: string
  branch?: string
  description?: string
  credentialsId?: string
  jenkinsfilePath?: string
  agentLabel?: string
  defaultEnvironment?: string
  discardOldBuilds?: boolean
  numToKeep?: number
  timeoutMinutes?: number
  concurrentBuilds?: boolean
  cronTrigger?: string
  enableWebhook?: boolean
  pollScmMinutes?: number
  enableBuildParameters?: boolean
  skipTestsDefault?: boolean
  runSonarDefault?: boolean
  requireApprovalProd?: boolean
}

interface JobTemplate {
  id: JobTemplateId
  label: string
  description: string
  icon: string
  patch: JobTemplatePatch
}

const JOB_TEMPLATES: JobTemplate[] = [
  {
    id: 'deploy-api',
    label: 'Deploy API',
    description: 'Pipeline K8s staging/prod',
    icon: 'cloud_upload',
    patch: {
      name: 'deploy-api-staging',
      type: 'pipeline',
      folder: '/cloudops/apps',
      scmUrl: 'github.com/cloudops/api-gateway',
      jenkinsfilePath: 'Jenkinsfile',
      agentLabel: 'docker',
      defaultEnvironment: 'staging',
      enableWebhook: true,
      pollScmMinutes: 5,
      enableBuildParameters: true,
    },
  },
  {
    id: 'terraform',
    label: 'Terraform',
    description: 'Plan y apply infra AWS',
    icon: 'landscape',
    patch: {
      name: 'terraform-plan-aws',
      type: 'pipeline',
      folder: '/cloudops/infra',
      scmUrl: 'github.com/cloudops/terraform-aws',
      jenkinsfilePath: 'ci/Jenkinsfile',
      agentLabel: 'terraform',
      defaultEnvironment: 'staging',
      cronTrigger: 'H 3 * * 1-5',
      enableWebhook: false,
      pollScmMinutes: 0,
      requireApprovalProd: true,
    },
  },
  {
    id: 'docker',
    label: 'Docker build',
    description: 'Imagen y push al registry',
    icon: 'layers',
    patch: {
      name: 'docker-build-app',
      type: 'pipeline',
      folder: '/cloudops/apps',
      scmUrl: 'github.com/cloudops/frontend-app',
      agentLabel: 'docker',
      enableWebhook: true,
      runSonarDefault: true,
    },
  },
  {
    id: 'security',
    label: 'Security scan',
    description: 'SAST y dependencias',
    icon: 'security',
    patch: {
      name: 'security-scan-nightly',
      type: 'freestyle',
      folder: '/cloudops/security',
      scmUrl: 'github.com/cloudops/monorepo',
      cronTrigger: 'H 2 * * *',
      enableWebhook: false,
      skipTestsDefault: false,
      runSonarDefault: true,
    },
  },
  {
    id: 'blank',
    label: 'En blanco',
    description: 'Configuración manual',
    icon: 'note_add',
    patch: {
      name: '',
      description: '',
      cronTrigger: '',
    },
  },
]

@Component({
  selector: 'app-jenkins-create-job-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatSlideToggleModule,
    MatChipsModule,
    MatTooltipModule,
  ],
  template: `
    <div class="create-job">
      <header class="create-job__header">
        <div class="create-job__brand">
          <mat-icon>playlist_add</mat-icon>
          <div>
            <h2 mat-dialog-title>Nuevo job Jenkins</h2>
            <p>Plantilla, SCM, agente, parámetros y disparadores</p>
          </div>
        </div>
        <nav class="create-job__steps" aria-label="Secciones del asistente">
          @for (step of steps; track step.id) {
            <button
              type="button"
              class="step-pill"
              [class.step-pill--active]="activeStep() === step.id"
              (click)="handleScrollTo(step.id)"
            >
              <mat-icon>{{ step.icon }}</mat-icon>
              {{ step.label }}
            </button>
          }
        </nav>
      </header>

      <mat-dialog-content class="create-job__body">
        <section class="create-job__templates" aria-label="Plantillas rápidas">
          <h3>Plantilla de inicio</h3>
          <div class="template-grid">
            @for (tpl of templates; track tpl.id) {
              <button
                type="button"
                class="template-card"
                [class.template-card--active]="selectedTemplate() === tpl.id"
                (click)="handleApplyTemplate(tpl)"
                [attr.aria-pressed]="selectedTemplate() === tpl.id"
              >
                <mat-icon>{{ tpl.icon }}</mat-icon>
                <strong>{{ tpl.label }}</strong>
                <span>{{ tpl.description }}</span>
              </button>
            }
          </div>
        </section>

        <div class="create-job__layout">
          <form [formGroup]="form" class="create-job__form">
            <section id="create-step-identity" class="form-zone">
              <header class="form-zone__head">
                <mat-icon>badge</mat-icon>
                <div>
                  <h4>Identidad del job</h4>
                  <p>Nombre, ubicación y tipo de proyecto</p>
                </div>
              </header>
              <div class="type-picker" role="radiogroup" aria-label="Tipo de job">
                @for (opt of jobTypes; track opt.value) {
                  <button
                    type="button"
                    class="type-card"
                    [class.type-card--active]="form.controls.type.value === opt.value"
                    (click)="handleTypeSelect(opt.value)"
                    [attr.aria-pressed]="form.controls.type.value === opt.value"
                  >
                    <mat-icon>{{ opt.icon }}</mat-icon>
                    <strong>{{ opt.label }}</strong>
                    <span>{{ opt.hint }}</span>
                  </button>
                }
              </div>
              <div class="field-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Nombre del job</mat-label>
                  <input matInput formControlName="name" placeholder="deploy-mi-servicio" />
                  <mat-hint>Minúsculas, números y guiones</mat-hint>
                  @if (form.controls.name.hasError('pattern') && form.controls.name.touched) {
                    <mat-error>Formato inválido (ej. deploy-api-staging)</mat-error>
                  }
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Carpeta</mat-label>
                  <mat-select formControlName="folder">
                    @for (f of data.folders; track f.path) {
                      <mat-option [value]="f.path">{{ f.label }} · {{ f.path }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Controlador</mat-label>
                  <mat-select formControlName="serverId">
                    @for (s of data.servers; track s.id) {
                      <mat-option [value]="s.id">
                        {{ s.name }} ({{ s.busyExecutors }}/{{ s.executors }} exec)
                      </mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Timeout (min)</mat-label>
                  <input matInput type="number" formControlName="timeoutMinutes" min="5" max="240" />
                </mat-form-field>
              </div>
              <mat-form-field appearance="outline" class="field-full">
                <mat-label>Descripción</mat-label>
                <textarea matInput formControlName="description" rows="2"></textarea>
                <mat-hint>Visible en la vista del job en Jenkins</mat-hint>
              </mat-form-field>
            </section>

            <section id="create-step-scm" class="form-zone">
              <header class="form-zone__head">
                <mat-icon>source</mat-icon>
                <div>
                  <h4>Repositorio (SCM)</h4>
                  <p>Origen del código y credenciales</p>
                </div>
                <button
                  mat-stroked-button
                  type="button"
                  class="form-zone__action"
                  [disabled]="scmValidating()"
                  (click)="handleValidateScm()"
                >
                  <mat-icon>verified</mat-icon>
                  Validar acceso
                </button>
              </header>
              @if (scmValidated()) {
                <p class="scm-ok" role="status">
                  <mat-icon>check_circle</mat-icon>
                  Repositorio preparado con la credencial seleccionada
                </p>
              }
              <div class="field-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Proveedor SCM</mat-label>
                  <mat-select formControlName="scmType">
                    <mat-option value="git">GitHub</mat-option>
                    <mat-option value="gitlab">GitLab</mat-option>
                    <mat-option value="bitbucket">Bitbucket</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Credencial Jenkins</mat-label>
                  <mat-select formControlName="credentialsId">
                    <mat-option value="github-cloudops">github-cloudops-ssh</mat-option>
                    <mat-option value="gitlab-token">gitlab-deploy-token</mat-option>
                    <mat-option value="bitbucket-app">bitbucket-app-password</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline" class="field-span-2">
                  <mat-label>URL del repositorio</mat-label>
                  <input matInput formControlName="scmUrl" placeholder="github.com/org/repo" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Rama por defecto</mat-label>
                  <input matInput formControlName="branch" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Ruta Jenkinsfile</mat-label>
                  <input matInput formControlName="jenkinsfilePath" />
                  @if (form.controls.type.value !== 'pipeline') {
                    <mat-hint>Opcional para freestyle</mat-hint>
                  }
                </mat-form-field>
              </div>
            </section>

            <section id="create-step-run" class="form-zone">
              <header class="form-zone__head">
                <mat-icon>memory</mat-icon>
                <div>
                  <h4>Ejecución y parámetros</h4>
                  <p>Agente, entorno y opciones del build</p>
                </div>
              </header>
              <div class="field-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Etiqueta de agente</mat-label>
                  <mat-select formControlName="agentLabel">
                    <mat-option value="docker">docker — contenedores</mat-option>
                    <mat-option value="terraform">terraform — infra AWS</mat-option>
                    <mat-option value="linux">linux — shell genérico</mat-option>
                    <mat-option value="any">any — primer disponible</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Entorno por defecto</mat-label>
                  <mat-select
                    formControlName="defaultEnvironment"
                    (selectionChange)="handleEnvironmentChange($event.value)"
                  >
                    <mat-option value="development">development</mat-option>
                    <mat-option value="staging">staging</mat-option>
                    <mat-option value="production">production</mat-option>
                  </mat-select>
                  @if (isProdTarget()) {
                    <mat-hint>Checklist PRO obligatorio para poder lanzar a producción</mat-hint>
                  }
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Retener builds</mat-label>
                  <input matInput type="number" formControlName="numToKeep" min="1" max="50" />
                </mat-form-field>
              </div>
              <div class="toggle-grid">
                <mat-slide-toggle formControlName="discardOldBuilds">Descartar builds antiguos</mat-slide-toggle>
                <mat-slide-toggle formControlName="concurrentBuilds">Limitar builds concurrentes</mat-slide-toggle>
                <mat-slide-toggle formControlName="enableBuildParameters">Parámetros de build</mat-slide-toggle>
              </div>
              @if (form.controls.enableBuildParameters.value) {
                <div class="toggle-grid toggle-grid--nested">
                  <mat-slide-toggle formControlName="skipTestsDefault">SKIP_TESTS por defecto</mat-slide-toggle>
                  <mat-slide-toggle formControlName="runSonarDefault">SonarQube en pipeline</mat-slide-toggle>
                  <mat-slide-toggle formControlName="requireApprovalProd">Aprobación manual en prod</mat-slide-toggle>
                </div>
              }

              @if (isProdTarget()) {
                <div class="prod-checklist" role="group" aria-label="Validación para lanzar en producción">
                  <h5>Listo para PRO</h5>
                  <p class="prod-checklist__intro">
                    Todos los requisitos deben cumplirse para crear el job y lanzarlo a <strong>production</strong>.
                  </p>
                  <ul class="prod-checklist__list">
                    @for (check of prodChecks(); track check.id) {
                      <li [class.prod-checklist__item--ok]="check.pass" [class.prod-checklist__item--fail]="!check.pass">
                        <mat-icon>{{ check.pass ? 'check_circle' : 'cancel' }}</mat-icon>
                        <div>
                          <span>{{ check.label }}</span>
                          @if (!check.pass) {
                            <small>{{ check.hint }}</small>
                          }
                        </div>
                      </li>
                    }
                  </ul>
                </div>
              }
            </section>

            <section id="create-step-triggers" class="form-zone">
              <header class="form-zone__head">
                <mat-icon>schedule</mat-icon>
                <div>
                  <h4>Disparadores</h4>
                  <p>Cuándo se lanzará el job automáticamente</p>
                </div>
              </header>
              <div class="field-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Poll SCM (minutos)</mat-label>
                  <input matInput type="number" formControlName="pollScmMinutes" min="0" max="60" />
                  <mat-hint>0 = desactivado</mat-hint>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Expresión cron</mat-label>
                  <input matInput formControlName="cronTrigger" placeholder="H 2 * * *" />
                  <mat-hint>Vacío = solo manual</mat-hint>
                </mat-form-field>
              </div>
              <mat-slide-toggle formControlName="enableWebhook">
                Webhook en push ({{ form.controls.scmType.value }})
              </mat-slide-toggle>
            </section>
          </form>

          <aside class="create-job__preview" aria-label="Vista previa de configuración">
            <div class="preview-card preview-card--path">
              <h5>Ruta en Jenkins</h5>
              <p class="mono preview-path">{{ previewPath() }}</p>
              <button
                type="button"
                class="preview-copy"
                matTooltip="Copiar URL"
                aria-label="Copiar ruta del job"
                (click)="handleCopyPath()"
              >
                <mat-icon>content_copy</mat-icon>
              </button>
            </div>

            <div class="preview-card">
              <h5>Resumen</h5>
              <dl class="preview-dl">
                <div><dt>Tipo</dt><dd>{{ typeLabel() }}</dd></div>
                <div><dt>Controlador</dt><dd class="preview-dl__truncate">{{ serverLabel() }}</dd></div>
                <div><dt>Agente</dt><dd class="mono">{{ formSnap().agentLabel }}</dd></div>
                <div><dt>Entorno</dt><dd class="mono">{{ formSnap().defaultEnvironment }}</dd></div>
                <div><dt>Timeout</dt><dd>{{ formSnap().timeoutMinutes }} min</dd></div>
              </dl>
            </div>

            <div class="preview-card">
              <h5>Disparadores activos</h5>
              @if (previewTriggers().length === 0) {
                <p class="preview-muted">Solo lanzamiento manual</p>
              } @else {
                <mat-chip-set aria-label="Disparadores">
                  @for (t of previewTriggers(); track t) {
                    <mat-chip>{{ t }}</mat-chip>
                  }
                </mat-chip-set>
              }
            </div>

            <div class="preview-card">
              <h5>Parámetros del job</h5>
              <table class="preview-table">
                <thead>
                  <tr>
                    <th scope="col">Clave</th>
                    <th scope="col">Default</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of previewParameters(); track row.key) {
                    <tr>
                      <td class="mono">{{ row.key }}</td>
                      <td class="mono preview-table__val">{{ row.value }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            @if (!form.valid) {
              <p class="preview-warn">
                <mat-icon>info</mat-icon>
                Completa los campos obligatorios para crear el job.
              </p>
            }
            @if (isProdTarget() && !prodReady()) {
              <p class="preview-warn preview-warn--prod">
                <mat-icon>warning</mat-icon>
                Completa el checklist PRO antes de crear el job.
              </p>
            }
            @if (isProdTarget() && prodReady()) {
              <p class="preview-ok" role="status">
                <mat-icon>verified</mat-icon>
                Job listo para lanzamientos a producción.
              </p>
            }
          </aside>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions class="create-job__actions" align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button
          mat-flat-button
          color="primary"
          type="button"
          [disabled]="!canCreate()"
          (click)="handleCreate()"
        >
          <mat-icon>add</mat-icon>
          Crear job en Jenkins
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .create-job {
      --job-accent: #d33833;
      --job-soft: color-mix(in srgb, #d33833 12%, transparent);
      min-width: min(920px, 96vw);
      max-width: 980px;
    }
    h2[mat-dialog-title] { margin: 0; padding: 0; font-size: 1.12rem; font-weight: 700; }
    .create-job__header {
      padding-bottom: 0.85rem;
      border-bottom: 1px solid color-mix(in srgb, var(--job-accent) 14%, transparent);
    }
    .create-job__brand {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      margin-bottom: 0.85rem;
    }
    .create-job__brand mat-icon {
      color: var(--job-accent);
      font-size: 1.85rem;
      width: 1.85rem;
      height: 1.85rem;
    }
    .create-job__brand p {
      margin: 0.2rem 0 0;
      font-size: 0.8rem;
      color: var(--app-text-muted);
    }
    .create-job__steps {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }
    .step-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.35rem 0.65rem;
      border-radius: 999px;
      border: 1px solid color-mix(in srgb, var(--app-text-muted) 14%, transparent);
      background: var(--app-elevated);
      font: inherit;
      font-size: 0.72rem;
      font-weight: 600;
      cursor: pointer;
      color: inherit;
    }
    .step-pill mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; }
    .step-pill--active {
      border-color: color-mix(in srgb, var(--job-accent) 40%, transparent);
      background: var(--job-soft);
      color: var(--job-accent);
    }
    .create-job__body { padding-top: 1rem !important; max-height: 72vh; }
    .create-job__templates h3 {
      margin: 0 0 0.6rem;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--app-text-muted);
    }
    .template-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 0.5rem;
      margin-bottom: 1.1rem;
    }
    @media (max-width: 800px) {
      .template-grid { grid-template-columns: repeat(2, 1fr); }
    }
    .template-card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.2rem;
      padding: 0.65rem 0.75rem;
      border-radius: var(--app-radius-md);
      border: 1px solid color-mix(in srgb, var(--app-text-muted) 12%, transparent);
      background: var(--app-elevated);
      cursor: pointer;
      text-align: left;
      font: inherit;
      color: inherit;
      transition: border-color 0.15s ease, background 0.15s ease;
    }
    .template-card mat-icon { color: var(--job-accent); font-size: 1.25rem; }
    .template-card strong { font-size: 0.78rem; }
    .template-card span { font-size: 0.65rem; color: var(--app-text-muted); line-height: 1.3; }
    .template-card--active {
      border-color: color-mix(in srgb, var(--job-accent) 45%, transparent);
      background: var(--job-soft);
    }
    .create-job__layout {
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(260px, 0.85fr);
      gap: 1.25rem;
      align-items: start;
    }
    @media (max-width: 900px) {
      .create-job__layout { grid-template-columns: 1fr; }
      .create-job__preview { order: -1; }
    }
    .form-zone {
      margin-bottom: 1.35rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text-muted) 8%, transparent);
    }
    .form-zone:last-child { border-bottom: none; margin-bottom: 0; }
    .form-zone__head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 0.65rem;
      margin-bottom: 0.85rem;
    }
    .form-zone__head mat-icon {
      color: var(--job-accent);
      background: var(--job-soft);
      padding: 0.4rem;
      border-radius: 8px;
    }
    .form-zone__head h4 { margin: 0; font-size: 0.9rem; font-weight: 700; }
    .form-zone__head p { margin: 0.12rem 0 0; font-size: 0.72rem; color: var(--app-text-muted); }
    .form-zone__head > div { flex: 1; min-width: 140px; }
    .form-zone__action { margin-left: auto; }
    .type-picker {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
      margin-bottom: 0.85rem;
    }
    @media (max-width: 560px) {
      .type-picker { grid-template-columns: 1fr; }
    }
    .type-card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.15rem;
      padding: 0.65rem 0.75rem;
      border-radius: var(--app-radius-md);
      border: 1px solid color-mix(in srgb, var(--app-text-muted) 12%, transparent);
      background: var(--app-card);
      cursor: pointer;
      font: inherit;
      text-align: left;
      color: inherit;
    }
    .type-card mat-icon { color: var(--job-accent); }
    .type-card strong { font-size: 0.78rem; }
    .type-card span { font-size: 0.65rem; color: var(--app-text-muted); }
    .type-card--active {
      border-color: color-mix(in srgb, var(--job-accent) 40%, transparent);
      background: var(--job-soft);
    }
    .field-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 0.75rem;
    }
    .field-span-2 { grid-column: span 2; }
    .field-full { width: 100%; }
    @media (max-width: 560px) {
      .field-grid { grid-template-columns: 1fr; }
      .field-span-2 { grid-column: span 1; }
    }
    .toggle-grid {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      margin-top: 0.5rem;
    }
    .toggle-grid--nested {
      margin-left: 0.75rem;
      padding-left: 0.75rem;
      border-left: 2px solid var(--job-soft);
    }
    .scm-ok {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0 0 0.75rem;
      padding: 0.45rem 0.65rem;
      border-radius: var(--app-radius-md);
      background: color-mix(in srgb, #22c55e 10%, transparent);
      font-size: 0.78rem;
      color: #15803d;
    }
    .scm-ok mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    .create-job__preview {
      position: sticky;
      top: 0;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .preview-card {
      padding: 0.85rem 1rem;
      border-radius: var(--app-radius-md);
      background: var(--app-elevated);
      border: 1px solid color-mix(in srgb, var(--app-text-muted) 10%, transparent);
    }
    .preview-card h5 {
      margin: 0 0 0.55rem;
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--app-text-muted);
    }
    .preview-card--path { position: relative; padding-right: 2.5rem; }
    .preview-path {
      margin: 0;
      font-size: 0.78rem;
      word-break: break-all;
      line-height: 1.4;
    }
    .preview-copy {
      position: absolute;
      top: 0.65rem;
      right: 0.5rem;
      border: none;
      background: transparent;
      cursor: pointer;
      color: var(--job-accent);
      padding: 0.25rem;
      border-radius: 6px;
    }
    .preview-copy:hover { background: var(--job-soft); }
    .preview-dl {
      margin: 0;
      display: grid;
      gap: 0.4rem;
    }
    .preview-dl div {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
      font-size: 0.78rem;
    }
    .preview-dl dt { color: var(--app-text-muted); }
    .preview-dl dd { margin: 0; font-weight: 600; text-align: right; }
    .preview-dl__truncate {
      max-width: 160px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .preview-muted { margin: 0; font-size: 0.78rem; color: var(--app-text-muted); }
    .preview-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.72rem;
    }
    .preview-table th {
      text-align: left;
      font-size: 0.62rem;
      text-transform: uppercase;
      color: var(--app-text-muted);
      padding-bottom: 0.35rem;
    }
    .preview-table td { padding: 0.25rem 0; border-top: 1px solid color-mix(in srgb, var(--app-text-muted) 8%, transparent); }
    .preview-table__val { color: var(--app-text-muted); max-width: 100px; overflow: hidden; text-overflow: ellipsis; }
    .preview-warn {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0;
      font-size: 0.75rem;
      color: #b45309;
    }
    .preview-warn mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    .preview-warn--prod { color: #b91c1c; }
    .preview-ok {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0;
      font-size: 0.75rem;
      color: #15803d;
    }
    .preview-ok mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    .prod-checklist {
      margin-top: 1rem;
      padding: 0.85rem 1rem;
      border-radius: var(--app-radius-md);
      background: var(--app-elevated);
    }
    .prod-checklist h5 {
      margin: 0 0 0.35rem;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--app-text-muted);
    }
    .prod-checklist__intro {
      margin: 0 0 0.65rem;
      font-size: 0.78rem;
      color: var(--app-text-muted);
      line-height: 1.4;
    }
    .prod-checklist__list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }
    .prod-checklist__list li {
      display: flex;
      align-items: flex-start;
      gap: 0.4rem;
      font-size: 0.78rem;
    }
    .prod-checklist__list mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      margin-top: 0.1rem;
    }
    .prod-checklist__item--ok mat-icon { color: #15803d; }
    .prod-checklist__item--fail mat-icon { color: #b91c1c; }
    .prod-checklist__list small {
      display: block;
      margin-top: 0.12rem;
      font-size: 0.68rem;
      color: var(--app-text-muted);
      line-height: 1.3;
    }
    .create-job__actions {
      padding-top: 0.5rem;
      border-top: 1px solid color-mix(in srgb, var(--app-text-muted) 10%, transparent);
    }
    .create-job__actions button mat-icon {
      margin-right: 0.25rem;
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
    }
    .mono { font-family: var(--app-font-mono, ui-monospace, monospace); }
  `,
})
export class JenkinsCreateJobDialogComponent {
  readonly data = inject<JenkinsCreateJobDialogData>(MAT_DIALOG_DATA)
  private readonly dialogRef = inject(MatDialogRef<JenkinsCreateJobDialogComponent, JenkinsJob | undefined>)
  private readonly fb = inject(FormBuilder)

  readonly templates = JOB_TEMPLATES
  readonly selectedTemplate = signal<JobTemplateId>('deploy-api')
  readonly activeStep = signal('create-step-identity')
  readonly scmValidated = signal(false)
  readonly scmValidating = signal(false)

  readonly steps = [
    { id: 'create-step-identity', label: 'Identidad', icon: 'badge' },
    { id: 'create-step-scm', label: 'SCM', icon: 'source' },
    { id: 'create-step-run', label: 'Ejecución', icon: 'memory' },
    { id: 'create-step-triggers', label: 'Disparadores', icon: 'schedule' },
  ]

  readonly jobTypes: { value: JenkinsJobType; label: string; hint: string; icon: string }[] = [
    { value: 'pipeline', label: 'Pipeline', hint: 'Jenkinsfile declarativo', icon: 'account_tree' },
    { value: 'freestyle', label: 'Freestyle', hint: 'Pasos clásicos', icon: 'build' },
    { value: 'multibranch', label: 'Multibranch', hint: 'Rama por rama', icon: 'device_hub' },
  ]

  readonly form = this.fb.nonNullable.group({
    name: ['deploy-api-staging', [Validators.required, Validators.pattern(/^[a-z0-9][a-z0-9-]*$/)]],
    folder: [this.data.folders[0]?.path ?? '/cloudops/apps', Validators.required],
    serverId: [this.data.servers[0]?.id ?? '', Validators.required],
    type: ['pipeline' as JenkinsJobType, Validators.required],
    scmType: ['git' as 'git' | 'gitlab' | 'bitbucket', Validators.required],
    scmUrl: ['github.com/cloudops/api-gateway', Validators.required],
    credentialsId: ['github-cloudops', Validators.required],
    branch: ['main', Validators.required],
    jenkinsfilePath: ['Jenkinsfile', Validators.required],
    agentLabel: ['docker', Validators.required],
    defaultEnvironment: ['staging', Validators.required],
    discardOldBuilds: [true],
    numToKeep: [10, [Validators.min(1), Validators.max(50)]],
    timeoutMinutes: [45, [Validators.min(5), Validators.max(240)]],
    concurrentBuilds: [true],
    cronTrigger: [''],
    enableWebhook: [true],
    pollScmMinutes: [5, [Validators.min(0), Validators.max(60)]],
    enableBuildParameters: [true],
    skipTestsDefault: [false],
    runSonarDefault: [true],
    requireApprovalProd: [false],
    description: ['Pipeline declarativo: build, test y deploy desde CloudOps'],
  })

  readonly formSnap = toSignal(
    this.form.valueChanges.pipe(
      startWith(null),
      map(() => this.form.getRawValue()),
    ),
    { initialValue: this.form.getRawValue() },
  )

  previewPath = computed(() => {
    const v = this.formSnap()
    const srv = this.data.servers.find((s) => s.id === v.serverId)?.name ?? 'jenkins'
    const folderPath = v.folder.replace(/^\//, '').replace(/\//g, '/job/')
    return `https://${srv}/job/${folderPath}/job/${v.name || '…'}/`
  })

  previewTriggers = computed(() => {
    const v = this.formSnap()
    const list = ['Manual']
    if (v.enableWebhook) list.push(`Webhook ${v.scmType}`)
    if (v.pollScmMinutes > 0) list.push(`Poll SCM (${v.pollScmMinutes} min)`)
    if (v.cronTrigger.trim()) list.push(`Cron ${v.cronTrigger.trim()}`)
    if (v.concurrentBuilds) list.push('Throttle concurrentes')
    return list
  })

  previewParameters = computed(() => {
    const v = this.formSnap()
    const rows = [
      { key: 'BRANCH', value: v.branch },
      { key: 'ENVIRONMENT', value: v.defaultEnvironment },
      { key: 'AGENT_LABEL', value: v.agentLabel },
      { key: 'JENKINSFILE', value: v.jenkinsfilePath },
    ]
    if (v.enableBuildParameters) {
      rows.push(
        { key: 'SKIP_TESTS', value: String(v.skipTestsDefault) },
        { key: 'RUN_SONAR', value: String(v.runSonarDefault) },
        { key: 'REQUIRE_APPROVAL', value: String(v.requireApprovalProd) },
      )
    }
    return rows
  })

  typeLabel = computed(() => {
    const t = this.formSnap().type
    return this.jobTypes.find((j) => j.value === t)?.label ?? t
  })

  serverLabel = computed(() => {
    const id = this.formSnap().serverId
    return this.data.servers.find((s) => s.id === id)?.name ?? '—'
  })

  isProdTarget = computed(() => targetsProduction(this.formSnap().defaultEnvironment))

  prodChecks = computed(() => {
    const v = this.formSnap()
    return evaluateProdReadiness({
      defaultEnvironment: v.defaultEnvironment,
      type: v.type,
      jenkinsfilePath: v.jenkinsfilePath,
      scmUrl: v.scmUrl,
      branch: v.branch,
      credentialsId: v.credentialsId,
      enableBuildParameters: v.enableBuildParameters,
      requireApprovalProd: v.requireApprovalProd,
      skipTestsDefault: v.skipTestsDefault,
      runSonarDefault: v.runSonarDefault,
      scmValidated: this.scmValidated(),
    })
  })

  prodReady = computed(() => {
    if (!this.isProdTarget()) return true
    return isProdReadinessComplete(this.prodChecks())
  })

  canCreate = (): boolean => this.form.valid && this.prodReady()

  constructor() {
    const resetScm = () => this.scmValidated.set(false)
    this.form.controls.scmUrl.valueChanges.subscribe(resetScm)
    this.form.controls.branch.valueChanges.subscribe(resetScm)
    this.form.controls.credentialsId.valueChanges.subscribe(resetScm)
    this.form.controls.scmType.valueChanges.subscribe(resetScm)
  }

  handleEnvironmentChange = (env: string): void => {
    if (!targetsProduction(env)) return
    this.form.patchValue({
      enableBuildParameters: true,
      requireApprovalProd: true,
      skipTestsDefault: false,
      runSonarDefault: true,
    })
  }

  handleApplyTemplate = (tpl: JobTemplate): void => {
    this.selectedTemplate.set(tpl.id)
    this.scmValidated.set(false)
    if (tpl.id === 'blank') {
      this.form.reset({
        name: '',
        folder: this.data.folders[0]?.path ?? '/cloudops/apps',
        serverId: this.data.servers[0]?.id ?? '',
        type: 'pipeline',
        scmType: 'git',
        scmUrl: '',
        credentialsId: 'github-cloudops',
        branch: 'main',
        jenkinsfilePath: 'Jenkinsfile',
        agentLabel: 'docker',
        defaultEnvironment: 'staging',
        discardOldBuilds: true,
        numToKeep: 10,
        timeoutMinutes: 45,
        concurrentBuilds: false,
        cronTrigger: '',
        enableWebhook: false,
        pollScmMinutes: 0,
        enableBuildParameters: false,
        skipTestsDefault: false,
        runSonarDefault: false,
        requireApprovalProd: false,
        description: '',
      })
      return
    }
    this.form.patchValue(tpl.patch)
  }

  handleTypeSelect = (type: JenkinsJobType): void => {
    this.form.controls.type.setValue(type)
    if (type === 'freestyle') {
      this.form.controls.jenkinsfilePath.clearValidators()
    } else {
      this.form.controls.jenkinsfilePath.setValidators(Validators.required)
    }
    this.form.controls.jenkinsfilePath.updateValueAndValidity()
  }

  handleScrollTo = (id: string): void => {
    this.activeStep.set(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  handleValidateScm = (): void => {
    if (this.form.controls.scmUrl.invalid) return
    this.scmValidating.set(true)
    this.scmValidated.set(false)
    const url = this.form.controls.scmUrl.value.trim()
    const credential = this.form.controls.credentialsId.value.trim()
    const validUrl = /^(https?:\/\/|git@|ssh:\/\/).+/.test(url)
    queueMicrotask(() => {
      this.scmValidating.set(false)
      this.scmValidated.set(Boolean(validUrl && credential))
    })
  }

  handleCopyPath = (): void => {
    const path = this.previewPath()
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(path)
    }
  }

  handleCreate = (): void => {
    if (!this.canCreate()) {
      this.form.markAllAsTouched()
      return
    }
    const v = this.form.getRawValue()
    const payload: CreateJenkinsJobForm = {
      name: v.name,
      folder: v.folder,
      serverId: v.serverId,
      type: v.type,
      scmType: v.scmType,
      scmUrl: v.scmUrl,
      branch: v.branch,
      description: v.description,
      credentialsId: v.credentialsId,
      jenkinsfilePath: v.jenkinsfilePath,
      agentLabel: v.agentLabel,
      defaultEnvironment: v.defaultEnvironment,
      discardOldBuilds: v.discardOldBuilds,
      numToKeep: v.numToKeep,
      timeoutMinutes: v.timeoutMinutes,
      concurrentBuilds: v.concurrentBuilds,
      cronTrigger: v.cronTrigger,
      enableWebhook: v.enableWebhook,
      pollScmMinutes: v.pollScmMinutes,
      enableBuildParameters: v.enableBuildParameters,
      skipTestsDefault: v.skipTestsDefault,
      runSonarDefault: v.runSonarDefault,
      requireApprovalProd: v.requireApprovalProd,
    }
    this.dialogRef.close(createJobFromForm(payload, this.data.servers, this.scmValidated()))
  }
}
