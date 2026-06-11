/** Brand / platform logos (SVG inline vía `BRAND_LOGO_SVG`; GCP = logo oficial Google Cloud). */
export type NavLogoKey =
  | 'aws'
  | 'gcp'
  | 'azure'
  | 'clouding'
  | 'digitalocean'
  | 'hetzner'
  | 'linode'
  | 'ovh'
  | 'ionos'
  | 'vultr'
  | 'scaleway'
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
  | 'clouding'
  | 'digitalocean'
  | 'hetzner'
  | 'linode'
  | 'ovh'
  | 'ionos'
  | 'vultr'
  | 'scaleway'

export const sidebarBrandToLogo = (brand?: SidebarBrand): NavLogoKey | null => {
  if (!brand) return null
  return brand
}
