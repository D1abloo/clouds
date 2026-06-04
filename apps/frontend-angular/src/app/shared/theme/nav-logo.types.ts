/** Brand / platform logos (SVG assets under /assets/logos). */
export type NavLogoKey =
  | 'aws'
  | 'gcp'
  | 'azure'
  | 'docker'
  | 'kubernetes'
  | 'jenkins'
  | 'terraform'
  | 'postgresql'
  | 'github'
  | 'redis'
  | 'prometheus'
  | 'grafana'

export const NAV_LOGO_ASSET: Record<NavLogoKey, string> = {
  aws: '/assets/logos/aws.svg',
  gcp: '/assets/logos/gcp.svg',
  azure: '/assets/logos/azure.svg',
  docker: '/assets/logos/docker.svg',
  kubernetes: '/assets/logos/kubernetes.svg',
  jenkins: '/assets/logos/jenkins.svg',
  terraform: '/assets/logos/terraform.svg',
  postgresql: '/assets/logos/postgresql.svg',
  github: '/assets/logos/github.svg',
  redis: '/assets/logos/redis.svg',
  prometheus: '/assets/logos/prometheus.svg',
  grafana: '/assets/logos/grafana.svg',
}

export const sidebarBrandToLogo = (brand?: 'aws' | 'gcp' | 'azure'): NavLogoKey | null => {
  if (!brand) return null
  return brand
}
