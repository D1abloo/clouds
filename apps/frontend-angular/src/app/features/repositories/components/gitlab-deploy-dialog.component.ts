import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms'
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatSelectModule } from '@angular/material/select'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { toSignal } from '@angular/core/rxjs-interop'
import { startWith } from 'rxjs'
import {
  GITLAB_DEPLOY_ENVIRONMENTS,
  GITLAB_DEPLOY_STRATEGIES,
  GITLAB_DEPLOY_TARGETS,
  projectCiVars,
  projectEnvironments,
  projectLastDeploy,
  projectPipeline,
  projectReleases,
  targetTypeLabel,
  type GitlabDeployDialogData,
  type GitlabDeployDialogResult,
  type GitlabDeployStrategy,
} from '../utils/gitlab-deploy-form.config'

const PIPELINE_STAGES = ['build', 'test', 'scan', 'deploy', 'verify'] as const

@Component({
  selector: 'app-gitlab-deploy-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    ReactiveFormsModule,
  ],
  template: `
    <div class="gl-dep-dialog">
      <header class="gl-dep-dialog__head">
        <div>
          <h2 mat-dialog-title>Desplegar proyecto GitLab</h2>
          <p class="gl-dep-dialog__sub">
            Pipeline CI/CD · environment · destino de infraestructura · estrategia de rollout
          </p>
        </div>
        <span class="gl-dep-dialog__chip">GitLab CI · ~5 min</span>
      </header>

      <mat-dialog-content>
        <div class="gl-dep-dialog__layout">
          <div class="gl-dep-dialog__form">
            <article class="gl-dep-project">
              <span class="prov-badge prov-badge--gitlab">GitLab</span>
              <div>
                <strong>{{ data.project.fullPath }}</strong>
                <p>{{ data.project.description }}</p>
              </div>
              <dl class="gl-dep-project__meta">
                <div><dt>Rama default</dt><dd>{{ data.project.defaultBranch }}</dd></div>
                <div><dt>Lenguaje</dt><dd>{{ data.project.language }}</dd></div>
                <div><dt>Visibilidad</dt><dd>{{ data.project.visibility }}</dd></div>
                @if (lastPipeline(); as pipe) {
                  <div>
                    <dt>Último pipeline</dt>
                    <dd [class]="'pipe--' + pipe['status']">{{ pipe['status'] }} · {{ pipe['duration'] }}</dd>
                  </div>
                }
              </dl>
            </article>

            <section class="gl-dep-section">
              <h3><mat-icon>commit</mat-icon> Origen del despliegue</h3>
              <div class="gl-dep-grid gl-dep-grid--2">
                <mat-form-field appearance="outline">
                  <mat-label>Tipo de ref</mat-label>
                  <mat-select [formControl]="refType">
                    <mat-option value="branch">Rama</mat-option>
                    <mat-option value="tag">Tag / release</mat-option>
                    <mat-option value="sha">Commit SHA</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>{{ refLabel() }}</mat-label>
                  @if (refType.value === 'tag' && releases().length) {
                    <mat-select [formControl]="branch">
                      @for (r of releases(); track r['tag']) {
                        <mat-option [value]="r['tag']">{{ r['tag'] }} · {{ r['name'] }}</mat-option>
                      }
                    </mat-select>
                  } @else {
                    <input matInput [formControl]="branch" [placeholder]="refPlaceholder()" />
                  }
                  @if (branch.invalid && branch.touched) {
                    <mat-error>Referencia obligatoria</mat-error>
                  }
                </mat-form-field>
              </div>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Versión / artefacto</mat-label>
                <input matInput [formControl]="version" placeholder="v1.12.0 · chart-2.4.0" />
                <mat-hint>Etiqueta del release desplegado (Helm chart, imagen, etc.)</mat-hint>
              </mat-form-field>
            </section>

            <section class="gl-dep-section">
              <h3><mat-icon>layers</mat-icon> Environment y destino</h3>
              <div class="gl-dep-grid gl-dep-grid--2">
                <mat-form-field appearance="outline">
                  <mat-label>Environment GitLab</mat-label>
                  <mat-select [formControl]="environment">
                    @for (env of environments; track env.value) {
                      <mat-option [value]="env.value">
                        {{ env.label }}
                        @if (env.protected) { · protegido }
                      </mat-option>
                    }
                  </mat-select>
                  @if (projectEnvHint()) {
                    <mat-hint>{{ projectEnvHint() }}</mat-hint>
                  }
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Estrategia</mat-label>
                  <mat-select [formControl]="strategy">
                    @for (s of strategies; track s.value) {
                      <mat-option [value]="s.value">{{ s.label }}</mat-option>
                    }
                  </mat-select>
                  <mat-hint>{{ strategyHint() }}</mat-hint>
                </mat-form-field>
              </div>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Destino de infraestructura</mat-label>
                <mat-select [formControl]="targetId">
                  @for (t of filteredTargets(); track t.id) {
                    <mat-option [value]="t.id">
                      {{ t.name }} · {{ targetTypeLabel(t.type) }}
                      @if (t.region) { · {{ t.region }} }
                    </mat-option>
                  }
                </mat-select>
                <mat-hint>{{ selectedTargetLine() }}</mat-hint>
              </mat-form-field>
              @if (lastDeploy(); as dep) {
                <p class="gl-dep-last">
                  <mat-icon>history</mat-icon>
                  Último deploy OK: <strong>{{ dep['version'] }}</strong> → {{ dep['targetName'] }}
                  ({{ dep['duration'] }})
                </p>
              }
            </section>

            <section class="gl-dep-section">
              <h3><mat-icon>settings</mat-icon> Pipeline y opciones</h3>
              <div class="gl-dep-checks">
                <mat-checkbox [formControl]="rebuildPipeline">Forzar rebuild (no reutilizar artefacto)</mat-checkbox>
                <mat-checkbox [formControl]="autoRollback">Rollback automático si falla healthcheck</mat-checkbox>
                <mat-checkbox [formControl]="runHealthCheck">Ejecutar post-deploy healthcheck</mat-checkbox>
                <mat-checkbox [formControl]="approvalRequired">Requiere aprobación (environment protegido)</mat-checkbox>
                <mat-checkbox [formControl]="notifyOnSuccess">Notificar en Slack al completar</mat-checkbox>
                <mat-checkbox [formControl]="notifyOnFailure">Notificar en Slack si falla</mat-checkbox>
              </div>
              <mat-form-field appearance="outline" class="full">
                <mat-label>URL healthcheck</mat-label>
                <input matInput [formControl]="healthCheckUrl" placeholder="https://api.ejemplo.com/health" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Notas del despliegue</mat-label>
                <textarea matInput rows="2" [formControl]="description" placeholder="Hotfix pagos · ventana de mantenimiento aprobada"></textarea>
              </mat-form-field>
            </section>

            @if (ciVars().length) {
              <section class="gl-dep-section">
                <h3><mat-icon>key</mat-icon> Variables CI/CD del proyecto</h3>
                <p class="gl-dep-section__hint">Se inyectarán en el job deploy según el environment seleccionado</p>
                <ul class="gl-dep-vars">
                  @for (v of ciVars(); track v['id']) {
                    <li>
                      <code>{{ v['key'] }}</code>
                      <span>{{ v['environment'] }}</span>
                      @if (v['protected']) { <span class="chip chip--warn">protected</span> }
                      @if (v['masked']) { <span class="chip">masked</span> }
                    </li>
                  }
                </ul>
              </section>
            }
          </div>

          <aside class="gl-dep-dialog__aside">
            <article class="gl-dep-preview">
              <h4>Resumen</h4>
              <dl>
                <div><dt>Proyecto</dt><dd class="mono">{{ preview().project }}</dd></div>
                <div><dt>Ref</dt><dd class="mono">{{ preview().ref }}</dd></div>
                <div><dt>Environment</dt><dd>{{ preview().environment }}</dd></div>
                <div><dt>Destino</dt><dd>{{ preview().target }}</dd></div>
                <div><dt>Estrategia</dt><dd>{{ preview().strategy }}</dd></div>
                <div><dt>Duración est.</dt><dd>{{ preview().duration }}</dd></div>
              </dl>
            </article>

            <article class="gl-dep-pipeline">
              <h4>Stages del pipeline</h4>
              <div class="gl-dep-stages">
                @for (stage of pipelineStages(); track stage.label) {
                  <div class="gl-dep-stage" [class]="'gl-dep-stage--' + stage.status">
                    <span class="gl-dep-stage__dot"></span>
                    <span>{{ stage.label }}</span>
                  </div>
                }
              </div>
            </article>

            <article class="gl-dep-steps">
              <h4>Qué ocurre al desplegar</h4>
              <ol>
                @for (step of deploySteps(); track step) {
                  <li>{{ step }}</li>
                }
              </ol>
            </article>

            @if (environment.value === 'production') {
              <article class="gl-dep-warn" role="alert">
                <mat-icon>warning</mat-icon>
                <p>Environment <strong>production</strong> protegido — puede requerir aprobación manual en GitLab.</p>
              </article>
            }
          </aside>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-stroked-button type="button" [disabled]="!canSubmit() || dryRunning()" (click)="handleDryRun()">
          @if (dryRunning()) { Simulando… } @else { Simular pipeline }
        </button>
        <button mat-flat-button class="gl-btn" type="button" [disabled]="!canSubmit()" (click)="handleSubmit()">
          <mat-icon>rocket_launch</mat-icon> Desplegar
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .gl-dep-dialog__head {
      display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem;
      padding-right: 0.5rem;
    }
    h2[mat-dialog-title] { margin: 0; padding: 0; font-size: 1.12rem; font-weight: 700; }
    .gl-dep-dialog__sub { margin: 0.15rem 0 0; font-size: 0.72rem; color: var(--app-text-muted); max-width: 34rem; }
    .gl-dep-dialog__chip {
      flex-shrink: 0; font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.04em; padding: 0.25rem 0.55rem; border-radius: 4px;
      color: #c2410c; background: color-mix(in srgb, #fc6d26 14%, transparent);
    }
    .gl-dep-dialog__layout {
      display: grid; grid-template-columns: minmax(0, 1fr) minmax(220px, 260px);
      gap: 1.25rem; align-items: start;
    }
    .gl-dep-project {
      display: flex; flex-wrap: wrap; gap: 0.5rem 0.75rem; align-items: flex-start;
      padding: 0.65rem 0 0.85rem;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text-muted) 10%, transparent);
      strong { display: block; font-size: 0.92rem; }
      p { margin: 0.2rem 0 0; font-size: 0.76rem; color: var(--app-text-muted); flex: 1 1 100%; }
    }
    .gl-dep-project__meta {
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.35rem 0.75rem;
      width: 100%; margin: 0.35rem 0 0; font-size: 0.72rem;
      dt { color: var(--app-text-muted); font-size: 0.65rem; text-transform: uppercase; }
      dd { margin: 0.1rem 0 0; font-weight: 600; }
      .pipe--success { color: #16a34a; }
      .pipe--running { color: #2563eb; }
      .pipe--failed { color: #dc2626; }
    }
    .gl-dep-section {
      padding: 0.65rem 0 0.85rem;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text-muted) 10%, transparent);
      &:last-child { border-bottom: none; }
      h3 {
        display: flex; align-items: center; gap: 0.35rem; margin: 0 0 0.65rem;
        font-size: 0.82rem; font-weight: 750;
        mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: #fc6d26; opacity: 0.9; }
      }
    }
    .gl-dep-section__hint { margin: 0 0 0.5rem; font-size: 0.72rem; color: var(--app-text-muted); }
    .gl-dep-grid { display: grid; gap: 0.35rem 0.75rem; }
    .gl-dep-grid--2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .full { width: 100%; }
    .gl-dep-checks { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.5rem; font-size: 0.78rem; }
    .gl-dep-last {
      display: flex; align-items: center; gap: 0.3rem; flex-wrap: wrap;
      margin: 0.35rem 0 0; font-size: 0.74rem; color: var(--app-text-muted);
      mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; }
    }
    .gl-dep-vars {
      list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem;
      li {
        display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem; font-size: 0.74rem;
        code { font-weight: 700; font-size: 0.72rem; }
        span { color: var(--app-text-muted); font-size: 0.68rem; }
      }
    }
    .chip {
      font-size: 0.6rem; font-weight: 700; padding: 0.08rem 0.35rem; border-radius: 3px;
      background: color-mix(in srgb, var(--app-text-muted) 12%, transparent);
      &--warn { color: #b45309; background: color-mix(in srgb, #f59e0b 14%, transparent); }
    }
    .gl-dep-dialog__aside { display: flex; flex-direction: column; gap: 0.75rem; position: sticky; top: 0; }
    .gl-dep-preview, .gl-dep-pipeline, .gl-dep-steps, .gl-dep-warn {
      padding: 0.65rem 0.75rem;
      border-left: 2px solid color-mix(in srgb, #fc6d26 40%, transparent);
      font-size: 0.74rem;
      h4 {
        margin: 0 0 0.45rem; font-size: 0.72rem; font-weight: 750;
        text-transform: uppercase; letter-spacing: 0.04em; color: var(--app-text-muted);
      }
      dl { margin: 0; display: flex; flex-direction: column; gap: 0.35rem; }
      div { display: flex; justify-content: space-between; gap: 0.5rem; }
      dt { margin: 0; color: var(--app-text-muted); font-size: 0.68rem; }
      dd { margin: 0; font-weight: 600; text-align: right; }
      .mono { font-family: ui-monospace, monospace; font-size: 0.68rem; }
      ol { margin: 0; padding-left: 1.1rem; line-height: 1.45; }
      li { margin-bottom: 0.25rem; }
    }
    .gl-dep-stages { display: flex; flex-direction: column; gap: 0.35rem; }
    .gl-dep-stage {
      display: flex; align-items: center; gap: 0.4rem; font-size: 0.72rem; opacity: 0.45;
      text-transform: capitalize;
    }
    .gl-dep-stage--ok { opacity: 1; }
    .gl-dep-stage--run { opacity: 1; color: #2563eb; }
    .gl-dep-stage--wait { opacity: 0.35; }
    .gl-dep-stage__dot {
      width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
      background: color-mix(in srgb, var(--app-text-muted) 40%, transparent);
    }
    .gl-dep-stage--ok .gl-dep-stage__dot { background: #22c55e; }
    .gl-dep-stage--run .gl-dep-stage__dot { background: #2563eb; }
    .gl-dep-warn {
      display: flex; gap: 0.4rem; align-items: flex-start;
      border-left-color: #f59e0b; background: color-mix(in srgb, #f59e0b 8%, transparent);
      p { margin: 0; font-size: 0.72rem; line-height: 1.4; }
      mat-icon { color: #d97706; font-size: 1.1rem; width: 1.1rem; height: 1.1rem; flex-shrink: 0; }
    }
    .gl-btn {
      background: #fc6d26 !important; color: #fff !important;
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; margin-right: 0.15rem; }
    }
    @media (max-width: 820px) {
      .gl-dep-dialog__layout { grid-template-columns: 1fr; }
      .gl-dep-dialog__aside { position: static; }
      .gl-dep-grid--2 { grid-template-columns: 1fr; }
    }
  `,
})
export class GitlabDeployDialogComponent {
  readonly data = inject<GitlabDeployDialogData>(MAT_DIALOG_DATA)
  private readonly ref = inject(MatDialogRef<GitlabDeployDialogComponent, GitlabDeployDialogResult>)

