import type { InfraResourceRow } from './infrastructure-workspace.types'
import { csvEscape, downloadJsonFile, downloadTextFile, slugifyFilename, triggerBlobDownload } from './infrastructure-report-export.util'

export type ModuleOpStatus = 'ok' | 'warn' | 'fail'

export interface ModuleOpKpi {
  label: string
  value: string
  tone?: 'ok' | 'warn' | 'crit'
  icon?: string
}

export interface ModuleOpAlert {
  severity: ModuleOpStatus
  message: string
}

export interface ModuleOpStep {
  label: string
  status: ModuleOpStatus
  detail: string
  durationMs?: number
}

export interface ModuleOpTable {
  headers: string[]
  rows: string[][]
}

export interface ModuleOpSection {
  title: string
  icon?: string
  items?: string[]
  table?: ModuleOpTable
  code?: string
  steps?: ModuleOpStep[]
}

export interface ModuleOperationReport {
  moduleId: string
  actionId: string
  title: string
  subtitle: string
  generatedAt: string
  durationSec: number
  status: ModuleOpStatus
  resourceName?: string
  actionLabel?: string
  summary?: string
  impact?: string
  agent?: string
  alerts?: ModuleOpAlert[]
  kpis: ModuleOpKpi[]
  sections: ModuleOpSection[]
  recommendations: string[]
  exportBase: string
}

const hashSeed = (value: string): number =>
  value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)

const field = (row: InfraResourceRow, ...labels: string[]): string => {
  for (const label of labels) {
    const hit = row.fields.find((f) => f.label.toLowerCase().includes(label.toLowerCase()))
    if (hit?.value) return hit.value
  }
  return row.subtitle ?? '—'
}

const baseReport = (
  moduleId: string,
  actionId: string,
  title: string,
  subtitle: string,
  resourceName?: string,
): ModuleOperationReport => ({
  moduleId,
  actionId,
  title,
  subtitle,
  resourceName,
  generatedAt: new Date().toLocaleString('es-ES'),
  durationSec: 2 + (hashSeed(`${moduleId}:${actionId}:${resourceName ?? ''}`) % 8),
  status: 'ok',
  kpis: [],
  sections: [],
  recommendations: [],
  exportBase: slugifyFilename(`${moduleId}-${actionId}-${resourceName ?? 'fleet'}`),
})

export const buildDockerInspectReport = (row: InfraResourceRow): ModuleOperationReport => {
  const cpu = row.metrics?.find((m) => m.label === 'CPU')?.value ?? 12 + (hashSeed(row.title) % 35)
  const ram = row.metrics?.find((m) => m.label === 'RAM')?.value ?? 24 + (hashSeed(row.title) % 40)
  const r = baseReport('docker', 'inspect', `Inspección · ${row.title}`, field(row, 'host', 'imagen'), row.title)
  r.kpis = [
    { label: 'Estado', value: row.status },
    { label: 'Imagen', value: field(row, 'imagen') },
    { label: 'CPU', value: `${cpu}%` },
    { label: 'RAM', value: `${ram}%` },
    { label: 'Puertos', value: field(row, 'puerto', 'ports') },
    { label: 'Uptime', value: `${hashSeed(row.title) % 720}h` },
  ]
  r.sections = [
    {
      title: 'Configuración runtime',
      icon: 'settings',
      code: JSON.stringify(
        {
          Id: row.id,
          Name: row.title,
          State: { Status: row.status, Running: row.status.includes('run'), ExitCode: 0 },
          Config: { Image: field(row, 'imagen'), Env: ['NODE_ENV=production', 'LOG_LEVEL=info'] },
          Mounts: [{ Type: 'volume', Source: 'checkout-data', Destination: '/data' }],
          NetworkSettings: { Networks: { 'checkout-net': { IPAddress: '172.18.0.' + (hashSeed(row.title) % 200 + 2) } } },
        },
        null,
        2,
      ),
    },
    {
      title: 'Healthcheck',
      icon: 'favorite',
      steps: [
        { label: 'HTTP GET /health', status: 'ok', detail: '200 OK · 18ms', durationMs: 18 },
        { label: 'CPU throttle', status: 'ok', detail: 'Sin throttling', durationMs: 4 },
      ],
    },
  ]
  r.recommendations = ['Revisar límites de memoria si el contenedor supera 80% de uso sostenido.']
  return r
}

export const buildDockerLogsReport = (row: InfraResourceRow): ModuleOperationReport => {
  const errCount = hashSeed(row.title) % 3
  const host = field(row, 'host')
  const image = field(row, 'imagen')
  const r = baseReport('docker', 'logs', `Logs · ${row.title}`, 'Últimas 200 líneas · stdout + stderr', row.title)
  r.kpis = [
    { label: 'Líneas', value: '200' },
    { label: 'Errores', value: String(errCount), tone: errCount ? 'warn' : 'ok' },
    { label: 'Warnings', value: String(1 + (hashSeed(row.title) % 2)) },
    { label: 'Stream', value: 'stdout+stderr' },
    { label: 'Host', value: host },
    { label: 'Imagen', value: image },
  ]
  const now = Date.now()
  const ts = (offsetMs: number) => new Date(now - offsetMs).toISOString()
  r.sections = [
    {
      title: 'Visor de logs',
      icon: 'article',
      code: [
        `[${ts(420000)}] INFO  ${row.title} · container start · image=${image}`,
        `[${ts(418000)}] INFO  Loading config from /etc/app/config.yaml`,
        `[${ts(415000)}] INFO  Connected to postgres://checkout-db:5432`,
        `[${ts(390000)}] INFO  HTTP server listening on 0.0.0.0:8080`,
        `[${ts(360000)}] INFO  GET /health 200 12ms`,
        `[${ts(240000)}] INFO  GET /api/v1/checkout 200 42ms user_agent=Mozilla`,
        `[${ts(180000)}] WARN  Slow query detected · duration=890ms · query=SELECT * FROM orders`,
        `[${ts(120000)}] INFO  GET /api/v1/checkout 200 38ms`,
        `[${ts(60000)}] INFO  Metrics scrape · cpu=${12 + (hashSeed(row.title) % 30)}% ram=${24 + (hashSeed(row.title) % 35)}%`,
        `[${ts(30000)}] INFO  Health check passed · uptime=${hashSeed(row.title) % 720}h`,
        ...(errCount ? [`[${ts(15000)}] ERROR Connection reset by peer · upstream=redis:6379`] : []),
        `[${ts(0)}] INFO  Log tail · host=${host} · status=${row.status}`,
      ].join('\n'),
    },
    {
      title: 'Distribución',
      icon: 'bar_chart',
      table: {
        headers: ['Nivel', 'Count', '%'],
        rows: [
          ['INFO', String(185 - errCount), '92%'],
          ['WARN', String(2 + (hashSeed(row.title) % 2)), '4%'],
          ['ERROR', String(errCount), `${errCount}%`],
        ],
      },
    },
  ]
  if (errCount) {
    r.status = 'warn'
    r.recommendations = ['Revisar conexión a Redis y timeouts del pool de conexiones.']
  }
  return r
}

export const buildDockerRestartReport = (row: InfraResourceRow): ModuleOperationReport => {
  const r = baseReport('docker', 'restart', `Reinicio · ${row.title}`, 'Reinicio graceful completado', row.title)
  r.sections = [
    {
      title: 'Pasos ejecutados',
      icon: 'restart_alt',
      steps: [
        { label: 'SIGTERM a PID 1', status: 'ok', detail: 'Timeout 10s', durationMs: 1200 },
        { label: 'Container stop', status: 'ok', detail: 'Exit 0', durationMs: 800 },
        { label: 'Container start', status: 'ok', detail: row.status, durationMs: 2400 },
        { label: 'Healthcheck', status: 'ok', detail: 'HTTP 200', durationMs: 3200 },
      ],
    },
  ]
  r.kpis = [{ label: 'Downtime', value: '~4.2 s' }, { label: 'Política', value: 'unless-stopped' }]
  return r
}

