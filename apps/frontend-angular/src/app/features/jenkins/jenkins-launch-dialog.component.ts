import { Component, inject, computed } from '@angular/core'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { MatIconModule } from '@angular/material/icon'
import { MatDividerModule } from '@angular/material/divider'
import { MatChipsModule } from '@angular/material/chips'
import { startWith, map } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import { JenkinsLaunchDetailPanelComponent } from './jenkins-launch-detail-panel.component'
import type { JobRow } from './jenkins.demo'
export type { JobRow } from './jenkins.demo'
import { isJobProdLaunchReady, targetsProduction } from './jenkins-prod-readiness'

export interface JenkinsLaunchDialogData {
  job: JobRow
}

export interface JenkinsLaunchParams {
  branch: string
  gitRevision: string
  environment: string
  deployTarget: string
  namespace: string
  helmChart: string
  dockerTag: string
  skipTests: boolean
  runSonar: boolean
  cleanWorkspace: boolean
  dryRun: boolean
  requireApproval: boolean
  changeTicket: string
  buildPriority: 'low' | 'normal' | 'high'
  timeoutMinutes: number
  agentLabel: string
  description: string
  notifyOnComplete: boolean
  notifySlack: boolean
  notifyEmail: boolean
}

export interface JenkinsLaunchDetailData {
  jobName: string
  server: string
  status: string
  buildNum: number
  queueId: string
  buildUrl: string
  triggeredBy: string
  startedAt: string
  estimatedDuration: string
  node: string
  executor: number
  params: JenkinsLaunchParams
  stages: { name: string; status: string; duration?: string }[]
  causes: string[]
  parameters: { key: string; value: string }[]
  logHead: string
}

const jobParamDefault = (job: JobRow, key: string): string | undefined => {
  const params = job['parameters'] as { key: string; default: string }[] | undefined
  return params?.find((p) => p.key === key)?.default
}

export const defaultLaunchParams = (job: JobRow): JenkinsLaunchParams => {
  const env = jobParamDefault(job, 'ENVIRONMENT') ?? 'staging'
  const isProd = targetsProduction(env)
  const agentFromJob = jobParamDefault(job, 'AGENT_LABEL')
  return {
    branch: String(job['branch'] ?? 'main'),
    gitRevision: String((job['scm'] as { commit?: string })?.commit ?? 'HEAD'),
    environment: env,
    deployTarget: isProd ? 'k8s-production' : 'k8s-staging',
    namespace: isProd ? 'production' : 'staging',
    helmChart: 'api-gateway',
    dockerTag: isProd ? 'release' : 'latest',
    skipTests: jobParamDefault(job, 'SKIP_TESTS') === 'true',
    runSonar: jobParamDefault(job, 'RUN_SONAR') !== 'false',
    cleanWorkspace: true,
    dryRun: false,
    requireApproval: jobParamDefault(job, 'REQUIRE_APPROVAL') === 'true',
    changeTicket: jobParamDefault(job, 'CHANGE_TICKET') ?? '',
    buildPriority: 'normal',
    timeoutMinutes: 45,
    agentLabel: agentFromJob ?? 'docker',
    description: isProd ? 'Despliegue a producción desde CloudOps' : 'Lanzamiento desde CloudOps',
    notifyOnComplete: true,
    notifySlack: true,
    notifyEmail: isProd,
  }
}

