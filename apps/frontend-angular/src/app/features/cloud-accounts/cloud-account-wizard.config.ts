import type { CloudProvider } from '../../core/models/api.models'
import type { NavLogoKey } from '../../shared/theme/nav-logo.types'

export type WizardStep = 'provider' | 'method' | 'credentials' | 'validate' | 'resources' | 'finish'

/** Pasos del asistente gráfico (6 pasos SaaS) */
export const FULL_WIZARD_STEPS: { id: WizardStep; label: string }[] = [
  { id: 'provider', label: 'Proveedor' },
  { id: 'method', label: 'Método' },
  { id: 'credentials', label: 'Credenciales' },
  { id: 'validate', label: 'Validación' },
  { id: 'resources', label: 'Alcance' },
  { id: 'finish', label: 'Finalizar' },
]

/** Proveedores soportados en el asistente de conexión */
export type ConnectionProviderId =
  | CloudProvider
  | 'DIGITALOCEAN'
  | 'HETZNER'
  | 'CLOUDFLARE'
  | 'LINODE'
  | 'OVH'
  | 'IONOS'
  | 'VULTR'
  | 'SCALEWAY'
  | 'KUBERNETES'
  | 'DOCKER'
  | 'GITHUB'
  | 'GITLAB'
  | 'JENKINS'
  | 'TERRAFORM'

export type WizardProviderScope = 'cloud' | 'vps' | 'platform'

export interface CloudProviderWizardCard {
  id: ConnectionProviderId
  name: string
  shortName: string
  description: string
  credentialsSummary: string
  permissionsSummary: string[]
  logo: NavLogoKey
  toneClass: string
  scope: WizardProviderScope
  /** Si guarda vía API cloud-accounts (AWS/GCP/AZURE) */
  cloudApiProvider?: CloudProvider
  defaultCredentialType: string
}

export const CLOUD_WIZARD_STEPS = FULL_WIZARD_STEPS

export interface ConnectionMethodCard {
  id: string
  label: string
  description: string
  icon: string
  recommended?: boolean
  comingSoon?: boolean
}

export interface ResourceSyncOption {
  id: string
  label: string
  description: string
  defaultSelected: boolean
}

export interface SyncRegionOption {
  id: string
  label: string
}

export const PROVIDER_ALIAS_MAP: Record<string, ConnectionProviderId> = {
  aws: 'AWS',
  gcp: 'GCP',
  azure: 'AZURE',
  clouding: 'CLOUDING',
  digitalocean: 'DIGITALOCEAN',
  hetzner: 'HETZNER',
  linode: 'LINODE',
  ovh: 'OVH',
  ionos: 'IONOS',
  vultr: 'VULTR',
  scaleway: 'SCALEWAY',
  cloudflare: 'CLOUDFLARE',
  kubernetes: 'KUBERNETES',
  k8s: 'KUBERNETES',
  docker: 'DOCKER',
  github: 'GITHUB',
  gitlab: 'GITLAB',
  jenkins: 'JENKINS',
  terraform: 'TERRAFORM',
  vps: 'DIGITALOCEAN',
}

export const resolveProviderAlias = (alias: string): ConnectionProviderId | null =>
  PROVIDER_ALIAS_MAP[alias.trim().toLowerCase()] ?? null

export const wizardRouteForAlias = (alias: string): string => {
  const key = alias.trim().toLowerCase()
  if (key === 'vps' || key === 'baremetal' || key === 'bare-metal') {
    return '/admin/infraestructura/vps/nuevo'
  }
  return `/admin/configuracion/integraciones/${key}/conectar`
}

