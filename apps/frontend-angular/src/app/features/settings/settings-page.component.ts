import { Component, inject, OnInit } from '@angular/core'
import { MatCardModule } from '@angular/material/card'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { AuthService } from '../../core/services/auth.service'
import { ThemeService } from '../../core/services/theme.service'
import { DemoService } from '../../core/services/demo.service'
import { environment } from '../../../environments/environment'

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [
    MatCardModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page-container">
      <header class="page-header">
        <h1>Settings</h1>
        <p>Application preferences and account</p>
      </header>

      <div class="settings-grid">
        <mat-card>
          <mat-card-header>
            <mat-card-title>Appearance</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-slide-toggle
              [checked]="theme.mode() === 'dark'"
              (change)="handleThemeChange($event.checked)"
              aria-label="Dark mode"
            >
              Dark mode
            </mat-slide-toggle>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-card-title>API</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Backend URL</mat-label>
              <input matInput [value]="apiUrl" readonly />
            </mat-form-field>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-card-title>Demo Mode</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>Simulated cloud data — no real AWS/GCP/Azure resources.</p>
            <p><strong>User:</strong> {{ demoUserLabel }}</p>
            @if (demo.status(); as s) {
              <p class="demo-stats">{{ s.instances }} instances · {{ s.vps }} VPS · {{ s.metrics }} metrics</p>
            }
            <div class="demo-actions">
              @if (demo.loading()) {
                <mat-spinner diameter="24" />
              } @else {
                <button mat-flat-button color="primary" type="button" (click)="demo.loadDemo()">
                  Cargar datos demo
                </button>
                <button mat-stroked-button color="warn" type="button" (click)="demo.resetDemo()">
                  Reset demo
                </button>
              }
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-card-title>Account</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p><strong>Email:</strong> {{ auth.user()?.email }}</p>
            <p><strong>Name:</strong> {{ auth.user()?.name ?? '—' }}</p>
            <p><strong>Roles:</strong> {{ auth.user()?.roles?.join(', ') ?? '—' }}</p>
            <button
              mat-stroked-button
              color="warn"
              type="button"
              class="logout-btn"
              (click)="auth.logout()"
            >
              Sign out
            </button>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: `
    .settings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
    }
    .full-width { width: 100%; }
    .logout-btn { margin-top: 1rem; }
    .demo-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.75rem; align-items: center; }
    .demo-stats { font-size: 0.85rem; color: var(--app-text-muted); }
    p { margin: 0.5rem 0; }
  `,
})
export class SettingsPageComponent implements OnInit {
  readonly auth = inject(AuthService)
  readonly theme = inject(ThemeService)
  readonly demo = inject(DemoService)
  readonly apiUrl = environment.apiUrl
  readonly demoUserLabel = 'demo@cloudops.local / Demo1234!'

  ngOnInit = (): void => this.demo.refreshStatus()

  handleThemeChange = (dark: boolean): void => {
    this.theme.setTheme(dark ? 'dark' : 'light')
  }
}
