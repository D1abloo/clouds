import { DatePipe } from '@angular/common'
import { Component, computed, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatIconModule } from '@angular/material/icon'
import { MatDialog, MatDialogModule } from '@angular/material/dialog'
import { PageHeaderComponent, type PageHeaderAction } from '../../shared/components/page-header/page-header.component'
import { AuthService } from '../../core/services/auth.service'
import { ThemeService } from '../../core/services/theme.service'
import { ToastService } from '../../core/services/toast.service'
import { PlatformActionService } from '../../shared/platform/platform-action.service'
import { IntegrationsService } from '../../core/services/integrations.service'
import type { IntegrationConfigDto, IntegrationDeliveryDto, IntegrationPlatformSourceDto, IntegrationsStatusDto } from '../../core/models/api.models'
import { environment } from '../../../environments/environment'
import {
  ADMIN_SETTINGS_ACCENT,
  ADMIN_SETTINGS_ACCENT_BORDER,
  ADMIN_SETTINGS_ACCENT_LIGHT,
  adminRelativeTime,
  downloadBlob,
} from './admin.config'
import {
  SETTINGS_ACCOUNT_META,
  SETTINGS_GENERAL,
  SETTINGS_INTEGRATIONS,
  SETTINGS_NOTIFICATION_CHANNELS,
  SETTINGS_PLATFORM_SOURCES,
  SETTINGS_NOTIF_HISTORY,
  SETTINGS_SECURITY_POLICIES,
  SETTINGS_SECURITY_SCORE,
  SETTINGS_SYNC_HISTORY,
  SETTINGS_TABS,
  SETTINGS_THEME_OPTIONS,
  integrationStatusLabel,
  mergeIntegrationFromApi,
  sparkPath,
  type SettingsIntegration,
  type SettingsTabId,
} from './admin-settings.demo'
import { AdminSettingsIntegrationDialogComponent } from './admin-settings-integration-dialog.component'

