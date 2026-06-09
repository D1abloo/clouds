import { emptyGithubInventory } from '../../../core/demo/pro-empty.data'

/** Resumen inventario GitHub cuando el API no responde */
export const buildGithubInventoryFallback = (): Record<string, unknown> => emptyGithubInventory()
