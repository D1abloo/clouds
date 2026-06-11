import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  computed,
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import { CloudAccountsService } from '../../core/services/cloud-accounts.service'
import { CopilotApiService } from '../../core/services/copilot-api.service'
import { RealtimeService } from '../../core/services/realtime.service'
import { ToastService } from '../../core/services/toast.service'
import type { CloudAccount, CloudProvider } from '../../core/models/api.models'
import type { NavLogoKey } from '../../shared/theme/nav-logo.types'

type WizardStep = 1 | 2 | 3 | 4 | 5

const PROVIDERS: { id: CloudProvider; label: string; logo: NavLogoKey }[] = [
  { id: 'AWS', label: 'Amazon Web Services', logo: 'aws' },
  { id: 'GCP', label: 'Google Cloud Platform', logo: 'gcp' },
  { id: 'AZURE', label: 'Microsoft Azure', logo: 'azure' },
]

@Component({
  selector: 'app-ai-infra-studio',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatProgressBarModule, BrandLogoComponent],
  template: `
    <div class="page-container ai-studio">
      <header class="ai-studio__hero">
        <h1><mat-icon>auto_awesome</mat-icon> AI Infra Studio</h1>
        <p>Asistente Copilot para lanzar instancias cloud paso a paso. Tras una prueba, elimina la instancia de prueba.</p>
      </header>

      <div class="ai-studio__layout">
        <section class="ai-studio__wizard finops-card">
          <ol class="ai-studio__steps" aria-label="Pasos del asistente">
            @for (s of stepLabels; track s.n) {
              <li [class.ai-studio__step--active]="step() >= s.n" [class.ai-studio__step--current]="step() === s.n">
                <span>{{ s.n }}</span> {{ s.label }}
              </li>
            }
          </ol>

          @if (step() === 1) {
            <div class="ai-studio__panel">
              <h2>Proveedor cloud</h2>
              <div class="ai-studio__providers">
                @for (p of providers; track p.id) {
                  <button type="button" class="ai-studio__provider" [class.ai-studio__provider--on]="provider() === p.id" (click)="selectProvider(p.id)">
                    <app-brand-logo [logo]="p.logo" size="lg" />
                    <span>{{ p.label }}</span>
                  </button>
                }
              </div>
            </div>
          }

          @if (step() === 2) {
            <div class="ai-studio__panel">
              <h2>Región</h2>
              @if (regions().length) {
                <select class="ai-studio__select" [ngModel]="region()" (ngModelChange)="region.set($event)">
                  @for (r of regions(); track r.id) {
                    <option [value]="r.id">{{ r.name || r.id }}</option>
                  }
                </select>
              } @else {
                <p class="ai-studio__hint">Cargando regiones o sin cuentas conectadas — usa datos demo.</p>
                <select class="ai-studio__select" [ngModel]="region()" (ngModelChange)="region.set($event)">
                  <option value="eu-west-1">eu-west-1</option>
                  <option value="eu-central-1">eu-central-1</option>
                </select>
              }
            </div>
          }

          @if (step() === 3) {
            <div class="ai-studio__panel">
              <h2>Tipo de instancia</h2>
              <select class="ai-studio__select" [ngModel]="instanceType()" (ngModelChange)="instanceType.set($event)">
                @for (t of typeOptions(); track t) {
                  <option [value]="t">{{ t }}</option>
                }
              </select>
            </div>
          }

          @if (step() === 4) {
            <div class="ai-studio__panel">
              <h2>Imagen / AMI</h2>
              <select class="ai-studio__select" [ngModel]="imageId()" (ngModelChange)="imageId.set($event)">
                @for (img of imageOptions(); track img.id) {
                  <option [value]="img.id">{{ img.name }}</option>
                }
              </select>
              <label class="ai-studio__field">
                Nombre de la instancia
                <input class="ai-studio__input" [ngModel]="instanceName()" (ngModelChange)="instanceName.set($event)" />
              </label>
            </div>
          }

          @if (step() === 5) {
            <div class="ai-studio__panel">
              <h2>Lanzamiento</h2>
              @if (launching()) {
                <p>{{ launchStep() }}</p>
                <mat-progress-bar mode="determinate" [value]="launchPercent()" />
                <span class="ai-studio__pct">{{ launchPercent() }} %</span>
              } @else if (launchDone()) {
                <p class="ai-studio__success"><mat-icon>check_circle</mat-icon> Instancia lanzada. Elimínala cuando termines la prueba.</p>
              } @else {
                <p>Revisa y confirma el lanzamiento real vía API cloud.</p>
                <ul class="ai-studio__summary">
                  <li><strong>Proveedor:</strong> {{ provider() }}</li>
                  <li><strong>Región:</strong> {{ region() }}</li>
                  <li><strong>Tipo:</strong> {{ instanceType() }}</li>
                  <li><strong>Imagen:</strong> {{ imageId() }}</li>
                </ul>
              }
            </div>
          }

          <div class="ai-studio__nav">
            @if (step() > 1 && !launching()) {
              <button mat-stroked-button type="button" (click)="prev()">Anterior</button>
            }
            <span class="flex-1"></span>
            @if (step() < 5) {
              <button mat-flat-button color="primary" type="button" (click)="next()" [disabled]="!canNext()">Siguiente</button>
            } @else if (!launchDone() && !launching()) {
              <button mat-flat-button color="primary" type="button" (click)="handleLaunch()">Lanzar instancia</button>
            }
          </div>
        </section>

        <aside class="ai-studio__copilot finops-card">
          <h2><mat-icon>smart_toy</mat-icon> Copilot</h2>
          <div class="ai-studio__chat">
            @for (m of copilotMessages(); track $index) {
              <p [class.ai-studio__msg--user]="m.role === 'user'">{{ m.text }}</p>
            }
          </div>
          <form class="ai-studio__prompt" (submit)="handleCopilot($event)">
            <input [(ngModel)]="copilotPrompt" name="prompt" placeholder="Pide ayuda al Copilot…" />
            <button mat-icon-button type="submit" aria-label="Enviar"><mat-icon>send</mat-icon></button>
          </form>
        </aside>
      </div>
    </div>
  `,
  styles: `
    .ai-studio__hero h1 { display: flex; align-items: center; gap: 0.5rem; margin: 0 0 0.35rem; }
    .ai-studio__hero p { margin: 0 0 1.25rem; color: var(--app-text-muted); font-size: 0.88rem; }
    .ai-studio__layout { display: grid; grid-template-columns: 1fr 320px; gap: 1rem; }
    @media (max-width: 900px) { .ai-studio__layout { grid-template-columns: 1fr; } }
    .finops-card {
      border-radius: 14px; padding: 1.1rem; background: var(--app-card);
      border: 1px solid var(--app-border-subtle);
    }
    .ai-studio__steps { display: flex; flex-wrap: wrap; gap: 0.5rem; list-style: none; padding: 0; margin: 0 0 1rem; font-size: 0.72rem; }
    .ai-studio__steps li { padding: 0.25rem 0.5rem; border-radius: 8px; opacity: 0.5; }
    .ai-studio__step--active { opacity: 1; background: color-mix(in srgb, var(--app-primary) 12%, transparent); }
    .ai-studio__step--current { font-weight: 700; }
    .ai-studio__providers { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem; }
    .ai-studio__provider {
      display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 1rem;
      border: 1px solid var(--app-border-subtle); border-radius: 12px; background: transparent; cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .ai-studio__provider:hover { transform: scale(1.03); box-shadow: var(--app-shadow-md); }
    .ai-studio__provider--on { border-color: var(--app-primary); box-shadow: 0 0 12px color-mix(in srgb, var(--app-primary) 30%, transparent); }
    .ai-studio__select, .ai-studio__input { width: 100%; padding: 0.55rem 0.65rem; border-radius: 10px; border: 1px solid var(--app-border-subtle); font: inherit; }
    .ai-studio__field { display: flex; flex-direction: column; gap: 0.35rem; margin-top: 0.75rem; font-size: 0.8rem; font-weight: 600; }
    .ai-studio__nav { display: flex; align-items: center; gap: 0.5rem; margin-top: 1rem; }
    .ai-studio__pct { font-size: 0.8rem; font-weight: 700; }
    .ai-studio__success { display: flex; align-items: center; gap: 0.35rem; color: #34d399; }
    .ai-studio__summary { margin: 0.5rem 0 0; padding-left: 1.1rem; font-size: 0.82rem; }
    .ai-studio__copilot h2 { display: flex; align-items: center; gap: 0.4rem; font-size: 0.95rem; margin: 0 0 0.75rem; }
    .ai-studio__chat { min-height: 200px; max-height: 320px; overflow-y: auto; font-size: 0.8rem; margin-bottom: 0.75rem; }
    .ai-studio__chat p { margin: 0 0 0.5rem; padding: 0.5rem 0.65rem; border-radius: 10px; background: color-mix(in srgb, var(--app-primary) 8%, transparent); }
    .ai-studio__msg--user { background: color-mix(in srgb, #6366f1 15%, transparent) !important; text-align: right; }
    .ai-studio__prompt { display: flex; gap: 0.35rem; }
    .ai-studio__prompt input { flex: 1; padding: 0.45rem 0.6rem; border-radius: 8px; border: 1px solid var(--app-border-subtle); font: inherit; }
    .ai-studio__hint { font-size: 0.78rem; color: var(--app-text-muted); }
  `,
})
export class AiInfraStudioComponent implements OnInit, OnDestroy {
  private readonly cloud = inject(CloudAccountsService)
  private readonly copilot = inject(CopilotApiService)
  private readonly realtime = inject(RealtimeService)
  private readonly toast = inject(ToastService)
  private readonly destroyRef = inject(DestroyRef)

