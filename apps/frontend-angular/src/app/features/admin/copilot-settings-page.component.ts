import { DatePipe } from '@angular/common'
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { CopilotApiService } from '../../core/services/copilot-api.service'
import { ToastService } from '../../core/services/toast.service'
import type { CopilotAiProvider, CopilotSettings } from '../../core/models/api.models'
import {
  ADMIN_COPILOT_ACCENT,
  ADMIN_COPILOT_ACCENT_BORDER,
  ADMIN_SETTINGS_ACCENT,
  ADMIN_SETTINGS_ACCENT_BORDER,
  ADMIN_SETTINGS_ACCENT_LIGHT,
} from './admin.config'

type ProviderCard = {
  id: CopilotAiProvider
  label: string
  desc: string
  icon: string
  defaultModel: string
  accent: string
}

const PROVIDER_CARDS: ProviderCard[] = [
  { id: 'OPENAI', label: 'OpenAI', desc: 'GPT-4o, GPT-4o mini', icon: 'psychology', defaultModel: 'gpt-4o-mini', accent: '#10a37f' },
  { id: 'ANTHROPIC', label: 'Anthropic', desc: 'Claude vía OpenRouter', icon: 'auto_awesome', defaultModel: 'anthropic/claude-3.5-sonnet', accent: '#d97706' },
  { id: 'GOOGLE', label: 'Google', desc: 'Gemini vía OpenRouter', icon: 'cloud', defaultModel: 'google/gemini-flash-1.5', accent: '#4285f4' },
  { id: 'OPENROUTER', label: 'OpenRouter', desc: 'Multi-modelo unificado', icon: 'hub', defaultModel: 'openai/gpt-4o-mini', accent: '#7c3aed' },
]

const MODEL_OPTIONS: Record<CopilotAiProvider, string[]> = {
  OPENAI: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  OPENROUTER: ['openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet', 'google/gemini-flash-1.5', 'meta-llama/llama-3.1-70b-instruct'],
  ANTHROPIC: ['anthropic/claude-3.5-sonnet', 'anthropic/claude-3-haiku'],
  GOOGLE: ['google/gemini-flash-1.5', 'google/gemini-pro-1.5'],
}