  readonly environments = GITLAB_DEPLOY_ENVIRONMENTS
  readonly strategies = GITLAB_DEPLOY_STRATEGIES
  readonly targetTypeLabel = targetTypeLabel

  readonly refType = new FormControl<'branch' | 'tag' | 'sha'>('branch', { nonNullable: true })
  readonly branch = new FormControl(this.data.project.defaultBranch, { nonNullable: true, validators: [Validators.required] })
  readonly version = new FormControl('', { nonNullable: true })
  readonly environment = new FormControl('staging', { nonNullable: true })
  readonly strategy = new FormControl<GitlabDeployStrategy>('rolling', { nonNullable: true })
  readonly targetId = new FormControl(GITLAB_DEPLOY_TARGETS[0].id, { nonNullable: true })
  readonly rebuildPipeline = new FormControl(false, { nonNullable: true })
  readonly autoRollback = new FormControl(true, { nonNullable: true })
  readonly runHealthCheck = new FormControl(true, { nonNullable: true })
  readonly approvalRequired = new FormControl(false, { nonNullable: true })
  readonly notifyOnSuccess = new FormControl(true, { nonNullable: true })
  readonly notifyOnFailure = new FormControl(true, { nonNullable: true })
  readonly healthCheckUrl = new FormControl('', { nonNullable: true })
  readonly description = new FormControl('', { nonNullable: true })