export const connectionMethodsFor = (provider: ConnectionProviderId): ConnectionMethodCard[] => {
  const methods: Partial<Record<ConnectionProviderId, ConnectionMethodCard[]>> = {
    AWS: [
      { id: 'iam_role', label: 'IAM Role (ARN)', description: 'Assume-role cross-account — recomendado para producción', icon: 'verified_user', recommended: true },
      { id: 'access_key', label: 'Access Key + Secret', description: 'Claves IAM con permisos de lectura/operación', icon: 'vpn_key' },
      { id: 'oidc', label: 'OIDC / SSO', description: 'Federación con proveedor de identidad', icon: 'account_tree' },
    ],
    GCP: [
      { id: 'service_account', label: 'Service Account (JSON)', description: 'JSON descargado desde IAM — método recomendado', icon: 'description', recommended: true },
      { id: 'workload_identity', label: 'Workload Identity', description: 'OIDC en GKE o Cloud Run', icon: 'cloud' },
    ],
    AZURE: [
      { id: 'client_secret', label: 'App Registration', description: 'Client ID + Secret de aplicación registrada', icon: 'app_registration', recommended: true },
      { id: 'managed_identity', label: 'Managed Identity', description: 'Identidad administrada en Azure', icon: 'badge' },
    ],
    DIGITALOCEAN: [{ id: 'api_token', label: 'Personal Access Token', description: 'Token del panel DigitalOcean', icon: 'token', recommended: true }],
    HETZNER: [{ id: 'api_token', label: 'API Token', description: 'Token Hetzner Cloud Console', icon: 'token', recommended: true }],
    LINODE: [{ id: 'api_token', label: 'Personal Access Token', description: 'Token Linode API v4', icon: 'token', recommended: true }],
    OVH: [{ id: 'ovh_keys', label: 'Application + Consumer Keys', description: 'Par de claves API OVH', icon: 'key', recommended: true }],
    IONOS: [{ id: 'api_token', label: 'API Token', description: 'Token del panel IONOS Cloud', icon: 'token', recommended: true }],
    VULTR: [{ id: 'api_token', label: 'API Key', description: 'Personal API Key de Vultr', icon: 'token', recommended: true }],
    SCALEWAY: [{ id: 'api_token', label: 'API Secret Key', description: 'Secret Key de Scaleway IAM', icon: 'token', recommended: true }],
    CLOUDING: [{ id: 'api_token', label: 'API Token', description: 'Token de acceso Clouding.io', icon: 'token', recommended: true }],
    CLOUDFLARE: [
      { id: 'api_token', label: 'API Token', description: 'Token con permisos de zona', icon: 'token', recommended: true },
      { id: 'global_key', label: 'Global API Key', description: 'Global Key + email de cuenta', icon: 'mail' },
    ],
    KUBERNETES: [
      { id: 'kubeconfig', label: 'Kubeconfig', description: 'Archivo kubeconfig o pegado YAML', icon: 'upload_file', recommended: true },
      { id: 'bearer_token', label: 'Bearer Token', description: 'URL del API server + token de service account', icon: 'vpn_key' },
    ],
    DOCKER: [
      { id: 'tls', label: 'TLS + Endpoint', description: 'Docker Engine expuesto con certificados TLS', icon: 'lock', recommended: true },
      { id: 'ssh_tunnel', label: 'SSH + socket remoto', description: 'Túnel SSH al socket Docker local', icon: 'terminal' },
    ],
    GITHUB: [
      { id: 'pat', label: 'Personal Access Token', description: 'PAT con scopes repo y read:org', icon: 'vpn_key', recommended: true },
      { id: 'github_app', label: 'GitHub App', description: 'Instalación de GitHub App', icon: 'apps', comingSoon: true },
    ],
    GITLAB: [
      { id: 'pat', label: 'Personal Access Token', description: 'PAT con scope api', icon: 'vpn_key', recommended: true },
      { id: 'oauth', label: 'OAuth', description: 'Flujo OAuth GitLab', icon: 'login', comingSoon: true },
    ],
    JENKINS: [{ id: 'api_token', label: 'Usuario + API Token', description: 'Credencial REST API Jenkins', icon: 'token', recommended: true }],
    TERRAFORM: [{ id: 'api_token', label: 'API Token', description: 'Token Terraform Cloud / Enterprise', icon: 'token', recommended: true }],
  }
  return methods[provider] ?? []
}

