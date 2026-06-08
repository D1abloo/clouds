import { Component, inject } from '@angular/core'
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
import { PublicApiService } from './public-api.service'
import { PublicSeoService } from './public-seo.service'
import { PUBLIC_THEME } from './public-theme'

const passwordMatch = (group: AbstractControl): ValidationErrors | null => {
  const p = group.get('password')?.value
  const c = group.get('confirmPassword')?.value
  return p === c ? null : { passwordMismatch: true }
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-register-page',
  template: `
    <div class="pub pub-register">
      <div class="pub-wrap pub-register__card">
        <h1>Crea tu cuenta de Spendlyx</h1>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="row">
            <label>Nombre<input formControlName="firstName" autocomplete="given-name" /></label>
            <label>Apellidos<input formControlName="lastName" autocomplete="family-name" /></label>
          </div>
          <label>Empresa<input formControlName="company" autocomplete="organization" /></label>
          <label>Email profesional<input type="email" formControlName="email" autocomplete="email" /></label>
          <label>Contraseña<input type="password" formControlName="password" autocomplete="new-password" /></label>
          <label>Confirmar contraseña<input type="password" formControlName="confirmPassword" autocomplete="new-password" /></label>
          <label class="check"><input type="checkbox" formControlName="acceptTerms" /> Acepto los <a routerLink="/terminos" target="_blank">términos y condiciones</a></label>
          <label class="check"><input type="checkbox" formControlName="acceptPrivacy" /> Acepto la <a routerLink="/privacidad" target="_blank">política de privacidad</a></label>
          <label class="check"><input type="checkbox" formControlName="marketingConsent" /> Deseo recibir novedades de Spendlyx (opcional)</label>
          <input type="text" formControlName="website" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true" />
          @if (error) { <p class="err" role="alert">{{ error }}</p> }
          <button type="submit" class="pub-btn pub-btn--primary full" [disabled]="form.invalid || loading">{{ loading ? 'Creando…' : 'Crear cuenta' }}</button>
        </form>
        <p class="foot">¿Ya tienes cuenta? <a routerLink="/login">Iniciar sesión</a></p>
      </div>
    </div>
  `,
  styles: [PUBLIC_THEME, `
    .pub-register { min-height: 100dvh; display: grid; place-items: center; padding: 2rem 0; background: #f8fafc; }
    .pub-register__card { max-width: 480px; background: #fff; border-radius: 16px; padding: 2rem; box-shadow: 0 12px 40px rgba(15,23,42,.08); width: 100%; }
    .pub-register h1 { font-size: 1.35rem; margin: 0 0 1.25rem; }
    form { display: flex; flex-direction: column; gap: .75rem; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
    label { display: flex; flex-direction: column; gap: .25rem; font-size: .8rem; font-weight: 600; }
    label input { padding: .55rem .65rem; border: 1px solid #e2e8f0; border-radius: 8px; font: inherit; }
    .check { flex-direction: row; align-items: flex-start; font-weight: 400; font-size: .82rem; }
    .full { width: 100%; margin-top: .5rem; }
    .hp { position: absolute; left: -9999px; }
    .err { color: #dc2626; font-size: .85rem; margin: 0; }
    .foot { text-align: center; margin-top: 1rem; font-size: .85rem; color: #64748b; }
  `],
})
export class RegisterPageComponent {
  private readonly fb = inject(FormBuilder)
  private readonly api = inject(PublicApiService)
  private readonly router = inject(Router)
  private readonly seo = inject(PublicSeoService)
  loading = false
  error = ''
  form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    company: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
    acceptTerms: [false, Validators.requiredTrue],
    acceptPrivacy: [false, Validators.requiredTrue],
    marketingConsent: [false],
    website: [''],
  }, { validators: passwordMatch })

  constructor() {
    this.seo.apply({ title: 'Crear cuenta | Spendlyx', description: 'Regístrate en Spendlyx', path: '/registro' })
  }

  submit = (): void => {
    if (this.form.invalid) return
    this.loading = true
    this.error = ''
    const v = this.form.getRawValue()
    this.api.register({
      firstName: v.firstName!,
      lastName: v.lastName!,
      company: v.company!,
      email: v.email!,
      password: v.password!,
      acceptTerms: v.acceptTerms!,
      acceptPrivacy: v.acceptPrivacy!,
      marketingConsent: v.marketingConsent ?? false,
      website: v.website ?? '',
    }).subscribe({
      next: () => {
        void this.router.navigate(['/verificar-email/enviado'], { queryParams: { email: v.email } })
      },
      error: (e) => {
        this.error = e.error?.message ?? 'No se pudo crear la cuenta. Comprueba los datos.'
        this.loading = false
      },
    })
  }
}