  readonly dryRunning = signal(false)

  private readonly refTypeSig = toSignal(this.refType.valueChanges.pipe(startWith(this.refType.value)), {
    initialValue: this.refType.value,
  })
  private readonly envSig = toSignal(this.environment.valueChanges.pipe(startWith(this.environment.value)), {
    initialValue: this.environment.value,
  })
  private readonly strategySig = toSignal(this.strategy.valueChanges.pipe(startWith(this.strategy.value)), {
    initialValue: this.strategy.value,
  })
  private readonly targetSig = toSignal(this.targetId.valueChanges.pipe(startWith(this.targetId.value)), {
    initialValue: this.targetId.value,
  })

  readonly lastPipeline = computed(() => projectPipeline(this.data.project.fullPath))
  readonly lastDeploy = computed(() => projectLastDeploy(this.data.project.fullPath))
  readonly ciVars = computed(() => projectCiVars(this.data.project.fullPath))
  readonly releases = computed(() => projectReleases(this.data.project.fullPath))

  readonly refLabel = computed(() => {
    const t = this.refTypeSig()
    if (t === 'tag') return 'Tag / release'
    if (t === 'sha') return 'Commit SHA'
    return 'Rama'
  })

  readonly refPlaceholder = computed(() => {
    const t = this.refTypeSig()
    if (t === 'sha') return 'gl0f6e5d4c3b2a1…'
    return this.data.project.defaultBranch
  })