export const buildDockerPruneReport = (): ModuleOperationReport => {
  const r = baseReport('docker', 'prune', 'Prune de recursos Docker', 'Limpieza en hosts gestionados')
  r.kpis = [
    { label: 'Espacio liberado', value: '2.4 GB' },
    { label: 'Contenedores', value: '3' },
    { label: 'Imágenes', value: '12' },
    { label: 'Redes', value: '2' },
  ]
  r.sections = [
    {
      title: 'Resultado por host',
      icon: 'dns',
      table: {
        headers: ['Host', 'Contenedores', 'Imágenes', 'Redes', 'Liberado'],
        rows: [
          ['vps-prod-docker-01', '2', '8', '1', '1.8 GB'],
          ['vps-staging-docker', '1', '4', '1', '620 MB'],
        ],
      },
    },
  ]
  r.recommendations = ['Programar prune semanal en ventana de mantenimiento.']
  return r
}

export const buildDockerPullReport = (): ModuleOperationReport => {
  const r = baseReport('docker', 'pull', 'Pull imagen checkout-api:v2.4.1', 'Registry interno · cosign verificado')
  r.kpis = [
    { label: 'Tamaño', value: '412 MB' },
    { label: 'Digest', value: 'sha256:ab12…f9' },
    { label: 'Hosts', value: '2' },
  ]
  r.sections = [
    {
      title: 'Capas descargadas',
      icon: 'download',
      steps: [
        { label: 'Auth registry', status: 'ok', detail: 'Token OIDC 1h', durationMs: 420 },
        { label: 'Pull amd64', status: 'ok', detail: '6 capas', durationMs: 82000 },
        { label: 'Verify cosign', status: 'ok', detail: 'Firma válida', durationMs: 1200 },
      ],
    },
  ]
  return r
}

export const buildDockerComposeReport = (): ModuleOperationReport => {
  const r = baseReport('docker', 'compose', 'Docker Compose exportado', 'Generado desde stacks en producción')
  r.sections = [
    {
      title: 'compose.yaml',
      icon: 'code',
      code: `version: "3.8"\nservices:\n  checkout-api:\n    image: checkout-api:v2.4.1\n    ports:\n      - "8080:8080"\n    networks:\n      - checkout-net\n    restart: unless-stopped\nnetworks:\n  checkout-net:\n    external: true`,
    },
  ]
  return r
}

export const buildK8sDescribeReport = (row: InfraResourceRow): ModuleOperationReport => {
  const r = baseReport('kubernetes', 'describe', `Describe · ${row.title}`, field(row, 'namespace', 'cluster'), row.title)
  r.sections = [
    {
      title: 'Eventos y condiciones',
      icon: 'description',
      code: `Name:         ${row.title}\nNamespace:    ${field(row, 'namespace')}\nStatus:       ${row.status}\nConditions:\n  Ready        True\n  Scheduled    True\nEvents:\n  Normal  Scheduled  pod assigned to node pool\n  Normal  Pulled     container image already present`,
    },
    {
      title: 'Checks',
      icon: 'verified',
      steps: [
        { label: 'API reachable', status: 'ok', detail: field(row, 'cluster'), durationMs: 45 },
        { label: 'Resource exists', status: 'ok', detail: row.title, durationMs: 28 },
      ],
    },
  ]
  return r
}

export const buildK8sLogsReport = (row: InfraResourceRow): ModuleOperationReport => {
  const r = baseReport('kubernetes', 'logs', `Logs · ${row.title}`, 'Contenedor principal · --tail=200', row.title)
  r.sections = [
    {
      title: 'kubectl logs',
      icon: 'article',
      code: `2026-06-06T10:00:01Z INFO  Starting ${row.title}\n2026-06-06T10:00:02Z INFO  Connected to Redis\n2026-06-06T10:00:05Z INFO  HTTP server listening :8080\n2026-06-06T10:05:12Z WARN  latency spike 420ms`,
    },
  ]
  return r
}

export const buildK8sYamlReport = (row: InfraResourceRow): ModuleOperationReport => {
  const r = baseReport('kubernetes', 'yaml', `YAML · ${row.title}`, 'Manifiesto exportado', row.title)
  r.sections = [
    {
      title: 'Manifiesto',
      icon: 'code',
      code: `apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: ${row.title}\n  namespace: ${field(row, 'namespace')}\nspec:\n  replicas: ${field(row, 'réplica', 'replica') || '3'}\n  selector:\n    matchLabels:\n      app: ${row.title}`,
    },
  ]
  return r
}

export const buildK8sScaleReport = (row: InfraResourceRow, replicas = 5): ModuleOperationReport => {
  const r = baseReport('kubernetes', 'scale', `Escalado · ${row.title}`, `${field(row, 'réplica', 'replica') || '3'} → ${replicas} réplicas`, row.title)
  r.kpis = [
    { label: 'Réplicas', value: String(replicas) },
    { label: 'Ready', value: `${replicas}/${replicas}` },
    { label: 'Strategy', value: 'RollingUpdate' },
  ]
  r.sections = [
    {
      title: 'Rollout',
      icon: 'unfold_more',
      steps: [
        { label: 'kubectl scale', status: 'ok', detail: `--replicas=${replicas}`, durationMs: 120 },
        { label: 'Pods scheduling', status: 'ok', detail: `${replicas} pods`, durationMs: 45000 },
        { label: 'Endpoints ready', status: 'ok', detail: 'Service updated', durationMs: 52000 },
      ],
    },
  ]
  return r
}

export const buildK8sEventsReport = (): ModuleOperationReport => {
  const r = baseReport('kubernetes', 'events', 'Eventos del cluster', 'prod-eu-west · últimos 50')
  r.sections = [
    {
      title: 'Eventos recientes',
      icon: 'event',
      table: {
        headers: ['Tipo', 'Objeto', 'Razón', 'Mensaje'],
        rows: [
          ['Normal', 'pod/checkout-api-7f8b', 'Scheduled', 'Asignado a pool-1-a'],
          ['Warning', 'pod/legacy-app-0', 'BackOff', 'Reinicio fallido'],
          ['Normal', 'deploy/checkout-api', 'ScalingReplicaSet', 'Escalado a 5'],
        ],
      },
    },
  ]
  return r
}

export const buildK8sKubeconfigReport = (): ModuleOperationReport => {
  const r = baseReport('kubernetes', 'kubeconfig', 'Kubeconfig exportado', 'Contexto prod-eu-west · token 1h')
  r.sections = [
    {
      title: 'Contexto',
      icon: 'vpn_key',
      code: `apiVersion: v1\nkind: Config\nclusters:\n- name: prod-eu-west\n  cluster:\n    server: https://6443.k8s.prod.example.com\ncontexts:\n- name: prod-eu-west\n  context:\n    cluster: prod-eu-west\n    user: cloudops-oidc`,
    },
  ]
  r.recommendations = ['Token expira en 1 hora. No compartir fuera de VPN.']
  return r
}

