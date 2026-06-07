import { DatePipe } from '@angular/common'
import { Component, computed, inject, signal } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { PlatformActionService } from '../../shared/platform/platform-action.service'
import { ToastService } from '../../core/services/toast.service'
import { IntegrationsService } from '../../core/services/integrations.service'
import {
  ADMIN_SETTINGS_ACCENT,
  ADMIN_SETTINGS_ACCENT_BORDER,
  ADMIN_SETTINGS_ACCENT_LIGHT,
  adminRelativeTime,
} from './admin.config'
import {
  enrichIntegrationProfile,
  integrationStatusLabel,
  sparkPath,
  type IntegrationEventType,
  type SettingsIntegration,
} from './admin-settings.demo'

export interface AdminSettingsIntegrationDialogData {
  integration: SettingsIntegration
  liveMode?: boolean
}

type ConfigTab = 'overview' | 'connection' | 'events'

@Component({
  selector: 'app-admin-settings-integration-dialog',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
  ],
  template: `
    <article class="intcfg" [style.--int-accent]="profile().accent">
      <header class="intcfg__head">
        <div class="intcfg__identity">
          <span class="intcfg__icon"><mat-icon>{{ profile().icon }}</mat-icon></span>
          <div>
            <span class="intcfg__label">Integración · {{ profile().category }}</span>
            <h2>{{ profile().label }}</h2>
            <p>{{ profile().desc }}</p>
          </div>
        </div>
        <div class="intcfg__head-meta">
          <span class="intcfg__status" [attr.data-status]="profile().status">
            <i></i>{{ statusLabel(profile().status) }}
          </span>
          <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar"><mat-icon>close</mat-icon></button>
        </div>
      </header>

      <aside class="intcfg__mode" [attr.data-live]="data.liveMode">
        <mat-icon>{{ data.liveMode ? 'cloud_done' : 'science' }}</mat-icon>
        <span>{{ data.liveMode ? 'Entrega PRO — HTTP real a Slack/PagerDuty/Jira' : 'Simulación — entregas registradas en log hasta activar INTEGRATIONS_LIVE' }}</span>
      </aside>

      <div class="intcfg__badges">
        <span class="intcfg__badge"><mat-icon>lock</mat-icon> {{ profile().authType }}</span>
        <span class="intcfg__badge"><mat-icon>domain</mat-icon> {{ profile().workspace }}</span>
        @if (profile().enabled && profile().deliveryRate > 0) {
          <span class="intcfg__badge intcfg__badge--ok"><mat-icon>check_circle</mat-icon> {{ profile().deliveryRate }}% entrega</span>
        }
        @if (profile().errorRate > 5) {
          <span class="intcfg__badge intcfg__badge--warn"><mat-icon>warning</mat-icon> {{ profile().errorRate }}% errores</span>
        }
      </div>

      <nav class="intcfg__tabs" role="tablist" aria-label="Secciones de configuración">
        @for (tab of tabs; track tab.id) {
          <button
            type="button"
            role="tab"
            class="intcfg__tab"
            [class.intcfg__tab--on]="view() === tab.id"
            [attr.aria-selected]="view() === tab.id"
            (click)="view.set(tab.id)"
          >
            <mat-icon>{{ tab.icon }}</mat-icon>{{ tab.label }}
          </button>
        }
      </nav>

      <mat-dialog-content class="intcfg__body">
        @switch (view()) {
          @case ('overview') {
            <div class="intcfg__split">
              <section class="intcfg__panel">
                <h3><mat-icon>insights</mat-icon> Métricas (24 h)</h3>
                <div class="intcfg__stat-row">
                  <div class="intcfg__stat">
                    <strong>{{ profile().events24h }}</strong>
                    <span>Eventos</span>
                  </div>
                  <div class="intcfg__stat">
                    <strong>{{ profile().avgLatencyMs }}<small>ms</small></strong>
                    <span>Latencia media</span>
                  </div>
                  <div class="intcfg__stat">
                    <strong>{{ profile().deliveryRate }}%</strong>
                    <span>Entrega</span>
                  </div>
                </div>
                <h4 class="intcfg__sub">Actividad de sync (12 h)</h4>
                <div class="intcfg__spark">
                  <svg viewBox="0 0 140 36" preserveAspectRatio="none" aria-hidden="true">
                    <path [attr.d]="syncSpark()" fill="none" [attr.stroke]="profile().accent" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </div>
                <dl class="intcfg__facts">
                  <div><dt>Última sync</dt><dd>{{ relativeTime(profile().lastSync) }}</dd></div>
                  <div><dt>Conectado por</dt><dd>{{ profile().connectedBy }}</dd></div>
                  @if (profile().connectedAt !== '—') {
                    <div><dt>Desde</dt><dd>{{ profile().connectedAt | date: 'dd MMM yyyy' }}</dd></div>
                  }
                  <div><dt>Tasa de error</dt><dd [class.intcfg__warn]="profile().errorRate > 5">{{ profile().errorRate }}%</dd></div>
                </dl>
              </section>
              <section class="intcfg__panel intcfg__panel--aside">
                <h3><mat-icon>link</mat-icon> Endpoint</h3>
                <code class="intcfg__endpoint mono">{{ profile().endpoint }}</code>
                <ul class="intcfg__hints">
                  <li><mat-icon>https</mat-icon> Conexión cifrada TLS 1.3</li>
                  <li><mat-icon>schedule</mat-icon> Reintento automático ×3</li>
                  <li><mat-icon>description</mat-icon>
                    <a [href]="profile().docsUrl" target="_blank" rel="noopener noreferrer">Documentación</a>
                  </li>
                </ul>
                @if (profile().status === 'disconnected' || profile().status === 'pending') {
                  <aside class="intcfg__warn intcfg__warn--info">
                    <mat-icon>info</mat-icon>
                    <p>Completa la conexión en la pestaña <strong>Conexión</strong> y prueba antes de activar eventos.</p>
                  </aside>
                }
              </section>
            </div>
          }
          @case ('connection') {
            <section class="intcfg__panel">
              <h3><mat-icon>settings</mat-icon> Parámetros de conexión</h3>
              <p class="intcfg__panel-desc">Credenciales almacenadas cifradas. Los valores secretos solo se muestran parcialmente.</p>
              <div class="intcfg__fields">
                @for (field of profile().configFields; track field.key) {
                  <mat-form-field appearance="outline" class="intcfg__field">
                    <mat-label>{{ field.label }}</mat-label>
                    <input
                      matInput
                      [type]="field.secret && !revealed()[field.key] ? 'password' : 'text'"
                      [value]="fieldControls[field.key].value"
                      [readonly]="field.readonly"
                      (input)="fieldControls[field.key].setValue(($any($event.target)).value)"
                    />
                    @if (field.secret) {
                      <button mat-icon-button matSuffix type="button" (click)="toggleReveal(field.key)" [attr.aria-label]="'Mostrar ' + field.label">
                        <mat-icon>{{ revealed()[field.key] ? 'visibility_off' : 'visibility' }}</mat-icon>
                      </button>
                    }
                  </mat-form-field>
                }
                <mat-form-field appearance="outline" class="intcfg__field">
                  <mat-label>Entorno</mat-label>
                  <mat-select [formControl]="envControl">
                    <mat-option value="production">Production</mat-option>
                    <mat-option value="staging">Staging</mat-option>
                    <mat-option value="sandbox">Sandbox</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
              <aside class="intcfg__warn intcfg__warn--info">
                <mat-icon>info</mat-icon>
                <div>
                  <strong>Autenticación: {{ profile().authType }}</strong>
                  <p>Tras guardar, ejecuta <em>Probar conexión</em> para validar credenciales sin activar el envío de eventos.</p>
                </div>
              </aside>
            </section>
          }
          @case ('events') {
            <section class="intcfg__panel">
              <h3><mat-icon>bolt</mat-icon> Tipos de evento suscritos</h3>
              <p class="intcfg__panel-desc">Selecciona qué eventos de CloudOps se envían a {{ profile().label }}.</p>
              <ul class="intcfg__events">
                @for (ev of eventTypes(); track ev.id) {
                  <li class="intcfg__event" [class.intcfg__event--off]="!ev.enabled">
                    <div class="intcfg__event-text">
                      <strong>{{ ev.label }}</strong>
                      <span>{{ ev.desc }}</span>
                      <code>{{ ev.id }}</code>
                    </div>
                    <mat-slide-toggle
                      [checked]="ev.enabled"
                      (change)="handleEventToggle(ev.id, $event.checked)"
                      [attr.aria-label]="'Activar ' + ev.label"
                    />
                  </li>
                }
              </ul>
              <div class="intcfg__event-summary">
                <span>{{ enabledEvents() }}/{{ eventTypes().length }} eventos activos</span>
                <button type="button" class="intcfg__link-btn" (click)="handleSelectAllEvents(true)">Activar todos</button>
                <button type="button" class="intcfg__link-btn" (click)="handleSelectAllEvents(false)">Desactivar todos</button>
              </div>
            </section>
          }
        }
      </mat-dialog-content>

      <mat-dialog-actions align="start" class="intcfg__actions">
        <button type="button" class="page-action-btn page-action-btn--primary" (click)="handleSave()">
          <mat-icon>save</mat-icon> Guardar configuración
        </button>
        <button type="button" class="page-action-btn" (click)="handleTestConnection()">
          <mat-icon>wifi_tethering</mat-icon> Probar conexión
        </button>
        @if (profile().status === 'connected') {
          <button type="button" class="page-action-btn intcfg__btn-danger" (click)="handleDisconnect()">
            <mat-icon>link_off</mat-icon> Desconectar
          </button>
        }
        <button type="button" class="page-action-btn" mat-dialog-close>Cancelar</button>
      </mat-dialog-actions>
    </article>
  `,
  styles: `
    :host { display: block; }
    .intcfg { width: 100%; color: #0f172a; padding: 1.15rem 1.35rem 1.2rem; box-sizing: border-box; --int-accent: ${ADMIN_SETTINGS_ACCENT}; }
    .intcfg__head {
      display: flex; justify-content: space-between; align-items: flex-start; gap: 0.85rem;
      padding: 0.85rem 1rem; margin-bottom: 0.55rem; border-radius: 12px;
      border: 1px solid ${ADMIN_SETTINGS_ACCENT_BORDER};
      background: linear-gradient(135deg, ${ADMIN_SETTINGS_ACCENT_LIGHT}, #fff);
    }
    .intcfg__identity { display: flex; gap: 0.7rem; align-items: center; min-width: 0; flex: 1; }
    .intcfg__icon {
      display: flex; align-items: center; justify-content: center;
      width: 2.5rem; height: 2.5rem; border-radius: 11px; flex-shrink: 0;
      background: color-mix(in srgb, var(--int-accent) 15%, #fff);
      border: 1px solid color-mix(in srgb, var(--int-accent) 30%, #e2e8f0);
      color: var(--int-accent);
      mat-icon { font-size: 1.2rem; width: 1.2rem; height: 1.2rem; }
    }
    .intcfg__label { font-size: 0.58rem; font-weight: 750; text-transform: uppercase; letter-spacing: 0.04em; color: #94a3b8; }
    .intcfg__head h2 { margin: 0.15rem 0 0; font-size: 1.05rem; font-weight: 700; }
    .intcfg__head p { margin: 0.2rem 0 0; font-size: 0.72rem; color: #64748b; line-height: 1.45; }
    .intcfg__mode {
      display: flex; align-items: center; gap: 0.4rem; padding: 0.45rem 0.65rem; margin-bottom: 0.55rem;
      border-radius: 8px; font-size: 0.64rem; font-weight: 600;
      border: 1px solid ${ADMIN_SETTINGS_ACCENT_BORDER}; background: ${ADMIN_SETTINGS_ACCENT_LIGHT}; color: #475569;
      mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; color: ${ADMIN_SETTINGS_ACCENT}; }
      &[data-live='true'] { border-color: #bbf7d0; background: #f0fdf4; color: #15803d; mat-icon { color: #15803d; } }
    }
    .intcfg__head-meta { display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0; }
    .intcfg__status {
      display: inline-flex; align-items: center; gap: 0.28rem;
      font-size: 0.62rem; font-weight: 700; text-transform: uppercase;
      padding: 0.2rem 0.45rem; border-radius: 999px; background: #f1f5f9; color: #64748b;
      i { width: 6px; height: 6px; border-radius: 50%; background: #94a3b8; }
      &[data-status='connected'] { background: #dcfce7; color: #15803d; i { background: #22c55e; } }
      &[data-status='error'] { background: #fef2f2; color: #dc2626; i { background: #ef4444; } }
      &[data-status='pending'] { background: #fef3c7; color: #b45309; i { background: #f59e0b; } }
    }
    .intcfg__badges { display: flex; flex-wrap: wrap; gap: 0.32rem; margin-bottom: 0.55rem; }
    .intcfg__badge {
      display: inline-flex; align-items: center; gap: 0.22rem;
      font-size: 0.62rem; font-weight: 600; padding: 0.12rem 0.42rem;
      border-radius: 999px; background: #f1f5f9; color: #475569;
      mat-icon { font-size: 0.78rem; width: 0.78rem; height: 0.78rem; }
      &--ok { background: #dcfce7; color: #15803d; }
      &--warn { background: #fef3c7; color: #b45309; }
    }
    .intcfg__tabs {
      display: flex; flex-wrap: wrap; gap: 0.2rem; padding: 0.18rem;
      margin-bottom: 0.55rem; border-radius: 10px; background: ${ADMIN_SETTINGS_ACCENT_LIGHT};
    }
    .intcfg__tab {
      display: inline-flex; align-items: center; gap: 0.28rem;
      padding: 0.32rem 0.55rem; border: none; border-radius: 8px;
      background: transparent; font: inherit; font-size: 0.66rem; font-weight: 600;
      color: #475569; cursor: pointer;
      mat-icon { font-size: 0.88rem; width: 0.88rem; height: 0.88rem; }
    }
    .intcfg__tab--on { background: #fff; color: ${ADMIN_SETTINGS_ACCENT}; box-shadow: 0 1px 2px rgb(71 85 105 / 0.08); }
    .intcfg__body { padding: 0 !important; max-height: min(52vh, 440px); overflow-y: auto; scrollbar-width: thin; }
    .intcfg__split { display: grid; grid-template-columns: minmax(0, 1fr) minmax(200px, 240px); gap: 0.65rem; align-items: start; }
    .intcfg__panel {
      padding: 0.75rem 0.9rem; border-radius: 11px; border: 1px solid #e2e8f0; background: #fafbfc;
      h3 { display: flex; align-items: center; gap: 0.35rem; margin: 0 0 0.55rem; font-size: 0.74rem; font-weight: 700; color: ${ADMIN_SETTINGS_ACCENT}; mat-icon { font-size: 1rem; width: 1rem; height: 1rem; } }
    }
    .intcfg__panel--aside { background: ${ADMIN_SETTINGS_ACCENT_LIGHT}; border-color: ${ADMIN_SETTINGS_ACCENT_BORDER}; }
    .intcfg__panel-desc { margin: -0.35rem 0 0.65rem; font-size: 0.66rem; color: #64748b; line-height: 1.5; }
    .intcfg__stat-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.45rem; margin-bottom: 0.65rem; }
    .intcfg__stat {
      padding: 0.55rem 0.65rem; border-radius: 9px; border: 1px solid #e2e8f0; background: #fff; text-align: center;
      strong { display: block; font-size: 0.88rem; font-weight: 800; color: var(--int-accent); small { font-size: 0.55rem; } }
      span { display: block; font-size: 0.56rem; color: #94a3b8; text-transform: uppercase; margin-top: 0.12rem; }
    }
    .intcfg__sub { margin: 0 0 0.35rem; font-size: 0.64rem; font-weight: 700; color: #475569; text-transform: uppercase; }
    .intcfg__spark svg { width: 100%; height: 36px; display: block; margin-bottom: 0.65rem; }
    .intcfg__facts {
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.45rem 0.75rem; margin: 0;
      dt { font-size: 0.56rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; }
      dd { margin: 0.06rem 0 0; font-size: 0.74rem; font-weight: 500; .intcfg__warn { color: #d97706; font-weight: 700; } }
    }
    .intcfg__endpoint { display: block; font-size: 0.68rem; padding: 0.45rem 0.55rem; border-radius: 8px; background: #fff; border: 1px solid ${ADMIN_SETTINGS_ACCENT_BORDER}; word-break: break-all; margin-bottom: 0.55rem; }
    .intcfg__hints { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.28rem; li { display: flex; align-items: center; gap: 0.32rem; font-size: 0.64rem; color: #475569; mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; color: ${ADMIN_SETTINGS_ACCENT}; } a { color: ${ADMIN_SETTINGS_ACCENT}; font-weight: 600; text-decoration: none; &:hover { text-decoration: underline; } } } }
    .intcfg__fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.35rem 0.55rem; margin-bottom: 0.55rem; }
    .intcfg__field { width: 100%; }
    .intcfg__warn { display: flex; gap: 0.45rem; padding: 0.6rem 0.7rem; border-radius: 9px; mat-icon { flex-shrink: 0; font-size: 1rem; width: 1rem; height: 1rem; margin-top: 0.05rem; } p, div p { margin: 0; font-size: 0.64rem; color: #475569; line-height: 1.55; } strong { display: block; font-size: 0.7rem; margin-bottom: 0.15rem; } em { font-style: normal; font-weight: 600; } }
    .intcfg__warn--info { background: ${ADMIN_SETTINGS_ACCENT_LIGHT}; border: 1px solid ${ADMIN_SETTINGS_ACCENT_BORDER}; mat-icon { color: ${ADMIN_SETTINGS_ACCENT}; } }
    .intcfg__events { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
    .intcfg__event {
      display: flex; align-items: center; justify-content: space-between; gap: 0.65rem;
      padding: 0.6rem 0.7rem; border-radius: 10px; border: 1px solid #e2e8f0; background: #fff;
      &--off { opacity: 0.72; background: #fafbfc; }
    }
    .intcfg__event-text strong { display: block; font-size: 0.74rem; }
    .intcfg__event-text span { display: block; font-size: 0.62rem; color: #64748b; margin-top: 0.08rem; }
    .intcfg__event-text code { display: inline-block; font-size: 0.58rem; margin-top: 0.2rem; padding: 0.06rem 0.3rem; border-radius: 4px; background: #f1f5f9; color: #64748b; }
    .intcfg__event-summary { display: flex; flex-wrap: wrap; align-items: center; gap: 0.45rem; margin-top: 0.65rem; padding-top: 0.55rem; border-top: 1px solid #e2e8f0; font-size: 0.64rem; color: #64748b; }
    .intcfg__link-btn { border: none; background: none; font: inherit; font-size: 0.62rem; font-weight: 600; color: ${ADMIN_SETTINGS_ACCENT}; cursor: pointer; padding: 0; &:hover { text-decoration: underline; } }
    .intcfg__actions { display: flex; flex-wrap: wrap; gap: 0.45rem; padding: 0.85rem 0 0; margin: 0.85rem 0 0; border-top: 1px solid #e2e8f0; min-height: unset; }
    .page-action-btn--primary { background: ${ADMIN_SETTINGS_ACCENT}; border-color: #334155; }
    .intcfg__btn-danger { color: #dc2626 !important; border-color: #fecaca !important; &:hover { background: #fef2f2 !important; } }
    .mono { font-family: ui-monospace, monospace; }
    @media (max-width: 720px) { .intcfg { padding: 1rem; } .intcfg__split, .intcfg__fields, .intcfg__facts { grid-template-columns: 1fr; } .intcfg__stat-row { grid-template-columns: 1fr; } }
  `,
})
export class AdminSettingsIntegrationDialogComponent {
  readonly data = inject<AdminSettingsIntegrationDialogData>(MAT_DIALOG_DATA)
  private readonly dialogRef = inject(MatDialogRef<AdminSettingsIntegrationDialogComponent>)
  private readonly actions = inject(PlatformActionService)
  private readonly toast = inject(ToastService)
  private readonly integrationsApi = inject(IntegrationsService)