  readonly strategyHint = computed(
    () => GITLAB_DEPLOY_STRATEGIES.find((s) => s.value === this.strategySig())?.hint ?? '',
  )

  readonly filteredTargets = computed(() => {
    const env = this.envSig()
    if (env === 'production') {
      return GITLAB_DEPLOY_TARGETS.filter((t) => t.type === 'kubernetes' || t.type === 'docker')
    }
    return GITLAB_DEPLOY_TARGETS
  })

  readonly selectedTarget = computed(() =>
    GITLAB_DEPLOY_TARGETS.find((t) => t.id === this.targetSig()) ?? GITLAB_DEPLOY_TARGETS[0],
  )

  readonly selectedTargetLine = computed(() => {
    const t = this.selectedTarget()
    return `${t.name} · ${targetTypeLabel(t.type)} · ${t.status ?? 'online'}`
  })

  readonly projectEnvHint = computed(() => {
    const envs = projectEnvironments(this.data.project.fullPath)
    if (!envs.length) return 'Environments definidos en GitLab CI/CD'
    return `Configurados: ${envs.map((e) => e['name']).join(', ')}`
  })

  readonly preview = computed(() => {
    const t = this.selectedTarget()
    const strat = GITLAB_DEPLOY_STRATEGIES.find((s) => s.value === this.strategySig())?.label ?? 'Rolling'
    return {
      project: this.data.project.name,
      ref: `${this.refTypeSig()}:${this.branch.value}`,
      environment: this.envSig(),
      target: `${t.name} (${targetTypeLabel(t.type)})`,
      strategy: strat,
      duration: this.rebuildPipeline.value ? '~6–8 min' : '~4–5 min',
    }
  })