export const buildPlatformSyncReport = (moduleId: string, row: InfraResourceRow): ModuleOperationReport => {
  const r = baseReport(moduleId, 'sync', `Sincronizado · ${row.title}`, 'Metadatos actualizados desde API cloud', row.title)
  r.kpis = [
    { label: 'Proveedor', value: field(row, 'proveedor', 'provider') || 'Multi' },
    { label: 'Región', value: field(row, 'región', 'region') || '—' },
    { label: 'Estado', value: row.status },
  ]
  r.sections = [
    {
      title: 'API sync',
      icon: 'sync',
      steps: [
        { label: 'DescribeResource', status: 'ok', detail: '200 OK', durationMs: 340 },
        { label: 'Merge inventario', status: 'ok', detail: row.title, durationMs: 120 },
        { label: 'Tags/labels', status: 'ok', detail: 'Actualizados', durationMs: 80 },
      ],
    },
  ]
  return r
}

export const buildPlatformAuditReport = (moduleId: string, row: InfraResourceRow, tabId: string): ModuleOperationReport => {
  const r = baseReport(moduleId, 'audit', `Auditoría · ${row.title}`, `Cambios recientes · ${tabId}`, row.title)
  r.sections = [
    {
      title: 'Registro de cambios',
      icon: 'policy',
      table: {
        headers: ['Fecha', 'Usuario', 'Acción', 'Detalle'],
        rows: [
          [new Date().toLocaleString('es-ES'), 'ops@cloudops', 'UPDATE', `Modificación ${row.title}`],
          [new Date(Date.now() - 86400000).toLocaleString('es-ES'), 'ci-bot', 'SYNC', 'Sync automático'],
          [new Date(Date.now() - 172800000).toLocaleString('es-ES'), 'admin@cloudops', 'CREATE', 'Alta inicial'],
        ],
      },
    },
  ]
  return r
}

export const buildPlatformAlertReport = (moduleId: string, row: InfraResourceRow): ModuleOperationReport => {
  const r = baseReport(moduleId, 'alert', `Alerta creada · ${row.title}`, 'Umbral personalizado registrado', row.title)
  r.kpis = [
    { label: 'Umbral', value: '85%' },
    { label: 'Ventana', value: '5 min' },
    { label: 'Canal', value: 'Slack #cloudops' },
  ]
  r.recommendations = ['La alerta se evaluará en el próximo ciclo de métricas (5 min).']
  return r
}

export const buildNetworkRuleReport = (row?: InfraResourceRow): ModuleOperationReport => {
  const r = baseReport('network', 'add-rule', 'Regla de firewall añadida', row ? `SG asociado a ${row.title}` : 'Nueva regla inbound')
  r.kpis = [
    { label: 'Puerto', value: '443/TCP' },
    { label: 'Origen', value: '10.0.0.0/8' },
    { label: 'Acción', value: 'Allow' },
  ]
  r.sections = [
    {
      title: 'Regla aplicada',
      icon: 'security',
      table: {
        headers: ['Campo', 'Valor'],
        rows: [
          ['Security Group', row?.title ?? 'sg-web-public'],
          ['Dirección', 'Inbound'],
          ['Protocolo', 'TCP'],
          ['Puerto', '443'],
          ['CIDR', '10.0.0.0/8'],
        ],
      },
    },
  ]
  return r
}

export const buildNetworkTopologyReport = (): ModuleOperationReport => {
  const r = baseReport('network', 'sync-topology', 'Topología sincronizada', 'AWS · GCP · Azure · VPS')
  r.kpis = [
    { label: 'VPC/VNet', value: '8' },
    { label: 'Subredes', value: '24' },
    { label: 'Peering', value: '5' },
    { label: 'LB', value: '6' },
  ]
  r.recommendations = ['Revisar sg-bastion-legacy con regla 0.0.0.0/0 en puerto 22.']
  return r
}

export const buildNetworkTrafficReport = (): ModuleOperationReport => {
  const r = baseReport('network', 'traffic-map', 'Mapa de tráfico', 'Flujos activos últimas 24h')
  r.sections = [
    {
      title: 'Flujos principales',
      icon: 'map',
      table: {
        headers: ['Origen', 'Destino', 'Puerto', 'Volumen', 'Estado'],
        rows: [
          ['Internet', 'alb-checkout-prod', '443', '1.2 TB', 'OK'],
          ['subnet-web', 'subnet-db', '5432', '420 GB', 'OK'],
          ['0.0.0.0/0', 'vps-bastion-01', '22', '12 MB', 'WARN'],
        ],
      },
    },
  ]
  r.status = 'warn'
  return r
}

export const buildStorageVolumeReport = (row?: InfraResourceRow): ModuleOperationReport => {
  const r = baseReport('storage', 'create-volume', 'Volumen creado', row?.title ?? 'gp3 · 500 GB')
  r.kpis = [
    { label: 'Tipo', value: 'gp3' },
    { label: 'Tamaño', value: '500 GB' },
    { label: 'IOPS', value: '3000' },
    { label: 'AZ', value: 'eu-west-1a' },
  ]
  return r
}

export const buildStorageAttachReport = (row: InfraResourceRow): ModuleOperationReport => {
  const r = baseReport('storage', 'attach', `Volumen adjunto · ${row.title}`, field(row, 'instancia', 'instance'), row.title)
  r.sections = [
    {
      title: 'Adjunción',
      icon: 'link',
      steps: [
        { label: 'AttachVolume API', status: 'ok', detail: '/dev/xvdf', durationMs: 2400 },
        { label: 'OS detect', status: 'ok', detail: 'nvme1n1', durationMs: 8000 },
      ],
    },
  ]
  return r
}

export const buildStorageIopsReport = (): ModuleOperationReport => {
  const r = baseReport('storage', 'iops-report', 'Informe IOPS', 'Últimas 24h · todos los volúmenes')
  r.sections = [
    {
      title: 'Top volúmenes',
      icon: 'speed',
      table: {
        headers: ['Volumen', 'Read IOPS', 'Write IOPS', 'Latencia', 'Estado'],
        rows: [
          ['vol-db-primary', '4200', '890', '2.1 ms', 'OK'],
          ['vol-checkout-data', '1800', '420', '1.4 ms', 'OK'],
          ['vol-logs-archive', '120', '45', '4.8 ms', 'OK'],
        ],
      },
    },
  ]
  return r
}

export const buildBackupCreateReport = (row?: InfraResourceRow): ModuleOperationReport => {
  const r = baseReport('backups', 'create', 'Backup iniciado', row?.title ?? 'Snapshot on-demand')
  r.kpis = [
    { label: 'Tipo', value: 'Incremental' },
    { label: 'Retención', value: '30 días' },
    { label: 'Tamaño est.', value: '48 GB' },
  ]
  r.sections = [
    {
      title: 'Progreso',
      icon: 'backup',
      steps: [
        { label: 'Lock opcional', status: 'ok', detail: 'Sin lock', durationMs: 0 },
        { label: 'Snapshot API', status: 'ok', detail: 'snap-0abc123', durationMs: 120000 },
        { label: 'Verificación', status: 'ok', detail: 'Checksum OK', durationMs: 180000 },
      ],
    },
  ]
  return r
}

export const buildBackupRestoreReport = (row: InfraResourceRow): ModuleOperationReport => {
  const r = baseReport('backups', 'restore', `Restauración · ${row.title}`, 'Demo · sin cambios en producción', row.title)
  r.status = 'warn'
  r.recommendations = ['Restauración demo. En producción requiere ventana de mantenimiento aprobada.']
  r.sections = [
    {
      title: 'Plan de restauración',
      icon: 'restore',
      steps: [
        { label: 'Selección snapshot', status: 'ok', detail: field(row, 'snapshot', 'fecha'), durationMs: 200 },
        { label: 'Dry-run', status: 'ok', detail: 'Validación OK', durationMs: 1200 },
        { label: 'Restore (demo)', status: 'warn', detail: 'Simulado', durationMs: 5000 },
      ],
    },
  ]
  return r
}

