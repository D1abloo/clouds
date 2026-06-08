/** Brand / platform logos (SVG inline vía `BRAND_LOGO_SVG`; GCP = logo oficial Google Cloud). */
export type NavLogoKey =
  | 'aws'
  | 'gcp'
  | 'azure'
  | 'digitalocean'
  | 'hetzner'
  | 'linode'
  | 'ovh'
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

export type SidebarBrand =
  | 'aws'
  | 'gcp'
  | 'azure'
  | 'digitalocean'
  | 'hetzner'
  | 'linode'
  | 'ovh'

export const sidebarBrandToLogo = (brand?: SidebarBrand): NavLogoKey | null => {
  if (!brand) return null
  return brand
}