  readonly providers = PROVIDERS
  readonly stepLabels = [
    { n: 1 as WizardStep, label: 'Proveedor' },
    { n: 2 as WizardStep, label: 'Región' },
    { n: 3 as WizardStep, label: 'Tipo' },
    { n: 4 as WizardStep, label: 'Imagen' },
    { n: 5 as WizardStep, label: 'Lanzar' },
  ]

  readonly step = signal<WizardStep>(1)
  readonly provider = signal<CloudProvider>('AWS')
  readonly region = signal('eu-west-1')
  readonly instanceType = signal('t3.micro')
  readonly imageId = signal('ami-linux-2023')
  readonly instanceName = signal('ai-studio-test')
  readonly regions = signal<{ id: string; name: string }[]>([])
  readonly accounts = signal<CloudAccount[]>([])
  readonly launching = signal(false)
  readonly launchPercent = signal(0)
  readonly launchStep = signal('')
  readonly launchDone = signal(false)

  copilotPrompt = ''
  readonly copilotMessages = signal<{ role: 'user' | 'assistant'; text: string }[]>([
    { role: 'assistant', text: 'Hola — te guío en el lanzamiento. Elige proveedor y región; puedo sugerir tipos económicos.' },
  ])

  readonly typeOptions = computed(() => {
    const p = this.provider()
    if (p === 'GCP') return ['e2-micro', 'e2-small', 'n2-standard-2']
    if (p === 'AZURE') return ['Standard_B1s', 'Standard_D2s_v3']
    return ['t3.micro', 't3.small', 'm6i.large']
  })