export const buildBackupIntegrityReport = (): ModuleOperationReport => {
  const r = baseReport('backups', 'integrity', 'Verificación de integridad', 'Todos los snapshots programados')
  r.kpis = [
    { label: 'Snapshots', value: '42' },
    { label: 'OK', value: '41' },
    { label: 'Warn', value: '1', tone: 'warn' },
  ]
  return r
}

export const buildCapacityPlanReport = (): ModuleOperationReport => {
  const r = baseReport('capacity-planner', 'generate-plan', 'Plan de capacidad generado', 'Proyección 90 días')
  r.kpis = [
    { label: 'Ahorro pot.', value: '€2.4k/mes' },
    { label: 'Rightsizing', value: '12 instancias' },
    { label: 'Riesgo', value: '3 WARN', tone: 'warn' },
  ]
  r.sections = [
    {
      title: 'Recomendaciones top',
      icon: 'trending_down',
      items: [
        'Reducir m5.xlarge → m5.large en checkout-api (-€180/mes)',
        'Migrar volúmenes gp2 → gp3 (-€95/mes)',
        'Reservar RI 1yr para pool DB (-€420/mes)',
      ],
    },
  ]
  return r
}

export const buildCapacityResizeReport = (row: InfraResourceRow): ModuleOperationReport => {
  const r = baseReport('capacity-planner', 'resize', `Resize · ${row.title}`, field(row, 'tipo', 'type'), row.title)
  r.sections = [
    {
      title: 'Cambio propuesto',
      icon: 'straighten',
      table: {
        headers: ['Atributo', 'Actual', 'Propuesto'],
        rows: [
          ['Tipo', field(row, 'tipo', 'type'), 'm5.large'],
          ['vCPU', field(row, 'cpu'), '2'],
          ['RAM', field(row, 'ram'), '8 GB'],
          ['Coste/mes', field(row, 'coste', 'cost'), '€120'],
        ],
      },
    },
  ]
  return r
}

export interface ModuleFormValues {
  replicas?: number
  sizeGb?: number
  growthPct?: number
  periodDays?: number
  cpuThreshold?: number
  ramThreshold?: number
  diskThreshold?: number
}

