import { Component, inject, OnInit } from '@angular/core'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { PublicApiService } from './public-api.service'
import { PUBLIC_THEME } from './public-theme'

@Component({
  standalone: true,
  imports: [RouterLink],
  selector: 'app-verify-email-page',
  template: `
    <div class="pub pub-verify">
      <div class="pub-wrap pub-verify__card">
        @if (loading) { <p>Verificando tu cuenta…</p> }
        @else if (success) {
          <h1>Cuenta verificada correctamente</h1>
          <p>Ya puedes iniciar sesión con tu email y contraseña.</p>
          <a routerLink="/login" class="pub-btn pub-btn--primary">Iniciar sesión</a>
        } @else {
          <h1>{{ errorTitle }}</h1>
          <p>{{ errorMsg }}</p>
          <a routerLink="/reenviar-verificacion" class="pub-btn pub-btn--primary">Reenviar correo de verificación</a>
        }
      </div>
    </div>
  `,
  styles: [PUBLIC_THEME, `.pub-verify { min-height: 80dvh; display: grid; place-items: center; } .pub-verify__card { text-align: center; max-width: 420px; padding: 2rem; }`],
})
export class VerifyEmailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly api = inject(PublicApiService)
  loading = true
  success = false
  errorTitle = 'El enlace no es válido'
  errorMsg = 'Solicita un nuevo enlace de verificación.'
  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token')
    if (!token) { this.loading = false; return }
    this.api.verifyEmail(token).subscribe({
      next: () => { this.success = true; this.loading = false },
      error: (e) => {
        this.loading = false
        const msg = e.error?.message ?? ''
        if (msg.includes('caducado')) {
          this.errorTitle = 'El enlace ha caducado'
          this.errorMsg = 'El enlace de validación caduca en 24 horas.'
        }
      },
    })
  }
}