  readonly imageOptions = computed(() => {
    const p = this.provider()
    if (p === 'GCP') return [{ id: 'debian-11', name: 'Debian 11' }, { id: 'ubuntu-2204', name: 'Ubuntu 22.04' }]
    if (p === 'AZURE') return [{ id: 'Ubuntu-22_04-lts', name: 'Ubuntu 22.04 LTS' }]
    return [{ id: 'ami-linux-2023', name: 'Amazon Linux 2023' }, { id: 'ami-ubuntu-2204', name: 'Ubuntu 22.04' }]
  })

  private progressHandler = (payload: unknown): void => {
    const p = payload as { percent?: number; step?: string; status?: string }
    if (p.percent != null) this.launchPercent.set(p.percent)
    if (p.step) this.launchStep.set(p.step)
    if (p.status === 'success') {
      this.launching.set(false)
      this.launchDone.set(true)
      this.toast.success('Instancia de prueba lanzada — elimínala cuando termines')
    }
    if (p.status === 'error') {
      this.launching.set(false)
      this.toast.error('Error en el lanzamiento')
    }
  }

  ngOnInit(): void {
    this.realtime.connect()
    this.realtime.on('instance.launch.progress', this.progressHandler)
    this.destroyRef.onDestroy(() => this.realtime.off('instance.launch.progress', this.progressHandler))
    this.loadAccounts()
  }

