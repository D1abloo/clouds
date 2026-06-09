import type { PlatformModuleConfig } from '../../shared/platform/platform-module.models'

export const infraTs = (minsAgo: number): string =>
  new Date(Date.now() - minsAgo * 60_000).toISOString()

const hasRows = (rows: unknown): rows is Record<string, unknown>[] =>
  Array.isArray(rows) && rows.length > 0

export const DOCKER_DEMO_CONTAINERS = [
  { id: 'c1', name: 'nginx-prod', image: 'nginx:1.25-alpine', host: 'vps-prod-docker-01', status: 'running', ports: '443:443', cpu: 12, ram: 18 },
  { id: 'c2', name: 'postgres-primary', image: 'postgres:16', host: 'vps-prod-docker-01', status: 'running', ports: '5432:5432', cpu: 34, ram: 62 },
  { id: 'c3', name: 'redis-session', image: 'redis:7.2', host: 'vps-staging-docker', status: 'running', ports: '6379:6379', cpu: 8, ram: 14 },
  { id: 'c4', name: 'checkout-api', image: 'checkout-api:v2.4.1', host: 'vps-staging-docker', status: 'running', ports: '8080:8080', cpu: 28, ram: 44 },
  { id: 'c5', name: 'legacy-worker', image: 'legacy-worker:v1.8', host: 'bare-metal-ci-01', status: 'warning', ports: '—', cpu: 71, ram: 80 },
  { id: 'c6', name: 'prometheus', image: 'prom/prometheus:v2.49', host: 'bare-metal-ci-01', status: 'running', ports: '9090:9090', cpu: 19, ram: 36 },
]

export const DOCKER_DEMO_HOSTS = [
  { id: 'dh-01', hostRef: 'vps-prod-docker-01', ip: '10.0.4.12', engine: 'Docker 26.1', os: 'Ubuntu 22.04', containerCount: 14, status: 'running', cpu: 38, ram: 62 },
  { id: 'dh-02', hostRef: 'vps-staging-docker', ip: '10.0.5.8', engine: 'Docker 25.0', os: 'Debian 12', containerCount: 9, status: 'running', cpu: 22, ram: 48 },
  { id: 'dh-03', hostRef: 'bare-metal-ci-01', ip: '192.168.10.40', engine: 'Docker 26.0', os: 'Rocky 9', containerCount: 6, status: 'warning', cpu: 71, ram: 84 },
]

export const DOCKER_DEMO_IMAGES = [
  { name: 'nginx', tag: '1.25-alpine', size: '48 MB', layers: 8, hosts: 3, status: 'running' },
  { name: 'postgres', tag: '16-bookworm', size: '412 MB', layers: 14, hosts: 2, status: 'running' },
  { name: 'redis', tag: '7.2', size: '128 MB', layers: 9, hosts: 2, status: 'running' },
  { name: 'checkout-api', tag: 'v2.4.1', size: '286 MB', layers: 18, hosts: 1, status: 'running' },
  { name: 'legacy-worker', tag: 'v1.8.0', size: '520 MB', layers: 22, hosts: 1, status: 'warning' },
]

export const DOCKER_DEMO_NETWORKS = [
  { name: 'bridge', driver: 'bridge', scope: 'local', containers: 12, subnet: '172.17.0.0/16', status: 'running' },
  { name: 'checkout-net', driver: 'bridge', scope: 'local', containers: 4, subnet: '172.20.0.0/24', status: 'running' },
  { name: 'monitoring', driver: 'overlay', scope: 'swarm', containers: 6, subnet: '10.10.0.0/24', status: 'running' },
  { name: 'legacy-isolated', driver: 'bridge', scope: 'local', containers: 1, subnet: '172.30.0.0/24', status: 'warning' },
]

export const DOCKER_DEMO_VOLUMES = [
  { name: 'pg-data-primary', driver: 'local', mountpoint: '/var/lib/docker/volumes/pg-data', size: '120 GB', attached: 'postgres-primary', status: 'running' },
  { name: 'redis-cache', driver: 'local', mountpoint: '/var/lib/docker/volumes/redis-cache', size: '8 GB', attached: 'redis-session', status: 'running' },
  { name: 'uploads-prod', driver: 'local', mountpoint: '/var/lib/docker/volumes/uploads', size: '240 GB', attached: 'checkout-api', status: 'running' },
  { name: 'orphan-vol-001', driver: 'local', mountpoint: '/var/lib/docker/volumes/orphan', size: '50 GB', attached: '—', status: 'warning' },
]