  readonly pipelineStages = computed(() => {
    const rebuild = this.rebuildPipeline.value
    return PIPELINE_STAGES.map((label, i) => {
      let status: 'ok' | 'run' | 'wait' = 'wait'
      if (!rebuild && i < 3) status = 'ok'
      if (rebuild && i === 0) status = 'run'
      if (!rebuild && i === 3) status = 'run'
      return { label, status }
    })
  })

  readonly deploySteps = computed(() => {
    const steps = [`Disparar pipeline en ${this.data.project.fullPath}`]
    if (this.rebuildPipeline.value) steps.push('Build + test + scan de seguridad')
    else steps.push('Reutilizar artefacto del último pipeline OK')
    steps.push(`Deploy stage → environment ${this.envSig()}`)
    steps.push(`Rollout ${this.strategyHint()} en ${this.selectedTarget().name}`)
    if (this.runHealthCheck.value) steps.push('Healthcheck post-deploy')
    if (this.approvalRequired.value || this.envSig() === 'production') {
      steps.push('Esperar aprobación (environment protegido)')
    }
    if (this.notifyOnSuccess.value) steps.push('Notificación Slack al completar')
    return steps
  })

  canSubmit = (): boolean => this.branch.valid && !!this.branch.value.trim()

  handleDryRun = (): void => {
    if (!this.canSubmit()) return
    this.dryRunning.set(true)
    setTimeout(() => this.dryRunning.set(false), 800)
  }

  handleSubmit = (): void => {
    if (!this.canSubmit()) return
    const target = this.selectedTarget()
    this.ref.close({
      projectPath: this.data.project.fullPath,
      branch: this.branch.value.trim(),
      refType: this.refType.value,
      version: this.version.value.trim() || undefined,
      environment: this.environment.value,
      targetId: target.id,
      targetType: target.type,
      targetName: target.name,
      strategy: this.strategy.value,
      rebuildPipeline: this.rebuildPipeline.value,
      autoRollback: this.autoRollback.value,
      runHealthCheck: this.runHealthCheck.value,
      healthCheckUrl: this.healthCheckUrl.value.trim() || undefined,
      notifyOnSuccess: this.notifyOnSuccess.value,
      notifyOnFailure: this.notifyOnFailure.value,
      runnerTags: ['docker', 'linux'],
      ciVariables: this.ciVars().map((v) => String(v['key'])),
      approvalRequired: this.approvalRequired.value || this.environment.value === 'production',
      description: this.description.value.trim() || undefined,
    })
  }
}