  readonly view = signal<ConfigTab>('overview')
  readonly profile = computed(() => enrichIntegrationProfile({ ...this.data.integration, enabled: this.data.integration.enabled }))
  readonly eventTypes = signal<IntegrationEventType[]>([...enrichIntegrationProfile(this.data.integration).eventTypes])
  readonly revealed = signal<Record<string, boolean>>({})

  readonly envControl = new FormControl('production', { nonNullable: true })
  fieldControls: Record<string, FormControl<string>> = {}

  relativeTime = adminRelativeTime
  statusLabel = integrationStatusLabel

  readonly tabs: { id: ConfigTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Resumen', icon: 'dashboard' },
    { id: 'connection', label: 'Conexión', icon: 'link' },
    { id: 'events', label: 'Eventos', icon: 'bolt' },
  ]

  readonly syncSpark = computed(() => sparkPath(this.profile().syncHistory))
  readonly enabledEvents = computed(() => this.eventTypes().filter((e) => e.enabled).length)

  constructor() {
    for (const field of enrichIntegrationProfile(this.data.integration).configFields) {
      this.fieldControls[field.key] = new FormControl(field.value, { nonNullable: true })
    }
  }

  toggleReveal = (key: string): void => {
    this.revealed.update((r) => ({ ...r, [key]: !r[key] }))
  }

