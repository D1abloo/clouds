import type { CloudLaunchStepId } from './cloud-launch.types'

export type LaunchStepMeta = {
  id: CloudLaunchStepId
  label: string
  shortLabel: string
  icon: string
}

export const CLOUD_LAUNCH_STEPS: LaunchStepMeta[] = [
  { id: 'provider', label: 'Proveedor', shortLabel: 'Proveedor', icon: 'cloud' },
  { id: 'account', label: 'Cuenta', shortLabel: 'Cuenta', icon: 'verified_user' },
  { id: 'region', label: 'Región / Zona', shortLabel: 'Región', icon: 'public' },
  { id: 'network', label: 'Red', shortLabel: 'Red', icon: 'device_hub' },
  { id: 'compute', label: 'Compute', shortLabel: 'Compute', icon: 'memory' },
  { id: 'image', label: 'Imagen', shortLabel: 'Imagen', icon: 'image' },
  { id: 'review', label: 'Revisar', shortLabel: 'Revisar', icon: 'fact_check' },
  { id: 'launch', label: 'Lanzar', shortLabel: 'Lanzar', icon: 'rocket_launch' },
  { id: 'test', label: 'Prueba', shortLabel: 'Prueba', icon: 'network_check' },
  { id: 'delete', label: 'Eliminar', shortLabel: 'Eliminar', icon: 'delete_forever' },
]

export const stepIndex = (id: CloudLaunchStepId): number => CLOUD_LAUNCH_STEPS.findIndex((s) => s.id === id)