const paramsToPreview = (p: JenkinsLaunchParams): { key: string; value: string }[] => [
  { key: 'BRANCH', value: p.branch },
  { key: 'GIT_REVISION', value: p.gitRevision },
  { key: 'ENVIRONMENT', value: p.environment },
  { key: 'DEPLOY_TARGET', value: p.deployTarget },
  { key: 'K8S_NAMESPACE', value: p.namespace },
  { key: 'HELM_CHART', value: p.helmChart },
  { key: 'DOCKER_TAG', value: p.dockerTag },
  { key: 'AGENT_LABEL', value: p.agentLabel },
  { key: 'BUILD_PRIORITY', value: p.buildPriority },
  { key: 'TIMEOUT_MIN', value: String(p.timeoutMinutes) },
  { key: 'SKIP_TESTS', value: String(p.skipTests) },
  { key: 'RUN_SONAR', value: String(p.runSonar) },
  { key: 'CLEAN_WORKSPACE', value: String(p.cleanWorkspace) },
  { key: 'DRY_RUN', value: String(p.dryRun) },
  { key: 'REQUIRE_APPROVAL', value: String(p.requireApproval) },
  { key: 'CHANGE_TICKET', value: p.changeTicket || '—' },
  { key: 'BUILD_DESCRIPTION', value: p.description || '—' },
  { key: 'NOTIFY_SLACK', value: String(p.notifySlack) },
  { key: 'NOTIFY_EMAIL', value: String(p.notifyEmail) },
]

export const buildJenkinsLaunchDetail = (job: JobRow, params: JenkinsLaunchParams): JenkinsLaunchDetailData => {
  const prevBuild = Number(job['buildNum'] ?? 847)
  const buildNum = prevBuild + 1
  const jobName = String(job['name'] ?? 'pipeline')
  const server = String(job['server'] ?? 'jenkins.cloudops.local')
  const slug = encodeURIComponent(jobName)
  const agent = params.agentLabel === 'terraform' ? 'terraform-agent' : 'docker-agent-03'
  return {
    jobName,
    server,
    status: params.dryRun ? 'SUCCESS' : 'RUNNING',
    buildNum,
    queueId: `Q-${Date.now().toString(36).slice(-8).toUpperCase()}`,
    buildUrl: `https://${server}/job/${slug}/${buildNum}/`,
    triggeredBy: 'admin@cloudops.local',
    startedAt: new Date().toISOString(),
    estimatedDuration: estimateDuration(params),
    node: `${agent} (docker)`,
    executor: 2,
    params,
    causes: [
      'Build with Parameters — CloudOps',
      `Usuario: admin@cloudops.local`,
      `Rama: ${params.branch} @ ${params.gitRevision}`,
      params.dryRun ? 'Modo dry-run (sin deploy real)' : `Deploy → ${params.deployTarget}`,
      params.changeTicket ? `Ticket: ${params.changeTicket}` : '',
    ].filter(Boolean),
    parameters: paramsToPreview(params),
    stages: buildStages(params),
    logHead: buildLogHead(server, jobName, params),
  }
}

const estimateDuration = (p: JenkinsLaunchParams): string => {
  if (p.dryRun) return '1–2 min'
  if (p.skipTests) return '2–5 min'
  if (p.environment === 'production') return '6–12 min'
  return '4–8 min'
}

const buildStages = (p: JenkinsLaunchParams): { name: string; status: string; duration?: string }[] => [
  { name: 'Declarative: checkout SCM', status: 'SUCCESS', duration: '22s' },
  { name: 'Clean workspace', status: p.cleanWorkspace ? 'SUCCESS' : 'SKIPPED', duration: p.cleanWorkspace ? '8s' : '—' },
  { name: 'Install dependencies', status: 'RUNNING', duration: '1m 12s' },
  { name: 'Unit & integration tests', status: p.skipTests ? 'SKIPPED' : 'PENDING', duration: p.skipTests ? '—' : '—' },
  { name: 'SonarQube scan', status: !p.runSonar || p.skipTests ? 'SKIPPED' : 'PENDING', duration: '—' },
  { name: 'Build artifact / image', status: 'PENDING', duration: '—' },
  {
    name: p.dryRun ? 'Dry-run deploy (simulated)' : `Deploy → ${p.deployTarget}`,
    status: 'PENDING',
    duration: '—',
  },
]

