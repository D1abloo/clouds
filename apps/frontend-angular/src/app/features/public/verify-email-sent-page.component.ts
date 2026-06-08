import { Component } from '@angular/core'
import { RouterLink } from '@angular/router'
import { PUBLIC_THEME } from './public-theme'

@Component({
  standalone: true,
  imports: [RouterLink],
  selector: 'app-verify-email-sent-page',
  template: `
    <div class="pub pub-verify"><div class="pub-wrap pub-verify__card">
      <h1>Te hemos enviado un correo de validación</h1>
      <p>Revisa tu correo para validar la cuenta.</p>
      <p>El enlace de validación caduca en 24 horas.</p>
      <a routerLink="/login" class="pub-btn pub-btn--outline">Volver al login</a>
    </div></div>
  `,
  styles: [PUBLIC_THEME, `.pub-verify { min-height: 80dvh; display: grid; place-items: center; } .pub-verify__card { text-align: center; max-width: 420px; padding: 2rem; }`],
})
export class VerifyEmailSentPageComponent {}
