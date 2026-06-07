import type { NavLogoKey } from '../../../shared/theme/nav-logo.types'

export const providerToLogo = (provider: string): NavLogoKey | null => {
  const p = provider.toLowerCase()
  if (p.includes('aws')) return 'aws'
  if (p.includes('gcp') || p.includes('google')) return 'gcp'
  if (p.includes('azure')) return 'azure'
  if (p.includes('docker')) return 'docker'
  if (p.includes('k8s') || p.includes('kubernetes')) return 'kubernetes'
  if (p.includes('jenkins')) return 'jenkins'
  if (p.includes('terraform')) return 'terraform'
  if (p.includes('github')) return 'github'
  if (p.includes('gitlab')) return 'gitlab'
  if (p.includes('postgres')) return 'postgresql'
  if (p.includes('redis')) return 'redis'
  if (p.includes('prometheus')) return 'prometheus'
  if (p.includes('grafana')) return 'grafana'
  return null
}