@Component({
  selector: 'app-admin-settings-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    PageHeaderComponent,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatDialogModule,
  ],
  template: `
    <div class="page-container set-page animate-fade-in">
      <app-page-header
        title="Configuración"
        description="Preferencias de plataforma, integraciones, notificaciones, seguridad, tema y cuenta."
        icon="settings"
        [actions]="headerActions"
        (actionClick)="handleHeader($event)"
      />

      <section class="set-intro">
        <div class="set-intro__main">
          <span class="set-intro__eyebrow">Administración · Plataforma</span>
          <h2 class="set-intro__title">Centro de configuración</h2>
          <p class="set-intro__desc">
            Ajusta el comportamiento global de CloudOps para toda la organización.
            Los cambios se aplican inmediatamente en modo demo.
          </p>
        </div>
        <ul class="set-intro__stats">
          <li>
            <strong>{{ activeIntegrations() }}</strong>
            <span>Integraciones activas</span>
          </li>
          <li>
            <strong>{{ securityScore }}</strong>
            <span>Score seguridad</span>
          </li>
          <li>
            <strong>{{ theme.mode() === 'dark' ? 'Oscuro' : 'Claro' }}</strong>
            <span>Tema actual</span>
          </li>
          <li>
            <strong>{{ relativeTime(general.lastSaved) }}</strong>
            <span>Último guardado</span>
          </li>
        </ul>
      </section>

      <div class="set-bar">
        <nav class="set-tabs" role="tablist" aria-label="Secciones de configuración">
          @for (tab of tabs; track tab.id) {
            <button
              type="button"
              role="tab"
              class="set-tabs__tab"
              [class.set-tabs__tab--on]="view() === tab.id"
              [attr.aria-selected]="view() === tab.id"
              (click)="view.set(tab.id)"
            >
              <mat-icon>{{ tab.icon }}</mat-icon>
              {{ tab.label }}
              @if (tab.id === 'integrations') {
                <span class="set-tabs__count">{{ activeIntegrations() }}</span>
              }
            </button>
          }
        </nav>
      </div>

      <div class="table-card set-content">
          <header class="set-section-head">
            <div class="set-section-head__icon"><mat-icon>{{ currentTab().icon }}</mat-icon></div>
            <div>
              <h2>{{ currentTab().label }}</h2>
              <p>{{ currentTab().desc }}</p>
            </div>
          </header>

          @switch (view()) {
            @case ('general') {
              <div class="set-grid set-grid--2">
                <section class="set-card set-card--wide">
                  <h3><mat-icon>business</mat-icon> Organización</h3>
                  <div class="set-form-grid">
                    <mat-form-field appearance="outline" class="set-field">
                      <mat-label>Nombre de la organización</mat-label>
                      <input matInput [value]="orgName()" (input)="orgName.set(($any($event.target)).value)" />
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="set-field">
                      <mat-label>Zona horaria</mat-label>
                      <mat-select [value]="timezone()" (selectionChange)="timezone.set($event.value)">
                        @for (tz of timezones; track tz) {
                          <mat-option [value]="tz">{{ tz }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="set-field">
                      <mat-label>Idioma</mat-label>
                      <mat-select [value]="locale()" (selectionChange)="locale.set($event.value)">
                        <mat-option value="es-ES">Español (España)</mat-option>
                        <mat-option value="en-US">English (US)</mat-option>
                        <mat-option value="pt-BR">Português (Brasil)</mat-option>
                      </mat-select>
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="set-field">
                      <mat-label>Sincronización cloud</mat-label>
                      <mat-select [value]="syncInterval()" (selectionChange)="syncInterval.set($event.value)">
                        <mat-option [value]="5">Cada 5 minutos</mat-option>
                        <mat-option [value]="15">Cada 15 minutos</mat-option>
                        <mat-option [value]="30">Cada 30 minutos</mat-option>
                        <mat-option [value]="60">Cada hora</mat-option>
                      </mat-select>
                    </mat-form-field>
                  </div>
                  <div class="set-chips">
                    <span class="set-chip" [attr.data-env]="general.environment">{{ general.environment }}</span>
                    <span class="set-chip"><mat-icon>public</mat-icon> {{ general.region }}</span>
                    <span class="set-chip"><mat-icon>api</mat-icon> API {{ general.apiVersion }}</span>
                  </div>
                  <div class="set-actions">
                    <button type="button" class="page-action-btn page-action-btn--primary" (click)="saveSection('General')">
                      <mat-icon>save</mat-icon> Guardar general
                    </button>
                  </div>
                </section>

                <section class="set-card">
                  <h3><mat-icon>cloud_sync</mat-icon> Estado del backend</h3>
                  <div class="set-status-hero">
                    <span class="set-status-dot set-status-dot--ok"></span>
                    <div>
                      <strong>Operativo</strong>
                      <span>Backend respondiendo correctamente</span>
                    </div>
                  </div>
                  <dl class="set-facts">
                    <div><dt>URL API</dt><dd class="mono">{{ apiUrl }}</dd></div>
                    <div><dt>Versión</dt><dd>{{ general.apiVersion }}</dd></div>
                    <div><dt>Entorno</dt><dd>{{ general.environment }}</dd></div>
                    <div><dt>Región</dt><dd>{{ general.region }}</dd></div>
                  </dl>
                </section>

                <section class="set-card">
                  <h3><mat-icon>show_chart</mat-icon> Sincronizaciones (12 h)</h3>
                  <div class="set-spark-wrap">
                    <svg viewBox="0 0 140 36" preserveAspectRatio="none" aria-hidden="true">
                      <path [attr.d]="syncSpark()" fill="none" stroke="${ADMIN_SETTINGS_ACCENT}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    <div class="set-spark-meta">
                      <span>Promedio {{ syncAvg() }} min</span>
                      <span>Intervalo {{ syncInterval() }} min</span>
                    </div>
                  </div>
                </section>
              </div>
            }

            @case ('integrations') {
              @if (integrationsStatus()) {
                <aside class="set-int-pro" [attr.data-live]="integrationsStatus()!.liveMode">
                  <mat-icon>{{ integrationsStatus()!.liveMode ? 'cloud_done' : 'science' }}</mat-icon>
                  <div>
                    <strong>{{ integrationsStatus()!.liveMode ? 'Entrega PRO activa' : 'Modo simulación' }}</strong>
                    <p>{{ integrationsStatus()!.message }}</p>
                  </div>
                </aside>
              }
              <div class="set-int-summary">
                <div class="set-mini-stat"><strong>{{ activeIntegrations() }}</strong><span>Activas</span></div>
                <div class="set-mini-stat"><strong>{{ connectedIntegrations() }}</strong><span>Conectadas</span></div>
                <div class="set-mini-stat"><strong>{{ totalEvents24h() }}</strong><span>Eventos (24h)</span></div>
              </div>
              @if (platformSources().length) {
                <section class="set-card set-card--wide set-int-sources">
                  <h3><mat-icon>hub</mat-icon> Fuentes conectadas en PRO</h3>
                  <p class="set-int-sources__hint">
                    Módulos del panel que publican eventos al bus de integraciones cuando
                    {{ integrationsStatus()?.liveMode ? 'la entrega PRO está activa' : 'activas INTEGRATIONS_LIVE o DEMO_MODE=false' }}.
                  </p>
                  <div class="set-int-sources__grid">
                    @for (src of platformSources(); track src.id) {
                      <article class="set-int-source">
                        <header>
                          <strong>{{ src.label }}</strong>
                          <code>{{ src.module }}</code>
                        </header>
                        <ul>
                          @for (ev of src.events; track ev) {
                            <li><code>{{ ev }}</code></li>
                          }
                        </ul>
                      </article>
                    }
                  </div>
                </section>
              }
              <div class="set-int-grid">
                @for (int of integrations(); track int.id) {
                  <article class="set-int-card" [class.set-int-card--off]="!int.enabled">
                    <header>
                      <span class="set-int-card__icon" [style.--int-accent]="int.accent">
                        <mat-icon>{{ int.icon }}</mat-icon>
                      </span>
                      <div class="set-int-card__head-text">
                        <strong>{{ int.label }}</strong>
                        <span class="set-int-card__cat">{{ int.category }}</span>
                      </div>
                      <mat-slide-toggle
                        [checked]="int.enabled"
                        (change)="handleIntegration(int.id, $event.checked)"
                        [attr.aria-label]="'Activar ' + int.label"
                      />
                    </header>
                    <p>{{ int.desc }}</p>
                    <footer>
                      <span class="set-int-status" [attr.data-status]="int.status">
                        <i></i>{{ statusLabel(int.status) }}
                      </span>
                      @if (int.enabled) {
                        <span class="set-int-meta">{{ int.events24h }} evt/24h · {{ relativeTime(int.lastSync) }}</span>
                      }
                      <button type="button" class="set-int-config" (click)="configureIntegration(int)">
                        <mat-icon>settings</mat-icon> Configurar
                      </button>
                    </footer>
                  </article>
                }
              </div>
              @if (integrationDeliveries().length) {
                <section class="set-card set-card--wide set-deliveries">
                  <h3><mat-icon>outbox</mat-icon> Entregas recientes</h3>
                  <p class="set-deliveries__hint">Notificaciones enviadas a Slack, PagerDuty y Jira al activar integraciones o disparar alertas.</p>
                  <div class="set-deliveries__table-wrap">
                    <table class="premium-table" aria-label="Entregas de integraciones">
                      <thead>
                        <tr><th>Integración</th><th>Evento</th><th>Título</th><th>Estado</th><th>Latencia</th><th>Hace</th></tr>
                      </thead>
                      <tbody>
                        @for (d of integrationDeliveries(); track d.id) {
                          <tr>
                            <td><strong>{{ d.integration?.label ?? d.integrationId }}</strong></td>
                            <td><code>{{ d.eventType }}</code></td>
                            <td>{{ d.title }}</td>
                            <td><span class="set-delivery-status" [attr.data-status]="d.status">{{ deliveryStatusLabel(d.status) }}</span></td>
                            <td>{{ d.latencyMs != null ? d.latencyMs + ' ms' : '—' }}</td>
                            <td>{{ relativeTime(d.createdAt) }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </section>
              }
            }

            @case ('notifications') {
              <div class="set-grid set-grid--2">
                <section class="set-card set-card--wide">
                  <h3><mat-icon>tune</mat-icon> Canales de notificación</h3>
                  @for (ch of notificationChannels(); track ch.id) {
                    <div class="set-notif-row">
                      <span class="set-notif-row__icon"><mat-icon>{{ ch.icon }}</mat-icon></span>
                      <div class="set-notif-row__body">
                        <div class="set-notif-row__top">
                          <strong>{{ ch.label }}</strong>
                          @if (ch.destination) {
                            <code>{{ ch.destination }}</code>
                          }
                        </div>
                        <p>{{ ch.desc }}</p>
                        @if (ch.enabled && ch.volume24h > 0) {
                          <div class="set-notif-metrics">
                            <span>{{ ch.volume24h }} enviadas (24h)</span>
                            <span class="set-notif-rate" [attr.data-ok]="ch.deliveryRate >= 95">{{ ch.deliveryRate }}% entrega</span>
                          </div>
                        }
                      </div>
                      <mat-slide-toggle
                        [checked]="ch.enabled"
                        (change)="handleNotification(ch.id, $event.checked)"
                        [attr.aria-label]="'Activar ' + ch.label"
                      />
                    </div>
                  }
                </section>
                <section class="set-card">
                  <h3><mat-icon>show_chart</mat-icon> Volumen (14 d)</h3>
                  <div class="set-spark-wrap set-spark-wrap--tall">
                    <svg viewBox="0 0 140 48" preserveAspectRatio="none" aria-hidden="true">
                      <path [attr.d]="notifSpark()" fill="none" stroke="${ADMIN_SETTINGS_ACCENT}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </div>
                  <dl class="set-facts set-facts--compact">
                    <div><dt>Total hoy</dt><dd>{{ notifToday() }}</dd></div>
                    <div><dt>Canales activos</dt><dd>{{ activeNotifChannels() }}/{{ notificationChannels().length }}</dd></div>
                  </dl>
                </section>
              </div>
              <div class="set-actions">
                <button type="button" class="page-action-btn page-action-btn--primary" (click)="saveSection('Notificaciones')">
                  <mat-icon>save</mat-icon> Guardar notificaciones
                </button>
              </div>
            }

            @case ('security') {
              <div class="set-sec-hero">
                <div class="set-sec-score">
                  <svg viewBox="0 0 80 80" aria-hidden="true">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="#e2e8f0" stroke-width="6" />
                    <circle
                      cx="40" cy="40" r="34" fill="none"
                      stroke="${ADMIN_SETTINGS_ACCENT}" stroke-width="6"
                      stroke-linecap="round"
                      [attr.stroke-dasharray]="213.6"
                      [attr.stroke-dashoffset]="213.6 * (1 - securityScore / 100)"
                      transform="rotate(-90 40 40)"
                    />
                  </svg>
                  <div class="set-sec-score__center">
                    <strong>{{ securityScore }}</strong>
                    <span>/ 100</span>
                  </div>
                </div>
                <div class="set-sec-hero__text">
                  <h3>Postura de seguridad</h3>
                  <p>{{ enabledPolicies() }} de {{ securityPolicies().length }} políticas activas. MFA obligatorio para administradores.</p>
                  <ul class="set-sec-tags">
                    <li><mat-icon>verified_user</mat-icon> MFA activo</li>
                    <li><mat-icon>schedule</mat-icon> Sesión 8 h</li>
                    <li><mat-icon>receipt_long</mat-icon> Auditoría 365 d</li>
                  </ul>
                </div>
              </div>
              <div class="set-sec-grid">
                @for (pol of securityPolicies(); track pol.id) {
                  <article class="set-sec-card" [class.set-sec-card--off]="!pol.enabled">
                    <header>
                      <span class="set-sec-card__icon" [attr.data-sev]="pol.severity">
                        <mat-icon>{{ pol.icon }}</mat-icon>
                      </span>
                      <div>
                        <strong>{{ pol.label }}</strong>
                        <em>{{ pol.impact }}</em>
                      </div>
                      <mat-slide-toggle
                        [checked]="pol.enabled"
                        (change)="handleSecurity(pol.id, $event.checked)"
                        [attr.aria-label]="pol.label"
                      />
                    </header>
                    <p>{{ pol.desc }}</p>
                    <span class="set-sev" [attr.data-sev]="pol.severity">{{ pol.severity === 'critical' ? 'Crítica' : pol.severity === 'high' ? 'Alta' : 'Media' }}</span>
                  </article>
                }
              </div>
              <div class="set-actions">
                <button type="button" class="page-action-btn page-action-btn--primary" (click)="saveSection('Políticas de seguridad')">
                  <mat-icon>policy</mat-icon> Aplicar políticas
                </button>
              </div>
            }

            @case ('theme') {
              <div class="set-theme-grid">
                @for (opt of themeOptions; track opt.id) {
                  <button
                    type="button"
                    class="set-theme-opt"
                    [class.set-theme-opt--on]="selectedTheme() === opt.id"
                    (click)="handleThemeSelect(opt.id)"
                  >
                    <div class="set-theme-preview" [attr.data-theme]="opt.id">
                      <span class="set-theme-preview__bar"></span>
                      <span class="set-theme-preview__sidebar"></span>
                      <span class="set-theme-preview__content"></span>
                    </div>
                    <div class="set-theme-opt__text">
                      <mat-icon>{{ opt.icon }}</mat-icon>
                      <strong>{{ opt.label }}</strong>
                      <em>{{ opt.desc }}</em>
                    </div>
                  </button>
                }
              </div>
              <section class="set-card set-card--wide">
                <h3><mat-icon>accessibility</mat-icon> Accesibilidad</h3>
                <div class="set-toggle-card">
                  <div>
                    <strong>Animaciones reducidas</strong>
                    <p>Desactiva transiciones para usuarios sensibles al movimiento (prefers-reduced-motion).</p>
                  </div>
                  <mat-slide-toggle
                    [checked]="reducedMotion()"
                    (change)="handleReducedMotion($event.checked)"
                    aria-label="Animaciones reducidas"
                  />
                </div>
                <div class="set-toggle-card">
                  <div>
                    <strong>Modo compacto</strong>
                    <p>Reduce espaciado en tablas y paneles para mayor densidad de información.</p>
                  </div>
                  <mat-slide-toggle
                    [checked]="compactMode()"
                    (change)="compactMode.set($event.checked); toast.info('Modo compacto ' + ($event.checked ? 'activado' : 'desactivado'))"
                    aria-label="Modo compacto"
                  />
                </div>
                <div class="set-toggle-card">
                  <div>
                    <strong>Alto contraste</strong>
                    <p>Aumenta contraste de bordes y texto para mejor legibilidad.</p>
                  </div>
                  <mat-slide-toggle
                    [checked]="highContrast()"
                    (change)="highContrast.set($event.checked); toast.info('Alto contraste ' + ($event.checked ? 'activado' : 'desactivado'))"
                    aria-label="Alto contraste"
                  />
                </div>
              </section>
            }

            @case ('account') {
              <div class="set-account-layout">
                <section class="set-account-profile">
                  <span class="set-account-avatar">{{ accountInitials() }}</span>
                  <div>
                    <h3>{{ auth.user()?.name ?? 'Usuario demo' }}</h3>
                    <p>{{ auth.user()?.email ?? 'demo@cloudops.io' }}</p>
                    <div class="set-account-badges">
                      @for (role of auth.user()?.roles ?? ['admin']; track role) {
                        <span class="set-role-chip">{{ role }}</span>
                      }
                      @if (accountMeta.mfaEnabled) {
                        <span class="set-mfa-chip"><mat-icon>verified_user</mat-icon> MFA</span>
                      }
                    </div>
                  </div>
                </section>
                <div class="set-grid set-grid--2">
                  <section class="set-card">
                    <h3><mat-icon>badge</mat-icon> Información de cuenta</h3>
                    <dl class="set-facts">
                      <div><dt>Email</dt><dd>{{ auth.user()?.email ?? '—' }}</dd></div>
                      <div><dt>Departamento</dt><dd>{{ accountMeta.department }}</dd></div>
                      <div><dt>MFA</dt><dd>{{ accountMeta.mfaEnabled ? accountMeta.mfaMethod : 'No configurado' }}</dd></div>
                      <div><dt>Miembro desde</dt><dd>{{ accountMeta.memberSince | date: 'dd MMM yyyy' }}</dd></div>
                      <div><dt>Último acceso</dt><dd>{{ relativeTime(accountMeta.lastLogin) }}</dd></div>
                      <div><dt>Logins (30 d)</dt><dd>{{ accountMeta.loginCount30d }}</dd></div>
                    </dl>
                  </section>
                  <section class="set-card">
                    <h3><mat-icon>insights</mat-icon> Actividad</h3>
                    <div class="set-account-stats">
                      <div class="set-mini-stat set-mini-stat--lg">
                        <strong>{{ accountMeta.sessionsActive }}</strong>
                        <span>Sesiones activas</span>
                      </div>
                      <div class="set-mini-stat set-mini-stat--lg">
                        <strong>{{ accountMeta.apiTokens }}</strong>
                        <span>Tokens API</span>
                      </div>
                    </div>
                    <ul class="set-account-actions">
                      <li>
                        <button type="button" class="set-action-link" (click)="saveSection('Perfil')">
                          <mat-icon>edit</mat-icon>
                          <div><strong>Actualizar perfil</strong><span>Nombre, email y preferencias</span></div>
                        </button>
                      </li>
                      <li>
                        <button type="button" class="set-action-link" (click)="handleChangePassword()">
                          <mat-icon>lock</mat-icon>
                          <div><strong>Cambiar contraseña</strong><span>Última rotación hace 45 días</span></div>
                        </button>
                      </li>
                      <li>
                        <button type="button" class="set-action-link set-action-link--danger" (click)="auth.logout()">
                          <mat-icon>logout</mat-icon>
                          <div><strong>Cerrar sesión</strong><span>Finaliza todas las sesiones locales</span></div>
                        </button>
                      </li>
                    </ul>
                  </section>
                </div>
              </div>
            }
          }
      </div>
    </div>
  `,
  styles: `
    :host { display: block; flex: 1; min-height: 0; }
    .set-page {
      display: flex; flex-direction: column; gap: 0.65rem;
      overflow-y: auto; scrollbar-width: thin;
      --page-accent: ${ADMIN_SETTINGS_ACCENT};
    }
    .set-page ::ng-deep .page-action-btn--primary {
      background: ${ADMIN_SETTINGS_ACCENT}; border-color: #334155;
      &:hover:not(:disabled) { background: #334155; }
    }

    .set-intro {
      display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-start;
      padding: 0.85rem 1.1rem; border-radius: 12px;
      border: 1px solid ${ADMIN_SETTINGS_ACCENT_BORDER};
      background: linear-gradient(135deg, ${ADMIN_SETTINGS_ACCENT_LIGHT}, #fff);
    }
    .set-intro__eyebrow { font-size: 0.58rem; font-weight: 700; text-transform: uppercase; color: ${ADMIN_SETTINGS_ACCENT}; letter-spacing: 0.04em; }
    .set-intro__title { margin: 0.2rem 0; font-size: 1.05rem; font-weight: 700; color: #0f172a; }
    .set-intro__desc { margin: 0; max-width: 36rem; font-size: 0.72rem; color: #64748b; line-height: 1.55; }
    .set-intro__stats {
      list-style: none; margin: 0; padding: 0;
      display: grid; grid-template-columns: repeat(4, minmax(88px, 1fr)); gap: 0.45rem;
      flex: 1; min-width: min(100%, 360px);
    }
    .set-intro__stats li {
      padding: 0.55rem 0.65rem; border-radius: 10px;
      border: 1px solid ${ADMIN_SETTINGS_ACCENT_BORDER}; background: #fff; text-align: center;
      strong { display: block; font-size: 0.95rem; font-weight: 800; color: ${ADMIN_SETTINGS_ACCENT}; }
      span { display: block; font-size: 0.54rem; color: #94a3b8; text-transform: uppercase; font-weight: 650; margin-top: 0.1rem; }
    }

    .set-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
    .set-tabs {
      display: flex; flex-wrap: wrap; gap: 0.2rem;
      padding: 0.2rem; border-radius: 10px;
      background: ${ADMIN_SETTINGS_ACCENT_LIGHT};
      width: 100%;
    }
    .set-tabs__tab {
      display: inline-flex; align-items: center; gap: 0.28rem;
      padding: 0.38rem 0.65rem; border: none; border-radius: 8px;
      background: transparent; font: inherit; font-size: 0.68rem;
      font-weight: 600; color: #475569; cursor: pointer;
      white-space: nowrap;
    }
    .set-tabs__tab--on {
      background: #fff; color: ${ADMIN_SETTINGS_ACCENT};
      box-shadow: 0 1px 2px rgb(71 85 105 / 0.08);
    }
    .set-tabs__tab mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; }
    .set-tabs__count {
      font-size: 0.58rem; font-weight: 700;
      padding: 0.05rem 0.35rem; border-radius: 999px;
      background: ${ADMIN_SETTINGS_ACCENT_BORDER}; color: ${ADMIN_SETTINGS_ACCENT};
    }

    .set-content {
      overflow: auto; padding: 0.85rem 1rem 1.1rem;
      min-height: 0;
    }
    .set-section-head {
      display: flex; gap: 0.65rem; align-items: center;
      padding-bottom: 0.75rem; margin-bottom: 0.75rem;
      border-bottom: 1px solid #e2e8f0;
    }
    .set-section-head__icon {
      display: flex; align-items: center; justify-content: center;
      width: 2.4rem; height: 2.4rem; border-radius: 11px;
      background: ${ADMIN_SETTINGS_ACCENT}; color: #fff;
      mat-icon { font-size: 1.15rem; width: 1.15rem; height: 1.15rem; }
    }
    .set-section-head h2 { margin: 0; font-size: 0.95rem; font-weight: 700; }
    .set-section-head p { margin: 0.15rem 0 0; font-size: 0.68rem; color: #64748b; }

    .set-grid { display: grid; gap: 0.65rem; }
    .set-grid--2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .set-card {
      padding: 0.85rem 1rem; border-radius: 11px;
      border: 1px solid #e2e8f0; background: #fafbfc;
      h3 {
        display: flex; align-items: center; gap: 0.35rem;
        margin: 0 0 0.65rem; font-size: 0.76rem; font-weight: 700; color: ${ADMIN_SETTINGS_ACCENT};
        mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
      }
    }
    .set-card--wide { grid-column: 1 / -1; }

    .set-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.45rem 0.65rem; margin-bottom: 0.65rem; }
    .set-field { width: 100%; }
    .set-chips { display: flex; flex-wrap: wrap; gap: 0.32rem; margin-bottom: 0.65rem; }
    .set-chip {
      display: inline-flex; align-items: center; gap: 0.22rem;
      font-size: 0.62rem; font-weight: 600; padding: 0.12rem 0.45rem;
      border-radius: 999px; background: #f1f5f9; color: #475569;
      &[data-env='production'] { background: #dcfce7; color: #15803d; }
      mat-icon { font-size: 0.78rem; width: 0.78rem; height: 0.78rem; }
    }
    .set-actions { display: flex; flex-wrap: wrap; gap: 0.45rem; margin-top: 0.65rem; }

    .set-status-hero {
      display: flex; align-items: center; gap: 0.55rem;
      padding: 0.65rem 0.75rem; border-radius: 10px;
      border: 1px solid #bbf7d0; background: #f0fdf4; margin-bottom: 0.65rem;
      strong { display: block; font-size: 0.82rem; color: #15803d; }
      span { font-size: 0.64rem; color: #64748b; }
    }
    .set-status-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; &--ok { background: #22c55e; box-shadow: 0 0 0 3px #dcfce7; } }

    .set-facts {
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.45rem 0.75rem; margin: 0;
      dt { font-size: 0.56rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; }
      dd { margin: 0.06rem 0 0; font-size: 0.74rem; font-weight: 500; word-break: break-word; }
      &--compact { margin-top: 0.55rem; }
    }

    .set-spark-wrap {
      svg { width: 100%; height: 36px; display: block; }
      &--tall svg { height: 48px; }
    }
    .set-spark-meta { display: flex; justify-content: space-between; margin-top: 0.35rem; font-size: 0.62rem; color: #94a3b8; }

    .set-int-summary { display: flex; flex-wrap: wrap; gap: 0.45rem; margin-bottom: 0.65rem; }
    .set-mini-stat {
      padding: 0.45rem 0.75rem; border-radius: 9px;
      border: 1px solid ${ADMIN_SETTINGS_ACCENT_BORDER}; background: ${ADMIN_SETTINGS_ACCENT_LIGHT};
      strong { display: block; font-size: 0.88rem; font-weight: 800; color: ${ADMIN_SETTINGS_ACCENT}; }
      span { font-size: 0.56rem; color: #94a3b8; text-transform: uppercase; }
      &--lg { flex: 1; text-align: center; padding: 0.65rem; }
    }

    .set-int-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); gap: 0.55rem; }
    .set-int-card {
      padding: 0.75rem 0.85rem; border-radius: 11px;
      border: 1px solid #e2e8f0; background: #fff;
      display: flex; flex-direction: column; gap: 0.45rem;
      header { display: flex; align-items: flex-start; gap: 0.55rem; }
      p { margin: 0; font-size: 0.66rem; color: #64748b; line-height: 1.55; flex: 1; }
      footer { display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem; padding-top: 0.35rem; border-top: 1px solid #f1f5f9; }
      &--off { opacity: 0.72; background: #fafbfc; }
    }
    .set-int-card__icon {
      display: flex; align-items: center; justify-content: center;
      width: 2.2rem; height: 2.2rem; border-radius: 10px; flex-shrink: 0;
      background: color-mix(in srgb, var(--int-accent) 12%, #fff);
      border: 1px solid color-mix(in srgb, var(--int-accent) 25%, #e2e8f0);
      color: var(--int-accent);
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
    }
    .set-int-card__head-text { flex: 1; min-width: 0; strong { display: block; font-size: 0.78rem; } }
    .set-int-card__cat { font-size: 0.58rem; color: #94a3b8; text-transform: uppercase; font-weight: 650; }
    .set-int-status {
      display: inline-flex; align-items: center; gap: 0.28rem;
      font-size: 0.6rem; font-weight: 700; text-transform: uppercase;
      i { width: 6px; height: 6px; border-radius: 50%; background: #94a3b8; }
      &[data-status='connected'] { color: #15803d; i { background: #22c55e; } }
      &[data-status='disconnected'] { color: #64748b; }
      &[data-status='error'] { color: #dc2626; i { background: #ef4444; } }
      &[data-status='pending'] { color: #d97706; i { background: #f59e0b; } }
    }
    .set-int-meta { font-size: 0.58rem; color: #94a3b8; margin-left: auto; }
    .set-int-config {
      display: inline-flex; align-items: center; gap: 0.2rem;
      padding: 0.22rem 0.45rem; border-radius: 7px;
      border: 1px solid ${ADMIN_SETTINGS_ACCENT_BORDER}; background: #fff;
      font: inherit; font-size: 0.6rem; font-weight: 600; color: ${ADMIN_SETTINGS_ACCENT}; cursor: pointer;
      mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; }
      &:hover { background: ${ADMIN_SETTINGS_ACCENT_LIGHT}; }
    }

    .set-int-pro {
      display: flex; gap: 0.55rem; align-items: flex-start;
      padding: 0.65rem 0.85rem; margin-bottom: 0.65rem; border-radius: 10px;
      border: 1px solid ${ADMIN_SETTINGS_ACCENT_BORDER}; background: ${ADMIN_SETTINGS_ACCENT_LIGHT};
      mat-icon { color: ${ADMIN_SETTINGS_ACCENT}; font-size: 1.1rem; width: 1.1rem; height: 1.1rem; flex-shrink: 0; }
      strong { display: block; font-size: 0.76rem; color: #0f172a; }
      p { margin: 0.15rem 0 0; font-size: 0.64rem; color: #64748b; line-height: 1.5; }
      &[data-live='true'] { border-color: #bbf7d0; background: #f0fdf4; mat-icon { color: #15803d; } strong { color: #15803d; } }
    }

    .set-int-sources { margin-bottom: 0.65rem; }
    .set-int-sources__hint { margin: -0.35rem 0 0.55rem; font-size: 0.64rem; color: #64748b; line-height: 1.5; }
    .set-int-sources__grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr)); gap: 0.45rem;
    }
    .set-int-source {
      padding: 0.55rem 0.65rem; border-radius: 9px; border: 1px solid #e2e8f0; background: #fafbfc;
      header { display: flex; flex-direction: column; gap: 0.12rem; margin-bottom: 0.35rem; strong { font-size: 0.72rem; color: #0f172a; } code { font-size: 0.55rem; color: #94a3b8; } }
      ul { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.22rem; }
      li code { font-size: 0.55rem; padding: 0.06rem 0.28rem; border-radius: 4px; background: #fff; border: 1px solid #e2e8f0; color: ${ADMIN_SETTINGS_ACCENT}; }
    }

    .set-deliveries { margin-top: 0.65rem; }
    .set-deliveries__hint { margin: -0.35rem 0 0.55rem; font-size: 0.64rem; color: #64748b; }
    .set-deliveries__table-wrap { overflow-x: auto; }
    .set-deliveries__table-wrap code { font-size: 0.62rem; }
    .set-delivery-status {
      font-size: 0.6rem; font-weight: 700; text-transform: uppercase;
      padding: 0.08rem 0.35rem; border-radius: 999px;
      &[data-status='sent'] { background: #dcfce7; color: #15803d; }
      &[data-status='simulated'] { background: #fef3c7; color: #b45309; }
      &[data-status='failed'] { background: #fef2f2; color: #dc2626; }
    }

    .set-notif-row {
      display: flex; align-items: flex-start; gap: 0.65rem;
      padding: 0.65rem 0; border-bottom: 1px solid #e2e8f0;
      &:last-child { border-bottom: none; }
    }
    .set-notif-row__icon {
      display: flex; align-items: center; justify-content: center;
      width: 2rem; height: 2rem; border-radius: 9px; flex-shrink: 0;
      background: ${ADMIN_SETTINGS_ACCENT_LIGHT}; color: ${ADMIN_SETTINGS_ACCENT};
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    }
    .set-notif-row__body { flex: 1; min-width: 0; }
    .set-notif-row__top { display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem; strong { font-size: 0.76rem; } code { font-size: 0.6rem; padding: 0.08rem 0.35rem; border-radius: 5px; background: #f1f5f9; } }
    .set-notif-row__body p { margin: 0.15rem 0 0; font-size: 0.64rem; color: #64748b; line-height: 1.45; }
    .set-notif-metrics { display: flex; gap: 0.65rem; margin-top: 0.28rem; font-size: 0.6rem; color: #94a3b8; }
    .set-notif-rate { font-weight: 700; &[data-ok='true'] { color: #15803d; } &[data-ok='false'] { color: #d97706; } }

    .set-sec-hero {
      display: flex; flex-wrap: wrap; gap: 1rem; align-items: center;
      padding: 0.85rem 1rem; border-radius: 11px;
      border: 1px solid ${ADMIN_SETTINGS_ACCENT_BORDER};
      background: linear-gradient(135deg, ${ADMIN_SETTINGS_ACCENT_LIGHT}, #fff);
      margin-bottom: 0.65rem;
    }
    .set-sec-score { position: relative; width: 80px; height: 80px; flex-shrink: 0; svg { width: 100%; height: 100%; } }
    .set-sec-score__center {
      position: absolute; inset: 0; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      strong { font-size: 1.1rem; font-weight: 800; color: ${ADMIN_SETTINGS_ACCENT}; line-height: 1; }
      span { font-size: 0.5rem; color: #94a3b8; }
    }
    .set-sec-hero__text h3 { margin: 0 0 0.25rem; font-size: 0.85rem; font-weight: 700; }
    .set-sec-hero__text p { margin: 0 0 0.45rem; font-size: 0.68rem; color: #64748b; line-height: 1.55; max-width: 28rem; }
    .set-sec-tags { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.35rem; li { display: inline-flex; align-items: center; gap: 0.22rem; font-size: 0.62rem; font-weight: 600; padding: 0.12rem 0.42rem; border-radius: 999px; background: #fff; border: 1px solid #e2e8f0; color: #475569; mat-icon { font-size: 0.78rem; width: 0.78rem; height: 0.78rem; color: ${ADMIN_SETTINGS_ACCENT}; } } }

    .set-sec-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr)); gap: 0.55rem; }
    .set-sec-card {
      padding: 0.75rem 0.85rem; border-radius: 11px; border: 1px solid #e2e8f0; background: #fff;
      header { display: flex; align-items: flex-start; gap: 0.45rem; margin-bottom: 0.35rem; strong { display: block; font-size: 0.74rem; } em { display: block; font-style: normal; font-size: 0.58rem; color: #94a3b8; margin-top: 0.08rem; } }
      p { margin: 0 0 0.35rem; font-size: 0.64rem; color: #64748b; line-height: 1.5; }
      &--off { opacity: 0.75; background: #fafbfc; }
    }
    .set-sec-card__icon {
      display: flex; align-items: center; justify-content: center;
      width: 2rem; height: 2rem; border-radius: 9px; flex-shrink: 0;
      background: ${ADMIN_SETTINGS_ACCENT_LIGHT}; color: ${ADMIN_SETTINGS_ACCENT};
      &[data-sev='critical'] { background: #fef2f2; color: #dc2626; }
      &[data-sev='high'] { background: #fef3c7; color: #b45309; }
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    }
    .set-sev {
      font-size: 0.56rem; font-weight: 700; text-transform: uppercase;
      padding: 0.08rem 0.35rem; border-radius: 999px;
      &[data-sev='critical'] { background: #fef2f2; color: #dc2626; }
      &[data-sev='high'] { background: #fef3c7; color: #b45309; }
      &[data-sev='medium'] { background: #f1f5f9; color: #64748b; }
    }

    .set-theme-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.55rem; margin-bottom: 0.65rem; }
    .set-theme-opt {
      display: flex; flex-direction: column; gap: 0.55rem;
      padding: 0.65rem; border-radius: 11px;
      border: 2px solid #e2e8f0; background: #fff; cursor: pointer;
      text-align: left; font: inherit; transition: border-color 0.15s, box-shadow 0.15s;
      &:hover { border-color: ${ADMIN_SETTINGS_ACCENT_BORDER}; }
    }
    .set-theme-opt--on { border-color: ${ADMIN_SETTINGS_ACCENT}; box-shadow: 0 2px 12px rgb(71 85 105 / 0.12); }
    .set-theme-preview {
      height: 64px; border-radius: 8px; overflow: hidden; position: relative;
      border: 1px solid #e2e8f0;
      &[data-theme='light'] { background: #f8fafc; .set-theme-preview__bar { background: #fff; border-bottom: 1px solid #e2e8f0; } .set-theme-preview__sidebar { background: #f1f5f9; } .set-theme-preview__content { background: #fff; } }
      &[data-theme='dark'] { background: #0f172a; .set-theme-preview__bar { background: #1e293b; } .set-theme-preview__sidebar { background: #334155; } .set-theme-preview__content { background: #1e293b; } }
      &[data-theme='system'] { background: linear-gradient(90deg, #f8fafc 50%, #0f172a 50%); .set-theme-preview__bar { background: linear-gradient(90deg, #fff 50%, #1e293b 50%); } .set-theme-preview__sidebar { background: linear-gradient(90deg, #f1f5f9 50%, #334155 50%); } .set-theme-preview__content { background: linear-gradient(90deg, #fff 50%, #1e293b 50%); } }
    }
    .set-theme-preview__bar { position: absolute; top: 0; left: 0; right: 0; height: 12px; }
    .set-theme-preview__sidebar { position: absolute; top: 12px; left: 0; width: 28%; bottom: 0; }
    .set-theme-preview__content { position: absolute; top: 20px; left: 32%; right: 8%; bottom: 8px; border-radius: 4px; opacity: 0.9; }
    .set-theme-opt__text {
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: ${ADMIN_SETTINGS_ACCENT}; margin-bottom: 0.15rem; }
      strong { display: block; font-size: 0.74rem; }
      em { display: block; font-style: normal; font-size: 0.6rem; color: #94a3b8; line-height: 1.4; margin-top: 0.1rem; }
    }

    .set-toggle-card {
      display: flex; justify-content: space-between; align-items: center; gap: 1rem;
      padding: 0.65rem 0; border-bottom: 1px solid #e2e8f0;
      &:last-child { border-bottom: none; }
      strong { display: block; font-size: 0.76rem; }
      p { margin: 0.15rem 0 0; font-size: 0.64rem; color: #64748b; line-height: 1.45; max-width: 32rem; }
    }

    .set-account-layout { display: flex; flex-direction: column; gap: 0.65rem; }
    .set-account-profile {
      display: flex; align-items: center; gap: 0.85rem;
      padding: 0.85rem 1rem; border-radius: 11px;
      border: 1px solid ${ADMIN_SETTINGS_ACCENT_BORDER};
      background: linear-gradient(135deg, ${ADMIN_SETTINGS_ACCENT_LIGHT}, #fff);
    }
    .set-account-avatar {
      display: flex; align-items: center; justify-content: center;
      width: 3.2rem; height: 3.2rem; border-radius: 12px;
      background: ${ADMIN_SETTINGS_ACCENT}; color: #fff;
      font-size: 1.1rem; font-weight: 800; flex-shrink: 0;
    }
    .set-account-profile h3 { margin: 0; font-size: 0.95rem; font-weight: 700; }
    .set-account-profile p { margin: 0.15rem 0 0.35rem; font-size: 0.72rem; color: #64748b; }
    .set-account-badges { display: flex; flex-wrap: wrap; gap: 0.28rem; }
    .set-role-chip { font-size: 0.6rem; font-weight: 700; padding: 0.1rem 0.4rem; border-radius: 999px; background: ${ADMIN_SETTINGS_ACCENT_LIGHT}; color: ${ADMIN_SETTINGS_ACCENT}; border: 1px solid ${ADMIN_SETTINGS_ACCENT_BORDER}; }
    .set-mfa-chip { display: inline-flex; align-items: center; gap: 0.18rem; font-size: 0.6rem; font-weight: 700; padding: 0.1rem 0.4rem; border-radius: 999px; background: #dcfce7; color: #15803d; mat-icon { font-size: 0.75rem; width: 0.75rem; height: 0.75rem; } }

    .set-account-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 0.45rem; margin-bottom: 0.65rem; }
    .set-account-actions { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
    .set-action-link {
      display: flex; align-items: flex-start; gap: 0.45rem; width: 100%;
      padding: 0.55rem 0.65rem; border-radius: 10px;
      border: 1px solid #e2e8f0; background: #fff; cursor: pointer;
      text-align: left; font: inherit; transition: border-color 0.15s;
      &:hover { border-color: ${ADMIN_SETTINGS_ACCENT_BORDER}; }
      mat-icon { color: ${ADMIN_SETTINGS_ACCENT}; font-size: 1.05rem; width: 1.05rem; height: 1.05rem; margin-top: 0.05rem; }
      strong { display: block; font-size: 0.74rem; }
      span { display: block; font-size: 0.6rem; color: #94a3b8; margin-top: 0.08rem; }
      &--danger { border-color: #fecaca; mat-icon { color: #dc2626; } strong { color: #991b1b; } &:hover { border-color: #f87171; } }
    }

    .mono { font-family: ui-monospace, monospace; font-size: 0.68rem; }

    @media (max-width: 720px) {
      .set-intro__stats { grid-template-columns: repeat(2, 1fr); }
      .set-grid--2, .set-form-grid { grid-template-columns: 1fr; }
      .set-theme-grid { grid-template-columns: 1fr; }
      .set-tabs__tab { flex: 1 1 calc(50% - 0.2rem); justify-content: center; }
    }
  `,
})
export class AdminSettingsPageComponent implements OnInit {
  readonly auth = inject(AuthService)
  readonly theme = inject(ThemeService)
  readonly toast = inject(ToastService)
  private readonly actions = inject(PlatformActionService)
  private readonly dialog = inject(MatDialog)
  private readonly integrationsApi = inject(IntegrationsService)

