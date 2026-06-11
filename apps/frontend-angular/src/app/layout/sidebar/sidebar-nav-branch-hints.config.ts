export const branchTooltip = (branchId: string): string => {
  const hint = SIDEBAR_BRANCH_HINTS[branchId] ?? ''
  if (hint.length <= 120) return hint
  return `${hint.slice(0, 117)}…`
}

export const SIDEBAR_BRANCH_HINTS: Record<string, string> = {
  aws: 'Amazon Web Services — EC2, VPC y facturación live',
  gcp: 'Google Cloud Platform — Compute y billing',
  azure: 'Microsoft Azure — VMs y suscripciones',
  clouding: 'Clouding.io — instancias cloud europeas',
  digitalocean: 'Droplets y API DigitalOcean',
  hetzner: 'Servidores cloud Hetzner',
  linode: 'Instancias Linode / Akamai',
  ovh: 'Public Cloud OVH',
  ionos: 'Servidores cloud IONOS',
  vultr: 'Instancias cloud Vultr',
  scaleway: 'Instances y Elastic Metal Scaleway',
}
