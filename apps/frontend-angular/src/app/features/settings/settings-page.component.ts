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
import { DemoActionsService } from '../../core/services/demo-actions.service'
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
      <app-page-header title="Settings" description="General preferences, users, integrations and demo mode" />

      <mat-tab-group>
        <mat-tab label="General">
          <div class="tab-panel">
            <mat-card>
              <mat-card-content>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Backend URL</mat-label>
                  <input matInput [value]="apiUrl" readonly />
                </mat-form-field>
                <p>Sync frequency: every 15 minutes (demo)</p>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>
        <mat-tab label="Users">
          <div class="tab-panel">
            <p>Demo users: super_admin and admin roles (see Demo Mode tab for credentials).</p>
            <button mat-stroked-button type="button" (click)="simulateAction('Create user')">Create user</button>
          </div>
        </mat-tab>
        <mat-tab label="Roles"><div class="tab-panel"><p>super_admin, admin, operator, viewer</p></div></mat-tab>
        <mat-tab label="Permissions"><div class="tab-panel"><p>RBAC matrix (demo) — cloud.*, vps.*, terraform.apply</p></div></mat-tab>
        <mat-tab label="Secrets"><div class="tab-panel"><button mat-stroked-button (click)="simulateAction('Configure secrets')">Configure secrets</button></div></mat-tab>
        <mat-tab label="Integrations"><div class="tab-panel"><button mat-stroked-button (click)="simulateAction('Configure webhooks')">Configure webhooks</button></div></mat-tab>
        <mat-tab label="Demo Mode">
          <div class="tab-panel">
            <mat-card>
              <mat-card-header><mat-card-title>Demo Mode</mat-card-title></mat-card-header>
              <mat-card-content>
                <p>Simulated cloud data — no real AWS/GCP/Azure resources.</p>
                <p><strong>Status:</strong> {{ demo.demoMode() ? 'Activo' : 'Desactivado en servidor' }}</p>
                <p><strong>User:</strong> {{ demoUserLabel }}</p>
                @if (!demo.canManageDemo()) {
                  <p class="hint">Inicia sesión como admin para cargar o resetear datos demo.</p>
                }
                @if (demo.status(); as s) {
                  <p class="demo-stats">{{ s.instances }} instances · {{ s.vps }} VPS · {{ s.metrics }} metrics</p>
                }
                <div class="demo-actions">
                  @if (demo.loading()) {
                    <mat-spinner diameter="24" />
                  } @else {
                    <button mat-flat-button color="primary" type="button" [disabled]="!demo.canManageDemo()" (click)="demo.loadDemo()">Cargar datos demo</button>
                    <button mat-stroked-button color="warn" type="button" [disabled]="!demo.canManageDemo()" (click)="demo.resetDemo()">Reset demo</button>
                  }
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>
        <mat-tab label="Theme">
          <div class="tab-panel">
            <mat-slide-toggle [checked]="theme.mode() === 'dark'" (change)="handleThemeChange($event.checked)" aria-label="Dark mode">
              Dark mode
            </mat-slide-toggle>
          </div>
        </mat-tab>
        <mat-tab label="Notifications">
          <div class="tab-panel">
            <mat-slide-toggle checked disabled>In-app</mat-slide-toggle>
            <mat-slide-toggle checked (change)="simulateAction('Email notifications')">Email</mat-slide-toggle>
          </div>
        </mat-tab>
        <mat-tab label="Account">
          <div class="tab-panel">
            <p><strong>Email:</strong> {{ auth.user()?.email }}</p>
            <p><strong>Name:</strong> {{ auth.user()?.name ?? '—' }}</p>
            <p><strong>Roles:</strong> {{ auth.user()?.roles?.join(', ') ?? '—' }}</p>
            <button mat-stroked-button color="warn" type="button" class="logout-btn" (click)="auth.logout()">Sign out</button>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: `
    .full-width { width: 100%; max-width: 480px; }
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
  readonly demoActions = inject(DemoActionsService)
  readonly apiUrl = environment.apiUrl
  readonly demoUserLabel = 'demo@cloudops.local / Demo1234!'

  ngOnInit(): void {
    this.demo.refreshStatus()
  }

  handleThemeChange = (dark: boolean): void => {
    this.theme.setTheme(dark ? 'dark' : 'light')
  }

  simulateAction = (label: string): void => {
    this.demoActions.simulate(label, 400).subscribe()
  }
}