  readonly apiUrl = environment.apiUrl
  readonly general = SETTINGS_GENERAL
  readonly accountMeta = SETTINGS_ACCOUNT_META
  readonly securityScore = SETTINGS_SECURITY_SCORE
  readonly themeOptions = SETTINGS_THEME_OPTIONS
  readonly tabs = SETTINGS_TABS
  readonly timezones = ['Europe/Madrid', 'Europe/London', 'America/New_York', 'America/Sao_Paulo', 'UTC']

  readonly orgName = signal('CloudOps Demo Org')
  readonly timezone = signal(SETTINGS_GENERAL.timezone)
  readonly locale = signal(SETTINGS_GENERAL.locale)
  readonly syncInterval = signal(SETTINGS_GENERAL.syncIntervalMin)
  readonly reducedMotion = signal(false)
  readonly compactMode = signal(false)
  readonly highContrast = signal(false)
  readonly selectedTheme = signal<'light' | 'dark' | 'system'>('light')
  readonly view = signal<SettingsTabId>('general')

  readonly integrations = signal<SettingsIntegration[]>([...SETTINGS_INTEGRATIONS])
  readonly integrationsStatus = signal<IntegrationsStatusDto | null>(null)
  readonly integrationDeliveries = signal<IntegrationDeliveryDto[]>([])
  readonly platformSources = signal<IntegrationPlatformSourceDto[]>(
    SETTINGS_PLATFORM_SOURCES.map((s) => ({ ...s, events: [...s.events] })),
  )
  readonly notificationChannels = signal([...SETTINGS_NOTIFICATION_CHANNELS])
  readonly securityPolicies = signal([...SETTINGS_SECURITY_POLICIES])

