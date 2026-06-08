import { Component, inject, OnInit } from '@angular/core'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { ActivatedRoute } from '@angular/router'
import { PublicApiService } from './public-api.service'
import { PublicSeoService } from './public-seo.service'
import { PUBLIC_THEME } from './public-theme'
import { SPENDLYX_CONTACT_EMAIL } from './public.constants'

@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  selector: 'app-contact-page',
  template: `
    <header class="pub-page-hero">
      <div class="pub-wrap">
        <h1>Contacto</h1>
        <p>Escríbenos a <a [href]="'mailto:' + contactEmail">{{ contactEmail }}</a> o usa el formulario.</p>
      </div>
    </header>
    <div class="pub pub-page-body">
      <div class="pub-wrap" style="max-width: 560px">
        @if (success) {
          <p class="ok" role="status">{{ success }}</p>
        } @else {
          <form [formGroup]="form" (ngSubmit)="submit()" class="pub-form pub-card">
            <label>Nombre<input formControlName="name" /></label>
            <label>Email<input type="email" formControlName="email" /></label>
            <label>Motivo
              <select formControlName="reason">
                <option value="general">General</option>
                <option value="ventas">Ventas</option>
                <option value="soporte">Soporte</option>
                <option value="partners">Partners</option>
                <option value="otro">Otro</option>
              </select>
            </label>
            <label>Asunto<input formControlName="subject" /></label>
            <label>Mensaje<textarea formControlName="message" rows="5"></textarea></label>
            <input type="text" formControlName="website" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true" />
            @if (error) { <p class="err" role="alert">{{ error }}</p> }
            <button type="submit" class="pub-btn pub-btn--primary" [disabled]="form.invalid || loading">{{ loading ? 'Enviando…' : 'Enviar mensaje' }}</button>
          </form>
        }
      </div>
    </div>
  `,
  styles: [PUBLIC_THEME, `
    .pub-form { display: flex; flex-direction: column; gap: .85rem; padding: 1.75rem; }
    .pub-form label { display: flex; flex-direction: column; gap: .3rem; font-size: .85rem; font-weight: 600; }
    .pub-form input, .pub-form select, .pub-form textarea { padding: .6rem .7rem; border: 1px solid #e2e8f0; border-radius: 10px; font: inherit; transition: border-color 0.15s, box-shadow 0.15s; }
    .pub-form input:focus, .pub-form select:focus, .pub-form textarea:focus { outline: none; border-color: #0284c7; box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15); }
    .hp { position: absolute; left: -9999px; }
    .err { color: #dc2626; font-size: .85rem; margin: 0; }
    .ok { color: #059669; font-weight: 600; padding: 1.5rem; background: #ecfdf5; border-radius: 12px; border: 1px solid #a7f3d0; }
    .pub-page-hero a { color: #0284c7; }
  `],
})
export class ContactPageComponent implements OnInit {
  readonly contactEmail = SPENDLYX_CONTACT_EMAIL
  private readonly fb = inject(FormBuilder)
  private readonly api = inject(PublicApiService)
  private readonly route = inject(ActivatedRoute)
  private readonly seo = inject(PublicSeoService)
  loading = false
  error = ''
  success = ''
  form = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    reason: ['general', Validators.required],
    subject: ['', Validators.required],
    message: ['', [Validators.required, Validators.minLength(10)]],
    website: [''],
  })
  ngOnInit(): void { const s = this.route.snapshot.data['seo']; if (s) this.seo.apply(s) }
  submit = (): void => {
    if (this.form.invalid) return
    this.loading = true
    this.error = ''
    this.api.contact(this.form.getRawValue() as never).subscribe({
      next: (r) => { this.success = r.message; this.loading = false },
      error: () => { this.error = 'No se pudo enviar el mensaje. Inténtalo más tarde.'; this.loading = false },
    })
  }
}
