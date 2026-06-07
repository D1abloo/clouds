/** Brand / platform logos (SVG inline vía `BRAND_LOGO_SVG`; GCP = logo oficial Google Cloud). */
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
  | 'gitlab'
  | 'redis'
  | 'prometheus'
  | 'grafana'

export const sidebarBrandToLogo = (brand?: 'aws' | 'gcp' | 'azure'): NavLogoKey | null => {
  if (!brand) return null
  return brand
}