const buildLogHead = (server: string, jobName: string, p: JenkinsLaunchParams): string =>
  `[Pipeline] Build with Parameters\n` +
  `[Pipeline] node (label: ${p.agentLabel})\n` +
  `[Pipeline] stage ('Checkout')\n` +
  `Checking out ${p.branch} @ ${p.gitRevision}\n` +
  `[Pipeline] environment: ${p.environment} | namespace: ${p.namespace}\n` +
  `[Pipeline] helm: ${p.helmChart} | tag: ${p.dockerTag}\n` +
  (p.dryRun ? `[Pipeline] DRY_RUN=true — skipping live deploy\n` : '') +
  `Agent: ${server} · Job: ${jobName}\n`

@Component({
  selector: 'app-jenkins-launch-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCheckboxModule,
    MatSlideToggleModule,
    MatIconModule,
    MatDividerModule,
    MatChipsModule,
    StatusBadgeComponent,
  ],
  template: `
    <div class="launch-dialog">
      <header class="launch-dialog__header">
        <div class="launch-dialog__title-wrap">
          <mat-icon class="launch-dialog__title-icon">tune</mat-icon>
          <div>
            <h2 mat-dialog-title>Build with Parameters</h2>
            <p class="launch-dialog__job mono">{{ data.job['name'] }}</p>
          </div>
        </div>
        <div class="launch-dialog__next">
          <span class="launch-dialog__next-lbl">Próximo build</span>
          <strong class="launch-dialog__next-num">#{{ nextBuildNum() }}</strong>
          <span class="launch-dialog__next-dur">~{{ estimatedDuration() }}</span>
        </div>
      </header>

      <mat-dialog-content>
        <div class="launch-dialog__layout">
          <aside class="launch-dialog__context">
            <div class="context-card">
              <h3>Job</h3>
              <dl>
                <dt>Estado</dt>
                <dd><app-status-badge [value]="jobStatus()" /></dd>
                <dt>Último build</dt>
                <dd class="mono">#{{ data.job['buildNum'] ?? '—' }}</dd>
                <dt>Servidor</dt>
                <dd class="mono">{{ data.job['server'] }}</dd>
                <dt>Carpeta</dt>
                <dd class="mono">{{ jobFolder() }}</dd>
                <dt>Tipo</dt>
                <dd>{{ jobTypeLabel() }}</dd>
              </dl>
            </div>
            <div class="context-card">
              <h3>SCM configurado</h3>
              <dl>
                <dt>Repositorio</dt>
                <dd class="mono scm-url">{{ scmUrl() }}</dd>
                <dt>Rama por defecto</dt>
                <dd class="mono">{{ data.job['branch'] ?? 'main' }}</dd>
                <dt>Commit ref.</dt>
                <dd class="mono">{{ scmCommit() }}</dd>
              </dl>
            </div>
            @if (isProduction()) {
              <div class="context-alert" role="alert">
                <mat-icon>warning</mat-icon>
                <span>Despliegue a <strong>production</strong>. Se recomienda ticket de cambio y aprobación.</span>
              </div>
            }
            @if (isProduction() && !jobProdReady()) {
              <div class="context-alert context-alert--error" role="alert">
                <mat-icon>block</mat-icon>
                <span>
                  Este job no cumple la configuración PRO. Créalo con entorno <strong>production</strong> y checklist completo.
                </span>
              </div>
            }
          </aside>

          <form [formGroup]="form" class="launch-dialog__form">
            <section class="form-section">
              <h4><mat-icon>code</mat-icon> Código fuente</h4>
              <div class="form-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Rama (BRANCH)</mat-label>
                  <mat-select formControlName="branch">
                    @for (b of branchOptions(); track b) {
                      <mat-option [value]="b">{{ b }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Revisión Git</mat-label>
                  <input matInput formControlName="gitRevision" placeholder="SHA, tag o HEAD" />
                  <mat-hint>Commit, tag o HEAD</mat-hint>
                </mat-form-field>
              </div>
              <mat-slide-toggle formControlName="cleanWorkspace">Limpiar workspace antes del build</mat-slide-toggle>
            </section>

            <mat-divider />

            <section class="form-section">
              <h4><mat-icon>cloud_upload</mat-icon> Despliegue</h4>
              <div class="form-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Entorno (ENVIRONMENT)</mat-label>
                  <mat-select formControlName="environment">
                    <mat-option value="development">development</mat-option>
                    <mat-option value="staging">staging</mat-option>
                    <mat-option value="production">production</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Destino (DEPLOY_TARGET)</mat-label>
                  <mat-select formControlName="deployTarget">
                    <mat-option value="k8s-staging">k8s-staging</mat-option>
                    <mat-option value="k8s-production">k8s-production</mat-option>
                    <mat-option value="aws-ecs-prod">aws-ecs-prod</mat-option>
                    <mat-option value="vps-edge">vps-edge</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Namespace K8s</mat-label>
                  <input matInput formControlName="namespace" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Helm chart</mat-label>
                  <input matInput formControlName="helmChart" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Docker tag</mat-label>
                  <input matInput formControlName="dockerTag" placeholder="latest, v1.2.0…" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Ticket de cambio</mat-label>
                  <input matInput formControlName="changeTicket" placeholder="CHG-2041 (producción)" />
                  @if (isProduction() && form.controls.changeTicket.hasError('required')) {
                    <mat-error>Obligatorio para production (ej. CHG-2041)</mat-error>
                  }
                </mat-form-field>
              </div>
            </section>

            <mat-divider />

            <section class="form-section">
              <h4><mat-icon>settings</mat-icon> Pipeline y agente</h4>
              <div class="form-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Etiqueta de agente</mat-label>
                  <mat-select formControlName="agentLabel">
                    <mat-option value="docker">docker (linux)</mat-option>
                    <mat-option value="terraform">terraform + aws</mat-option>
                    <mat-option value="vps">vps + ssh</mat-option>
                    <mat-option value="any">any available</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Prioridad en cola</mat-label>
                  <mat-select formControlName="buildPriority">
                    <mat-option value="low">Baja</mat-option>
                    <mat-option value="normal">Normal</mat-option>
                    <mat-option value="high">Alta</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Timeout (minutos)</mat-label>
                  <input matInput type="number" formControlName="timeoutMinutes" min="5" max="180" />
                </mat-form-field>
              </div>
              <div class="toggle-grid">
                <mat-slide-toggle formControlName="skipTests">Omitir tests (SKIP_TESTS)</mat-slide-toggle>
                <mat-slide-toggle formControlName="runSonar">Ejecutar SonarQube</mat-slide-toggle>
                <mat-slide-toggle formControlName="dryRun">Dry-run (sin deploy real)</mat-slide-toggle>
                <mat-slide-toggle formControlName="requireApproval">Requiere aprobación manual</mat-slide-toggle>
              </div>
            </section>

            <mat-divider />

            <section class="form-section">
              <h4><mat-icon>notifications</mat-icon> Notificaciones y notas</h4>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Descripción del build</mat-label>
                <textarea matInput formControlName="description" rows="2" placeholder="Motivo del lanzamiento, enlace a PR…"></textarea>
              </mat-form-field>
              <div class="toggle-grid">
                <mat-slide-toggle formControlName="notifyOnComplete">Notificar al finalizar</mat-slide-toggle>
                <mat-slide-toggle formControlName="notifySlack">Canal Slack #deploys</mat-slide-toggle>
                <mat-slide-toggle formControlName="notifyEmail">Email al equipo</mat-slide-toggle>
              </div>
            </section>

            <section class="form-section preview-section">
              <h4><mat-icon>preview</mat-icon> Parámetros que se enviarán a Jenkins</h4>
              <div class="preview-table-wrap">
                <table class="preview-table">
                  <thead>
                    <tr><th>Parámetro</th><th>Valor</th></tr>
                  </thead>
                  <tbody>
                    @for (row of previewRows(); track row.key) {
                      <tr>
                        <td class="mono">{{ row.key }}</td>
                        <td>{{ row.value }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          </form>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="launch-dialog__actions">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-stroked-button type="button" (click)="handleReset()">
          <mat-icon>restart_alt</mat-icon>
          Restaurar
        </button>
        <button
          mat-flat-button
          color="primary"
          type="button"
          [disabled]="!canLaunch()"
          (click)="handleLaunch()"
        >
          <mat-icon>play_arrow</mat-icon>
          Lanzar build #{{ nextBuildNum() }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .launch-dialog { min-width: min(860px, 95vw); max-width: 920px; }
    h2[mat-dialog-title] { margin: 0; padding: 0; font-size: 1.15rem; font-weight: 700; }
    .launch-dialog__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      padding: 0.25rem 0 1rem;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text-muted) 12%, transparent);
    }
    .launch-dialog__title-wrap { display: flex; gap: 0.75rem; align-items: flex-start; }
    .launch-dialog__title-icon { color: #d33833; font-size: 1.75rem; width: 1.75rem; height: 1.75rem; }
    .launch-dialog__job { margin: 0.2rem 0 0; font-size: 0.85rem; color: var(--app-text-muted); }
    .launch-dialog__next {
      text-align: right;
      padding: 0.5rem 0.75rem;
      border-radius: var(--app-radius-md);
      background: color-mix(in srgb, #d33833 8%, var(--app-elevated));
    }
    .launch-dialog__next-lbl { display: block; font-size: 0.65rem; text-transform: uppercase; color: var(--app-text-muted); }
    .launch-dialog__next-num { font-size: 1.35rem; color: #d33833; }
    .launch-dialog__next-dur { display: block; font-size: 0.72rem; color: var(--app-text-muted); }
    mat-dialog-content { max-height: 70vh; padding-top: 1rem !important; }
    .launch-dialog__layout {
      display: grid;
      grid-template-columns: 240px 1fr;
      gap: 1.25rem;
      align-items: start;
    }
    @media (max-width: 800px) {
      .launch-dialog__layout { grid-template-columns: 1fr; }
    }
    .context-card {
      padding: 0.85rem;
      border-radius: var(--app-radius-md);
      background: var(--app-elevated);
      margin-bottom: 0.75rem;
      font-size: 0.8rem;
    }
    .context-card h3 {
      margin: 0 0 0.5rem;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--app-text-muted);
    }
    .context-card dl {
      display: grid;
      grid-template-columns: 88px 1fr;
      gap: 0.3rem 0.5rem;
      margin: 0;
    }
    .context-card dt { color: var(--app-text-muted); font-weight: 600; }
    .context-card dd { margin: 0; word-break: break-word; }
    .scm-url { font-size: 0.72rem; }
    .context-alert {
      display: flex;
      gap: 0.5rem;
      padding: 0.65rem;
      border-radius: var(--app-radius-md);
      background: color-mix(in srgb, #f59e0b 15%, transparent);
      border: 1px solid color-mix(in srgb, #f59e0b 35%, transparent);
      font-size: 0.78rem;
    }
    .context-alert mat-icon { color: #d97706; flex-shrink: 0; }
    .context-alert--error {
      background: color-mix(in srgb, #dc2626 12%, transparent);
      border-color: color-mix(in srgb, #dc2626 35%, transparent);
    }
    .context-alert--error mat-icon { color: #b91c1c; }
    .form-section { margin-bottom: 1rem; }
    .form-section h4 {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin: 0 0 0.75rem;
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--app-text-muted);
    }
    .form-section h4 mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 0.75rem;
    }
    @media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } }
    .full { width: 100%; grid-column: 1 / -1; }
    .toggle-grid {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    .preview-section { margin-top: 0.5rem; }
    .preview-table-wrap {
      max-height: 200px;
      overflow: auto;
      border-radius: var(--app-radius-md);
      border: 1px solid color-mix(in srgb, var(--app-text-muted) 12%, transparent);
    }
    .preview-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.78rem;
    }
    .preview-table th {
      position: sticky;
      top: 0;
      background: var(--app-elevated);
      text-align: left;
      padding: 0.45rem 0.65rem;
      font-size: 0.68rem;
      text-transform: uppercase;
      color: var(--app-text-muted);
    }
    .preview-table td {
      padding: 0.35rem 0.65rem;
      border-top: 1px solid color-mix(in srgb, var(--app-text-muted) 8%, transparent);
    }
    .preview-table td:first-child { color: var(--app-text-muted); font-weight: 600; width: 42%; }
    .mono { font-family: var(--app-font-mono, monospace); }
    .launch-dialog__actions mat-icon {
      margin-right: 0.2rem;
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
    }
  `,
})
export class JenkinsLaunchDialogComponent {
  readonly data = inject<JenkinsLaunchDialogData>(MAT_DIALOG_DATA)
  private readonly dialogRef = inject(MatDialogRef<JenkinsLaunchDialogComponent, JenkinsLaunchDetailData | undefined>)
  private readonly fb = inject(FormBuilder)