export const resourceSyncOptionsFor = (provider: ConnectionProviderId): ResourceSyncOption[] => {
  const map: Partial<Record<ConnectionProviderId, ResourceSyncOption[]>> = {
    AWS: [
      { id: 'ec2', label: 'EC2 / Instancias', description: 'Instancias, tipos y estados', defaultSelected: true },
      { id: 'vpc', label: 'VPC / Redes', description: 'VPCs, subnets y gateways', defaultSelected: true },
      { id: 'sg', label: 'Security Groups', description: 'Grupos de seguridad y reglas', defaultSelected: true },
      { id: 'cloudwatch', label: 'CloudWatch', description: 'Métricas y alarmas', defaultSelected: false },
      { id: 'cost', label: 'Cost Explorer', description: 'Costes y facturación', defaultSelected: true },
    ],
    GCP: [
      { id: 'compute', label: 'Compute Engine', description: 'VMs y plantillas', defaultSelected: true },
      { id: 'vpc', label: 'VPC / Redes', description: 'Redes y subredes', defaultSelected: true },
      { id: 'monitoring', label: 'Cloud Monitoring', description: 'Métricas y SLIs', defaultSelected: false },
      { id: 'billing', label: 'Facturación', description: 'Costes por proyecto', defaultSelected: true },
    ],
    AZURE: [
      { id: 'vms', label: 'Máquinas virtuales', description: 'VMs y scale sets', defaultSelected: true },
      { id: 'vnets', label: 'VNets', description: 'Redes virtuales y subnets', defaultSelected: true },
      { id: 'monitor', label: 'Azure Monitor', description: 'Métricas y diagnósticos', defaultSelected: false },
      { id: 'cost', label: 'Cost Management', description: 'Costes por suscripción', defaultSelected: true },
    ],
    KUBERNETES: [
      { id: 'pods', label: 'Pods', description: 'Pods y contenedores', defaultSelected: true },
      { id: 'deployments', label: 'Deployments', description: 'Despliegues y réplicas', defaultSelected: true },
      { id: 'services', label: 'Services', description: 'Servicios ClusterIP/LoadBalancer', defaultSelected: true },
      { id: 'namespaces', label: 'Namespaces', description: 'Namespaces y cuotas', defaultSelected: false },
    ],
    DOCKER: [
      { id: 'containers', label: 'Contenedores', description: 'Contenedores en ejecución', defaultSelected: true },
      { id: 'images', label: 'Imágenes', description: 'Imágenes locales', defaultSelected: true },
      { id: 'networks', label: 'Redes', description: 'Redes Docker', defaultSelected: false },
      { id: 'volumes', label: 'Volúmenes', description: 'Volúmenes persistentes', defaultSelected: false },
    ],
    DIGITALOCEAN: [
      { id: 'droplets', label: 'Droplets', description: 'Servidores cloud', defaultSelected: true },
      { id: 'vpc', label: 'VPC', description: 'Redes privadas', defaultSelected: true },
    ],
    HETZNER: [
      { id: 'servers', label: 'Servidores', description: 'Cloud servers', defaultSelected: true },
      { id: 'networks', label: 'Redes', description: 'Private networks', defaultSelected: true },
    ],
    LINODE: [{ id: 'linodes', label: 'Linodes', description: 'Instancias Linode', defaultSelected: true }],
    OVH: [{ id: 'instances', label: 'Instancias Public Cloud', description: 'Instancias OVH', defaultSelected: true }],
    IONOS: [
      { id: 'servers', label: 'Servidores cloud', description: 'Instancias IONOS Cloud', defaultSelected: true },
      { id: 'networks', label: 'Redes privadas', description: 'LAN y balanceadores', defaultSelected: true },
    ],
    VULTR: [
      { id: 'instances', label: 'Instancias cloud', description: 'Compute Vultr', defaultSelected: true },
      { id: 'block_storage', label: 'Block storage', description: 'Volúmenes persistentes', defaultSelected: false },
    ],
    SCALEWAY: [
      { id: 'instances', label: 'Instances', description: 'Instancias Scaleway', defaultSelected: true },
      { id: 'networks', label: 'Private Networks', description: 'Redes privadas y LB', defaultSelected: true },
    ],
    CLOUDING: [
      { id: 'instances', label: 'Instancias cloud', description: 'VMs Clouding', defaultSelected: true },
      { id: 'networks', label: 'Redes privadas', description: 'Private networks y políticas', defaultSelected: true },
      { id: 'billing', label: 'Facturación', description: 'Costes y uso', defaultSelected: true },
    ],
  }
  return map[provider] ?? [{ id: 'inventory', label: 'Inventario básico', description: 'Recursos detectados por la API', defaultSelected: true }]
}