@Component({
  selector: 'app-copilot-settings-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    PageHeaderComponent,
    LoadingStateComponent,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatIconModule,
  ],
  template: `
    <div class="page-container cop-set animate-fade-in">
      <app-page-header
        icon="smart_toy"
        title="Copilot IA"
        description="Configura el asistente CloudOps: proveedor LLM, alcance del panel y acciones autónomas."
      />

      @if (loading()) {
        <app-loading-state message="Cargando configuración del Copilot…" />
      } @else {
        <section class="cop-set-hero">
          <div class="cop-set-hero__glow" aria-hidden="true"></div>
          <div class="cop-set-hero__content">
            <span class="cop-set-hero__eyebrow">Administración · Inteligencia artificial</span>
            <h2>CloudOps Copilot</h2>
            <p>
              La clave API se almacena cifrada en bóveda AES-256. Solo administradores pueden ver o modificar esta configuración.
              El resto de usuarios nunca verá la clave completa.
            </p>
            @if (savedSettings()?.apiKeyHint) {
              <div class="cop-set-hero__hint">
                <mat-icon>key</mat-icon>
                Clave activa: <code>{{ savedSettings()?.apiKeyHint }}</code>
              </div>
            }
          </div>
          <div class="cop-set-hero__badge" [class.cop-set-hero__badge--on]="form.controls.enabled.value">
            <mat-icon>{{ form.controls.enabled.value ? 'check_circle' : 'pause_circle' }}</mat-icon>
            {{ form.controls.enabled.value ? 'Copilot activo' : 'Copilot inactivo' }}
          </div>
        </section>

        <section class="cop-set-providers" aria-label="Proveedores LLM">
          <h3>Proveedor LLM</h3>
          <div class="cop-set-providers__grid">
            @for (card of providerCards; track card.id) {
              <button
                type="button"
                class="cop-set-provider"
                [class.cop-set-provider--on]="form.controls.provider.value === card.id"
                [attr.aria-pressed]="form.controls.provider.value === card.id"
                (click)="selectProvider(card)"
              >
                <span class="cop-set-provider__icon" [style.--prov-accent]="card.accent">
                  <mat-icon>{{ card.icon }}</mat-icon>
                </span>
                <strong>{{ card.label }}</strong>
                <span>{{ card.desc }}</span>
              </button>
            }
          </div>
        </section>

        <form class="cop-set-form" [formGroup]="form" (ngSubmit)="handleSave()">
          <div class="cop-set-panel">
            <header>
              <mat-icon>vpn_key</mat-icon>
              <div>
                <h3>Clave API</h3>
                <p>Solo se guarda cifrada; deja vacío para mantener la clave actual.</p>
              </div>
            </header>
            <mat-form-field appearance="outline" class="cop-set-field">
              <mat-label>Nueva clave API</mat-label>
              <input matInput type="password" formControlName="apiKey" autocomplete="off" aria-label="Clave API del proveedor LLM" />
              <mat-hint>Mínimo 8 caracteres si deseas actualizarla</mat-hint>
            </mat-form-field>
          </div>

          <div class="cop-set-panel">
            <header>
              <mat-icon>tune</mat-icon>
              <div>
                <h3>Modelo y parámetros</h3>
                <p>Ajusta el modelo y la creatividad de las respuestas.</p>
              </div>
            </header>
            <div class="cop-set-row">
              <mat-form-field appearance="outline" class="cop-set-field">
                <mat-label>Modelo</mat-label>
                <mat-select formControlName="model" aria-label="Modelo LLM">
                  @for (m of modelOptions(); track m) {
                    <mat-option [value]="m">{{ m }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="cop-set-field cop-set-field--sm">
                <mat-label>Máx. tokens</mat-label>
                <input matInput type="number" formControlName="maxTokens" min="256" max="16384" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="cop-set-field cop-set-field--sm">
                <mat-label>Temperatura</mat-label>
                <input matInput type="number" formControlName="temperature" min="0" max="2" step="0.1" />
              </mat-form-field>
            </div>
            <mat-form-field appearance="outline" class="cop-set-field">
              <mat-label>Prompt de sistema (opcional)</mat-label>
              <textarea matInput rows="3" formControlName="systemPrompt" placeholder="Instrucciones adicionales para el Copilot…"></textarea>
            </mat-form-field>
          </div>

          <div class="cop-set-panel">
            <header>
              <mat-icon>shield</mat-icon>
              <div>
                <h3>Alcance y permisos</h3>
                <p>Restringe el Copilot al panel y controla acciones automáticas.</p>
              </div>
            </header>
            <div class="cop-set-toggles">
              <label class="cop-set-toggle">
                <mat-slide-toggle formControlName="enabled" color="primary" />
                <span>
                  <strong>Habilitar Copilot</strong>
                  <em>Los usuarios pueden chatear cuando hay clave configurada</em>
                </span>
              </label>
              <label class="cop-set-toggle">
                <mat-slide-toggle formControlName="allowAutonomous" color="primary" />
                <span>
                  <strong>Tareas autónomas</strong>
                  <em>El Copilot ejecuta sin interacción del usuario</em>
                </span>
              </label>
              <label class="cop-set-toggle">
                <mat-slide-toggle formControlName="allowLaunch" color="primary" />
                <span>
                  <strong>Lanzar instancias</strong>
                  <em>Permite crear VMs desde instrucciones del Copilot</em>
                </span>
              </label>
            </div>
            <p class="cop-set-note">
              <mat-icon>lock</mat-icon>
              Alcance: <strong>solo panel e infraestructura</strong> — el Copilot rechaza temas fuera de operaciones cloud.
            </p>
          </div>

          <footer class="cop-set-actions">
            <button mat-stroked-button type="button" [disabled]="testing() || saving()" (click)="handleTest()">
              <mat-icon>science</mat-icon>
              Probar conexión
            </button>
            <button mat-flat-button color="primary" type="submit" [disabled]="saving() || form.invalid">
              <mat-icon>save</mat-icon>
              Guardar configuración
            </button>
          </footer>

          @if (savedSettings()?.updatedAt) {
            <p class="cop-set-updated">Última actualización: {{ savedSettings()!.updatedAt | date:'medium' }}</p>
          }
        </form>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .cop-set { --cop-accent: ${ADMIN_COPILOT_ACCENT}; }

    .cop-set-hero {
      position: relative; overflow: hidden;
      display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; justify-content: space-between;
      padding: 1.25rem 1.35rem; border-radius: 14px; margin-bottom: 1rem;
      border: 1px solid ${ADMIN_COPILOT_ACCENT_BORDER};
      background: linear-gradient(135deg, ${ADMIN_SETTINGS_ACCENT_LIGHT} 0%, #fff 40%, color-mix(in srgb, ${ADMIN_COPILOT_ACCENT} 8%, #fff));
    }
    .cop-set-hero__glow {
      position: absolute; inset: -40% 50% auto -20%; height: 120%; width: 60%;
      background: radial-gradient(ellipse, color-mix(in srgb, ${ADMIN_COPILOT_ACCENT} 18%, transparent), transparent 70%);
      pointer-events: none;
    }
    .cop-set-hero__content { position: relative; flex: 1; min-width: 220px; }
    .cop-set-hero__eyebrow { font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: ${ADMIN_COPILOT_ACCENT}; }
    .cop-set-hero h2 { margin: 0.35rem 0; font-size: 1.35rem; font-weight: 800; color: #0f172a; }
    .cop-set-hero p { margin: 0; font-size: 0.78rem; color: #64748b; line-height: 1.55; max-width: 36rem; }
    .cop-set-hero__hint {
      display: inline-flex; align-items: center; gap: 0.35rem; margin-top: 0.65rem;
      padding: 0.35rem 0.65rem; border-radius: 8px; background: #fff; border: 1px solid #e2e8f0;
      font-size: 0.72rem; color: #475569;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: ${ADMIN_SETTINGS_ACCENT}; }
      code { font-family: ui-monospace, monospace; font-weight: 600; }
    }
    .cop-set-hero__badge {
      position: relative; display: inline-flex; align-items: center; gap: 0.4rem;
      padding: 0.55rem 0.85rem; border-radius: 999px; font-size: 0.72rem; font-weight: 700;
      background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0;
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
    }
    .cop-set-hero__badge--on { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }

    .cop-set-providers { margin-bottom: 1rem; }
    .cop-set-providers h3 { margin: 0 0 0.65rem; font-size: 0.85rem; font-weight: 700; color: #0f172a; }
    .cop-set-providers__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 0.55rem; }
    .cop-set-provider {
      display: flex; flex-direction: column; align-items: flex-start; gap: 0.25rem;
      padding: 0.75rem; border-radius: 12px; border: 1px solid #e2e8f0; background: #fff;
      font: inherit; text-align: left; cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s;
      strong { font-size: 0.78rem; color: #0f172a; }
      span:last-child { font-size: 0.62rem; color: #94a3b8; line-height: 1.35; }
      &:hover { border-color: ${ADMIN_COPILOT_ACCENT_BORDER}; }
    }
    .cop-set-provider--on {
      border-color: var(--prov-accent, ${ADMIN_COPILOT_ACCENT});
      box-shadow: 0 4px 16px color-mix(in srgb, ${ADMIN_COPILOT_ACCENT} 12%, transparent);
      strong { color: ${ADMIN_COPILOT_ACCENT}; }
    }
    .cop-set-provider__icon {
      width: 2.25rem; height: 2.25rem; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      background: color-mix(in srgb, var(--prov-accent, ${ADMIN_COPILOT_ACCENT}) 12%, #fff);
      mat-icon { color: var(--prov-accent, ${ADMIN_COPILOT_ACCENT}); }
    }

    .cop-set-form { display: flex; flex-direction: column; gap: 0.75rem; }
    .cop-set-panel {
      padding: 1rem 1.1rem; border-radius: 12px;
      border: 1px solid ${ADMIN_SETTINGS_ACCENT_BORDER}; background: #fff;
      header {
        display: flex; gap: 0.55rem; margin-bottom: 0.75rem;
        mat-icon { color: ${ADMIN_SETTINGS_ACCENT}; }
        h3 { margin: 0; font-size: 0.82rem; font-weight: 700; }
        p { margin: 0.15rem 0 0; font-size: 0.65rem; color: #94a3b8; }
      }
    }
    .cop-set-row { display: flex; flex-wrap: wrap; gap: 0.55rem; }
    .cop-set-field { flex: 1; min-width: 180px; width: 100%; }
    .cop-set-field--sm { flex: 0 1 140px; min-width: 120px; }

    .cop-set-toggles { display: flex; flex-direction: column; gap: 0.65rem; }
    .cop-set-toggle {
      display: flex; align-items: flex-start; gap: 0.65rem; cursor: pointer;
      strong { display: block; font-size: 0.78rem; color: #0f172a; }
      em { display: block; font-style: normal; font-size: 0.65rem; color: #94a3b8; margin-top: 0.1rem; }
    }
    .cop-set-note {
      display: flex; align-items: center; gap: 0.35rem; margin: 0.85rem 0 0;
      padding: 0.55rem 0.65rem; border-radius: 8px; background: ${ADMIN_SETTINGS_ACCENT_LIGHT};
      font-size: 0.68rem; color: #475569;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: ${ADMIN_SETTINGS_ACCENT}; }
    }

    .cop-set-actions { display: flex; flex-wrap: wrap; gap: 0.55rem; justify-content: flex-end; padding-top: 0.25rem; }
    .cop-set-updated { margin: 0; font-size: 0.62rem; color: #94a3b8; text-align: right; }
  `,
})
export class CopilotSettingsPageComponent implements OnInit {
  private readonly copilotApi = inject(CopilotApiService)
  private readonly toast = inject(ToastService)

