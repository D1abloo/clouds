/** Brand / platform logos (inline SVG from Simple Icons + files in src/assets/logos). */
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

export const sidebarBrandToLogo = (brand?: 'aws' | 'gcp' | 'azure'): NavLogoKey | null => {
  if (!brand) return null
  return brand
}