export const defaultSelectedResources = (provider: ConnectionProviderId): string[] =>
  resourceSyncOptionsFor(provider).filter((o) => o.defaultSelected).map((o) => o.id)

export const syncRegionOptionsFor = (provider: ConnectionProviderId): SyncRegionOption[] => {
  const map: Partial<Record<ConnectionProviderId, SyncRegionOption[]>> = {
    AWS: [
      { id: 'us-east-1', label: 'us-east-1 (N. Virginia)' },
      { id: 'us-west-2', label: 'us-west-2 (Oregon)' },
      { id: 'eu-west-1', label: 'eu-west-1 (Ireland)' },
      { id: 'eu-central-1', label: 'eu-central-1 (Frankfurt)' },
      { id: 'eu-south-2', label: 'eu-south-2 (Spain)' },
    ],
    GCP: [
      { id: 'us-central1', label: 'us-central1' },
      { id: 'europe-west1', label: 'europe-west1' },
      { id: 'europe-southwest1', label: 'europe-southwest1' },
      { id: 'southamerica-east1', label: 'southamerica-east1' },
      { id: 'africa-south1', label: 'africa-south1' },
    ],
    AZURE: [
      { id: 'westeurope', label: 'West Europe' },
      { id: 'northeurope', label: 'North Europe' },
      { id: 'eastus', label: 'East US' },
      { id: 'spaincentral', label: 'Spain Central' },
      { id: 'brazilsouth', label: 'Brazil South' },
    ],
    CLOUDING: [
      { id: 'eu-central', label: 'eu-central' },
      { id: 'eu-west', label: 'eu-west' },
    ],
    DIGITALOCEAN: [
      { id: 'nyc3', label: 'NYC3' },
      { id: 'ams3', label: 'AMS3' },
      { id: 'fra1', label: 'FRA1' },
      { id: 'sfo3', label: 'SFO3' },
    ],
    HETZNER: [
      { id: 'fsn1', label: 'Falkenstein' },
      { id: 'nbg1', label: 'Nuremberg' },
      { id: 'hel1', label: 'Helsinki' },
    ],
    LINODE: [
      { id: 'eu-central', label: 'Frankfurt' },
      { id: 'eu-west', label: 'London' },
      { id: 'us-east', label: 'Newark' },
    ],
    OVH: [
      { id: 'GRA', label: 'Gravelines' },
      { id: 'SBG', label: 'Strasbourg' },
      { id: 'BHS', label: 'Beauharnois' },
    ],
    IONOS: [
      { id: 'de/fra', label: 'Germany / Frankfurt' },
      { id: 'de/txl', label: 'Germany / Berlin' },
      { id: 'es/vit', label: 'Spain / Vitoria' },
    ],
    VULTR: [
      { id: 'ewr', label: 'New Jersey' },
      { id: 'ams', label: 'Amsterdam' },
      { id: 'fra', label: 'Frankfurt' },
      { id: 'mad', label: 'Madrid' },
    ],
    SCALEWAY: [
      { id: 'fr-par-1', label: 'Paris 1' },
      { id: 'fr-par-2', label: 'Paris 2' },
      { id: 'nl-ams-1', label: 'Amsterdam 1' },
      { id: 'pl-waw-1', label: 'Warsaw 1' },
    ],
  }
  return map[provider] ?? []
}

export const integrationStatusLabel = (status: string): string => {
  const map: Record<string, string> = {
    connected: 'Conectada',
    idle: 'Conectada',
    syncing: 'Sincronizando',
    sync: 'Sincronizando',
    error: 'Error',
    pending: 'Pendiente',
    disconnected: 'Pendiente',
  }
  return map[status.toLowerCase()] ?? 'Pendiente'
}

export const WIZARD_SUBTITLE =
  'Configura las credenciales, permisos y alcance de sincronización para conectar tu proveedor cloud en modo PRO.'