  readonly headerActions: PageHeaderAction[] = [
    { label: 'Guardar cambios', icon: 'save', primary: true },
    { label: 'Exportar config', icon: 'download' },
  ]

  readonly currentTab = computed(() => this.tabs.find((t) => t.id === this.view()) ?? this.tabs[0])
  readonly activeIntegrations = computed(() => this.integrations().filter((i) => i.enabled).length)
  readonly connectedIntegrations = computed(() => this.integrations().filter((i) => i.status === 'connected').length)
  readonly totalEvents24h = computed(() => this.integrations().reduce((s, i) => s + (i.enabled ? i.events24h : 0), 0))
  readonly activeNotifChannels = computed(() => this.notificationChannels().filter((c) => c.enabled).length)
  readonly enabledPolicies = computed(() => this.securityPolicies().filter((p) => p.enabled).length)
  readonly syncSpark = computed(() => sparkPath(SETTINGS_SYNC_HISTORY))
  readonly notifSpark = computed(() => sparkPath(SETTINGS_NOTIF_HISTORY, 140, 48))
  readonly syncAvg = computed(() => Math.round(SETTINGS_SYNC_HISTORY.reduce((a, b) => a + b, 0) / SETTINGS_SYNC_HISTORY.length))
  readonly notifToday = computed(() => SETTINGS_NOTIF_HISTORY[SETTINGS_NOTIF_HISTORY.length - 1])

