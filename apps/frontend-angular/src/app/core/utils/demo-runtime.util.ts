import { environment } from '../../../environments/environment'
import type { ProModeService } from '../services/pro-mode.service'

/** true solo cuando el runtime permite datos demo (DEMO_MODE=true, no PRO). */
export const allowsDemoDataFrom = (pro: ProModeService): boolean => {
  if (pro.loaded()) {
    if (pro.proMode() && !pro.demoMode()) return false
    return pro.demoMode()
  }
  return environment.demoMode === true && environment.proMode !== true
}