  readonly providerCards = PROVIDER_CARDS
  readonly loading = signal(true)
  readonly saving = signal(false)
  readonly testing = signal(false)
  readonly savedSettings = signal<CopilotSettings | null>(null)
  readonly modelOptions = signal<string[]>(MODEL_OPTIONS.OPENAI)

  readonly form = new FormGroup({
    enabled: new FormControl(false, { nonNullable: true }),
    provider: new FormControl<CopilotAiProvider>('OPENAI', { nonNullable: true }),
    model: new FormControl('gpt-4o-mini', { nonNullable: true, validators: [Validators.required] }),
    apiKey: new FormControl(''),
    allowAutonomous: new FormControl(false, { nonNullable: true }),
    allowLaunch: new FormControl(false, { nonNullable: true }),
    maxTokens: new FormControl(2048, { nonNullable: true }),
    temperature: new FormControl(0.3, { nonNullable: true }),
    systemPrompt: new FormControl(''),
  })

  ngOnInit(): void {
    this.copilotApi.getSettings().subscribe({
      next: (settings) => this.applySettings(settings),
      error: () => {
        this.loading.set(false)
        this.toast.error('No se pudo cargar la configuración del Copilot')
      },
    })
  }

  selectProvider = (card: ProviderCard): void => {
    this.form.controls.provider.setValue(card.id)
    this.form.controls.model.setValue(card.defaultModel)
    this.modelOptions.set(MODEL_OPTIONS[card.id])
  }