export const CLOUD_PROVIDER_CARDS: CloudProviderWizardCard[] = [
  {
    id: 'AWS',
    name: 'Amazon Web Services',
    shortName: 'AWS',
    description: 'Sincroniza cuentas, regiones, EC2, VPC, métricas CloudWatch y costes con Cost Explorer.',
    credentialsSummary: 'IAM Role (ARN), Access Key + Secret u OIDC federado',
    permissionsSummary: [
      'ec2:DescribeInstances, StartInstances, StopInstances',
      'cloudwatch:GetMetricData',
      'ce:GetCostAndUsage',
      'ec2:DescribeVpcs, DescribeSecurityGroups',
      'sts:GetCallerIdentity',
    ],
    logo: 'aws',
    toneClass: 'provider-card--aws',
    scope: 'cloud',
    cloudApiProvider: 'AWS',
    defaultCredentialType: 'iam_role',
  },
  {
    id: 'GCP',
    name: 'Google Cloud Platform',
    shortName: 'Google Cloud',
    description: 'Conecta proyectos GCP, zonas, instancias Compute, Monitoring y facturación BigQuery.',
    credentialsSummary: 'Service Account JSON o Workload Identity / OIDC',
    permissionsSummary: [
      'compute.instances.list',
      'compute.instances.start / stop',
      'monitoring.timeSeries.list',
      'billing.accounts.getSpend',
      'resourcemanager.projects.get',
    ],
    logo: 'gcp',
    toneClass: 'provider-card--gcp',
    scope: 'cloud',
    cloudApiProvider: 'GCP',
    defaultCredentialType: 'service_account',
  },
  {
    id: 'AZURE',
    name: 'Microsoft Azure',
    shortName: 'Azure',
    description: 'Gestiona suscripciones, resource groups, VMs, Azure Monitor y Cost Management.',
    credentialsSummary: 'App Registration (Client ID + Secret) o Managed Identity',
    permissionsSummary: [
      'Microsoft.Compute/virtualMachines/read',
      'Microsoft.Compute/virtualMachines/start/action',
      'Microsoft.Insights/metrics/read',
      'Microsoft.CostManagement/query',
    ],
    logo: 'azure',
    toneClass: 'provider-card--azure',
    scope: 'cloud',
    cloudApiProvider: 'AZURE',
    defaultCredentialType: 'client_secret',
  },
  {
    id: 'CLOUDING',
    name: 'Clouding.io',
    shortName: 'Clouding',
    description: 'Instancias cloud europeas, redes privadas, métricas y facturación unificada.',
    credentialsSummary: 'API Token con permisos de instancias y redes',
    permissionsSummary: [
      'instances.list / instances.create',
      'networks.read',
      'images.read',
      'billing.read',
    ],
    logo: 'clouding',
    toneClass: 'provider-card--clouding',
    scope: 'cloud',
    cloudApiProvider: 'CLOUDING',
    defaultCredentialType: 'api_token',
  },
  {
    id: 'DIGITALOCEAN',
    name: 'DigitalOcean',
    shortName: 'DigitalOcean',
    description: 'Droplets, VPC, load balancers y facturación desde la API de DigitalOcean.',
    credentialsSummary: 'Personal Access Token con alcance de lectura/escritura',
    permissionsSummary: ['droplet:read', 'droplet:write', 'account:read', 'vpc:read'],
    logo: 'digitalocean',
    toneClass: 'provider-card--do',
    scope: 'vps',
    defaultCredentialType: 'api_token',
  },
  {
    id: 'HETZNER',
    name: 'Hetzner Cloud',
    shortName: 'Hetzner',
    description: 'Servidores cloud, redes privadas y volúmenes en Hetzner Cloud.',
    credentialsSummary: 'API Token del panel Hetzner Cloud',
    permissionsSummary: ['servers:read', 'servers:write', 'networks:read', 'volumes:read'],
    logo: 'hetzner',
    toneClass: 'provider-card--hetzner',
    scope: 'vps',
    defaultCredentialType: 'api_token',
  },
  {
    id: 'CLOUDFLARE',
    name: 'Cloudflare',
    shortName: 'Cloudflare',
    description: 'DNS, Workers, R2 y reglas de firewall desde la API de Cloudflare.',
    credentialsSummary: 'API Token con permisos de zona o Global API Key + email',
    permissionsSummary: ['Zone:Read', 'DNS:Edit', 'Account:Read', 'Workers Routes:Read'],
    logo: 'docker',
    toneClass: 'provider-card--cf',
    scope: 'platform',
    defaultCredentialType: 'api_token',
  },
  {
    id: 'LINODE',
    name: 'Linode / Akamai',
    shortName: 'Linode',
    description: 'Instancias Linode, volúmenes, balanceadores y facturación.',
    credentialsSummary: 'Personal Access Token de Linode API v4',
    permissionsSummary: ['linodes:read_write', 'volumes:read_only', 'account:read_only'],
    logo: 'linode',
    toneClass: 'provider-card--linode',
    scope: 'vps',
    defaultCredentialType: 'api_token',
  },
  {
    id: 'OVH',
    name: 'OVHcloud',
    shortName: 'OVH',
    description: 'Instancias Public Cloud, vRack y facturación OVH.',
    credentialsSummary: 'Application Key + Secret + Consumer Key (API OVH)',
    permissionsSummary: ['GET /cloud/project/*', 'GET /me/bill', 'POST /cloud/project/*/instance'],
    logo: 'ovh',
    toneClass: 'provider-card--ovh',
    scope: 'vps',
    defaultCredentialType: 'ovh_keys',
  },
  {
    id: 'IONOS',
    name: 'IONOS Cloud',
    shortName: 'IONOS',
    description: 'Servidores cloud, redes privadas y facturación desde la API de IONOS.',
    credentialsSummary: 'API Token del panel IONOS Cloud',
    permissionsSummary: ['servers:read', 'servers:write', 'datacenters:read', 'lan:read'],
    logo: 'ionos',
    toneClass: 'provider-card--ionos',
    scope: 'vps',
    defaultCredentialType: 'api_token',
  },
  {
    id: 'VULTR',
    name: 'Vultr',
    shortName: 'Vultr',
    description: 'Instancias cloud, block storage y redes privadas en Vultr.',
    credentialsSummary: 'Personal API Key de Vultr',
    permissionsSummary: ['instances:read', 'instances:write', 'billing:read', 'network:read'],
    logo: 'vultr',
    toneClass: 'provider-card--vultr',
    scope: 'vps',
    defaultCredentialType: 'api_token',
  },
  {
    id: 'SCALEWAY',
    name: 'Scaleway',
    shortName: 'Scaleway',
    description: 'Instancias Instances, Elastic Metal y facturación Scaleway.',
    credentialsSummary: 'Secret Key de Scaleway IAM',
    permissionsSummary: ['instance:read', 'instance:write', 'billing:read', 'vpc:read'],
    logo: 'scaleway',
    toneClass: 'provider-card--scaleway',
    scope: 'vps',
    defaultCredentialType: 'api_token',
  },
  {
    id: 'KUBERNETES',
    name: 'Kubernetes',
    shortName: 'Kubernetes',
    description: 'Clusters gestionados o self-hosted: pods, deployments, servicios y eventos.',
    credentialsSummary: 'Kubeconfig o token de service account con RBAC de lectura',
    permissionsSummary: ['get/list pods', 'get/list deployments', 'get/list services', 'get/list namespaces'],
    logo: 'kubernetes',
    toneClass: 'provider-card--k8s',
    scope: 'platform',
    defaultCredentialType: 'kubeconfig',
  },
  {
    id: 'DOCKER',
    name: 'Docker',
    shortName: 'Docker',
    description: 'Hosts Docker Engine o Swarm: contenedores, imágenes, redes y volúmenes.',
    credentialsSummary: 'TLS cert + endpoint Docker API o socket SSH tunelizado',
    permissionsSummary: ['containers:inspect', 'images:list', 'networks:list', 'volumes:list'],
    logo: 'docker',
    toneClass: 'provider-card--docker',
    scope: 'platform',
    defaultCredentialType: 'tls',
  },
  {
    id: 'GITHUB',
    name: 'GitHub',
    shortName: 'GitHub',
    description: 'Repositorios, Actions, webhooks y despliegues desde GitHub.',
    credentialsSummary: 'Personal Access Token o GitHub App con scopes de repo',
    permissionsSummary: ['repo', 'read:org', 'admin:repo_hook', 'workflow'],
    logo: 'github',
    toneClass: 'provider-card--github',
    scope: 'platform',
    defaultCredentialType: 'pat',
  },
  {
    id: 'GITLAB',
    name: 'GitLab',
    shortName: 'GitLab',
    description: 'Proyectos, pipelines CI/CD, runners y despliegues GitLab.',
    credentialsSummary: 'Personal Access Token o OAuth con alcance api',
    permissionsSummary: ['read_api', 'read_repository', 'read_user', 'write_repository'],
    logo: 'gitlab',
    toneClass: 'provider-card--gitlab',
    scope: 'platform',
    defaultCredentialType: 'pat',
  },
  {
    id: 'JENKINS',
    name: 'Jenkins',
    shortName: 'Jenkins',
    description: 'Jobs, builds, pipelines y agentes desde Jenkins REST API.',
    credentialsSummary: 'Usuario + API Token o credencial de servicio',
    permissionsSummary: ['Job/Read', 'Job/Build', 'Run/Replay', 'Computer/Read'],
    logo: 'jenkins',
    toneClass: 'provider-card--jenkins',
    scope: 'platform',
    defaultCredentialType: 'api_token',
  },
  {
    id: 'TERRAFORM',
    name: 'Terraform',
    shortName: 'Terraform',
    description: 'Workspaces, runs y estado remoto en Terraform Cloud / Enterprise.',
    credentialsSummary: 'API Token de Terraform Cloud u organización HCP Terraform',
    permissionsSummary: ['organization:read', 'workspace:read', 'run:read', 'state:read'],
    logo: 'terraform',
    toneClass: 'provider-card--terraform',
    scope: 'platform',
    defaultCredentialType: 'api_token',
  },
]