  private readonly defaults = defaultLaunchParams(this.data.job)

  readonly form = this.fb.nonNullable.group({
    branch: [this.defaults.branch, Validators.required],
    gitRevision: [this.defaults.gitRevision, Validators.required],
    environment: [this.defaults.environment, Validators.required],
    deployTarget: [this.defaults.deployTarget, Validators.required],
    namespace: [this.defaults.namespace, Validators.required],
    helmChart: [this.defaults.helmChart, Validators.required],
    dockerTag: [this.defaults.dockerTag, Validators.required],
    skipTests: [this.defaults.skipTests],
    runSonar: [this.defaults.runSonar],
    cleanWorkspace: [this.defaults.cleanWorkspace],
    dryRun: [this.defaults.dryRun],
    requireApproval: [this.defaults.requireApproval],
    changeTicket: [this.defaults.changeTicket],
    buildPriority: [this.defaults.buildPriority, Validators.required],
    timeoutMinutes: [this.defaults.timeoutMinutes, [Validators.required, Validators.min(5), Validators.max(180)]],
    agentLabel: [this.defaults.agentLabel, Validators.required],
    description: [this.defaults.description],
    notifyOnComplete: [this.defaults.notifyOnComplete],
    notifySlack: [this.defaults.notifySlack],
    notifyEmail: [this.defaults.notifyEmail],
  })