export const K8S_DEMO_PODS = [
  { name: 'checkout-api-7f8b9c', namespace: 'checkout', status: 'running', node: 'gke-prod-pool-1-a', restarts: 0, cpu: 22, ram: 38 },
  { name: 'checkout-api-2a1d4e', namespace: 'checkout', status: 'running', node: 'gke-prod-pool-1-b', restarts: 1, cpu: 19, ram: 35 },
  { name: 'payment-worker-x9k2', namespace: 'checkout', status: 'running', node: 'gke-prod-pool-1-a', restarts: 0, cpu: 31, ram: 42 },
  { name: 'legacy-app-0', namespace: 'production', status: 'warning', node: 'gke-prod-pool-1-b', restarts: 9, cpu: 55, ram: 68 },
  { name: 'prometheus-0', namespace: 'monitoring', status: 'running', node: 'k3s-master-fra', restarts: 0, cpu: 14, ram: 28 },
  { name: 'api-demo-staging', namespace: 'staging', status: 'running', node: 'k3s-worker-fra-01', restarts: 0, cpu: 11, ram: 22 },
]

export const K8S_DEMO_CLUSTERS = [
  { name: 'prod-eu-west', provider: 'GKE', version: '1.29.2', nodes: 6, pods: 84, status: 'running', region: 'europe-west1' },
  { name: 'staging-shared', provider: 'k3s', version: '1.28.5', nodes: 3, pods: 32, status: 'running', region: 'fra1' },
  { name: 'dev-local', provider: 'kind', version: '1.27.3', nodes: 1, pods: 12, status: 'warning', region: 'local' },
]

export const K8S_DEMO_NODES = [
  { name: 'gke-prod-pool-1-a', cluster: 'prod-eu-west', role: 'worker', cpu: 58, ram: 72, pods: 18, status: 'running' },
  { name: 'gke-prod-pool-1-b', cluster: 'prod-eu-west', role: 'worker', cpu: 62, ram: 68, pods: 16, status: 'running' },
  { name: 'k3s-master-fra', cluster: 'staging-shared', role: 'control-plane', cpu: 41, ram: 55, pods: 11, status: 'running' },
  { name: 'k3s-worker-fra-01', cluster: 'staging-shared', role: 'worker', cpu: 33, ram: 49, pods: 9, status: 'running' },
]

export const K8S_DEMO_NAMESPACES = [
  { name: 'production', cluster: 'prod-eu-west', pods: 42, quotas: 'CPU 32 / RAM 128Gi', status: 'running' },
  { name: 'checkout', cluster: 'prod-eu-west', pods: 18, quotas: 'CPU 16 / RAM 64Gi', status: 'running' },
  { name: 'monitoring', cluster: 'prod-eu-west', pods: 12, quotas: 'CPU 8 / RAM 32Gi', status: 'running' },
  { name: 'staging', cluster: 'staging-shared', pods: 22, quotas: 'CPU 12 / RAM 48Gi', status: 'running' },
]

export const K8S_DEMO_DEPLOYMENTS = [
  { name: 'checkout-api', namespace: 'checkout', replicas: '5/5', strategy: 'RollingUpdate', image: 'checkout-api:v2.4.1', status: 'running' },
  { name: 'payment-worker', namespace: 'checkout', replicas: '3/3', strategy: 'RollingUpdate', image: 'payment-worker:v1.2.0', status: 'running' },
  { name: 'legacy-app', namespace: 'production', replicas: '1/2', strategy: 'Recreate', image: 'legacy-app:v0.9.4', status: 'warning' },
  { name: 'prometheus', namespace: 'monitoring', replicas: '1/1', strategy: 'Recreate', image: 'prom/prometheus:v2.49', status: 'running' },
]