  handleEventToggle = (id: string, enabled: boolean): void => {
    this.eventTypes.update((list) => list.map((e) => (e.id === id ? { ...e, enabled } : e)))
  }

  handleSelectAllEvents = (enabled: boolean): void => {
    this.eventTypes.update((list) => list.map((e) => ({ ...e, enabled })))
    this.toast.info(enabled ? 'Todos los eventos activados' : 'Todos los eventos desactivados')
  }

  handleTestConnection = (): void => {
    this.integrationsApi.test(this.profile().id).subscribe((res) => {
      if (!res) {
        this.toast.error('Backend no disponible — prueba en local con API activa')
        return
      }
      const { result, liveMode } = res
      if (result.status === 'failed') {
        this.toast.error(`${this.profile().label}: ${result.error ?? 'Error de conexión'}`)
      } else if (result.status === 'simulated') {
        this.toast.info(`${this.profile().label}: simulación OK (${result.latencyMs} ms). En PRO: INTEGRATIONS_LIVE=true`)
      } else {
        this.toast.success(`${this.profile().label}: entregado en PRO (${result.latencyMs} ms)`)
      }
      this.actions.runPageAction('settings', 'test-connection', `Probar: ${this.profile().label}`, {
        area: 'admin',
        row: { id: this.profile().id, liveMode, status: result.status },
      })
      this.dialogRef.close({ refresh: true, row: res.integration })
    })
  }

  handleDisconnect = (): void => {
    this.integrationsApi.disconnect(this.profile().id).subscribe((row) => {
      if (!row) {
        this.toast.error('No se pudo desconectar')
        return
      }
      this.toast.warning(`${this.profile().label} desconectado`)
      this.dialogRef.close({ row })
    })
  }

  handleSave = (): void => {
    const config = Object.fromEntries(Object.entries(this.fieldControls).map(([k, c]) => [k, c.value]))
    const events = this.eventTypes().filter((e) => e.enabled).map((e) => e.id)
    const payload = {
      config: { ...config, environment: this.envControl.value },
      events,
      enabled: this.data.integration.enabled,
    }
    this.integrationsApi.update(this.profile().id, payload).subscribe((row) => {
      if (!row) {
        this.toast.error('No se pudo guardar la configuración')
        return
      }
      this.actions.runPageAction('settings', 'save-integration', `Guardar ${this.profile().label}`, {
        area: 'admin',
        row: payload,
      })
      this.toast.success(`Configuración de ${this.profile().label} guardada`)
      this.dialogRef.close({ row })
    })
  }
}