  ngOnDestroy(): void {
    this.realtime.off('instance.launch.progress', this.progressHandler)
  }

  selectProvider = (id: CloudProvider): void => {
    this.provider.set(id)
    this.loadAccounts()
  }

  loadAccounts = (): void => {
    this.cloud.list(undefined, this.provider()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (accs) => {
        this.accounts.set(accs)
        const first = accs[0]
        if (first) this.loadRegions(first.id)
      },
    })
  }

  loadRegions = (accountId: string): void => {
    this.cloud.regions(accountId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (r) => {
        this.regions.set(r)
        if (r[0]) this.region.set(r[0].id)
      },
    })
  }

  canNext = (): boolean => {
    const s = this.step()
    if (s === 1) return !!this.provider()
    if (s === 2) return !!this.region()
    if (s === 3) return !!this.instanceType()
    if (s === 4) return !!this.imageId() && !!this.instanceName()
    return true
  }

  next = (): void => {
    if (this.step() < 5) this.step.update((n) => (n + 1) as WizardStep)
  }

  prev = (): void => {
    if (this.step() > 1) this.step.update((n) => (n - 1) as WizardStep)
  }

  handleLaunch = (): void => {
    const acc = this.accounts()[0]
    if (!acc) {
      this.simulateDemoLaunch()
      return
    }
    this.launching.set(true)
    this.launchPercent.set(0)
    this.cloud.launch(acc.id, {
      name: this.instanceName(),
      region: this.region(),
      instanceType: this.instanceType(),
      imageId: this.imageId(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.launchStep.set('Provisionando recursos…'),
      error: () => {
        this.launching.set(false)
        this.toast.error('No se pudo iniciar el lanzamiento')
      },
    })
  }

  simulateDemoLaunch = (): void => {
    this.launching.set(true)
    let pct = 0
    const iv = setInterval(() => {
      pct += 12
      this.launchPercent.set(Math.min(pct, 100))
      this.launchStep.set(`Demo — paso ${Math.ceil(pct / 20)} de 5`)
      if (pct >= 100) {
        clearInterval(iv)
        this.launching.set(false)
        this.launchDone.set(true)
        this.toast.success('Lanzamiento demo completado — elimina la instancia de prueba')
      }
    }, 400)
  }

  handleCopilot = (e: Event): void => {
    e.preventDefault()
    const msg = this.copilotPrompt.trim()
    if (!msg) return
    this.copilotMessages.update((m) => [...m, { role: 'user', text: msg }])
    this.copilotPrompt = ''
    this.copilot.chat(msg).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => this.copilotMessages.update((m) => [...m, { role: 'assistant', text: res.message }]),
      error: () => this.copilotMessages.update((m) => [...m, { role: 'assistant', text: 'Copilot no disponible — continúa con el asistente manual.' }]),
    })
  }
}