export const K8S_DEMO_SERVICES = [
  { name: 'checkout-api', namespace: 'checkout', type: 'ClusterIP', ports: '8080/TCP', endpoints: 5, status: 'running' },
  { name: 'checkout-api-lb', namespace: 'checkout', type: 'LoadBalancer', ports: '443/TCP', endpoints: 5, status: 'running' },
  { name: 'redis-headless', namespace: 'checkout', type: 'ClusterIP', ports: '6379/TCP', endpoints: 3, status: 'running' },
  { name: 'legacy-app', namespace: 'production', type: 'NodePort', ports: '30080/TCP', endpoints: 1, status: 'warning' },
]

export const K8S_DEMO_EVENTS = [
  { type: 'Normal', reason: 'Scheduled', object: 'pod/checkout-api-7f8b', message: 'Asignado a gke-prod-pool-1-a' },
  { type: 'Warning', reason: 'BackOff', object: 'pod/legacy-app-0', message: 'Reinicio fallido del contenedor' },
  { type: 'Normal', reason: 'ScalingReplicaSet', object: 'deploy/checkout-api', message: 'Escalado a 5 réplicas' },
  { type: 'Warning', reason: 'FailedMount', object: 'pod/worker-crash', message: 'Timeout montando volumen PVC uploads' },
]

export const VPS_DEMO_SSH_KEYS: Record<string, unknown>[] = []

export const VPS_DEMO_SERVICES: Record<string, unknown>[] = []

export const VPS_DEMO_PORTS: Record<string, unknown>[] = []

export const VPS_DEMO_AUDIT: Record<string, unknown>[] = []

const emptyDockerPageData = (): Record<string, unknown> => ({
  hosts: 0,
  running: 0,
  stopped: 0,
  images: 0,
  volumes: 0,
  networks: 0,
  containers: 0,
  items: [],
  hostRows: [],
  imageRows: [],
  networkRows: [],
  volumeRows: [],
})

const emptyKubernetesPageData = (d: Record<string, unknown>): Record<string, unknown> => ({
  ...d,
  clusters: 0,
  namespaceCount: 0,
  podCount: 0,
  deployments: 0,
  services: 0,
  podsWithError: 0,
  podItems: [],
  clusterRows: [],
  nodeRows: [],
  namespaceRows: [],
  deploymentRows: [],
  serviceRows: [],
  eventRows: [],
})

export const mergeDockerPageData = (
  d: Record<string, unknown>,
  allowDemo = true,
): Record<string, unknown> => {
  if (!allowDemo) return { ...emptyDockerPageData(), ...d, items: d['items'] ?? [], hostRows: d['hostRows'] ?? [] }
  return {
    hosts: d['hosts'] ?? DOCKER_DEMO_HOSTS.length,
    running: d['running'] ?? 22,
    stopped: d['stopped'] ?? 4,
    images: d['images'] ?? DOCKER_DEMO_IMAGES.length,
    volumes: d['volumes'] ?? DOCKER_DEMO_VOLUMES.length,
    networks: d['networks'] ?? DOCKER_DEMO_NETWORKS.length,
    containers: d['containers'] ?? 26,
    items: hasRows(d['items']) ? d['items'] : DOCKER_DEMO_CONTAINERS,
    hostRows: hasRows(d['hostRows']) ? d['hostRows'] : DOCKER_DEMO_HOSTS,
    imageRows: hasRows(d['imageRows']) ? d['imageRows'] : DOCKER_DEMO_IMAGES,
    networkRows: hasRows(d['networkRows']) ? d['networkRows'] : DOCKER_DEMO_NETWORKS,
    volumeRows: hasRows(d['volumeRows']) ? d['volumeRows'] : DOCKER_DEMO_VOLUMES,
  }
}

