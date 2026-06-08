import { Component, inject, OnInit } from '@angular/core'
import { Router } from '@angular/router'
import { AuthService } from '../../core/services/auth.service'

@Component({
  standalone: true,
  selector: 'app-oauth-callback',
  template: `
    <div class="oauth-callback" role="status" aria-live="polite">
      <p>Completando inicio de sesión…</p>
    </div>
  `,
  styles: [
    `
      .oauth-callback {
        min-height: 100vh;
        display: grid;
        place-items: center;
        color: var(--text-secondary, #94a3b8);
        font-size: 0.95rem;
      }
    `,
  ],
})
export class OAuthCallbackComponent implements OnInit {
  private readonly auth = inject(AuthService)
  private readonly router = inject(Router)

  ngOnInit(): void {
    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash
    const params = new URLSearchParams(hash)

    const token = params.get('token')
    const userRaw = params.get('user')

    if (!token || !userRaw) {
      void this.router.navigate(['/login'], {
        queryParams: { oauth_error: 'missing_token' },
        replaceUrl: true,
      })
      return
    }

    try {
      const user = JSON.parse(decodeURIComponent(userRaw))
      this.auth.completeOAuth(token, user)
      void this.router.navigateByUrl('/dashboard', { replaceUrl: true })
    } catch {
      void this.router.navigate(['/login'], {
        queryParams: { oauth_error: 'invalid_session' },
        replaceUrl: true,
      })
    }
  }
}