  private readonly formValues = toSignal(
    this.form.valueChanges.pipe(
      startWith(null),
      map(() => this.form.getRawValue()),
    ),
    { initialValue: this.form.getRawValue() },
  )

  readonly previewRows = computed(() => paramsToPreview(this.formValues()))

  jobStatus = (): string => String(this.data.job['status'] ?? 'UNKNOWN')

  nextBuildNum = (): number => Number(this.data.job['buildNum'] ?? 0) + 1

  jobFolder = (): string => String(this.data.job['folder'] ?? '/cloudops/apps')

  jobTypeLabel = (): string => {
    const t = String(this.data.job['type'] ?? 'pipeline')
    if (t === 'multibranch') return 'Multibranch Pipeline'
    if (t === 'freestyle') return 'Freestyle'
    return 'Pipeline declarativo'
  }

  scmUrl = (): string => String((this.data.job['scm'] as { url?: string })?.url ?? '—')

  scmCommit = (): string => String((this.data.job['scm'] as { commit?: string })?.commit ?? 'HEAD')

  branchOptions = (): string[] => {
    const base = String(this.data.job['branch'] ?? 'main')
    const extras = ['main', 'develop', 'release/2.4', 'infra/main', base]
    return [...new Set(extras)]
  }

  isProduction = (): boolean => this.formValues().environment === 'production'