export const mergeKubernetesPageData = (
  d: Record<string, unknown>,
  allowDemo = true,
): Record<string, unknown> => {
  if (!allowDemo) return emptyKubernetesPageData(d)
  return {
    ...d,
    clusters: d['clusters'] ?? K8S_DEMO_CLUSTERS.length,
    namespaceCount: d['namespaceCount'] ?? K8S_DEMO_NAMESPACES.length,
    podCount: d['podCount'] ?? 128,
    deployments: d['deployments'] ?? K8S_DEMO_DEPLOYMENTS.length,
    services: d['services'] ?? K8S_DEMO_SERVICES.length,
    podsWithError: d['podsWithError'] ?? 2,
    podItems: hasRows(d['podItems']) ? d['podItems'] : K8S_DEMO_PODS,
    clusterRows: hasRows(d['clusterRows']) ? d['clusterRows'] : K8S_DEMO_CLUSTERS,
    nodeRows: hasRows(d['nodeRows']) ? d['nodeRows'] : K8S_DEMO_NODES,
    namespaceRows: hasRows(d['namespaceRows']) ? d['namespaceRows'] : K8S_DEMO_NAMESPACES,
    deploymentRows: hasRows(d['deploymentRows']) ? d['deploymentRows'] : K8S_DEMO_DEPLOYMENTS,
    serviceRows: hasRows(d['serviceRows']) ? d['serviceRows'] : K8S_DEMO_SERVICES,
    eventRows: hasRows(d['eventRows']) ? d['eventRows'] : K8S_DEMO_EVENTS,
  }
}

export const INFRA_NETWORK_CONFIG: PlatformModuleConfig = {
  id: 'network',
  title: 'Red',
  description: 'VPC/VNet, subredes, firewalls, grupos de seguridad, balanceadores, IPs públicas y mapa de tráfico multi-cloud.',
  icon: 'device_hub',
  headerActions: [
    { label: 'Añadir regla', icon: 'add', primary: true },
    { label: 'Sincronizar topología', icon: 'sync' },
    { label: 'Mapa de tráfico', icon: 'map' },
  ],
  quickActions: [
    { label: 'Auditar puertos', icon: 'radar' },
    { label: 'Exportar diagrama', icon: 'download' },
    { label: 'Peering', icon: 'hub' },
  ],
  summaryCards: [
    { title: 'VPC / VNet', value: 8, icon: 'account_tree', iconColor: 'purple' },
    { title: 'Subredes', value: 24, icon: 'device_hub', iconColor: 'cyan' },
    { title: 'Balanceadores', value: 6, icon: 'balance', iconColor: 'success' },
    { title: 'IPs públicas', value: 14, icon: 'language', iconColor: 'warn' },
  ],
  tabs: [
    {
      label: 'VPC / VNet',
      searchPlaceholder: 'Nombre, CIDR o proveedor…',
      filters: [{ key: 'provider', label: 'Proveedor', options: ['', 'AWS', 'GCP', 'Azure', 'VPS'] }],
      columns: [
        { key: 'name', label: 'Nombre' },
        { key: 'cidr', label: 'CIDR' },
        { key: 'provider', label: 'Proveedor' },
        { key: 'region', label: 'Región' },
        { key: 'subnets', label: 'Subredes' },
        { key: 'status', label: 'Estado', type: 'status' },
      ],
      rows: [
        {
          name: 'vpc-prod-main',
          cidr: '10.0.0.0/16',
          provider: 'AWS',
          region: 'eu-west-1',
          subnets: 6,
          status: 'running',
          detail: 'VPC principal de producción EU. Peering activo con vpc-shared-services. Flow logs habilitados hacia S3.',
        },
        {
          name: 'vnet-core-prod',
          cidr: '10.1.0.0/16',
          provider: 'Azure',
          region: 'westeurope',
          subnets: 4,
          status: 'running',
          detail: 'VNet hub-spoke con Azure Firewall en subred dedicada. DNS privado linked a checkout.example.com.',
        },
        {
          name: 'vpc-shared-services',
          cidr: '10.2.0.0/16',
          provider: 'GCP',
          region: 'europe-west1',
          subnets: 5,
          status: 'running',
          detail: 'Servicios compartidos: CI/CD runners, registry de imágenes y bastion administrativo.',
        },
        {
          name: 'vps-private-net',
          cidr: '192.168.50.0/24',
          provider: 'VPS',
          region: 'fra1',
          subnets: 3,
          status: 'running',
          detail: 'Red privada Hetzner vSwitch interconectando VPS de staging y runners CI.',
        },
      ],
    },
    {
      label: 'Subredes',
      columns: [
        { key: 'name', label: 'Subred' },
        { key: 'cidr', label: 'CIDR' },
        { key: 'vpc', label: 'VPC/VNet' },
        { key: 'type', label: 'Tipo' },
        { key: 'instances', label: 'Recursos' },
        { key: 'status', label: 'Estado', type: 'status' },
      ],
      rows: [
        { name: 'subnet-web-public-a', cidr: '10.0.1.0/24', vpc: 'vpc-prod-main', type: 'Pública', instances: 12, status: 'running' },
        { name: 'subnet-db-private-a', cidr: '10.0.10.0/24', vpc: 'vpc-prod-main', type: 'Privada', instances: 4, status: 'running' },
        { name: 'subnet-staging', cidr: '10.2.20.0/24', vpc: 'vpc-shared-services', type: 'Privada', instances: 8, status: 'running' },
      ],
    },
    {
      label: 'Firewalls y SG',
      columns: [
        { key: 'name', label: 'Grupo' },
        { key: 'rules', label: 'Reglas' },
        { key: 'attached', label: 'Asociado a' },
        { key: 'inbound', label: 'Entrada' },
        { key: 'status', label: 'Estado', type: 'status' },
      ],
      rows: [
        { name: 'sg-web-public', rules: 6, attached: 'ALB checkout, tier web', inbound: '443, 80', status: 'running' },
        { name: 'nsg-db-internal', rules: 3, attached: 'subnet-db-private', inbound: '5432 (VPC)', status: 'running' },
        { name: 'sg-bastion-legacy', rules: 2, attached: 'vps-bastion-01', inbound: '22 (0.0.0.0/0)', status: 'warning' },
      ],
    },
    {
      label: 'Balanceadores',
      columns: [
        { key: 'name', label: 'Nombre' },
        { key: 'type', label: 'Tipo' },
        { key: 'targets', label: 'Destinos' },
        { key: 'health', label: 'Salud' },
        { key: 'status', label: 'Estado', type: 'status' },
      ],
      rows: [
        { name: 'alb-checkout-prod', type: 'ALB / HTTPS', targets: 6, health: '5/6 OK', status: 'running' },
        { name: 'ilb-api-internal', type: 'Internal LB', targets: 3, health: '3/3 OK', status: 'running' },
        { name: 'gcp-l7-gateway', type: 'L7 Gateway', targets: 4, health: '4/4 OK', status: 'running' },
      ],
    },
    {
      label: 'IPs y DNS',
      columns: [
        { key: 'record', label: 'Registro / IP' },
        { key: 'type', label: 'Tipo' },
        { key: 'target', label: 'Destino' },
        { key: 'ttl', label: 'TTL' },
        { key: 'status', label: 'Estado', type: 'status' },
      ],
      rows: [
        { record: 'api.checkout.example.com', type: 'A / ALIAS', target: 'alb-checkout-prod', ttl: '300s', status: 'running' },
        { record: '203.0.113.44', type: 'Elastic IP', target: 'vps-prod-web-01', ttl: '—', status: 'running' },
        { record: 'bastion.example.com', type: 'A', target: 'vps-bastion-01', ttl: '600s', status: 'warning' },
      ],
    },
  ],
}

