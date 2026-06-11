import { Component, DestroyRef, inject } from '@angular/core'
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
import { PublicApiService } from './public-api.service'
import { PublicSeoService } from './public-seo.service'
import { bindPublicScroll } from './public-scroll.util'
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
      <div class="pub-wrap pub-register__card pub-card">
        <div class="pub-register__head">
          <span class="pub-logo__mark" aria-hidden="true">S</span>
          <h1>Crea tu cuenta de Spendlyx</h1>
        </div>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="row">
            <label>Nombre<input formControlName="firstName" autocomplete="given-name" /></label>
            <label>Apellidos<input formControlName="lastName" autocomplete="family-name" /></label>
          </div>
          <label>Empresa<input formControlName="company" autocomplete="organization" /></label>
          <label>Plan
            <select formControlName="plan">
              <option value="starter">Starter — hasta 3 cuentas cloud</option>
              <option value="growth">Growth — equipos medianos</option>
              <option value="enterprise">Enterprise — SSO y SLA</option>
            </select>
          </label>
          <label>Proveedor cloud principal
            <select formControlName="cloudProvider">
              <option value="aws">AWS</option>
              <option value="gcp">GCP</option>
              <option value="azure">Azure</option>
              <option value="multi">Multi-cloud</option>
            </select>
          </label>
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
    .pub-register {
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: 2.5rem 0;
      background: linear-gradient(160deg, #f0f9ff 0%, #f8fafc 40%, #eef2ff 100%);
    }
    .pub-register__card { max-width: 500px; width: 100%; padding: 2rem; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.1); }
    .pub-register__head { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.35rem; }
    .pub-register__head .pub-logo__mark { width: 40px; height: 40px; border-radius: 11px; background: linear-gradient(135deg, #0284c7, #6366f1); color: #fff; display: grid; place-items: center; font-weight: 800; }
    .pub-register h1 { font-size: 1.3rem; margin: 0; font-weight: 800; letter-spacing: -0.02em; }
    form { display: flex; flex-direction: column; gap: .75rem; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
    label { display: flex; flex-direction: column; gap: .25rem; font-size: .8rem; font-weight: 600; }
    label input, label select { padding: .6rem .7rem; border: 1px solid #e2e8f0; border-radius: 10px; font: inherit; background: #fff; }
    label input:focus { outline: none; border-color: #0284c7; box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.12); }
    .check { flex-direction: row; align-items: flex-start; font-weight: 400; font-size: .82rem; gap: 0.5rem; }
    .full { width: 100%; margin-top: .5rem; }
    .hp { position: absolute; left: -9999px; }
    .err { color: #dc2626; font-size: .85rem; margin: 0; }
    .foot { text-align: center; margin-top: 1rem; font-size: .85rem; color: #64748b; }
    @media (max-width: 520px) { .row { grid-template-columns: 1fr; } }
  `],
})
export class RegisterPageComponent {
  private readonly destroyRef = inject(DestroyRef)
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
    plan: ['starter', Validators.required],
    cloudProvider: ['aws', Validators.required],
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
    const unbind = bindPublicScroll()
    this.destroyRef.onDestroy(unbind)
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
