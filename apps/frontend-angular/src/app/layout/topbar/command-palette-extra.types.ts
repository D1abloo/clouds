import type { Router } from '@angular/router'

export type CommandPaletteExtraItem = {
  label: string
  description: string
  icon: string
  action: (router: Router) => void
}