export const INFRA_STORAGE_CONFIG: PlatformModuleConfig = {
  id: 'storage',
  title: 'Almacenamiento',
  description: 'Volúmenes cloud, discos VPS, buckets de objetos, snapshots, IOPS y capacidad por proveedor.',
  icon: 'database',
  headerActions: [
    { label: 'Crear volumen', icon: 'add', primary: true },
    { label: 'Adjuntar', icon: 'link' },
    { label: 'Sincronizar', icon: 'sync' },
  ],
  quickActions: [
    { label: 'Limpiar huérfanos', icon: 'cleaning_services' },
    { label: 'Ampliar disco', icon: 'unfold_more' },
    { label: 'Informe IOPS', icon: 'assessment' },
  ],
  summaryCards: [
    { title: 'Volúmenes', value: 38, icon: 'sd_storage', iconColor: 'purple' },
    { title: 'Adjuntos', value: 31, icon: 'link', iconColor: 'success' },
    { title: 'Huérfanos', value: 4, icon: 'link_off', iconColor: 'warn' },
    { title: 'Capacidad total', value: '12.8 TB', icon: 'database', iconColor: 'cyan' },
  ],
  tabs: [
    {
      label: 'Volúmenes',
      searchPlaceholder: 'ID, instancia o tipo…',
      filters: [{ key: 'provider', label: 'Proveedor', options: ['', 'AWS', 'GCP', 'Azure', 'VPS'] }],
      columns: [
        { key: 'id', label: 'ID' },
        { key: 'size', label: 'Tamaño' },
        { key: 'type', label: 'Tipo' },
        { key: 'iops', label: 'IOPS' },
        { key: 'attached', label: 'Adjunto a' },
        { key: 'status', label: 'Estado', type: 'status' },
      ],
      rows: [
        { id: 'vol-web-prod-01', size: '100 GB', type: 'gp3', iops: '3000', attached: 'web-prod-01', status: 'running' },
        { id: 'vol-db-main', size: '500 GB', type: 'io2', iops: '12000', attached: 'db-primary', status: 'running', used: '92%', detail: 'Volumen crítico de base de datos. Snapshot cada 6h. Monitorizar crecimiento diario.' },
        { id: 'vol-analytics', size: '1 TB', type: 'pd-ssd', iops: '8000', attached: 'gcp-analytics-vm', status: 'running' },
        { id: 'vol-orphan-001', size: '50 GB', type: 'standard', iops: '—', attached: '—', status: 'warning', detail: 'Volumen huérfano sin adjuntar desde hace 45 días. Candidato a limpieza automatizada.' },
      ],
    },
    {
      label: 'Object storage',
      columns: [
        { key: 'bucket', label: 'Bucket' },
        { key: 'provider', label: 'Proveedor' },
        { key: 'size', label: 'Tamaño' },
        { key: 'objects', label: 'Objetos' },
        { key: 'status', label: 'Estado', type: 'status' },
      ],
      rows: [
        { bucket: 'cloudops-logs-prod', provider: 'AWS S3', size: '820 GB', objects: '1.2M', status: 'running' },
        { bucket: 'gcp-backups-eu', provider: 'GCS', size: '1.2 TB', objects: '840K', status: 'running' },
        { bucket: 'azure-artifacts', provider: 'Azure Blob', size: '340 GB', objects: '210K', status: 'running' },
      ],
    },
    {
      label: 'Snapshots',
      columns: [
        { key: 'name', label: 'Snapshot' },
        { key: 'source', label: 'Origen' },
        { key: 'size', label: 'Tamaño' },
        { key: 'retention', label: 'Retención' },
        { key: 'status', label: 'Estado', type: 'status' },
      ],
      rows: [
        { name: 'snap-db-daily', source: 'vol-db-main', size: '500 GB', retention: '30 días', status: 'running' },
        { name: 'snap-web-weekly', source: 'vol-web-prod-01', size: '100 GB', retention: '12 semanas', status: 'running' },
      ],
    },
    {
      label: 'Uso y alertas',
      columns: [
        { key: 'resource', label: 'Recurso' },
        { key: 'used', label: 'Uso' },
        { key: 'threshold', label: 'Umbral' },
        { key: 'forecast', label: 'Previsión' },
        { key: 'status', label: 'Estado', type: 'status' },
      ],
      rows: [
        { resource: 'vol-db-main', used: '92%', threshold: '85%', forecast: 'Lleno en 18 días', status: 'warning' },
        { resource: 'uploads-prod (Docker)', used: '78%', threshold: '80%', forecast: 'Estable', status: 'running' },
        { resource: 'cloudops-logs-prod', used: '64%', threshold: '90%', forecast: 'OK', status: 'running' },
      ],
    },
  ],
}