  jobProdReady = (): boolean => isJobProdLaunchReady(this.data.job)

  canLaunch = (): boolean => {
    if (this.form.invalid) return false
    if (this.isProduction() && !this.jobProdReady()) return false
    return true
  }

  estimatedDuration = (): string => estimateDuration(this.formValues())

  handleReset = (): void => {
    this.form.reset(this.defaults)
  }

  handleLaunch = (): void => {
    if (!this.canLaunch()) {
      this.form.markAllAsTouched()
      return
    }
    const v = this.form.getRawValue()
    if (v.environment === 'production' && !v.changeTicket.trim()) {
      this.form.controls.changeTicket.setErrors({ required: true })
      return
    }
    if (v.environment === 'production' && !isJobProdLaunchReady(this.data.job)) {
      return
    }
    this.dialogRef.close(buildJenkinsLaunchDetail(this.data.job, v))
  }
}

@Component({
  selector: 'app-jenkins-launch-detail-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    StatusBadgeComponent,
    BrandLogoComponent,
    JenkinsLaunchDetailPanelComponent,
  ],
  template: `
    <div class="launch-popup">
      <header class="launch-popup__bar" mat-dialog-title>
        <div class="launch-popup__bar-left">
          <span class="launch-popup__icon" aria-hidden="true">
            <app-brand-logo logo="jenkins" size="topo" />
          </span>
          <div>
            <p class="launch-popup__eyebrow">Detalle del lanzamiento</p>
            <p class="launch-popup__title">
              {{ data.jobName }}
              <span class="mono">#{{ data.buildNum }}</span>
            </p>
          </div>
        </div>
        <app-status-badge [value]="data.status" />
        <button
          mat-icon-button
          type="button"
          mat-dialog-close
          aria-label="Cerrar detalle del lanzamiento"
        >
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <mat-dialog-content class="launch-popup__content">
        <app-jenkins-launch-detail-panel [data]="data" />
      </mat-dialog-content>

      <mat-dialog-actions class="launch-popup__actions" align="end">
        <span class="launch-popup__queue mono">{{ data.queueId }}</span>
        <span class="launch-popup__spacer"></span>
        <a
          mat-stroked-button
          [href]="data.buildUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          <mat-icon>open_in_new</mat-icon>
          Abrir en Jenkins
        </a>
        <button mat-flat-button color="primary" mat-dialog-close type="button">
          Cerrar
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    :host { display: block; }
    :host ::ng-deep .mat-mdc-dialog-container {
      border: none;
      box-shadow: var(--app-shadow-lg, 0 12px 40px rgb(0 0 0 / 18%));
    }
    .launch-popup {
      min-width: min(720px, 96vw);
      max-width: 940px;
      background: var(--app-card);
    }
    .launch-popup__bar {
      display: flex !important;
      align-items: center;
      gap: 0.75rem;
      margin: 0 !important;
      padding: 1rem 1.25rem !important;
      background: var(--app-card);
      border-bottom: 1px solid var(--app-border);
    }
    .launch-popup__bar-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex: 1;
      min-width: 0;
    }
    .launch-popup__icon {
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
    }
    .launch-popup__icon app-brand-logo {
      width: 32px;
      height: 32px;
    }
    .launch-popup__eyebrow {
      margin: 0;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--app-text-muted);
    }
    .launch-popup__title {
      margin: 0.15rem 0 0;
      font-size: 1.05rem;
      font-weight: 700;
    }
    .launch-popup__title span {
      font-weight: 600;
      color: var(--app-text-muted);
      margin-left: 0.35rem;
    }
    .launch-popup__content {
      padding: 1rem 1.25rem 0.5rem !important;
      max-height: min(72vh, 680px);
      margin: 0;
    }
    .launch-popup__actions {
      padding: 0.75rem 1.25rem 1rem !important;
      gap: 0.5rem;
    }
    .launch-popup__queue {
      font-size: 0.72rem;
      color: var(--app-text-muted);
    }
    .launch-popup__spacer { flex: 1; }
    .launch-popup__actions a mat-icon,
    .launch-popup__actions button mat-icon {
      margin-right: 0.25rem;
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
    }
    .mono { font-family: var(--app-font-mono, ui-monospace, monospace); }

    :host ::ng-deep .launch-popup .status-badge--running {
      background: var(--app-surface);
      box-shadow: var(--app-shadow-xs);
    }
  `,
})
export class JenkinsLaunchDetailDialogComponent {
  readonly data = inject<JenkinsLaunchDetailData>(MAT_DIALOG_DATA)
}