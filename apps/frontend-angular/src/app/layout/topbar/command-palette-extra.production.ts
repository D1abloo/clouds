import type { CommandPaletteExtraItem } from './command-palette-extra.types'

export const commandPaletteExtraItems = (): CommandPaletteExtraItem[] => [
  {
    label: 'Modo demo',
    description: 'Cargar y reiniciar datos de demostración',
    icon: 'science',
    action: (router) => router.navigate(['/admin/demo-mode']),
  },
]