export const INFRA_BACKUPS_CONFIG: PlatformModuleConfig = {
  id: 'backups',
  title: 'Copias de seguridad',
  description: 'Snapshots, políticas programadas, restauraciones demo, retención y alertas de fallos.',
  icon: 'archive',
  headerActions: [
    { label: 'Crear backup', icon: 'add', primary: true },
    { label: 'Restaurar (demo)', icon: 'restore' },
    { label: 'Ejecutar ahora', icon: 'play_arrow' },
  ],
  quickActions: [
    { label: 'Verificar integridad', icon: 'verified' },
    { label: 'Política de retención', icon: 'policy' },
    { label: 'Informe mensual', icon: 'summarize' },
  ],
  summaryCards: [
    { title: 'Programados', value: 14, icon: 'event', iconColor: 'cyan' },
    { title: 'OK (24 h)', value: 11, icon: 'check_circle', iconColor: 'success' },
    { title: 'Fallidos', value: 2, icon: 'error', iconColor: 'warn' },
    { title: 'Tamaño total', value: '2.4 TB', icon: 'storage', iconColor: 'purple' },
  ],
  tabs: [
    {
      label: 'Snapshots',
      searchPlaceholder: 'ID, volumen o job…',
      columns: [
        { key: 'name', label: 'Snapshot' },
        { key: 'source', label: 'Origen' },
        { key: 'size', label: 'Tamaño' },
        { key: 'type', label: 'Tipo' },
        { key: 'createdAt', label: 'Creado', type: 'date' },
        { key: 'status', label: 'Estado', type: 'status' },
      ],
      rows: [
        { name: 'snap-web-prod-daily', source: 'vol-web-01', size: '120 GB', type: 'EBS', createdAt: infraTs(1440), status: 'running' },
        { name: 'snap-db-primary', source: 'vol-db-main', size: '500 GB', type: 'EBS', createdAt: infraTs(2880), status: 'running' },
        { name: 'snap-staging', source: 'vol-stg-01', size: '80 GB', type: 'PD', createdAt: infraTs(720), status: 'warning', detail: 'Backup fuera de ventana SLA. Reintento automático programado en 30 min.' },
        { name: 'snap-k8s-etcd', source: 'etcd-prod', size: '12 GB', type: 'Velero', createdAt: infraTs(360), status: 'running' },
      ],
    },
    {
      label: 'Programación',
      columns: [
        { key: 'name', label: 'Política' },
        { key: 'cron', label: 'Cron' },
        { key: 'retention', label: 'Retención' },
        { key: 'targets', label: 'Destinos' },
        { key: 'status', label: 'Estado', type: 'status' },
      ],
      rows: [
        { name: 'Daily AWS EBS prod', cron: '0 2 * * *', retention: '30 días', targets: '6 volúmenes', status: 'running' },
        { name: 'Weekly VPS tar', cron: '0 3 * * 0', retention: '12 semanas', targets: '8 VPS', status: 'running' },
        { name: 'Hourly DB WAL', cron: '0 * * * *', retention: '48 h', targets: 'db-primary', status: 'running' },
      ],
    },
    {
      label: 'Restauraciones',
      columns: [
        { key: 'job', label: 'Job' },
        { key: 'source', label: 'Snapshot' },
        { key: 'target', label: 'Destino' },
        { key: 'duration', label: 'Duración' },
        { key: 'status', label: 'Estado', type: 'status' },
      ],
      rows: [
        { job: 'restore-staging-042', source: 'snap-web-prod-daily', target: 'vol-stg-restore', duration: '18 min', status: 'success' },
        { job: 'restore-db-drill', source: 'snap-db-primary', target: 'vol-db-dr', duration: '42 min', status: 'success' },
      ],
    },
    {
      label: 'Alertas',
      columns: [
        { key: 'backup', label: 'Backup' },
        { key: 'message', label: 'Mensaje' },
        { key: 'severity', label: 'Severidad', type: 'severity' },
        { key: 'status', label: 'Estado', type: 'status' },
      ],
      rows: [
        { backup: 'snap-staging', message: 'Ventana superada — reintento programado', severity: 'warning', status: 'warning' },
        { backup: 'k8s-etcd', message: 'Timeout del agente de backup', severity: 'critical', status: 'failed' },
      ],
    },
  ],
}