export const CLOUD_WIZARD_CARDS = CLOUD_PROVIDER_CARDS.filter((c) => c.scope === 'cloud')
export const VPS_WIZARD_CARDS = CLOUD_PROVIDER_CARDS.filter((c) => c.scope === 'vps')

export const providerCard = (id: ConnectionProviderId): CloudProviderWizardCard | undefined =>
  CLOUD_PROVIDER_CARDS.find((c) => c.id === id)

export const credentialTypeLabel = (provider: ConnectionProviderId, type: string): string => {
  const map: Record<string, Record<string, string>> = {
    AWS: {
      iam_role: 'IAM Role (ARN)',
      access_key: 'Access Key + Secret',
      oidc: 'OIDC / SSO',
    },
    GCP: {
      service_account: 'Service Account (JSON)',
      workload_identity: 'Workload Identity / OIDC',
    },
    AZURE: {
      client_secret: 'Client ID + Secret',
      managed_identity: 'Managed Identity',
    },
    DIGITALOCEAN: { api_token: 'Personal Access Token' },
    HETZNER: { api_token: 'API Token' },
    CLOUDFLARE: { api_token: 'API Token', global_key: 'Global API Key + Email' },
    LINODE: { api_token: 'Personal Access Token' },
    OVH: { ovh_keys: 'Application + Consumer Keys' },
    IONOS: { api_token: 'API Token' },
    VULTR: { api_token: 'API Key' },
    SCALEWAY: { api_token: 'API Secret Key' },
    CLOUDING: { api_token: 'API Token' },
    KUBERNETES: { kubeconfig: 'Kubeconfig', bearer_token: 'Bearer Token' },
    DOCKER: { tls: 'TLS + Endpoint', ssh_tunnel: 'SSH + socket remoto' },
    GITHUB: { pat: 'Personal Access Token', github_app: 'GitHub App' },
    GITLAB: { pat: 'Personal Access Token', oauth: 'OAuth' },
    JENKINS: { api_token: 'Usuario + API Token' },
    TERRAFORM: { api_token: 'API Token Terraform Cloud' },
  }
  return map[provider]?.[type] ?? type
}

/** Enmascara secretos para el paso de revisión */
export const maskSecret = (value: string | undefined | null, visible = 4): string => {
  const v = (value ?? '').trim()
  if (!v) return '—'
  if (v.length <= visible) return '••••'
  return `${'•'.repeat(Math.min(12, v.length - visible))}${v.slice(-visible)}`
}

export const AWS_ACCOUNT_ID_PATTERN = /^\d{12}$/
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