  relativeTime = adminRelativeTime
  statusLabel = integrationStatusLabel

  deliveryStatusLabel = (status: string): string => {
    switch (status) {
      case 'sent': return 'Enviado'
      case 'simulated': return 'Simulado'
      case 'failed': return 'Fallido'
      default: return status
    }
  }

  ngOnInit(): void {
    this.loadIntegrationsFromApi()
  }

  private loadIntegrationsFromApi = (): void => {
    this.integrationsApi.getStatus().subscribe((s) => {
      if (s) this.integrationsStatus.set(s)
    })
    this.integrationsApi.listSources().subscribe((sources) => {
      if (sources.length) this.platformSources.set(sources)
    })
    this.integrationsApi.list().subscribe((rows) => {
      if (!rows.length) return
      this.integrations.set(rows.map((r) => this.mapIntegrationRow(r)))
    })
    this.refreshDeliveries()
  }

  private mapIntegrationRow = (row: IntegrationConfigDto): SettingsIntegration => {
    const demo = SETTINGS_INTEGRATIONS.find((d) => d.id === row.id)
    if (!demo) {
      return {
        id: row.id,
        label: row.label,
        desc: '',
        category: row.category as SettingsIntegration['category'],
        icon: 'hub',
        enabled: row.enabled,
        status: row.status as SettingsIntegration['status'],
        lastSync: row.lastSync ?? new Date().toISOString(),
        events24h: 0,
        accent: ADMIN_SETTINGS_ACCENT,
      }
    }
    return mergeIntegrationFromApi(row, demo)
  }

