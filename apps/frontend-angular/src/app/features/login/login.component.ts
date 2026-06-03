import { Component, inject } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router } from '@angular/router'
import { MatCardModule } from '@angular/material/card'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { AuthService } from '../../core/services/auth.service'
import { environment } from '../../../environments/environment'

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="login-page">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>CloudOps Control Center</mat-card-title>
          <mat-card-subtitle>Sign in to manage your infrastructure</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="demo-hint" role="note">
            <strong>Docker / Demo</strong>
            <p>Admin: <code>admin&#64;cloudops.local</code> / <code>Admin123!</code></p>
            <p>Demo: <code>demo&#64;cloudops.local</code> / <code>Demo1234!</code></p>
            <p class="url-hint">App: <code>http://localhost:8080</code> o <code>http://127.0.0.1:8080</code></p>
          </div>
          <form [formGroup]="form" (ngSubmit)="handleSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="username" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput type="password" formControlName="password" autocomplete="current-password" />
            </mat-form-field>
            @if (error) { <p class="error" role="alert">{{ error }}</p> }
            <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || loading" class="full-width">
              @if (loading) { <mat-spinner diameter="20" /> } @else { Sign In }
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-page { min-height: 100vh; display: grid; place-items: center; background: linear-gradient(135deg, #0f172a, #1e3a5f); }
    .login-card { width: 100%; max-width: 440px; padding: 8px; }
    .full-width { width: 100%; margin-bottom: 8px; }
    .error { color: #ef4444; font-size: 0.875rem; margin-bottom: 0.5rem; }
    .demo-hint {
      background: rgba(59, 130, 246, 0.12);
      border: 1px solid rgba(59, 130, 246, 0.35);
      border-radius: 8px;
      padding: 0.75rem;
      margin-bottom: 1rem;
      font-size: 0.8rem;
      p { margin: 0.25rem 0; }
      code { font-size: 0.75rem; }
      .url-hint { color: #94a3b8; margin-top: 0.35rem; }
    }
  `],
})
export class LoginComponent {
  private fb = inject(FormBuilder)
  private auth = inject(AuthService)
  private router = inject(Router)

  loading = false
  error = ''

  form = this.fb.group({
    email: ['admin@cloudops.local', [Validators.required, Validators.email]],
    password: ['Admin123!', [Validators.required, Validators.minLength(8)]],
  })

  handleSubmit = (): void => {
    if (this.form.invalid) return
    this.loading = true
    this.error = ''
    const { email, password } = this.form.getRawValue()
    this.auth.login(email!, password!).subscribe({
      next: () => {
        this.loading = false
        void this.router.navigateByUrl('/dashboard', { replaceUrl: true })
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false
        if (err.status === 0) {
          this.error = `Cannot reach API at ${environment.apiUrl}. Open http://localhost:8080 and ensure Docker is running.`
          return
        }
        const msg = err.error?.message
        this.error = typeof msg === 'string' ? msg : Array.isArray(msg) ? msg.join(', ') : 'Invalid credentials'
      },
    })
  }
}
