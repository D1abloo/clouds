import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { AuthService } from '../services/auth.service'

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService)
  const router = inject(Router)

  if (auth.isAuthenticated()) {
    return true
  }

  return router.createUrlTree(['/login'])
}

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService)
  const router = inject(Router)

  if (!auth.isAuthenticated()) {
    return true
  }

  return router.createUrlTree(['/dashboard'])
}

/** Rutas públicas de marketing y registro — redirige usuarios autenticados al panel. */
export const publicGuestGuard: CanActivateFn = () => {
  const auth = inject(AuthService)
  const router = inject(Router)

  if (!auth.isAuthenticated()) {
    return true
  }

  return router.createUrlTree(['/dashboard'])
}