  private applyIntegrationRow = (row: IntegrationConfigDto): void => {
    this.integrations.update((list) =>
      list.map((i) => (i.id === row.id ? this.mapIntegrationRow(row) : i)),
    )
  }

  refreshDeliveries = (): void => {
    this.integrationsApi.deliveries(20).subscribe((d) => this.integrationDeliveries.set(d))
  }

  accountInitials = (): string => {
    const name = this.auth.user()?.name ?? 'Demo User'
    return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  }

  handleHeader = (label: string): void => {
    if (label === 'Exportar config') {
      const config = {
        org: this.orgName(),
        timezone: this.timezone(),
        locale: this.locale(),
        syncInterval: this.syncInterval(),
        integrations: this.integrations(),
        notifications: this.notificationChannels(),
        security: this.securityPolicies(),
        theme: this.selectedTheme(),
        reducedMotion: this.reducedMotion(),
      }
      downloadBlob(JSON.stringify(config, null, 2), `cloudops-config-${Date.now()}.json`, 'application/json')
      this.toast.success('Configuración exportada (JSON)')
      return
    }
    this.saveSection('Todos los cambios')
  }

  handleThemeSelect = (id: 'light' | 'dark' | 'system'): void => {
    this.selectedTheme.set(id)
    if (id === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      this.theme.setTheme(prefersDark ? 'dark' : 'light')
      this.toast.success('Tema: seguir sistema')
      return
    }
    this.theme.setTheme(id)
    this.toast.success(id === 'dark' ? 'Modo oscuro activado' : 'Modo claro activado')
  }

