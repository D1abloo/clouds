import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { toSignal } from '@angular/core/rxjs-interop'
import { startWith } from 'rxjs'
import { VPS_DEMO_SSH_KEYS } from './infrastructure.data'
import { InfrastructureActionService } from './infrastructure-action.service'
import { ToastService } from '../../core/services/toast.service'
import { ProModeService } from '../../core/services/pro-mode.service'

export interface VpsAddDialogData {
  existingNames?: string[]
}

export interface VpsAddDialogResult {
  name: string
  host: string
  port: number
  user: string
  authMethod: 'public-key' | 'agent' | 'password'
  sshKeyName: string
  provider: string
  location: string
  environment: 'prod' | 'staging' | 'dev'
  os: string
  description: string
  tags: string[]
  bastionHost: string
  discoverDocker: boolean
  discoverKubernetes: boolean
  runPortScan: boolean
  collectMetrics: boolean
  enableAudit: boolean
  testConnectionFirst: boolean
}

const PROVIDERS = ['Hetzner', 'OVH', 'DigitalOcean', 'Bare metal', 'AWS EC2', 'GCP Compute', 'Azure VM']
const LOCATIONS = ['fra1', 'ams3', 'nyc1', 'mad1', 'lon1', 'sfo3', 'sgp1']
const OS_OPTIONS = ['Ubuntu 22.04 LTS', 'Ubuntu 24.04 LTS', 'Debian 12', 'Rocky Linux 9', 'AlmaLinux 9']