export const INFRA_CAPACITY_CONFIG: PlatformModuleConfig = {
  id: 'capacity-planner',
  title: 'Planificador de capacidad',
  description: 'Utilización CPU/RAM/disco, análisis de tráfico, recomendaciones de resize y predicción de crecimiento.',
  icon: 'trending_up',
  headerActions: [
    { label: 'Generar plan', icon: 'auto_graph', primary: true },
    { label: 'Aplicar resize', icon: 'straighten' },
    { label: 'Exportar', icon: 'download' },
  ],
  quickActions: [
    { label: 'Simular escenario', icon: 'science' },
    { label: 'Reservas RI/SP', icon: 'savings' },
    { label: 'Informe ejecutivo', icon: 'description' },
  ],
  summaryCards: [
    { title: 'CPU infrautilizada', value: 7, icon: 'speed', iconColor: 'cyan' },
    { title: 'RAM infrautilizada', value: 5, icon: 'memory', iconColor: 'purple' },
    { title: 'Disco cerca del límite', value: 3, icon: 'storage', iconColor: 'warn' },
    { title: 'Ahorro estimado', value: '1.240 €/mes', icon: 'savings', iconColor: 'success' },
  ],
  tabs: [
    {
      label: 'Recomendaciones',
      columns: [
        { key: 'resource', label: 'Recurso' },
        { key: 'cpu', label: 'CPU media' },
        { key: 'ram', label: 'RAM media' },
        { key: 'disk', label: 'Disco' },
        { key: 'action', label: 'Acción recomendada' },
        { key: 'savings', label: 'Ahorro/mes' },
      ],
      rows: [
        { resource: 'web-prod-01', cpu: '8%', ram: '22%', disk: '48%', action: 'Reducir t3.large → t3.medium', savings: '42 €' },
        { resource: 'db-primary', cpu: '45%', ram: '78%', disk: '92%', action: 'Ampliar disco +100 GB', savings: '—', detail: 'Disco al 92%. Ampliación recomendada antes de fin de mes para evitar degradación de IOPS.' },
        { resource: 'gcp-analytics-vm', cpu: '12%', ram: '18%', disk: '35%', action: 'Instancia reservada 1 año', savings: '310 €' },
        { resource: 'vps-staging-app', cpu: '6%', ram: '15%', disk: '40%', action: 'Downgrade plan VPS', savings: '28 €' },
      ],
    },
    {
      label: 'Tráfico',
      columns: [
        { key: 'resource', label: 'Recurso' },
        { key: 'networkIn', label: 'Entrada (Mbps)' },
        { key: 'networkOut', label: 'Salida (Mbps)' },
        { key: 'p95', label: 'P95' },
        { key: 'status', label: 'Estado', type: 'status' },
      ],
      rows: [
        { resource: 'alb-checkout-prod', networkIn: 420, networkOut: 890, p95: '1.1 Gbps', status: 'warning' },
        { resource: 'web-prod-01', networkIn: 45, networkOut: 120, p95: '180 Mbps', status: 'running' },
        { resource: 'vps-db-primary', networkIn: 12, networkOut: 28, p95: '35 Mbps', status: 'running' },
      ],
    },
    {
      label: 'Escenarios',
      columns: [
        { key: 'name', label: 'Escenario' },
        { key: 'growth', label: 'Crecimiento' },
        { key: 'horizon', label: 'Horizonte' },
        { key: 'cost', label: 'Coste proyectado' },
        { key: 'status', label: 'Estado', type: 'status' },
      ],
      rows: [
        { name: 'Black Friday +40% tráfico', growth: '+40% requests', horizon: 'Q4 2026', cost: '18.400 €/mes', status: 'running' },
        { name: 'Migración EU → US', growth: 'Duplicar región', horizon: 'H2 2026', cost: '22.100 €/mes', status: 'pending' },
        { name: 'Optimización actual', growth: 'Rightsizing', horizon: '30 días', cost: '14.200 €/mes', status: 'running' },
      ],
    },
    {
      label: 'Reservas',
      columns: [
        { key: 'provider', label: 'Proveedor' },
        { key: 'type', label: 'Tipo' },
        { key: 'coverage', label: 'Cobertura' },
        { key: 'savings', label: 'Ahorro anual' },
        { key: 'status', label: 'Estado', type: 'status' },
      ],
      rows: [
        { provider: 'AWS', type: 'Savings Plan compute', coverage: '68%', savings: '4.800 €', status: 'running' },
        { provider: 'GCP', type: 'Committed use', coverage: '52%', savings: '2.100 €', status: 'running' },
        { provider: 'Azure', type: 'Reservations VM', coverage: '41%', savings: '1.650 €', status: 'warning' },
      ],
    },
  ],
}