const uptimeFor = (row: InfraResourceRow): string => {
  const h = hashSeed(row.title) % 720
  return h > 48 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${hashSeed(row.id) % 60}m`
}

export const buildDockerStopReport = (row: InfraResourceRow): ModuleOperationReport => {
  const r = baseReport('docker', 'stop', `Detenido · ${row.title}`, 'SIGTERM enviado · contenedor parado', row.title)
  r.sections = [{ title: 'Secuencia', icon: 'stop_circle', steps: [
    { label: 'SIGTERM', status: 'ok', detail: 'Timeout 10s', durationMs: 10000 },
    { label: 'Container stopped', status: 'ok', detail: 'Exit 0', durationMs: 10200 },
  ]}]
  return r
}

export const buildDockerStartReport = (row: InfraResourceRow): ModuleOperationReport => {
  const r = baseReport('docker', 'start', `Iniciado · ${row.title}`, 'Contenedor en ejecución', row.title)
  r.kpis = [{ label: 'Estado', value: 'running' }, { label: 'Health', value: 'starting → healthy' }]
  return r
}

export const buildDockerImageDetailReport = (row: InfraResourceRow): ModuleOperationReport => {
  const r = baseReport('docker', 'image', `Imagen · ${field(row, 'imagen', 'tag') || row.title}`, 'Capas y digest', row.title)
  r.kpis = [
    { label: 'Tag', value: field(row, 'tag', 'versión') || 'latest' },
    { label: 'Tamaño', value: field(row, 'tamaño', 'size') || '412 MB' },
    { label: 'Digest', value: 'sha256:ab12…f9' },
    { label: 'Base', value: 'alpine:3.19' },
  ]
  r.sections = [{ title: 'Capas', icon: 'layers', table: { headers: ['Capa', 'Tamaño'], rows: [['base', '8 MB'], ['deps', '120 MB'], ['app', '284 MB']] } }]
  return r
}

export const buildDockerUsageReport = (row: InfraResourceRow): ModuleOperationReport => {
  const cpu = row.metrics?.find((m) => m.label === 'CPU')?.value ?? 12 + (hashSeed(row.title) % 40)
  const ram = row.metrics?.find((m) => m.label === 'RAM')?.value ?? 28 + (hashSeed(row.title) % 35)
  const disk = row.metrics?.find((m) => m.label === 'Disco')?.value ?? 18 + (hashSeed(row.title) % 25)
  const r = baseReport('docker', 'usage', `Uso · ${row.title}`, 'CPU, RAM, disco e I/O en tiempo real', row.title)
  r.kpis = [
    { label: 'CPU', value: `${cpu}%`, tone: cpu > 80 ? 'warn' : 'ok' },
    { label: 'RAM', value: `${ram}%`, tone: ram > 85 ? 'warn' : 'ok' },
    { label: 'Disco I/O', value: '42 MB/s' },
    { label: 'Red ↓/↑', value: '12 / 8 Mbps' },
    { label: 'Uptime', value: uptimeFor(row) },
    { label: 'PIDs', value: String(8 + (hashSeed(row.title) % 12)) },
  ]
  r.sections = [
    {
      title: 'Límites cgroup',
      icon: 'speed',
      table: {
        headers: ['Recurso', 'Límite', 'Uso', 'Estado'],
        rows: [
          ['CPU', '2 cores', `${cpu}%`, cpu > 80 ? 'WARN' : 'OK'],
          ['Memory', '512 MiB', `${ram}%`, ram > 85 ? 'WARN' : 'OK'],
          ['Block I/O', '100 MB/s', `${disk}%`, 'OK'],
          ['PIDs', '256', String(8 + (hashSeed(row.title) % 12)), 'OK'],
        ],
      },
    },
    {
      title: 'Histórico 1h',
      icon: 'show_chart',
      items: [
        `CPU media: ${Math.max(4, cpu - 6)}% · pico: ${Math.min(99, cpu + 12)}%`,
        `RAM media: ${Math.max(8, ram - 8)}% · pico: ${Math.min(99, ram + 10)}%`,
        `Reinicios últimas 24h: ${hashSeed(row.title) % 2}`,
      ],
    },
  ]
  if (cpu > 80 || ram > 85) {
    r.status = 'warn'
    r.recommendations = ['Considerar aumentar límites de memoria o escalar horizontalmente.']
  }
  return r
}

export const buildGenericInspectReport = (moduleId: string, row: InfraResourceRow, tabId: string): ModuleOperationReport => {
  const r = baseReport(moduleId, 'inspect', `Inspección · ${row.title}`, tabId.replace(/-/g, ' '), row.title)
  r.kpis = [
    { label: 'Estado', value: row.status },
    { label: 'Región', value: field(row, 'región', 'region') },
    { label: 'Proveedor', value: field(row, 'proveedor', 'provider') },
    { label: 'Uptime', value: uptimeFor(row) },
  ]
  r.sections = [
    {
      title: 'Metadatos del recurso',
      icon: 'info',
      table: {
        headers: ['Atributo', 'Valor'],
        rows: row.fields.length ? row.fields.map((f) => [f.label, f.value]) : [['Nombre', row.title], ['Estado', row.status]],
      },
    },
  ]
  if (row.metrics?.length) {
    r.sections.push({
      title: 'Métricas actuales',
      icon: 'monitoring',
      table: {
        headers: ['Métrica', 'Valor', 'Umbral'],
        rows: row.metrics.map((m) => [m.label, `${m.value}%`, m.value > 85 ? '85% ⚠' : '85%']),
      },
    })
  }
  if (row.tags?.length) {
    r.sections.push({ title: 'Etiquetas', icon: 'label', items: row.tags })
  }
  return r
}

export const buildK8sRolloutRestartReport = (row: InfraResourceRow): ModuleOperationReport => {
  const r = baseReport('kubernetes', 'rollout-restart', `Rollout restart · ${row.title}`, 'Rolling update iniciado', row.title)
  r.sections = [{ title: 'Rollout', icon: 'restart_alt', steps: [
    { label: 'kubectl rollout restart', status: 'ok', detail: row.title, durationMs: 180 },
    { label: 'Pods terminating', status: 'ok', detail: 'maxUnavailable 25%', durationMs: 12000 },
    { label: 'Pods ready', status: 'ok', detail: field(row, 'réplica', 'replica') || '3/3', durationMs: 45000 },
  ]}]
  return r
}

export const buildK8sEndpointsReport = (row: InfraResourceRow): ModuleOperationReport => {
  const r = baseReport('kubernetes', 'endpoints', `Endpoints · ${row.title}`, 'Pods detrás del service', row.title)
  r.sections = [{ title: 'Endpoints activos', icon: 'device_hub', table: {
    headers: ['Pod', 'IP', 'Puerto', 'Ready'],
    rows: [['checkout-api-7f8b', '10.0.1.42', '8080', 'true'], ['checkout-api-9c2d', '10.0.1.58', '8080', 'true']],
  }}]
  return r
}

export const buildNetworkPingReport = (row: InfraResourceRow): ModuleOperationReport => {
  const target = field(row, 'target', 'cidr', 'gateway') || row.title
  const r = baseReport('network', 'ping', `Ping · ${target}`, 'ICMP echo request', row.title)
  r.kpis = [{ label: 'Paquetes', value: '4/4 OK' }, { label: 'RTT avg', value: '18 ms' }, { label: 'Pérdida', value: '0%' }]
  r.sections = [{ title: 'Resultado', icon: 'wifi_tethering', code: `PING ${target}\n64 bytes from ${target}: icmp_seq=1 ttl=58 time=16.2 ms\n64 bytes from ${target}: icmp_seq=2 ttl=58 time=17.8 ms\n64 bytes from ${target}: icmp_seq=3 ttl=58 time=18.1 ms\n64 bytes from ${target}: icmp_seq=4 ttl=58 time=17.5 ms\n--- ping statistics ---\n4 packets transmitted, 4 received, 0% packet loss` }]
  return r
}

export const buildNetworkTracerouteReport = (row: InfraResourceRow): ModuleOperationReport => {
  const r = baseReport('network', 'traceroute', `Traceroute · ${row.title}`, 'Ruta hacia destino externo', row.title)
  r.sections = [{ title: 'Saltos', icon: 'route', code: ` 1  gateway.local (10.0.0.1)  0.8 ms\n 2  isp-core-01 (185.12.44.1)  4.2 ms\n 3  * * *\n 4  edge-eu-west (52.94.18.2)  12.1 ms\n 5  dest.example.com (203.0.113.10)  18.4 ms` }]
  return r
}

export const buildNetworkConnectivityReport = (row: InfraResourceRow): ModuleOperationReport => {
  const r = baseReport('network', 'connectivity', `Diagnóstico · ${row.title}`, 'Reachability y rutas', row.title)
  r.sections = [{ title: 'Pruebas', icon: 'network_check', steps: [
    { label: 'Route table', status: 'ok', detail: 'Ruta local OK', durationMs: 45 },
    { label: 'Security group', status: 'ok', detail: '443 permitido', durationMs: 120 },
    { label: 'NACL', status: 'ok', detail: 'Sin bloqueo', durationMs: 80 },
    { label: 'Endpoint reachability', status: isWarning(row.status) ? 'warn' : 'ok', detail: row.status, durationMs: 340 },
  ]}]
  return r
}

export const buildNetworkPortsReport = (row: InfraResourceRow): ModuleOperationReport => {
  const r = baseReport('network', 'ports', `Puertos · ${row.title}`, 'Escaneo de servicios expuestos', row.title)
  r.sections = [{ title: 'Puertos detectados', icon: 'radar', table: {
    headers: ['Puerto', 'Protocolo', 'Servicio', 'Estado'],
    rows: [['443', 'TCP', 'HTTPS', 'open'], ['80', 'TCP', 'HTTP', 'open'], ['22', 'TCP', 'SSH', isWarning(row.status) ? 'WARN' : 'filtered']],
  }}]
  if (isWarning(row.status)) r.recommendations = ['Puerto 22 expuesto públicamente. Restringir a bastion/VPN.']
  return r
}

export const buildStorageUsageReport = (row: InfraResourceRow): ModuleOperationReport => {
  const used = parsePercent(row.fields.find((f) => /uso|used/i.test(f.label))?.value) ?? 45 + (hashSeed(row.title) % 40)
  const r = baseReport('storage', 'usage', `Uso · ${row.title}`, `${used}% utilizado`, row.title)
  r.kpis = [
    { label: 'Usado', value: `${used}%`, tone: used > 85 ? 'warn' : 'ok' },
    { label: 'Libre', value: `${100 - used}%` },
    { label: 'Tendencia', value: used > 80 ? '+2.1%/sem' : 'Estable' },
  ]
  if (used > 85) r.recommendations = ['Ampliar capacidad antes de alcanzar el 95% para evitar degradación IOPS.']
  return r
}

export const buildStorageDetachReport = (row: InfraResourceRow): ModuleOperationReport => {
  const r = baseReport('storage', 'detach', `Desadjuntado · ${row.title}`, field(row, 'adjunto', 'attached'), row.title)
  r.status = 'warn'
  r.recommendations = ['Verificar que la instancia no tenga procesos escribiendo en el volumen.']
  return r
}

export const buildStorageExpandReport = (row: InfraResourceRow, sizeGb: number): ModuleOperationReport => {
  const current = field(row, 'tamaño', 'size') || '500 GB'
  const r = baseReport('storage', 'expand', `Ampliado · ${row.title}`, `${current} → ${sizeGb} GB`, row.title)
  r.kpis = [{ label: 'Nuevo tamaño', value: `${sizeGb} GB` }, { label: 'Downtime', value: '0 s (online)' }]
  return r
}

export const buildBackupDetailReport = (row: InfraResourceRow): ModuleOperationReport => {
  const r = baseReport('backups', 'detail', `Detalle · ${row.title}`, field(row, 'origen', 'source'), row.title)
  r.kpis = [
    { label: 'Tamaño', value: field(row, 'tamaño', 'size') },
    { label: 'Tipo', value: field(row, 'tipo', 'type') },
    { label: 'Estado', value: row.status },
    { label: 'Duración', value: `${2 + (hashSeed(row.title) % 8)} min` },
  ]
  r.sections = [{ title: 'Política', icon: 'policy', items: ['Retención: 30 días · Cross-region: eu-west-1 → eu-central-1 · Cifrado: AES-256'] }]
  return r
}

export const buildBackupHistoryReport = (row: InfraResourceRow): ModuleOperationReport => {
  const r = baseReport('backups', 'history', `Historial · ${row.title}`, 'Últimas ejecuciones', row.title)
  r.sections = [{ title: 'Ejecuciones', icon: 'history', table: {
    headers: ['Fecha', 'Estado', 'Tamaño', 'Duración'],
    rows: [
      [new Date().toLocaleString('es-ES'), 'OK', field(row, 'tamaño', 'size'), '4 min'],
      [new Date(Date.now() - 86400000).toLocaleString('es-ES'), 'OK', field(row, 'tamaño', 'size'), '3 min'],
      [new Date(Date.now() - 172800000).toLocaleString('es-ES'), 'WARN', field(row, 'tamaño', 'size'), '12 min'],
    ],
  }}]
  return r
}

export const buildBackupDeleteReport = (row: InfraResourceRow): ModuleOperationReport => {
  const r = baseReport('backups', 'delete', `Eliminado · ${row.title}`, 'Snapshot eliminado permanentemente', row.title)
  r.status = 'warn'
  return r
}

export const buildCapacityAnalysisReport = (row: InfraResourceRow): ModuleOperationReport => {
  const r = baseReport('capacity-planner', 'analysis', `Análisis · ${row.title}`, 'Utilización y coste', row.title)
  r.kpis = [
    { label: 'CPU', value: field(row, 'cpu') || '12%' },
    { label: 'RAM', value: field(row, 'ram') || '22%' },
    { label: 'Disco', value: field(row, 'disk', 'disco') || '48%' },
    { label: 'Ahorro', value: field(row, 'ahorro', 'savings') || '—' },
  ]
  r.sections = [{ title: 'Tendencia 30d', icon: 'trending_up', items: ['CPU estable · RAM +3% · Disco +8% · Tráfico +12%'] }]
  return r
}

export const buildCapacitySimulateReport = (row: InfraResourceRow, growthPct: number, periodDays: number): ModuleOperationReport => {
  const r = baseReport('capacity-planner', 'simulate', `Simulación · ${row.title}`, `+${growthPct}% en ${periodDays} días`, row.title)
  r.kpis = [
    { label: 'CPU pico', value: `${Math.min(99, 45 + growthPct)}%`, tone: 'warn' },
    { label: 'Nodos extra', value: `+${Math.ceil(growthPct / 15)}` },
    { label: 'Coste extra', value: `+€${Math.round(growthPct * 12)}/mes` },
  ]
  return r
}

export const buildCapacityCompareReport = (row: InfraResourceRow): ModuleOperationReport => {
  const r = baseReport('capacity-planner', 'compare', `Comparativa · ${row.title}`, 'Actual vs recomendado', row.title)
  r.sections = [{ title: 'Escenarios', icon: 'compare', table: {
    headers: ['Escenario', 'CPU', 'Coste/mes', 'Riesgo'],
    rows: [
      ['Actual', field(row, 'cpu') || '45%', '€240', 'Medio'],
      ['Recomendado', '35%', '€120', 'Bajo'],
      ['Pico +40%', '92%', '€890', 'Alto'],
    ],
  }}]
  return r
}

export const buildCapacityThresholdsReport = (row: InfraResourceRow, v: ModuleFormValues): ModuleOperationReport => {
  const r = baseReport('capacity-planner', 'thresholds', `Umbrales · ${row.title}`, 'Alertas actualizadas', row.title)
  r.kpis = [
    { label: 'CPU', value: `${v.cpuThreshold ?? 80}%` },
    { label: 'RAM', value: `${v.ramThreshold ?? 85}%` },
    { label: 'Disco', value: `${v.diskThreshold ?? 90}%` },
  ]
  return r
}

const parsePercent = (value?: string): number | null => {
  if (!value) return null
  const n = Number(String(value).replace('%', '').trim())
  return Number.isFinite(n) ? n : null
}

const isWarning = (status: string): boolean => /warn|pend|degrad/i.test(status)

const MODULE_LABELS: Record<string, string> = {
  docker: 'Docker',
  kubernetes: 'Kubernetes',
  network: 'Red',
  storage: 'Almacenamiento',
  backups: 'Copias de seguridad',
  'capacity-planner': 'Planificador de capacidad',
}

const ACTION_ICONS: Record<string, string> = {
  inspect: 'search',
  logs: 'article',
  restart: 'restart_alt',
  stop: 'stop_circle',
  start: 'play_circle',
  shell: 'terminal',
  image: 'layers',
  usage: 'monitoring',
  describe: 'description',
  yaml: 'code',
  scale: 'unfold_more',
  restore: 'restore',
  verify: 'verified',
  detail: 'info',
  ping: 'wifi_tethering',
  traffic: 'map',
  connectivity: 'network_check',
  analysis: 'analytics',
  simulate: 'science',
}

const kpiIconFor = (label: string): string => {
  const l = label.toLowerCase()
  if (l.includes('cpu')) return 'speed'
  if (l.includes('ram') || l.includes('mem')) return 'memory'
  if (l.includes('disco') || l.includes('disk') || l.includes('tamaño')) return 'storage'
  if (l.includes('estado') || l.includes('status')) return 'fiber_manual_record'
  if (l.includes('coste') || l.includes('ahorro')) return 'euro'
  if (l.includes('réplica') || l.includes('replica')) return 'copy_all'
  if (l.includes('uptime')) return 'schedule'
  if (l.includes('puerto')) return 'settings_ethernet'
  return 'insights'
}

export const finalizeModuleReport = (
  report: ModuleOperationReport,
  row?: InfraResourceRow,
  moduleId?: string,
  opId?: string,
  tabId?: string,
): ModuleOperationReport => {
  report.actionLabel = report.actionLabel ?? report.title.split(' · ')[0] ?? report.title
  report.agent = report.agent ?? `cloudops-agent · ${MODULE_LABELS[moduleId ?? report.moduleId] ?? report.moduleId} · demo`
  report.summary =
    report.summary ??
    `${report.actionLabel} ejecutada sobre ${report.resourceName ?? 'recurso seleccionado'}. ${report.subtitle}`

  report.kpis = report.kpis.map((k) => ({ ...k, icon: k.icon ?? kpiIconFor(k.label) }))

  if (!report.alerts?.length) {
    const alerts: ModuleOpAlert[] = []
    if (report.status === 'warn') {
      alerts.push({ severity: 'warn', message: 'Se detectaron condiciones que requieren revisión manual.' })
    }
    if (report.status === 'fail') {
      alerts.push({ severity: 'fail', message: 'La operación finalizó con errores. Consulte el detalle.' })
    }
    if (/restore|delete|stop|detach|rollout/i.test(opId ?? report.actionId)) {
      alerts.push({
        severity: 'warn',
        message: 'Acción con impacto operativo. Verifique ventana de mantenimiento y backups recientes.',
      })
    }
    if (alerts.length) report.alerts = alerts
  }

  if (row && !['inspect', 'detail', 'yaml'].includes(opId ?? report.actionId)) {
    const hasContext = report.sections.some((s) => s.title === 'Contexto del recurso')
    if (!hasContext && row.fields.length) {
      report.sections.unshift({
        title: 'Contexto del recurso',
        icon: 'inventory_2',
        table: {
          headers: ['Atributo', 'Valor'],
          rows: [
            ['Recurso', row.title],
            ['Estado', row.status],
            ...(tabId ? [['Vista', tabId.replace(/-/g, ' ')]] : []),
            ...row.fields.slice(0, 5).map((f) => [f.label, f.value]),
          ],
        },
      })
    }
  }

  if (row?.detail && report.recommendations.length < 2) {
    const note = row.detail.length > 160 ? `${row.detail.slice(0, 157)}…` : row.detail
    if (!report.recommendations.includes(note)) {
      report.recommendations = [...report.recommendations, note]
    }
  }

  if (report.recommendations.length && !report.impact) {
    report.impact =
      report.status === 'warn'
        ? 'Impacto moderado — validar en staging antes de producción.'
        : 'Impacto bajo en modo demo — sin cambios persistentes en el inventario.'
  }

  return report
}

export const buildModuleHeaderReport = (moduleId: string, label: string): ModuleOperationReport | null => {
  const map: Record<string, () => ModuleOperationReport> = {
    'Ejecutar prune': buildDockerPruneReport,
    'Pull imagen': buildDockerPullReport,
    'Inspeccionar red': () => buildDockerComposeReport(),
    'Exportar compose': buildDockerComposeReport,
    'Escalar deployment': () => buildK8sScaleReport({ id: 'd', title: 'checkout-api', status: 'running', fields: [{ label: 'Réplicas', value: '3' }] }, 5),
    'Port-forward': () => {
      const r = baseReport('kubernetes', 'port-forward', 'Port-forward activo', '8080 → checkout-api:8080')
      r.kpis = [{ label: 'Local', value: '8080' }, { label: 'Remote', value: '8080' }, { label: 'TTL', value: 'Sesión activa' }]
      return r
    },
    'Ver eventos': buildK8sEventsReport,
    'Exportar kubeconfig': buildK8sKubeconfigReport,
    'Aplicar manifiesto': () => buildK8sYamlReport({ id: 'd', title: 'checkout-api', status: 'running', fields: [{ label: 'Namespace', value: 'checkout' }, { label: 'Réplicas', value: '5' }] }),
    'Auditar puertos': buildNetworkTrafficReport,
    'Añadir regla': () => buildNetworkRuleReport(),
    'Sincronizar topología': buildNetworkTopologyReport,
    'Mapa de tráfico': buildNetworkTrafficReport,
    'Exportar diagrama': buildNetworkTopologyReport,
    Peering: () => {
      const r = baseReport('network', 'peering', 'Peering configurado', 'vpc-prod-main ↔ vpc-shared-services')
      r.kpis = [{ label: 'Estado', value: 'active' }, { label: 'Rutas', value: '12' }]
      return r
    },
    'Crear volumen': () => buildStorageVolumeReport(),
    Adjuntar: () => buildStorageVolumeReport(),
    Sincronizar: () => buildPlatformSyncReport('storage', { id: 's', title: 'inventario', status: 'running', fields: [] }),
    'Limpiar huérfanos': () => {
      const r = baseReport('storage', 'orphan-clean', 'Volúmenes huérfanos eliminados', '3 volúmenes · 120 GB')
      r.kpis = [{ label: 'Liberado', value: '120 GB' }]
      return r
    },
    'Ampliar disco': () => {
      const r = baseReport('storage', 'expand', 'Disco ampliado', '500 GB → 750 GB')
      r.kpis = [{ label: 'Nuevo tamaño', value: '750 GB' }]
      return r
    },
    'Informe IOPS': buildStorageIopsReport,
    'Crear backup': () => buildBackupCreateReport(),
    'Restaurar (demo)': () => buildBackupRestoreReport({ id: 'b', title: 'snap-checkout-daily', status: 'running', fields: [] }),
    'Ejecutar ahora': () => buildBackupCreateReport(),
    'Verificar integridad': buildBackupIntegrityReport,
    'Política de retención': () => {
      const r = baseReport('backups', 'retention', 'Política de retención', '30d daily · 12 weekly · 7 yearly')
      r.sections = [{ title: 'Reglas', icon: 'policy', items: ['Daily: 30 días', 'Weekly: 12 semanas', 'Yearly: 7 años', 'Cross-region: eu-west-1 → eu-central-1'] }]
      return r
    },
    'Informe mensual': () => {
      const r = baseReport('backups', 'monthly-report', 'Informe mensual backups', 'Mayo 2026')
      r.kpis = [{ label: 'Snapshots', value: '128' }, { label: 'Éxito', value: '99.2%' }, { label: 'Almacenado', value: '4.2 TB' }]
      return r
    },
    'Generar plan': buildCapacityPlanReport,
    'Aplicar resize': () => buildCapacityResizeReport({ id: 'c', title: 'checkout-api-prod', status: 'running', fields: [{ label: 'Tipo', value: 'm5.xlarge' }, { label: 'CPU', value: '4' }, { label: 'RAM', value: '16 GB' }, { label: 'Coste', value: '€240' }] }),
    Exportar: buildCapacityPlanReport,
    'Simular escenario': () => {
      const r = baseReport('capacity-planner', 'simulate', 'Escenario simulado', 'Tráfico +40% Black Friday')
      r.kpis = [{ label: 'CPU pico', value: '92%' }, { label: 'Nodos extra', value: '+4' }, { label: 'Coste', value: '+€890/mes' }]
      return r
    },
    'Reservas RI/SP': () => {
      const r = baseReport('capacity-planner', 'ri-sp', 'Recomendación RI/SP', 'Cobertura actual 62%')
      r.recommendations = ['Comprar RI 1yr para pool DB ahorra €420/mes con payback 4 meses.']
      return r
    },
    'Informe ejecutivo': buildCapacityPlanReport,
  }
  const builder = map[label]
  if (!builder) return null
  const report = builder()
  report.moduleId = moduleId
  return finalizeModuleReport(report, undefined, moduleId, label)
}

const resolveModuleRowReport = (
  moduleId: string,
  opId: string,
  row: InfraResourceRow,
  tabId: string,
  formValues?: ModuleFormValues,
): ModuleOperationReport | null => {
  const inspect = () => buildGenericInspectReport(moduleId, row, tabId)

  if (moduleId === 'docker') {
    if (opId === 'inspect') return buildDockerInspectReport(row)
    if (opId === 'logs' || opId === 'export-logs') return buildDockerLogsReport(row)
    if (opId === 'restart') return buildDockerRestartReport(row)
    if (opId === 'stop') return buildDockerStopReport(row)
    if (opId === 'start') return buildDockerStartReport(row)
    if (opId === 'shell') {
      const r = baseReport('docker', 'shell', `Shell · ${row.title}`, 'Sesión interactiva (demo)', row.title)
      r.sections = [{ title: 'Terminal', icon: 'terminal', code: `$ docker exec -it ${row.title} /bin/sh\n/ # id\nuid=0(root) gid=0(root)\n/ # ps aux\nPID   USER     COMMAND\n  1   root     /app/server\n/ # _`, }]
      return r
    }
    if (opId === 'image') return buildDockerImageDetailReport(row)
    if (opId === 'usage') return buildDockerUsageReport(row)
    if (opId === 'pull') return buildDockerPullReport()
    if (opId === 'sync') return buildPlatformSyncReport(moduleId, row)
    if (opId === 'list-containers') return inspect()
    if (opId === 'traffic') return buildNetworkTrafficReport()
    if (opId === 'connect') return buildStorageAttachReport(row)
    if (opId === 'snapshot') return buildBackupCreateReport(row)
  }

  if (moduleId === 'kubernetes') {
    if (opId === 'inspect') return inspect()
    if (opId === 'describe') return buildK8sDescribeReport(row)
    if (opId === 'logs') return buildK8sLogsReport(row)
    if (opId === 'yaml') return buildK8sYamlReport(row)
    if (opId === 'scale' || opId === 'scale-form') return buildK8sScaleReport(row, formValues?.replicas ?? 5)
    if (opId === 'rollout-restart') return buildK8sRolloutRestartReport(row)
    if (opId === 'events') return buildK8sEventsReport()
    if (opId === 'shell') {
      const r = baseReport('kubernetes', 'shell', `Exec · ${row.title}`, 'kubectl exec -it (demo)', row.title)
      r.sections = [{ title: 'Terminal', icon: 'terminal', code: `$ kubectl exec -it ${row.title} -n ${field(row, 'namespace')} -- /bin/sh\n/ # hostname\n${row.title}\n/ # _`, }]
      return r
    }
    if (opId === 'endpoints') return buildK8sEndpointsReport(row)
    if (opId === 'quotas') return inspect()
    if (opId === 'usage') return buildDockerUsageReport(row)
    if (opId === 'sync') return buildPlatformSyncReport(moduleId, row)
    if (opId === 'kubeconfig') return buildK8sKubeconfigReport()
    if (opId === 'related') return inspect()
  }

  if (moduleId === 'network') {
    if (opId === 'inspect') return inspect()
    if (opId === 'rules') return buildNetworkRuleReport(row)
    if (opId === 'traffic') return buildNetworkTrafficReport()
    if (opId === 'connectivity') return buildNetworkConnectivityReport(row)
    if (opId === 'ping') return buildNetworkPingReport(row)
    if (opId === 'traceroute') return buildNetworkTracerouteReport(row)
    if (opId === 'ports') return buildNetworkPortsReport(row)
    if (opId === 'dependencies') return inspect()
    if (opId === 'health') return buildNetworkConnectivityReport(row)
    if (opId === 'audit') return buildPlatformAuditReport(moduleId, row, tabId)
  }

  if (moduleId === 'storage') {
    if (opId === 'inspect') return inspect()
    if (opId === 'usage') return buildStorageUsageReport(row)
    if (opId === 'metrics') return buildStorageIopsReport()
    if (opId === 'attach') return buildStorageAttachReport(row)
    if (opId === 'detach') return buildStorageDetachReport(row)
    if (opId === 'snapshot') return buildBackupCreateReport(row)
    if (opId === 'snapshots-list') return buildBackupHistoryReport(row)
    if (opId === 'expand-form') return buildStorageExpandReport(row, formValues?.sizeGb ?? 750)
    if (opId === 'lifecycle') return inspect()
    if (opId === 'restore') return buildBackupRestoreReport(row)
    if (opId === 'delete') return buildBackupDeleteReport(row)
    if (opId === 'forecast') return buildCapacityPlanReport()
    if (opId === 'alert') return buildPlatformAlertReport(moduleId, row)
  }

  if (moduleId === 'backups') {
    if (opId === 'detail') return buildBackupDetailReport(row)
    if (opId === 'run-now') return buildBackupCreateReport(row)
    if (opId === 'restore') return buildBackupRestoreReport(row)
    if (opId === 'history') return buildBackupHistoryReport(row)
    if (opId === 'verify') return buildBackupIntegrityReport()
    if (opId === 'report') return buildBackupDetailReport(row)
    if (opId === 'delete') return buildBackupDeleteReport(row)
    if (opId === 'policy') {
      const r = baseReport('backups', 'policy', `Política · ${row.title}`, 'Retención y ventanas', row.title)
      r.sections = [{ title: 'Reglas', icon: 'policy', items: ['Daily: 30 días', 'Weekly: 12 semanas', 'Yearly: 7 años'] }]
      return r
    }
    if (opId === 'sync') return buildPlatformSyncReport(moduleId, row)
  }

  if (moduleId === 'capacity-planner') {
    if (opId === 'analysis') return buildCapacityAnalysisReport(row)
    if (opId === 'simulate-form') return buildCapacitySimulateReport(row, formValues?.growthPct ?? 25, formValues?.periodDays ?? 90)
    if (opId === 'recommend') return buildCapacityResizeReport(row)
    if (opId === 'resize') return buildCapacityResizeReport(row)
    if (opId === 'export') return buildCapacityPlanReport()
    if (opId === 'compare') return buildCapacityCompareReport(row)
    if (opId === 'forecast') return buildCapacityPlanReport()
    if (opId === 'thresholds-form') return buildCapacityThresholdsReport(row, formValues ?? {})
    if (opId === 'create-plan') {
      const r = baseReport('capacity-planner', 'create-plan', `Plan · ${row.title}`, 'Plan de capacidad guardado (demo)', row.title)
      r.kpis = [{ label: 'Horizonte', value: '90 días' }, { label: 'Ahorro', value: field(row, 'ahorro', 'savings') || '€120/mes' }]
      return r
    }
    if (opId === 'alert') return buildPlatformAlertReport(moduleId, row)
    if (opId === 'sync') return buildPlatformSyncReport(moduleId, row)
  }

  if (opId === 'sync') return buildPlatformSyncReport(moduleId, row)
  if (opId === 'audit') return buildPlatformAuditReport(moduleId, row, tabId)
  if (opId === 'alert') return buildPlatformAlertReport(moduleId, row)

  return null
}

