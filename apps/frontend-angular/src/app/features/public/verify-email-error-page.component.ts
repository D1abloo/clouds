import { Component } from '@angular/core'
import { RouterLink } from '@angular/router'
import { PUBLIC_THEME } from './public-theme'

@Component({
  standalone: true,
  imports: [RouterLink],
  selector: 'app-verify-email-error-page',
  template: `
    <div class="pub pub-verify"><div class="pub-wrap pub-verify__card">
      <h1>No se pudo verificar la cuenta</h1>
      <p>El enlace no es válido o ha caducado.</p>
      <a routerLink="/reenviar-verificacion" class="pub-btn pub-btn--primary">Reenviar verificación</a>
    </div></div>
  `,
  styles: [PUBLIC_THEME, `.pub-verify { min-height: 80dvh; display: grid; place-items: center; } .pub-verify__card { text-align: center; max-width: 420px; padding: 2rem; }`],
})
export class VerifyEmailErrorPageComponent {}
