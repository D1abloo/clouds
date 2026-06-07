import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms'
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatSelectModule } from '@angular/material/select'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { toSignal } from '@angular/core/rxjs-interop'
import { startWith } from 'rxjs'
import {
  GITHUB_ACCOUNT_TYPES,
  GITHUB_AUTH_METHODS,
  GITHUB_REPO_SCOPES,
  GITHUB_SCOPES,
  GITHUB_SYNC_INTERVALS,
  GITHUB_WEBHOOK_EVENTS,
  defaultCloudOpsWebhookUrl,
  type GithubAccountFormResult,
  type GithubAccountType,
  type GithubAuthMethod,
} from '../utils/github-account-form.config'
import { previewGithubRepoSync } from '../utils/github-sync-permissions.util'

@Component({
  selector: 'app-github-account-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule,
    MatSlideToggleModule,
  ],
  template: `
    <div class="gh-acc-dialog">
      <header class="gh-acc-dialog__head">
        <div>
          <h2 mat-dialog-title>Añadir cuenta GitHub</h2>
          <p class="gh-acc-dialog__sub">
            PAT o GitHub App · scopes para repos, Actions y webhooks · sincronización automática
          </p>
        </div>
        <span class="gh-acc-dialog__chip">~2 min · credenciales cifradas</span>
      </header>

      <mat-dialog-content>
        <div class="gh-acc-dialog__layout">
          <div class="gh-acc-dialog__form">
            <section class="gh-acc-section">
              <h3><mat-icon>badge</mat-icon> Identidad de la cuenta</h3>
              <div class="gh-acc-grid gh-acc-grid--2">
                <mat-form-field appearance="outline">
                  <mat-label>Etiqueta en CloudOps</mat-label>
                  <input matInput [formControl]="label" placeholder="GitHub producción" />
                  <mat-hint>Nombre visible en el panel de repositorios</mat-hint>
                  @if (label.invalid && label.touched) {
                    <mat-error>Obligatorio</mat-error>
                  }
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Entorno</mat-label>
                  <mat-select [formControl]="environment">
                    <mat-option value="production">Producción</mat-option>
                    <mat-option value="staging">Staging</mat-option>
                    <mat-option value="development">Desarrollo</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
              <div class="gh-acc-grid gh-acc-grid--2">
                <mat-form-field appearance="outline">
                  <mat-label>Tipo de cuenta</mat-label>
                  <mat-select [formControl]="accountType">
                    @for (t of accountTypes; track t.value) {
                      <mat-option [value]="t.value">{{ t.label }}</mat-option>
                    }
                  </mat-select>
                  <mat-hint>{{ accountTypeHint() }}</mat-hint>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Usuario GitHub</mat-label>
                  <input matInput [formControl]="username" placeholder="cloudops-demo" />
                  @if (username.invalid && username.touched) {
                    <mat-error>Obligatorio · sin &#64;</mat-error>
                  }
                  <mat-hint>Handle del propietario del token</mat-hint>
                </mat-form-field>
              </div>
              @if (showOrganization()) {
                <mat-form-field appearance="outline" class="full">
                  <mat-label>Organización (slug)</mat-label>
                  <input matInput [formControl]="organization" placeholder="cloudops-org" />
                  @if (organization.invalid && organization.touched) {
                    <mat-error>Requerido para cuentas de organización</mat-error>
                  }
                  <mat-hint>Slug en github.com/{{ organization.value || 'mi-org' }}</mat-hint>
                </mat-form-field>
              }
              <mat-form-field appearance="outline" class="full">
                <mat-label>Notas / propósito</mat-label>
                <textarea matInput rows="2" [formControl]="description" placeholder="Cuenta CI/CD principal · acceso solo DevOps"></textarea>
              </mat-form-field>
            </section>

            <section class="gh-acc-section">
              <h3><mat-icon>key</mat-icon> Autenticación</h3>
              <div class="gh-acc-grid gh-acc-grid--2">
                <mat-form-field appearance="outline">
                  <mat-label>Método</mat-label>
                  <mat-select [formControl]="authMethod">
                    @for (m of authMethods; track m.value) {
                      <mat-option [value]="m.value">{{ m.label }}</mat-option>
                    }
                  </mat-select>
                  <mat-hint>{{ authMethodHint() }}</mat-hint>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Nombre del token (GitHub)</mat-label>
                  <input matInput [formControl]="tokenName" placeholder="cloudops-prod-pat" />
                  <mat-hint>Referencia en Settings → Developer settings</mat-hint>
                </mat-form-field>
              </div>
              @if (!useDemoData.value) {
                <mat-form-field appearance="outline" class="full">
                  <mat-label>{{ tokenLabel() }}</mat-label>
                  <input
                    matInput
                    [formControl]="token"
                    [type]="showToken() ? 'text' : 'password'"
                    autocomplete="off"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  />
                  <button mat-icon-button matSuffix type="button" (click)="toggleShowToken()" [attr.aria-label]="showToken() ? 'Ocultar token' : 'Mostrar token'">
                    <mat-icon>{{ showToken() ? 'visibility_off' : 'visibility' }}</mat-icon>
                  </button>
                  @if (token.invalid && token.touched) {
                    <mat-error>Token obligatorio (o activa modo demo)</mat-error>
                  }
                  <mat-hint>Nunca se muestra de nuevo · almacenado como referencia cifrada</mat-hint>
                </mat-form-field>
                <div class="gh-acc-grid gh-acc-grid--2">
                  <mat-form-field appearance="outline">
                    <mat-label>Caducidad del token</mat-label>
                    <input matInput type="date" [formControl]="tokenExpiry" />
                    <mat-hint>Opcional · alerta 7 días antes</mat-hint>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Email de contacto</mat-label>
                    <input matInput type="email" [formControl]="contactEmail" placeholder="devops@empresa.com" />
                    <mat-hint>Alertas de expiración y fallos de sync</mat-hint>
                  </mat-form-field>
                </div>
              } @else {
                <div class="gh-acc-demo-banner" role="status">
                  <mat-icon>science</mat-icon>
                  <div>
                    <strong>Modo demostración</strong>
                    <p>Sin PAT real se cargarán repos, Actions y webhooks simulados de cloudops-org.</p>
                  </div>
                </div>
              }
              <mat-checkbox [formControl]="useDemoData">Usar datos demo (sin token real)</mat-checkbox>
            </section>

            <section class="gh-acc-section">
              <h3><mat-icon>shield</mat-icon> Scopes requeridos</h3>
              <p class="gh-acc-section__hint">Marca los permisos que concederás al PAT. Los obligatorios vienen preseleccionados.</p>
              <div class="gh-acc-scopes">
                @for (scope of visibleScopes(); track scope.id) {
                  <label class="gh-acc-scope" [class.gh-acc-scope--required]="scope.required">
                    <mat-checkbox
                      [checked]="isScopeChecked(scope.id)"
                      [disabled]="scope.required"
                      (change)="handleScopeToggle(scope.id, $event.checked)"
                    />
                    <span>
                      <code>{{ scope.label }}</code>
                      <small>{{ scope.description }}</small>
                    </span>
                  </label>
                }
              </div>
            </section>

            <section class="gh-acc-section">
              <h3><mat-icon>sync</mat-icon> Sincronización</h3>
              <div class="gh-acc-grid gh-acc-grid--2">
                <mat-form-field appearance="outline">
                  <mat-label>Alcance de repos</mat-label>
                  <mat-select [formControl]="repoScope">
                    @for (r of repoScopes; track r.value) {
                      <mat-option [value]="r.value">{{ r.label }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Intervalo</mat-label>
                  <mat-select [formControl]="syncInterval" [disabled]="!autoSync.value">
                    @for (i of syncIntervals; track i.value) {
                      <mat-option [value]="i.value">{{ i.label }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>
              <div class="gh-acc-checks">
                <mat-checkbox [formControl]="autoSync">Sincronización automática de repos</mat-checkbox>
                <mat-checkbox [formControl]="syncOnConnect">Sincronizar inmediatamente al conectar</mat-checkbox>
                <mat-checkbox [formControl]="validateBeforeSave">Validar token contra api.github.com antes de guardar</mat-checkbox>
              </div>
            </section>

            <section class="gh-acc-section">
              <h3><mat-icon>webhook</mat-icon> Webhooks (opcional)</h3>
              <mat-form-field appearance="outline" class="full">
                <mat-label>URL destino CloudOps</mat-label>
                <input matInput [formControl]="webhookUrl" />
                <mat-hint>Endpoint que recibirá eventos push, PR y deployment</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Secret del webhook</mat-label>
                <input matInput [formControl]="webhookSecret" type="password" autocomplete="off" placeholder="whsec_…" />
                <mat-hint>HMAC SHA-256 · se almacena cifrado</mat-hint>
              </mat-form-field>
              <p class="gh-acc-section__hint">Eventos a suscribir tras la primera sync:</p>
              <div class="gh-acc-events">
                @for (ev of webhookEvents; track ev.id) {
                  <mat-checkbox
                    [checked]="isEventChecked(ev.id)"
                    (change)="handleEventToggle(ev.id, $event.checked)"
                  >
                    <code>{{ ev.label }}</code>
                    <span class="gh-acc-event-desc">{{ ev.description }}</span>
                  </mat-checkbox>
                }
              </div>
            </section>
          </div>

          <aside class="gh-acc-dialog__aside">
            <article class="gh-acc-preview">
              <h4>Vista previa</h4>
              <dl>
                <div><dt>Cuenta</dt><dd>{{ preview().label }}</dd></div>
                <div><dt>Handle</dt><dd class="mono">&#64;{{ preview().username }}</dd></div>
                <div><dt>Tipo</dt><dd>{{ preview().typeLabel }}</dd></div>
                @if (preview().organization) {
                  <div><dt>Organización</dt><dd class="mono">{{ preview().organization }}</dd></div>
                }
                <div><dt>Entorno</dt><dd>{{ preview().environmentLabel }}</dd></div>
                <div><dt>Auth</dt><dd>{{ preview().authLabel }}</dd></div>
                <div><dt>Scopes</dt><dd>{{ preview().scopeCount }} activos</dd></div>
                <div><dt>Sync</dt><dd>{{ preview().syncLabel }}</dd></div>
              </dl>
            </article>

            <article class="gh-acc-steps">
              <h4>Qué ocurre al añadir</h4>
              <ol>
                @for (step of onboardingSteps(); track step) {
                  <li>{{ step }}</li>
                }
              </ol>
            </article>

            <article class="gh-acc-sync-preview" [class.gh-acc-sync-preview--warn]="!syncPreview().canSync || syncPreview().accessible === 0">
              <h4><mat-icon>sync</mat-icon> Sync según permisos</h4>
              <p>
                <strong>{{ syncPreview().accessible }}</strong> / {{ syncPreview().total }} repos importables
                @if (syncPreview().skipped) {
                  · <span>{{ syncPreview().skipped }} omitidos</span>
                }
              </p>
              @if (syncPreview().sampleRepos.length) {
                <ul>
                  @for (repo of syncPreview().sampleRepos; track repo) {
                    <li class="mono">{{ repo }}</li>
                  }
                </ul>
              }
              @for (reason of syncPreview().reasons; track reason) {
                <p class="gh-acc-sync-note">{{ reason }}</p>
              }
            </article>

            <article class="gh-acc-impact">
              <h4><mat-icon>info</mat-icon> Requisitos</h4>
              <ul>
                <li>PAT con scopes <code>repo</code>, <code>workflow</code> y <code>admin:repo_hook</code></li>
                <li>Usuario con acceso de lectura a los repos objetivo</li>
                <li>Para orgs: permiso <code>read:org</code> o membership</li>
                <li>Webhooks requieren URL HTTPS accesible desde GitHub</li>
              </ul>
            </article>
          </aside>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close type="button">Cancelar</button>
        <button mat-stroked-button type="button" [disabled]="!canSubmit() || validating()" (click)="handleValidate()">
          @if (validating()) { Validando… } @else { Probar token }
        </button>
        <button mat-flat-button color="primary" type="button" [disabled]="!canSubmit()" (click)="handleSubmit()">
          Añadir cuenta
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .gh-acc-dialog__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
      padding-right: 0.5rem;
    }
    h2[mat-dialog-title] { margin: 0; padding: 0; font-size: 1.12rem; font-weight: 700; }
    .gh-acc-dialog__sub {
      margin: 0.15rem 0 0;
      font-size: 0.72rem;
      color: var(--app-text-muted);
      max-width: 36rem;
    }
    .gh-acc-dialog__chip {
      flex-shrink: 0;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.25rem 0.55rem;
      border-radius: 4px;
      color: var(--app-accent);
      background: color-mix(in srgb, var(--app-accent) 10%, transparent);
    }
    .gh-acc-dialog__layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(220px, 260px);
      gap: 1.25rem;
      align-items: start;
    }
    .gh-acc-section {
      padding: 0.65rem 0 0.85rem;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text-muted) 10%, transparent);
      &:last-child { border-bottom: none; }
      h3 {
        display: flex; align-items: center; gap: 0.35rem;
        margin: 0 0 0.65rem; font-size: 0.82rem; font-weight: 750;
        mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: var(--app-accent); opacity: 0.85; }
      }
    }
    .gh-acc-section__hint { margin: 0 0 0.55rem; font-size: 0.72rem; color: var(--app-text-muted); }
    .gh-acc-grid { display: grid; gap: 0.35rem 0.75rem; }
    .gh-acc-grid--2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .full { width: 100%; }
    .gh-acc-demo-banner {
      display: flex; gap: 0.55rem; align-items: flex-start;
      padding: 0.65rem 0.75rem; margin-bottom: 0.65rem; border-radius: 6px;
      background: color-mix(in srgb, var(--app-primary, #1565c0) 8%, transparent);
      font-size: 0.78rem;
      mat-icon { color: var(--app-primary, #1565c0); flex-shrink: 0; }
      p { margin: 0.2rem 0 0; color: var(--app-text-muted); font-size: 0.72rem; }
    }
    .gh-acc-scopes { display: flex; flex-direction: column; gap: 0.35rem; }
    .gh-acc-scope {
      display: flex; align-items: flex-start; gap: 0.35rem; cursor: pointer;
      code { font-size: 0.72rem; font-weight: 700; }
      small { display: block; font-size: 0.68rem; color: var(--app-text-muted); margin-top: 0.1rem; }
    }
    .gh-acc-scope--required code { color: #16a34a; }
    .gh-acc-checks, .gh-acc-events {
      display: flex; flex-direction: column; gap: 0.25rem;
      mat-checkbox { font-size: 0.78rem; }
    }
    .gh-acc-event-desc { margin-left: 0.35rem; font-size: 0.68rem; color: var(--app-text-muted); }
    .gh-acc-dialog__aside {
      display: flex; flex-direction: column; gap: 0.75rem;
      position: sticky; top: 0;
    }
    .gh-acc-preview, .gh-acc-steps, .gh-acc-impact, .gh-acc-sync-preview {
      padding: 0.65rem 0.75rem;
      border-left: 2px solid color-mix(in srgb, var(--app-accent) 35%, transparent);
      font-size: 0.74rem;
      h4 {
        margin: 0 0 0.45rem; font-size: 0.72rem; font-weight: 750;
        text-transform: uppercase; letter-spacing: 0.04em; color: var(--app-text-muted);
        display: flex; align-items: center; gap: 0.25rem;
        mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; }
      }
      dl { margin: 0; display: flex; flex-direction: column; gap: 0.35rem; }
      div { display: flex; justify-content: space-between; gap: 0.5rem; }
      dt { margin: 0; color: var(--app-text-muted); font-size: 0.68rem; }
      dd { margin: 0; font-weight: 600; text-align: right; }
      .mono { font-family: ui-monospace, monospace; font-size: 0.7rem; }
      ol, ul { margin: 0; padding-left: 1.1rem; line-height: 1.45; }
      li { margin-bottom: 0.25rem; }
      code { font-size: 0.65rem; }
    }
    .gh-acc-sync-preview--warn {
      border-left-color: #f59e0b;
      background: color-mix(in srgb, #f59e0b 6%, transparent);
    }
    .gh-acc-sync-preview ul {
      margin: 0.35rem 0 0; padding-left: 0; list-style: none;
      li.mono { font-family: ui-monospace, monospace; font-size: 0.65rem; margin-bottom: 0.15rem; }
    }
    .gh-acc-sync-note { margin: 0.25rem 0 0; font-size: 0.68rem; color: var(--app-text-muted); font-style: italic; }
    @media (max-width: 820px) {
      .gh-acc-dialog__layout { grid-template-columns: 1fr; }
      .gh-acc-dialog__aside { position: static; }
      .gh-acc-grid--2 { grid-template-columns: 1fr; }
    }
  `,
})
export class GithubAccountDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<GithubAccountDialogComponent, GithubAccountFormResult>)

  readonly accountTypes = GITHUB_ACCOUNT_TYPES
  readonly authMethods = GITHUB_AUTH_METHODS
  readonly repoScopes = GITHUB_REPO_SCOPES
  readonly syncIntervals = GITHUB_SYNC_INTERVALS
  readonly webhookEvents = GITHUB_WEBHOOK_EVENTS

  readonly label = new FormControl('GitHub producción', { nonNullable: true, validators: [Validators.required] })
  readonly environment = new FormControl<'production' | 'staging' | 'development'>('production', { nonNullable: true })
  readonly accountType = new FormControl<GithubAccountType>('organization', { nonNullable: true })
  readonly username = new FormControl('cloudops-demo', { nonNullable: true, validators: [Validators.required] })
  readonly organization = new FormControl('cloudops-org', { nonNullable: true })
  readonly description = new FormControl('', { nonNullable: true })
  readonly authMethod = new FormControl<GithubAuthMethod>('pat-fine-grained', { nonNullable: true })
  readonly tokenName = new FormControl('cloudops-prod-pat', { nonNullable: true })
  readonly token = new FormControl('', { nonNullable: true })
  readonly tokenExpiry = new FormControl('', { nonNullable: true })
  readonly contactEmail = new FormControl('', { nonNullable: true })
  readonly useDemoData = new FormControl(true, { nonNullable: true })
  readonly autoSync = new FormControl(true, { nonNullable: true })
  readonly syncInterval = new FormControl<'15m' | '1h' | '6h' | 'manual'>('1h', { nonNullable: true })
  readonly repoScope = new FormControl<'all' | 'organization' | 'selected'>('organization', { nonNullable: true })
  readonly syncOnConnect = new FormControl(true, { nonNullable: true })
  readonly validateBeforeSave = new FormControl(true, { nonNullable: true })
  readonly webhookUrl = new FormControl(defaultCloudOpsWebhookUrl(), { nonNullable: true })
  readonly webhookSecret = new FormControl('', { nonNullable: true })

  readonly showToken = signal(false)
  readonly validating = signal(false)

  readonly selectedScopes = signal<string[]>(
    GITHUB_SCOPES.filter((s) => s.required).map((s) => s.id),
  )
  readonly selectedEvents = signal<string[]>(['push', 'pull_request', 'deployment', 'workflow_run'])

  private readonly accountTypeSig = toSignal(this.accountType.valueChanges.pipe(startWith(this.accountType.value)), {
    initialValue: this.accountType.value,
  })
  private readonly authMethodSig = toSignal(this.authMethod.valueChanges.pipe(startWith(this.authMethod.value)), {
    initialValue: this.authMethod.value,
  })
  private readonly useDemoSig = toSignal(this.useDemoData.valueChanges.pipe(startWith(this.useDemoData.value)), {
    initialValue: this.useDemoData.value,
  })
  private readonly autoSyncSig = toSignal(this.autoSync.valueChanges.pipe(startWith(this.autoSync.value)), {
    initialValue: this.autoSync.value,
  })
  private readonly repoScopeSig = toSignal(this.repoScope.valueChanges.pipe(startWith(this.repoScope.value)), {
    initialValue: this.repoScope.value,
  })
  private readonly orgSig = toSignal(this.organization.valueChanges.pipe(startWith(this.organization.value)), {
    initialValue: this.organization.value,
  })

  readonly showOrganization = computed(
    () => this.accountTypeSig() === 'organization' || this.accountTypeSig() === 'enterprise',
  )

  readonly visibleScopes = computed(() => {
    const isOrg = this.accountTypeSig() !== 'personal'
    return GITHUB_SCOPES.filter((s) => !s.orgOnly || isOrg)
  })

  readonly accountTypeHint = computed(
    () => GITHUB_ACCOUNT_TYPES.find((t) => t.value === this.accountTypeSig())?.hint ?? '',
  )

  readonly authMethodHint = computed(
    () => GITHUB_AUTH_METHODS.find((m) => m.value === this.authMethodSig())?.hint ?? '',
  )

  readonly tokenLabel = computed(() => {
    const m = this.authMethodSig()
    if (m === 'github-app') return 'Private key / installation token'
    if (m === 'oauth') return 'OAuth client secret'
    return 'Personal Access Token'
  })

  readonly syncPreview = computed(() =>
    previewGithubRepoSync({
      scopes: this.selectedScopes(),
      repoScope: this.repoScopeSig(),
      organization: this.orgSig(),
      accountType: this.accountTypeSig(),
    }),
  )

  readonly preview = computed(() => {
    const type = this.accountTypeSig()
    const envLabels = { production: 'Producción', staging: 'Staging', development: 'Desarrollo' }
    const auth = GITHUB_AUTH_METHODS.find((m) => m.value === this.authMethodSig())?.label ?? 'PAT'
    const sync = this.autoSyncSig()
      ? GITHUB_SYNC_INTERVALS.find((i) => i.value === this.syncInterval.value)?.label ?? 'Automática'
      : 'Manual'
    return {
      label: this.label.value || '—',
      username: this.username.value || '—',
      typeLabel: GITHUB_ACCOUNT_TYPES.find((t) => t.value === type)?.label ?? type,
      organization: this.showOrganization() ? this.organization.value : undefined,
      environmentLabel: envLabels[this.environment.value],
      authLabel: this.useDemoSig() ? 'Demo (sin token)' : auth,
      scopeCount: this.selectedScopes().length,
      syncLabel: sync,
    }
  })

  readonly onboardingSteps = computed(() => {
    const steps = ['Registrar credenciales cifradas en CloudOps']
    if (this.validateBeforeSave.value) steps.push('Validar token contra GitHub API')
    if (this.syncOnConnect.value) {
      const p = this.syncPreview()
      steps.push(
        p.canSync && p.accessible > 0
          ? `Sincronizar ${p.accessible} repo(s) según scopes y alcance`
          : 'Sincronizar repos permitidos por el token (puede ser 0 si faltan permisos)',
      )
    }
    if (this.autoSync.value) steps.push(`Programar sync ${this.syncInterval.value}`)
    if (this.selectedEvents().length) steps.push(`Configurar webhooks: ${this.selectedEvents().join(', ')}`)
    steps.push('Disponible en panel Repositorios → GitHub')
    return steps
  })

  canSubmit = (): boolean => {
    if (this.label.invalid || this.username.invalid) return false
    if (this.showOrganization() && !this.organization.value.trim()) return false
    if (!this.useDemoData.value && !this.token.value.trim()) return false
    return true
  }

  isScopeChecked = (id: string): boolean => this.selectedScopes().includes(id)

  handleScopeToggle = (id: string, checked: boolean): void => {
    const def = GITHUB_SCOPES.find((s) => s.id === id)
    if (def?.required) return
    this.selectedScopes.update((prev) => {
      const next = checked ? [...prev, id] : prev.filter((s) => s !== id)
      return next
    })
  }

  isEventChecked = (id: string): boolean => this.selectedEvents().includes(id)

  handleEventToggle = (id: string, checked: boolean): void => {
    this.selectedEvents.update((prev) =>
      checked ? [...prev, id] : prev.filter((e) => e !== id),
    )
  }

  toggleShowToken = (): void => this.showToken.update((v) => !v)

  handleValidate = (): void => {
    if (!this.canSubmit()) return
    this.validating.set(true)
    setTimeout(() => this.validating.set(false), 900)
  }

  handleSubmit = (): void => {
    if (!this.canSubmit()) return
    const result: GithubAccountFormResult = {
      label: this.label.value.trim(),
      username: this.username.value.trim(),
      token: this.useDemoData.value ? undefined : this.token.value.trim() || undefined,
      accountType: this.accountType.value,
      organization: this.showOrganization() ? this.organization.value.trim() : undefined,
      authMethod: this.authMethod.value,
      tokenName: this.tokenName.value.trim() || undefined,
      tokenExpiry: this.tokenExpiry.value || undefined,
      scopes: this.selectedScopes(),
      environment: this.environment.value,
      autoSync: this.autoSync.value,
      syncInterval: this.syncInterval.value,
      repoScope: this.repoScope.value,
      webhookUrl: this.webhookUrl.value.trim(),
      webhookSecret: this.webhookSecret.value.trim() || undefined,
      webhookEvents: this.selectedEvents(),
      description: this.description.value.trim() || undefined,
      contactEmail: this.contactEmail.value.trim() || undefined,
      useDemoData: this.useDemoData.value,
      validateBeforeSave: this.validateBeforeSave.value,
      syncOnConnect: this.syncOnConnect.value,
    }
    this.dialogRef.close(result)
  }
}