export const buildModuleRowReport = (
  moduleId: string,
  opId: string,
  row: InfraResourceRow,
  tabId: string,
  formValues?: ModuleFormValues,
): ModuleOperationReport | null => {
  const raw = resolveModuleRowReport(moduleId, opId, row, tabId, formValues)
  return raw ? finalizeModuleReport(raw, row, moduleId, opId, tabId) : null
}

export const exportModuleReportCsv = (report: ModuleOperationReport): string => {
  const lines = [
    ['campo', 'valor'].join(','),
    ['titulo', csvEscape(report.title)].join(','),
    ['modulo', csvEscape(report.moduleId)].join(','),
    ['generado', csvEscape(report.generatedAt)].join(','),
    ...report.kpis.map((k) => ['kpi', csvEscape(`${k.label}: ${k.value}`)].join(',')),
  ]
  for (const section of report.sections) {
    if (section.table) {
      lines.push(section.table.headers.map(csvEscape).join(','))
      section.table.rows.forEach((row) => lines.push(row.map(csvEscape).join(',')))
    }
    section.items?.forEach((item) => lines.push(['item', csvEscape(item)].join(',')))
  }
  const filename = `${report.exportBase}.csv`
  downloadTextFile(lines.join('\n'), filename, 'text/csv;charset=utf-8')
  return filename
}

