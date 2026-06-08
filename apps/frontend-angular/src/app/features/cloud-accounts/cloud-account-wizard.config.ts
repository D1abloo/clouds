import type { CloudProvider } from '../../core/models/api.models'
import type { NavLogoKey } from '../../shared/theme/nav-logo.types'

export type WizardStep = 'provider' | 'credentials' | 'review'

/** Proveedores soportados en el asistente de conexión */
export type ConnectionProviderId =
  | CloudProvider
  | 'DIGITALOCEAN'
  | 'HETZNER'
  | 'CLOUDFLARE'
  | 'LINODE'
  | 'OVH'
  | 'KUBERNETES'
  | 'DOCKER'
  | 'GITHUB'
  | 'GITLAB'
  | 'JENKINS'
  | 'TERRAFORM'

export interface CloudProviderWizardCard {
  id: ConnectionProviderId
  name: string
  shortName: string
  description: string
  credentialsSummary: string
  permissionsSummary: string[]
  logo: NavLogoKey
  toneClass: string
  /** Si guarda vía API cloud-accounts (AWS/GCP/AZURE) */
  cloudApiProvider?: CloudProvider
  defaultCredentialType: string
  defaultRegion?: string
}

export const CLOUD_WIZARD_STEPS: { id: WizardStep; label: string }[] = [
  { id: 'provider', label: 'Proveedor' },
  { id: 'credentials', label: 'Conexión' },
  { id: 'review', label: 'Revisión' },
]

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
    cloudApiProvider: 'AWS',
    defaultCredentialType: 'iam_role',
    defaultRegion: 'us-east-1',
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
    cloudApiProvider: 'GCP',
    defaultCredentialType: 'service_account',
    defaultRegion: 'us-central1-a',
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
    cloudApiProvider: 'AZURE',
    defaultCredentialType: 'client_secret',
    defaultRegion: 'westeurope',
  },
  {
    id: 'DIGITALOCEAN',
    name: 'DigitalOcean',
    shortName: 'DigitalOcean',
    description: 'Droplets, VPC, load balancers y facturación desde la API de DigitalOcean.',
    credentialsSummary: 'Personal Access Token con alcance de lectura/escritura',
    permissionsSummary: ['droplet:read', 'droplet:write', 'account:read', 'vpc:read'],
    logo: 'docker',
    toneClass: 'provider-card--do',
    defaultCredentialType: 'api_token',
    defaultRegion: 'nyc3',
  },
  {
    id: 'HETZNER',
    name: 'Hetzner Cloud',
    shortName: 'Hetzner',
    description: 'Servidores cloud, redes privadas y volúmenes en Hetzner Cloud.',
    credentialsSummary: 'API Token del panel Hetzner Cloud',
    permissionsSummary: ['servers:read', 'servers:write', 'networks:read', 'volumes:read'],
    logo: 'docker',
    toneClass: 'provider-card--hetzner',
    defaultCredentialType: 'api_token',
    defaultRegion: 'fsn1',
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
    defaultCredentialType: 'api_token',
  },
  {
    id: 'LINODE',
    name: 'Linode / Akamai',
    shortName: 'Linode',
    description: 'Instancias Linode, volúmenes, balanceadores y facturación.',
    credentialsSummary: 'Personal Access Token de Linode API v4',
    permissionsSummary: ['linodes:read_write', 'volumes:read_only', 'account:read_only'],
    logo: 'docker',
    toneClass: 'provider-card--linode',
    defaultCredentialType: 'api_token',
    defaultRegion: 'eu-central',
  },
  {
    id: 'OVH',
    name: 'OVHcloud',
    shortName: 'OVH',
    description: 'Instancias Public Cloud, vRack y facturación OVH.',
    credentialsSummary: 'Application Key + Secret + Consumer Key (API OVH)',
    permissionsSummary: ['GET /cloud/project/*', 'GET /me/bill', 'POST /cloud/project/*/instance'],
    logo: 'docker',
    toneClass: 'provider-card--ovh',
    defaultCredentialType: 'ovh_keys',
    defaultRegion: 'GRA',
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
    defaultCredentialType: 'api_token',
  },
]

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
