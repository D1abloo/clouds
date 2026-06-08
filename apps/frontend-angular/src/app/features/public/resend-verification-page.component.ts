import { Component, inject } from '@angular/core'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { PublicApiService } from './public-api.service'
import { PUBLIC_THEME } from './public-theme'

@Component({
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  selector: 'app-resend-verification-page',
  template: `
    <div class="pub pub-verify"><div class="pub-wrap pub-verify__card">
      <h1>Reenviar correo de verificación</h1>
      @if (done) { <p role="status">{{ done }}</p> }
      @else {
        <form [formGroup]="form" (ngSubmit)="submit()">
          <label>Email<input type="email" formControlName="email" /></label>
          @if (error) { <p class="err">{{ error }}</p> }
          <button type="submit" class="pub-btn pub-btn--primary" [disabled]="form.invalid || loading">Reenviar</button>
        </form>
      }
      <a routerLink="/login" class="pub-btn pub-btn--outline" style="margin-top:1rem">Iniciar sesión</a>
    </div></div>
  `,
  styles: [PUBLIC_THEME, `.pub-verify { min-height: 80dvh; display: grid; place-items: center; } .pub-verify__card { max-width: 420px; padding: 2rem; } .err { color: #dc2626; } form { display: flex; flex-direction: column; gap: .75rem; }`],
})
export class ResendVerificationPageComponent {
  private readonly fb = inject(FormBuilder)
  private readonly api = inject(PublicApiService)
  form = this.fb.group({ email: ['', [Validators.required, Validators.email]] })
  loading = false
  error = ''
  done = ''
  submit = (): void => {
    if (this.form.invalid) return
    this.loading = true
    this.api.resendVerification(this.form.value.email!).subscribe({
      next: (r) => { this.done = r.message; this.loading = false },
      error: (e) => { this.error = e.error?.message ?? 'Error al reenviar'; this.loading = false },
    })
  }
}