export const exportModuleReportJson = (report: ModuleOperationReport): string => {
  const filename = `${report.exportBase}.json`
  downloadJsonFile(report, filename)
  return filename
}

export const exportModuleReportMarkdown = (report: ModuleOperationReport): string => {
  const lines = [`# ${report.title}`, '', report.subtitle, '', `Generado: ${report.generatedAt}`, '']
  if (report.kpis.length) {
    lines.push('## KPIs', '')
    report.kpis.forEach((k) => lines.push(`- **${k.label}:** ${k.value}`))
    lines.push('')
  }
  for (const section of report.sections) {
    lines.push(`## ${section.title}`, '')
    if (section.items) section.items.forEach((i) => lines.push(`- ${i}`))
    if (section.code) lines.push('```', section.code, '```')
    if (section.table) {
      lines.push(`| ${section.table.headers.join(' | ')} |`, `| ${section.table.headers.map(() => '---').join(' | ')} |`)
      section.table.rows.forEach((row) => lines.push(`| ${row.join(' | ')} |`))
    }
    lines.push('')
  }
  const filename = `${report.exportBase}.md`
  downloadTextFile(lines.join('\n'), filename, 'text/markdown;charset=utf-8')
  return filename
}

export const exportModuleReportText = (report: ModuleOperationReport): string => {
  const filename = `${report.exportBase}.txt`
  const content = [
    report.title,
    report.subtitle,
    `Generado: ${report.generatedAt}`,
    '',
    ...report.sections.flatMap((s) => [s.title, s.code ?? s.items?.join('\n') ?? '', '']),
  ].join('\n')
  downloadTextFile(content, filename)
  return filename
}

export const downloadModuleReportCompose = (report: ModuleOperationReport): string | null => {
  if (report.actionId !== 'compose' && report.title !== 'Docker Compose exportado') return null
  const code = report.sections.find((s) => s.code)?.code ?? ''
  const filename = 'docker-compose-export.yaml'
  triggerBlobDownload(new Blob([code], { type: 'application/x-yaml' }), filename)
  return filename
}