  handleReducedMotion = (enabled: boolean): void => {
    this.reducedMotion.set(enabled)
    this.toast.info(`Animaciones ${enabled ? 'reducidas' : 'habilitadas'}`)
  }

  handleIntegration = (id: string, enabled: boolean): void => {
    const prev = this.integrations()
    this.integrations.update((list) =>
      list.map((i) => (i.id === id ? { ...i, enabled, status: enabled ? (i.status === 'disconnected' ? 'pending' : i.status) : 'disconnected' } : i)),
    )
    const item = prev.find((i) => i.id === id)
    this.integrationsApi.update(id, { enabled }).subscribe((row) => {
      if (!row) {
        this.integrations.set(prev)
        this.toast.error(`No se pudo ${enabled ? 'activar' : 'desactivar'} ${item?.label ?? id}`)
        return
      }
      this.applyIntegrationRow(row)
      const mode = this.integrationsStatus()?.liveMode ? 'PRO' : 'simulación'
      this.toast.success(`${row.label} ${enabled ? 'activada' : 'desactivada'} (${mode})`)
      this.refreshDeliveries()
    })
  }

  configureIntegration = (int: SettingsIntegration): void => {
    const ref = this.dialog.open(AdminSettingsIntegrationDialogComponent, {
      width: 'min(780px, 94vw)',
      maxWidth: '94vw',
      maxHeight: '92vh',
      panelClass: 'admin-settings-integration-dialog-panel',
      data: { integration: int, liveMode: this.integrationsStatus()?.liveMode ?? false },
    })
    ref.afterClosed().subscribe((result) => {
      if (!result?.row) {
        if (result?.refresh) this.refreshDeliveries()
        return
      }
      this.applyIntegrationRow(result.row)
      this.refreshDeliveries()
    })
  }

  handleNotification = (id: string, enabled: boolean): void => {
    this.notificationChannels.update((list) =>
      list.map((c) => (c.id === id ? { ...c, enabled } : c)),
    )
    this.toast.info(`Notificación ${id}: ${enabled ? 'activada' : 'desactivada'}`)
  }

  handleSecurity = (id: string, enabled: boolean): void => {
    this.securityPolicies.update((list) =>
      list.map((p) => (p.id === id ? { ...p, enabled } : p)),
    )
    this.toast.info(`Política ${id}: ${enabled ? 'activada' : 'desactivada'}`)
  }

  handleChangePassword = (): void => {
    this.actions.runPageAction('settings', 'password', 'Cambiar contraseña', { area: 'admin' })
    this.toast.info('Flujo de cambio de contraseña (demo)')
  }

  saveSection = (section: string): void => {
    this.actions.runPageAction('settings', 'save', `Guardar: ${section}`, { area: 'admin' })
    this.toast.success(`${section} guardado correctamente`)
  }
}