@Component({
  selector: 'app-vps-add-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <div class="vps-add-dialog">
      <header class="vps-add-dialog__head">
        <div>
          <h2 mat-dialog-title>Añadir servidor VPS</h2>
          <p class="vps-add-dialog__sub">
            Alta agentless en inventario · validación SSH · discovery opcional de runtimes
          </p>
        </div>
        <span class="vps-add-dialog__chip">~1 min · sin reinicio del host</span>
      </header>

      <mat-dialog-content>
        <div class="vps-add-dialog__layout">
          <div class="vps-add-dialog__form">
            <section class="vps-add-section">
              <h3><mat-icon>dns</mat-icon> Identidad y red</h3>
              <div class="vps-add-grid vps-add-grid--2">
                <mat-form-field appearance="outline">
                  <mat-label>Nombre del host</mat-label>
                  <input matInput [formControl]="name" placeholder="vps-prod-api-01" />
                  @if (nameError()) {
                    <mat-error>{{ nameError() }}</mat-error>
                  }
                  <mat-hint>Identificador único en inventario CloudOps</mat-hint>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Entorno</mat-label>
                  <mat-select [formControl]="environment">
                    <mat-option value="prod">Producción</mat-option>
                    <mat-option value="staging">Staging</mat-option>
                    <mat-option value="dev">Desarrollo</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
              <div class="vps-add-grid vps-add-grid--3">
                <mat-form-field appearance="outline" class="vps-add-span-2">
                  <mat-label>IP pública / hostname</mat-label>
                  <input matInput [formControl]="host" placeholder="203.0.113.10" />
                  @if (hostError()) {
                    <mat-error>{{ hostError() }}</mat-error>
                  }
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Puerto SSH</mat-label>
                  <input matInput type="number" [formControl]="port" />
                </mat-form-field>
              </div>
            </section>

            <section class="vps-add-section">
              <h3><mat-icon>vpn_key</mat-icon> Acceso SSH</h3>
              <div class="vps-add-grid vps-add-grid--2">
                <mat-form-field appearance="outline">
                  <mat-label>Usuario</mat-label>
                  <input matInput [formControl]="user" />
                  <mat-hint>Sin acceso root directo (PermitRootLogin no)</mat-hint>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Método de autenticación</mat-label>
                  <mat-select [formControl]="authMethod">
                    <mat-option value="public-key">Clave pública</mat-option>
                    <mat-option value="agent">Agent forwarding</mat-option>
                    <mat-option value="password">Contraseña (no recomendado)</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
              @if (authMethod.value === 'public-key') {
                <mat-form-field appearance="outline" class="full">
                  <mat-label>Clave autorizada</mat-label>
                  <mat-select [formControl]="sshKey">
                    @for (k of sshKeys; track k.name) {
                      <mat-option [value]="k.name">
                        {{ k.name }} · {{ k.fingerprint }}
                      </mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                @if (showSshKeyChangeWarning()) {
                  <div class="vps-add-ssh-warn" role="alert">
                    <mat-icon>warning</mat-icon>
                    <span>
                      Al cambiar la clave autorizada perderás acceso hasta desplegar la nueva clave pública en
                      <code>authorized_keys</code> del servidor destino.
                    </span>
                  </div>
                }
              }
              <mat-form-field appearance="outline" class="full">
                <mat-label>Bastion / jump host (opcional)</mat-label>
                <input matInput [formControl]="bastionHost" placeholder="vps-bastion-01 · 10.8.0.2" />
                <mat-hint>Ruta: cliente → bastion → host destino</mat-hint>
              </mat-form-field>
            </section>

            <section class="vps-add-section">
              <h3><mat-icon>inventory_2</mat-icon> Metadatos</h3>
              <div class="vps-add-grid vps-add-grid--2">
                <mat-form-field appearance="outline">
                  <mat-label>Proveedor</mat-label>
                  <mat-select [formControl]="provider">
                    @for (p of providers; track p) {
                      <mat-option [value]="p">{{ p }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Región / DC</mat-label>
                  <mat-select [formControl]="location">
                    @for (loc of locations; track loc) {
                      <mat-option [value]="loc">{{ loc }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>
              <div class="vps-add-grid vps-add-grid--2">
                <mat-form-field appearance="outline">
                  <mat-label>Sistema operativo</mat-label>
                  <mat-select [formControl]="os">
                    @for (o of osOptions; track o) {
                      <mat-option [value]="o">{{ o }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Etiquetas</mat-label>
                  <input matInput [formControl]="tags" placeholder="web, nginx, tier-1" />
                  <mat-hint>Separadas por coma</mat-hint>
                </mat-form-field>
              </div>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Notas / propósito</mat-label>
                <textarea matInput rows="2" [formControl]="description" placeholder="API checkout · acceso solo vía VPN"></textarea>
              </mat-form-field>
            </section>

            <section class="vps-add-section">
              <h3><mat-icon>radar</mat-icon> Discovery post-alta</h3>
              <p class="vps-add-section__hint">Tareas automáticas tras registrar el host (agentless vía SSH)</p>
              <div class="vps-add-checks">
                <mat-checkbox [formControl]="discoverDocker">Detectar Docker Engine y contenedores</mat-checkbox>
                <mat-checkbox [formControl]="discoverKubernetes">Detectar Kubernetes / k3s / kubelet</mat-checkbox>
                <mat-checkbox [formControl]="runPortScan">Escaneo inicial de puertos (top 1024)</mat-checkbox>
                <mat-checkbox [formControl]="collectMetrics">Recolección métricas CPU/RAM/disco</mat-checkbox>
                <mat-checkbox [formControl]="enableAudit">Registrar sesiones en auditoría CloudOps</mat-checkbox>
                <mat-checkbox [formControl]="testConnectionFirst">Validar SSH antes de guardar</mat-checkbox>
              </div>
            </section>
          </div>

          <aside class="vps-add-dialog__aside">
            <article class="vps-add-preview">
              <h4>Vista previa</h4>
              <dl>
                <div><dt>Host</dt><dd class="mono">{{ preview().name || '—' }}</dd></div>
                <div><dt>Endpoint</dt><dd class="mono">{{ preview().endpoint }}</dd></div>
                <div><dt>Entorno</dt><dd>{{ preview().environmentLabel }}</dd></div>
                <div><dt>Proveedor</dt><dd>{{ preview().provider }}</dd></div>
                <div><dt>SO</dt><dd>{{ preview().os }}</dd></div>
                <div><dt>Auth</dt><dd>{{ preview().authLabel }}</dd></div>
              </dl>
            </article>

            <article class="vps-add-steps">
              <h4>Qué ocurre al añadir</h4>
              <ol>
                @for (step of onboardingSteps(); track step) {
                  <li>{{ step }}</li>
                }
              </ol>
            </article>

            <article class="vps-add-impact">
              <h4><mat-icon>info</mat-icon> Impacto</h4>
              <ul>
                <li>Nuevo nodo en inventario VPS y terminal SSH</li>
                <li>Clave SSH debe estar en <code>authorized_keys</code></li>
                <li>Sin cambios en firewall del proveedor</li>
                <li>Discovery consume ~{{ estimatedDuration() }} s adicionales</li>
              </ul>
            </article>
          </aside>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button
          mat-stroked-button
          type="button"
          [disabled]="!canSubmit() || testing()"
          (click)="handleTestConnection()"
        >
          @if (testing()) {
            Probando…
          } @else {
            Probar conexión
          }
        </button>
        <button mat-flat-button color="primary" type="button" [disabled]="!canSubmit()" (click)="handleSubmit()">
          Añadir host
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .vps-add-dialog__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
      padding-right: 0.5rem;
    }
    .vps-add-dialog__sub {
      margin: 0.15rem 0 0;
      font-size: 0.72rem;
      color: var(--app-text-muted);
    }
    .vps-add-dialog__chip {
      flex-shrink: 0;
      padding: 0.25rem 0.55rem;
      border-radius: 999px;
      font-size: 0.62rem;
      font-weight: 650;
      background: color-mix(in srgb, var(--infra-accent, #ff9900) 14%, transparent);
      color: var(--infra-accent-deep, #c2410c);
    }
    .vps-add-dialog__layout {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(220px, 0.85fr);
      gap: 1rem;
    }
    @media (max-width: 760px) {
      .vps-add-dialog__layout { grid-template-columns: 1fr; }
    }
    .vps-add-section {
      margin-bottom: 1rem;
      padding-bottom: 0.85rem;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
    }
    .vps-add-section:last-child { border-bottom: 0; margin-bottom: 0; }
    .vps-add-section h3 {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0 0 0.55rem;
      font-size: 0.78rem;
      font-weight: 700;
    }
    .vps-add-section h3 mat-icon {
      width: 17px;
      height: 17px;
      font-size: 17px;
      color: var(--infra-accent-deep, #c2410c);
    }
    .vps-add-section__hint {
      margin: 0 0 0.45rem;
      font-size: 0.65rem;
      color: var(--app-text-muted);
    }
    .vps-add-grid {
      display: grid;
      gap: 0.35rem 0.65rem;
    }
    .vps-add-grid--2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .vps-add-grid--3 { grid-template-columns: 2fr 2fr 1fr; }
    .vps-add-span-2 { grid-column: span 2; }
    @media (max-width: 560px) {
      .vps-add-grid--2,
      .vps-add-grid--3 { grid-template-columns: 1fr; }
      .vps-add-span-2 { grid-column: span 1; }
    }
    .full { width: 100%; }
    .vps-add-checks {
      display: grid;
      gap: 0.25rem;
    }
    .vps-add-checks mat-checkbox {
      font-size: 0.72rem;
    }
    .vps-add-dialog__aside {
      display: grid;
      gap: 0.55rem;
      align-content: start;
    }
    .vps-add-preview,
    .vps-add-steps,
    .vps-add-impact {
      padding: 0.55rem 0.65rem;
      border-radius: 10px;
      border: 1px solid color-mix(in srgb, var(--app-text) 8%, transparent);
      background: color-mix(in srgb, var(--app-surface) 22%, var(--app-card));
    }
    .vps-add-preview h4,
    .vps-add-steps h4,
    .vps-add-impact h4 {
      margin: 0 0 0.4rem;
      font-size: 0.68rem;
      text-transform: uppercase;
      color: var(--app-text-muted);
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    .vps-add-impact h4 mat-icon {
      width: 14px;
      height: 14px;
      font-size: 14px;
    }
    .vps-add-preview dl {
      margin: 0;
      display: grid;
      gap: 0.3rem;
    }
    .vps-add-preview dt {
      font-size: 0.55rem;
      text-transform: uppercase;
      color: var(--app-text-muted);
    }
    .vps-add-preview dd {
      margin: 0.05rem 0 0;
      font-size: 0.72rem;
      font-weight: 650;
    }
    .vps-add-steps ol {
      margin: 0;
      padding-left: 1.1rem;
      font-size: 0.65rem;
      color: var(--app-text-muted);
    }
    .vps-add-impact ul {
      margin: 0;
      padding-left: 1rem;
      font-size: 0.65rem;
      color: var(--app-text-muted);
    }
    .vps-add-impact code {
      font-size: 0.62rem;
    }
    .vps-add-ssh-warn {
      display: flex;
      align-items: flex-start;
      gap: 0.35rem;
      margin: 0.35rem 0 0.5rem;
      padding: 0.45rem 0.55rem;
      border-radius: 8px;
      font-size: 0.65rem;
      line-height: 1.4;
      background: color-mix(in srgb, #f59e0b 12%, transparent);
      border: 1px solid color-mix(in srgb, #f59e0b 28%, transparent);
      color: #92400e;
    }
    .vps-add-ssh-warn mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
      flex-shrink: 0;
    }
    .mono { font-family: ui-monospace, monospace; }
  `,
})
export class VpsAddDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<VpsAddDialogComponent, VpsAddDialogResult | undefined>)
  private readonly infraActions = inject(InfrastructureActionService)
  private readonly toast = inject(ToastService)
  private readonly pro = inject(ProModeService)
  readonly data = inject<VpsAddDialogData>(MAT_DIALOG_DATA, { optional: true })

  readonly providers = PROVIDERS
  readonly locations = LOCATIONS
  readonly osOptions = OS_OPTIONS
  readonly sshKeys = VPS_DEMO_SSH_KEYS

  readonly name = new FormControl('vps-prod-new-01', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^[a-z0-9][a-z0-9-]{2,48}[a-z0-9]$/)],
  })
  readonly host = new FormControl('203.0.113.10', {
    nonNullable: true,
    validators: [Validators.required],
  })
  readonly port = new FormControl(22, { nonNullable: true, validators: [Validators.min(1), Validators.max(65535)] })
  readonly user = new FormControl('ubuntu', { nonNullable: true, validators: [Validators.required] })
  readonly authMethod = new FormControl<'public-key' | 'agent' | 'password'>('public-key', { nonNullable: true })
  readonly sshKey = new FormControl(VPS_DEMO_SSH_KEYS[0]?.name ?? 'ops-team-ed25519', { nonNullable: true })
  private readonly sshKeyBaseline = this.sshKey.value
  readonly provider = new FormControl('Hetzner', { nonNullable: true })
  readonly location = new FormControl('fra1', { nonNullable: true })
  readonly environment = new FormControl<'prod' | 'staging' | 'dev'>('prod', { nonNullable: true })
  readonly os = new FormControl('Ubuntu 22.04 LTS', { nonNullable: true })
  readonly tags = new FormControl('web, tier-1', { nonNullable: true })
  readonly description = new FormControl('Servidor de aplicaciones · acceso vía VPN corporativa', { nonNullable: true })
  readonly bastionHost = new FormControl('vps-bastion-01', { nonNullable: true })
  readonly discoverDocker = new FormControl(true, { nonNullable: true })
  readonly discoverKubernetes = new FormControl(false, { nonNullable: true })
  readonly runPortScan = new FormControl(true, { nonNullable: true })
  readonly collectMetrics = new FormControl(true, { nonNullable: true })
  readonly enableAudit = new FormControl(true, { nonNullable: true })
  readonly testConnectionFirst = new FormControl(true, { nonNullable: true })

  readonly testing = signal(false)
  readonly connectionOk = signal(false)

  private readonly nameVal = toSignal(this.name.valueChanges.pipe(startWith(this.name.value)), { initialValue: this.name.value })
  private readonly hostVal = toSignal(this.host.valueChanges.pipe(startWith(this.host.value)), { initialValue: this.host.value })
  private readonly portVal = toSignal(this.port.valueChanges.pipe(startWith(this.port.value)), { initialValue: this.port.value })
  private readonly userVal = toSignal(this.user.valueChanges.pipe(startWith(this.user.value)), { initialValue: this.user.value })
  private readonly authVal = toSignal(this.authMethod.valueChanges.pipe(startWith(this.authMethod.value)), { initialValue: this.authMethod.value })
  private readonly sshKeyVal = toSignal(this.sshKey.valueChanges.pipe(startWith(this.sshKey.value)), { initialValue: this.sshKey.value })
  private readonly providerVal = toSignal(this.provider.valueChanges.pipe(startWith(this.provider.value)), { initialValue: this.provider.value })
  private readonly locationVal = toSignal(this.location.valueChanges.pipe(startWith(this.location.value)), { initialValue: this.location.value })
  private readonly envVal = toSignal(this.environment.valueChanges.pipe(startWith(this.environment.value)), { initialValue: this.environment.value })
  private readonly osVal = toSignal(this.os.valueChanges.pipe(startWith(this.os.value)), { initialValue: this.os.value })
  private readonly dockerVal = toSignal(this.discoverDocker.valueChanges.pipe(startWith(this.discoverDocker.value)), { initialValue: this.discoverDocker.value })
  private readonly k8sVal = toSignal(this.discoverKubernetes.valueChanges.pipe(startWith(this.discoverKubernetes.value)), { initialValue: this.discoverKubernetes.value })
  private readonly scanVal = toSignal(this.runPortScan.valueChanges.pipe(startWith(this.runPortScan.value)), { initialValue: this.runPortScan.value })
  private readonly metricsVal = toSignal(this.collectMetrics.valueChanges.pipe(startWith(this.collectMetrics.value)), { initialValue: this.collectMetrics.value })
  private readonly testVal = toSignal(this.testConnectionFirst.valueChanges.pipe(startWith(this.testConnectionFirst.value)), { initialValue: this.testConnectionFirst.value })

  readonly preview = computed(() => {
    const envLabels = { prod: 'Producción', staging: 'Staging', dev: 'Desarrollo' }
    const authLabels = {
      'public-key': `Clave · ${this.sshKey.value}`,
      agent: 'SSH agent',
      password: 'Contraseña',
    }
    return {
      name: this.nameVal(),
      endpoint: `${this.userVal()}@${this.hostVal()}:${this.portVal()}`,
      environmentLabel: envLabels[this.envVal()],
      provider: `${this.providerVal()} · ${this.locationVal()}`,
      os: this.osVal(),
      authLabel: authLabels[this.authVal()],
    }
  })

  readonly onboardingSteps = computed(() => {
    const steps = ['Registro en inventario CloudOps y asignación de ID']
    if (this.testVal()) steps.push('Handshake SSH y verificación de host key')
    if (this.metricsVal()) steps.push('Snapshot inicial CPU/RAM/disco (agentless)')
    if (this.dockerVal()) steps.push('Discovery Docker: engine, sockets y contenedores')
    if (this.k8sVal()) steps.push('Discovery Kubernetes: kubelet, kubectl y namespaces')
    if (this.scanVal()) steps.push('Escaneo SYN puertos 1–1024 y mapa de exposición')
    steps.push('Sincronización con pestañas Servicios, Puertos y Métricas')
    return steps
  })

  readonly estimatedDuration = computed(() => {
    let sec = 12
    if (this.testVal()) sec += 8
    if (this.metricsVal()) sec += 6
    if (this.dockerVal()) sec += 14
    if (this.k8sVal()) sec += 18
    if (this.scanVal()) sec += 10
    return sec
  })

  readonly canSubmit = computed(() => this.name.valid && this.host.valid && this.port.valid && this.user.valid)

  readonly showSshKeyChangeWarning = computed(
    () => this.authVal() === 'public-key' && this.sshKeyVal() !== this.sshKeyBaseline,
  )

  nameError = (): string | null => {
    if (!this.name.touched && !this.name.dirty) return null
    if (this.name.hasError('required')) return 'El nombre es obligatorio'
    if (this.name.hasError('pattern')) return 'Usa minúsculas, números y guiones (3–50 chars)'
    const existing = this.data?.existingNames ?? []
    if (existing.includes(this.name.value)) return 'Ya existe un host con este nombre'
    return null
  }

  hostError = (): string | null => {
    if (!this.host.touched && !this.host.dirty) return null
    if (this.host.hasError('required')) return 'IP o hostname requerido'
    return null
  }

  handleTestConnection = (): void => {
    if (!this.canSubmit()) return
    this.testing.set(true)
    this.infraActions.validateAddPayload(this.buildResult()).subscribe({
      next: () => {
        this.testing.set(false)
        this.connectionOk.set(true)
      },
      error: () => {
        this.testing.set(false)
        this.connectionOk.set(true)
        this.toast.info(
          this.pro.proMode() && !this.pro.demoMode()
            ? 'No se pudo validar la conexión SSH. Revisa credenciales y firewall.'
            : 'Validación SSH completada (simulación local)',
        )
      },
    })
  }

  handleSubmit = (): void => {
    if (!this.canSubmit()) return
    if (this.testConnectionFirst.value && !this.connectionOk()) {
      this.testing.set(true)
      this.infraActions.validateAddPayload(this.buildResult()).subscribe({
        next: () => {
          this.testing.set(false)
          this.connectionOk.set(true)
          this.dialogRef.close(this.buildResult())
        },
        error: () => {
          this.testing.set(false)
          this.connectionOk.set(true)
          this.dialogRef.close(this.buildResult())
        },
      })
      return
    }
    this.dialogRef.close(this.buildResult())
  }

  private buildResult = (): VpsAddDialogResult => ({
    name: this.name.value.trim(),
    host: this.host.value.trim(),
    port: this.port.value,
    user: this.user.value.trim(),
    authMethod: this.authMethod.value,
    sshKeyName: this.sshKey.value,
    provider: this.provider.value,
    location: this.location.value,
    environment: this.environment.value,
    os: this.os.value,
    description: this.description.value.trim(),
    tags: this.tags.value.split(',').map((t) => t.trim()).filter(Boolean),
    bastionHost: this.bastionHost.value.trim(),
    discoverDocker: this.discoverDocker.value,
    discoverKubernetes: this.discoverKubernetes.value,
    runPortScan: this.runPortScan.value,
    collectMetrics: this.collectMetrics.value,
    enableAudit: this.enableAudit.value,
    testConnectionFirst: this.testConnectionFirst.value,
  })
}
