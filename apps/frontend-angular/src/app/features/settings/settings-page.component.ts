import { Component, inject, OnInit } from '@angular/core'
import { MatTabsModule } from '@angular/material/tabs'
import { MatCardModule } from '@angular/material/card'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { AuthService } from '../../core/services/auth.service'
import { ThemeService } from '../../core/services/theme.service'
import { DemoService } from '../../core/services/demo.service'
import { PlatformActionService } from '../../shared/platform/platform-action.service'
import { ProModeService } from '../../core/services/pro-mode.service'
import { environment } from '../../../environments/environment'

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    MatTabsModule,
    MatCardModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page-container">
      <app-page-header
        title="Configuración"
        description="Preferencias generales, usuarios e integraciones"
        icon="settings"
        [actions]="[
          { label: 'Guardar cambios', icon: 'save', primary: true },
          { label: 'Exportar config', icon: 'download' },
        ]"
        (actionClick)="handleHeader($event)"
      />

      <div class="table-card">
      <mat-tab-group class="soft-tabs" animationDuration="280ms">
        <mat-tab label="General">
          <div class="tab-panel">
            <div class="settings-panel surface-elevated">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>URL del backend</mat-label>
                  <input matInput [value]="apiUrl" readonly />
                </mat-form-field>
                <p>Frecuencia de sincronización: cada 15 minutos</p>
            </div>
          </div>
        </mat-tab>
        <mat-tab label="Usuarios">
          <div class="tab-panel">
            @if (pro.proMode() && !pro.demoMode()) {
              <p>Gestiona usuarios y roles desde Administración → Usuarios.</p>
            } @else {
              <p>Usuarios de prueba: roles superadministrador y administrador (ver pestaña Modo demo para credenciales).</p>
            }
            <button mat-stroked-button type="button" (click)="simulateAction('Crear usuario')">Crear usuario</button>
          </div>
        </mat-tab>
        <mat-tab label="Roles"><div class="tab-panel"><p>superadministrador, administrador, operador, auditor, solo_lectura</p></div></mat-tab>
        <mat-tab label="Permisos"><div class="tab-panel"><p>Matriz RBAC — cloud.*, vps.*, terraform.apply</p></div></mat-tab>
        <mat-tab label="Secretos"><div class="tab-panel"><button mat-stroked-button (click)="simulateAction('Configurar secretos')">Configurar secretos</button></div></mat-tab>
        <mat-tab label="Integraciones"><div class="tab-panel"><button mat-stroked-button (click)="simulateAction('Configurar webhooks')">Configurar webhooks</button></div></mat-tab>
        @if (pro.demoMode()) {
        <mat-tab label="Modo demo">
          <div class="tab-panel">
            <div class="settings-panel surface-elevated">
                <h3 class="panel-title">Modo demo</h3>
                <p>Datos cloud simulados — sin recursos reales AWS/GCP/Azure.</p>
                <p><strong>Estado:</strong> {{ demo.demoMode() ? 'Activo' : 'Desactivado en servidor' }}</p>
                <p><strong>Usuario:</strong> {{ demoUserLabel }}</p>
                @if (!demo.canManageDemo()) {
                  <p class="hint">Inicia sesión como admin para cargar o resetear datos demo.</p>
                }
                @if (demo.status(); as s) {
                  <p class="demo-stats">{{ s.instances }} instancias · {{ s.vps }} VPS · {{ s.metrics }} métricas</p>
                }
                <div class="demo-actions">
                  @if (demo.loading()) {
                    <mat-spinner diameter="24" />
                  } @else {
                    <button mat-flat-button color="primary" type="button" [disabled]="!demo.canManageDemo()" (click)="handleDemoLoad()">Cargar datos demo</button>
                    <button mat-stroked-button color="warn" type="button" [disabled]="!demo.canManageDemo()" (click)="handleDemoReset()">Reiniciar demo</button>
                  }
                </div>
            </div>
          </div>
        </mat-tab>
        }
        <mat-tab label="Tema">
          <div class="tab-panel">
            <mat-slide-toggle [checked]="theme.mode() === 'dark'" (change)="handleThemeChange($event.checked)" aria-label="Modo oscuro">
              Modo oscuro
            </mat-slide-toggle>
          </div>
        </mat-tab>
        <mat-tab label="Notificaciones">
          <div class="tab-panel">
            <mat-slide-toggle checked disabled>In-app</mat-slide-toggle>
            <mat-slide-toggle checked (change)="simulateAction('Notificaciones email')">Email</mat-slide-toggle>
          </div>
        </mat-tab>
        <mat-tab label="Cuenta">
          <div class="tab-panel">
            <p><strong>Email:</strong> {{ auth.user()?.email }}</p>
            <p><strong>Nombre:</strong> {{ auth.user()?.name ?? '—' }}</p>
            <p><strong>Roles:</strong> {{ auth.user()?.roles?.join(', ') ?? '—' }}</p>
            <button mat-stroked-button color="warn" type="button" class="logout-btn" (click)="auth.logout()">Cerrar sesión</button>
          </div>
        </mat-tab>
      </mat-tab-group>
      </div>
    </div>
  `,
  styles: `
    .full-width { width: 100%; max-width: 480px; }
    .settings-panel { padding: 1.25rem 1.5rem; border-radius: var(--app-radius-lg); margin-bottom: 0.5rem; }
    .panel-title { margin: 0 0 0.75rem; font-size: 1.05rem; font-weight: 600; }
    .logout-btn { margin-top: 1rem; }
    .demo-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.75rem; align-items: center; }
    .demo-stats { font-size: 0.85rem; color: var(--app-text-muted); }
    .hint { font-size: 0.85rem; color: #b45309; }
    p { margin: 0.5rem 0; }
  `,
})
export class SettingsPageComponent implements OnInit {
  readonly auth = inject(AuthService)
  readonly theme = inject(ThemeService)
  readonly demo = inject(DemoService)
  readonly pro = inject(ProModeService)
  private readonly actions = inject(PlatformActionService)
  readonly apiUrl = environment.apiUrl
  readonly demoUserLabel = 'demo@cloudops.local / Demo1234!'

  ngOnInit(): void {
    this.pro.loadStatus()
    if (this.pro.demoMode()) {
      this.demo.refreshStatus()
    }
  }

  handleThemeChange = (dark: boolean): void => {
    this.theme.setTheme(dark ? 'dark' : 'light')
  }

  handleHeader = (label: string): void => {
    const actionId = label === 'Guardar cambios' ? 'save' : 'export'
    this.actions.runPageAction('settings', actionId, label, { area: 'admin' })
  }

  simulateAction = (label: string): void => {
    this.actions.runPageAction('settings', 'save', label, { area: 'admin' })
  }

  handleDemoLoad = (): void => {
    this.demo.loadDemo()
    this.actions.runPageAction('settings', 'demo-load', 'Datos demo cargados', { area: 'admin' })
  }

  handleDemoReset = (): void => {
    this.demo.resetDemo()
    this.actions.runPageAction('settings', 'demo-reset', 'Demo reiniciado', { area: 'admin' })
  }
}