  handleSave = (): void => {
    if (this.form.invalid || this.saving()) return
    this.saving.set(true)
    const v = this.form.getRawValue()
    const payload = {
      enabled: v.enabled,
      provider: v.provider,
      model: v.model,
      allowAutonomous: v.allowAutonomous,
      allowLaunch: v.allowLaunch,
      maxTokens: v.maxTokens,
      temperature: v.temperature,
      systemPrompt: v.systemPrompt?.trim() || undefined,
      ...(v.apiKey?.trim() ? { apiKey: v.apiKey.trim() } : {}),
    }
    this.copilotApi.updateSettings(payload).subscribe({
      next: (settings) => {
        this.applySettings(settings)
        this.form.controls.apiKey.setValue('')
        this.saving.set(false)
        this.toast.success('Configuración del Copilot guardada')
      },
      error: (err) => {
        this.saving.set(false)
        this.toast.error(err?.error?.message ?? 'Error al guardar')
      },
    })
  }

  handleTest = (): void => {
    if (this.testing()) return
    this.testing.set(true)
    this.copilotApi.testConnection().subscribe({
      next: (res) => {
        this.testing.set(false)
        this.toast.success(res.message ?? 'Conexión verificada')
      },
      error: (err) => {
        this.testing.set(false)
        this.toast.error(err?.error?.message ?? 'Error al probar la conexión')
      },
    })
  }

  private applySettings = (settings: CopilotSettings): void => {
    this.savedSettings.set(settings)
    this.modelOptions.set(MODEL_OPTIONS[settings.provider])
    this.form.patchValue({
      enabled: settings.enabled,
      provider: settings.provider,
      model: settings.model,
      allowAutonomous: settings.allowAutonomous,
      allowLaunch: settings.allowLaunch,
      maxTokens: settings.maxTokens,
      temperature: settings.temperature,
      systemPrompt: settings.systemPrompt ?? '',
    })
    this.loading.set(false)
  }
}
