import type { PlatformModuleConfig } from '../../shared/platform/platform-module.models'

export const infraTs = (minsAgo: number): string =>
  new Date(Date.now() - minsAgo * 60_000).toISOString()

const hasRows = (rows: unknown): rows is Record<string, unknown>[] =>
  Array.isArray(rows) && rows.length > 0

export const DOCKER_DEMO_CONTAINERS = []

export const DOCKER_DEMO_HOSTS = []

export const DOCKER_DEMO_IMAGES = []

export const DOCKER_DEMO_NETWORKS = []

export const DOCKER_DEMO_VOLUMES = []

export const K8S_DEMO_PODS = []

export const K8S_DEMO_CLUSTERS = []

export const K8S_DEMO_NODES = []

export const K8S_DEMO_NAMESPACES = []

export const K8S_DEMO_DEPLOYMENTS = []

export const K8S_DEMO_SERVICES = []

export const K8S_DEMO_EVENTS = []

export type VpsDemoPortRow = { host: string; port: number; service: string; exposure: string; status: string }
export type VpsDemoSshKeyRow = { name: string; fingerprint: string; users: number; lastUsed: string; status: string }

export const VPS_DEMO_SSH_KEYS: VpsDemoSshKeyRow[] = []

export const VPS_DEMO_SERVICES: Record<string, unknown>[] = []

export const VPS_DEMO_PORTS: VpsDemoPortRow[] = []

export const VPS_DEMO_AUDIT = []

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
