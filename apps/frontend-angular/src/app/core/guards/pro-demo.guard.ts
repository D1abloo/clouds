import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { ProModeService } from '../services/pro-mode.service'
import { environment } from '../../../environments/environment'

/** Bloquea rutas demo en PRO (redirige a configuración). */
export const proDemoGuard: CanActivateFn = () => {
  const pro = inject(ProModeService)
  const router = inject(Router)

  const proMode = pro.loaded() ? pro.proMode() : environment.proMode
  const demoMode = pro.loaded() ? pro.demoMode() : environment.demoMode

  if (proMode && !demoMode) {
    return router.createUrlTree(['/settings/general'])
  }

  return true
}
