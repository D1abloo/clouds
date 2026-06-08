import type {
  InfraResourceRow,
  InfraWorkspaceConfig,
} from './infrastructure-workspace.types'
import { enrichInfraRows, resolveModuleLogos } from './infrastructure-row-enrichment'
import { attachVpsHostMeta } from './infrastructure-vps-operations.util'
import type { NavLogoKey } from '../../shared/theme/nav-logo.types'

type Row = Record<string, unknown>

const statusLabel = (value: unknown): string => String(value ?? 'activo')

const rowId = (prefix: string, value: unknown, index: number): string =>
  `${prefix}-${String(value ?? index)}`

const providerLogo = (provider?: string): NavLogoKey | undefined => {
  const value = (provider ?? '').toLowerCase()
  if (value.includes('aws')) return 'aws'
  if (value.includes('gcp') || value.includes('google')) return 'gcp'
  if (value.includes('azure')) return 'azure'
  return undefined
}

const finalizeWorkspace = (
  config: InfraWorkspaceConfig,
  hosts?: VpsHostRow[],
  portCatalog?: Row[],
): InfraWorkspaceConfig => {
  const branding = resolveModuleLogos(config.id)
  return {
    ...config,
    ...branding,
    tabs: config.tabs.map((tab) => {
      const rows = enrichInfraRows(tab.rows, { moduleId: config.id, tabId: tab.id })
      return {
        ...tab,
        rows: config.id === 'vps' && hosts?.length ? attachVpsHostMeta(rows, hosts, portCatalog) : rows,
      }
    }),
  }
}

export const buildDockerWorkspace = (data: Record<string, unknown>): InfraWorkspaceConfig => {
  const containers = (data['items'] as Row[]) ?? []
  const hosts = (data['hostRows'] as Row[]) ?? []
  const images = (data['imageRows'] as Row[]) ?? []
  const networks = (data['networkRows'] as Row[]) ?? []
  const volumes = (data['volumeRows'] as Row[]) ?? []
  const running = Number(data['running'] ?? 0)
  const stopped = Number(data['stopped'] ?? 0)
  const alerts = containers.filter((c) => String(c['status']).includes('warn')).length

  return finalizeWorkspace(
    {
      id: 'docker',
    icon: 'view_in_ar',
    title: 'Docker',
    description:
      'Motor de contenedores multi-host: runtime, imágenes, redes overlay, volúmenes persistentes, healthchecks y acciones en caliente sobre VPS y bare metal.',
    lastSync: 'hace 1 min',
    headerActions: [
      ...(hosts.length === 0
        ? [{ label: 'Conectar host Docker', icon: 'add_link', primary: true as const }]
        : [{ label: 'Iniciar contenedor', icon: 'play_arrow', primary: true as const }]),
      { label: 'Actualizar inventario', icon: 'refresh' },
      { label: 'Ejecutar prune', icon: 'cleaning_services' },
    ],
    quickActions: [
      { label: 'Pull imagen', icon: 'download' },
      { label: 'Inspeccionar red', icon: 'hub' },
      { label: 'Exportar compose', icon: 'code' },
    ],
    contextChips: [
      { label: `${hosts.length} hosts Docker`, icon: 'dns' },
      { label: `${running} en ejecución · ${stopped} detenidos`, icon: 'play_circle', tone: 'ok' },
      ...(alerts ? [{ label: `${alerts} contenedores en alerta`, icon: 'warning', tone: 'warn' as const }] : []),
    ],
    tabs: [
      {
        id: 'containers',
        label: 'Contenedores',
        searchPlaceholder: 'Nombre, imagen o host…',
        filters: [{ key: 'Estado', label: 'Estado', options: ['running', 'warning', 'stopped'] }],
        rows: containers.map((c, i) => containerRow(c, i)),
      },
      {
        id: 'hosts',
        label: 'Hosts',
        searchPlaceholder: 'Host, IP o versión engine…',
        rows: hosts.map((h, i) => dockerHostRow(h, i)),
      },
      {
        id: 'images',
        label: 'Imágenes',
        searchPlaceholder: 'Imagen o tag…',
        rows: images.map((img, i) => dockerImageRow(img, i)),
      },
      {
        id: 'networks',
        label: 'Redes',
        searchPlaceholder: 'Red, driver o subred…',
        rows: networks.map((n, i) => dockerNetworkRow(n, i)),
      },
      {
        id: 'volumes',
        label: 'Volúmenes',
        searchPlaceholder: 'Volumen o contenedor adjunto…',
        rows: volumes.map((v, i) => dockerVolumeRow(v, i)),
      },
      {
        id: 'logs',
        label: 'Logs agregados',
        searchPlaceholder: 'Buscar en logs…',
        rows: containers.slice(0, 4).map((c, i) => dockerLogRow(c, i)),
      },
    ],
  })
}

export const buildKubernetesWorkspace = (data: Record<string, unknown>): InfraWorkspaceConfig => {
  const pods = (data['podItems'] as Row[]) ?? []
  const clusters = (data['clusterRows'] as Row[]) ?? []
  const nodes = (data['nodeRows'] as Row[]) ?? []
  const namespaces = (data['namespaceRows'] as Row[]) ?? []
  const deployments = (data['deploymentRows'] as Row[]) ?? []
  const services = (data['serviceRows'] as Row[]) ?? []
  const events = (data['eventRows'] as Row[]) ?? []
  const podErrors = Number(data['podsWithError'] ?? 0)

  return finalizeWorkspace({
    id: 'kubernetes',
    icon: 'hub',
    title: 'Kubernetes',
    description:
      'Orquestación multi-cluster: pods, deployments, services, eventos del plano de control, cuotas por namespace y acciones de escalado rolling.',
    lastSync: 'hace 1 min',
    headerActions: [
      ...(clusters.length === 0
        ? [{ label: 'Conectar cluster', icon: 'add_link', primary: true as const }]
        : [{ label: 'Escalar deployment', icon: 'unfold_more', primary: true as const }]),
      { label: 'Actualizar clusters', icon: 'refresh' },
      { label: 'Aplicar manifiesto', icon: 'upload_file' },
    ],
    quickActions: [
      { label: 'Port-forward', icon: 'swap_horiz' },
      { label: 'Ver eventos', icon: 'notifications' },
      { label: 'Exportar kubeconfig', icon: 'vpn_key' },
    ],
    contextChips: [
      { label: `${clusters.length} clusters gestionados`, icon: 'hub' },
      { label: `${pods.length} pods activos`, icon: 'widgets', tone: 'ok' },
      ...(podErrors ? [{ label: `${podErrors} pods con error`, icon: 'error', tone: 'crit' as const }] : []),
    ],
    tabs: [
      {
        id: 'pods',
        label: 'Pods',
        searchPlaceholder: 'Pod, namespace o nodo…',
        filters: [{ key: 'Estado', label: 'Estado', options: ['running', 'warning'] }],
        rows: pods.map((p, i) => k8sPodRow(p, i)),
      },
      {
        id: 'clusters',
        label: 'Clusters',
        rows: clusters.map((c, i) => k8sClusterRow(c, i)),
      },
      {
        id: 'nodes',
        label: 'Nodos',
        rows: nodes.map((n, i) => k8sNodeRow(n, i)),
      },
      {
        id: 'namespaces',
        label: 'Namespaces',
        rows: namespaces.map((n, i) => k8sNamespaceRow(n, i)),
      },
      {
        id: 'deployments',
        label: 'Deployments',
        rows: deployments.map((d, i) => k8sDeploymentRow(d, i)),
      },
      {
        id: 'services',
        label: 'Services',
        rows: services.map((s, i) => k8sServiceRow(s, i)),
      },
      {
        id: 'events',
        label: 'Eventos',
        searchPlaceholder: 'Objeto, razón o mensaje…',
        rows: events.map((e, i) => k8sEventRow(e, i)),
      },
    ],
  })
}

export type VpsHostRow = {
  id: string
  name: string
  host: string
  port?: number
  status?: string
  user?: string
  os?: string
  provider?: string
  location?: string
  docker?: boolean
  kubernetes?: boolean
  cpu?: number
  ram?: number
  disk?: number
}

const remapDemoHostRows = (rows: Row[], hostKey: string, hosts: VpsHostRow[]): Row[] => {
  if (!hosts.length) return rows
  const hostNames = new Set(hosts.map((h) => h.name))
  const unique = [...new Set(rows.map((row) => String(row[hostKey] ?? '')))]
  const demoOnly = unique.filter((name) => !hostNames.has(name))
  const alias = new Map(
    demoOnly.map((name, index) => [name, hosts[index % hosts.length]?.name ?? name]),
  )
  return rows.map((row) => {
    const current = String(row[hostKey] ?? '')
    if (hostNames.has(current)) return row
    return {
      ...row,
      [hostKey]: alias.get(current) ?? row[hostKey],
    }
  })
}

export const buildVpsWorkspace = (
  hosts: VpsHostRow[],
  sshKeys: Row[],
  services: Row[],
  ports: Row[],
  audit: Row[],
): InfraWorkspaceConfig => {
  const boundServices = remapDemoHostRows(services, 'host', hosts)
  const boundPorts = remapDemoHostRows(ports, 'host', hosts)
  const boundAudit = remapDemoHostRows(audit, 'host', hosts)
  const connected = hosts.filter((h) => (h.status ?? 'online') !== 'offline').length
  const withDocker = hosts.filter((h) => h.docker).length
  const withK8s = hosts.filter((h) => h.kubernetes).length
  const alerts = boundPorts.filter((p) => String(p['status']).includes('warn')).length

  return finalizeWorkspace({
    id: 'vps',
    icon: 'dns',
    title: 'VPS / Bare metal',
    description:
      'Inventario SSH agentless: discovery Docker/Kubernetes, systemd, puertos expuestos, claves autorizadas, métricas CPU/RAM/disco y trazabilidad de sesiones.',
    lastSync: 'hace 3 min',
    headerActions: [
      { label: 'Añadir VPS', icon: 'add', primary: true },
      { label: 'Validar todos', icon: 'verified' },
      { label: 'Sincronizar', icon: 'sync' },
    ],
    quickActions: [
      { label: 'Abrir terminal', icon: 'terminal' },
      { label: 'Auditar puertos', icon: 'radar' },
      { label: 'Rotar claves SSH', icon: 'vpn_key' },
    ],
    contextChips: [
      { label: `${connected}/${hosts.length} conectados por SSH`, icon: 'link', tone: 'ok' },
      { label: `${withDocker} Docker · ${withK8s} Kubernetes`, icon: 'hub' },
      ...(alerts ? [{ label: `${alerts} puertos expuestos`, icon: 'warning', tone: 'warn' as const }] : []),
    ],
    tabs: [
      {
        id: 'servers',
        label: 'Servidores',
        searchPlaceholder: 'Nombre, IP o proveedor…',
        filters: [{ key: 'Proveedor', label: 'Proveedor', options: ['Hetzner', 'OVH', 'DigitalOcean', 'Bare metal'] }],
        rows: hosts.map((h, i) => vpsServerRow(h, i)),
      },
      {
        id: 'ssh',
        label: 'SSH',
        searchPlaceholder: 'Clave o huella…',
        rows: sshKeys.map((k, i) => vpsSshRow(k, i)),
      },
      {
        id: 'servicios',
        label: 'Servicios',
        searchPlaceholder: 'Host o unidad systemd…',
        rows: boundServices.map((s, i) => vpsServiceRow(s, i)),
      },
      {
        id: 'docker',
        label: 'Docker',
        rows: hosts.filter((h) => h.docker).map((h, i) => vpsDockerRow(h, i)),
        emptyMessage: 'Ningún host con Docker Engine detectado.',
      },
      {
        id: 'kubernetes',
        label: 'Kubernetes',
        rows: hosts.filter((h) => h.kubernetes).map((h, i) => vpsK8sRow(h, i)),
        emptyMessage: 'Ningún agente kubelet/k3s detectado.',
      },
      {
        id: 'ports',
        label: 'Puertos',
        searchPlaceholder: 'Host, puerto o servicio…',
        rows: boundPorts.map((p, i) => vpsPortRow(p, i)),
      },
      {
        id: 'metrics',
        label: 'Métricas',
        rows: hosts.map((h, i) => vpsMetricsRow(h, i)),
      },
      {
        id: 'audit',
        label: 'Auditoría',
        searchPlaceholder: 'Usuario o acción…',
        rows: boundAudit.map((a, i) => vpsAuditRow(a, i)),
      },
    ],
  }, hosts, boundPorts)
}

const containerRow = (c: Row, index: number): InfraResourceRow => ({
  id: rowId('ctr', c['id'] ?? c['name'], index),
  title: String(c['name']),
  subtitle: String(c['image']),
  status: statusLabel(c['status']),
  fields: [
    { label: 'Host', value: String(c['host']) },
    { label: 'Imagen', value: String(c['image']), mono: true },
    { label: 'Puertos', value: String(c['ports']), mono: true },
    { label: 'Runtime', value: 'containerd · restart unless-stopped' },
  ],
  metrics: [
    { label: 'CPU', value: Number(c['cpu'] ?? 0) },
    { label: 'RAM', value: Number(c['ram'] ?? 0) },
  ],
  tags: ['docker', String(c['host'])],
  detail: `Contenedor ${c['name']} ejecutando ${c['image']} en ${c['host']}. Healthcheck HTTP cada 30s. Acciones: start/stop/restart, attach logs, exec shell y export de métricas cAdvisor.`,
  sync: 'Live · 15s',
})

const dockerHostRow = (h: Row, index: number): InfraResourceRow => ({
  id: rowId('dhost', h['id'] ?? h['hostRef'], index),
  title: String(h['hostRef']),
  subtitle: String(h['ip']),
  status: statusLabel(h['status']),
  fields: [
    { label: 'IP privada', value: String(h['ip']), mono: true },
    { label: 'Engine', value: String(h['engine']) },
    { label: 'SO', value: String(h['os']) },
    { label: 'Contenedores', value: String(h['containerCount']) },
  ],
  metrics: [
    { label: 'CPU host', value: Number(h['cpu'] ?? 0) },
    { label: 'RAM host', value: Number(h['ram'] ?? 0) },
  ],
  tags: ['host', 'docker-engine'],
  detail: `Host Docker ${h['hostRef']} con ${h['containerCount']} contenedores activos. TLS habilitado en el socket remoto. Discovery automático cada 5 min vía SSH.`,
})

const dockerImageRow = (img: Row, index: number): InfraResourceRow => ({
  id: rowId('img', img['name'], index),
  title: `${img['name']}:${img['tag']}`,
  status: statusLabel(img['status']),
  fields: [
    { label: 'Tamaño', value: String(img['size']) },
    { label: 'Capas', value: String(img['layers']) },
    { label: 'Hosts', value: String(img['hosts']) },
    { label: 'Escaneo', value: 'Sin CVE críticas' },
  ],
  tags: ['imagen', 'registry'],
  detail: `Imagen ${img['name']} presente en ${img['hosts']} hosts. Firmada en registry privado. Política de retención: 90 días sin uso.`,
})

const dockerNetworkRow = (n: Row, index: number): InfraResourceRow => ({
  id: rowId('net', n['name'], index),
  title: String(n['name']),
  status: statusLabel(n['status']),
  fields: [
    { label: 'Driver', value: String(n['driver']) },
    { label: 'Scope', value: String(n['scope']) },
    { label: 'Subred', value: String(n['subnet']), mono: true },
    { label: 'Contenedores', value: String(n['containers']) },
  ],
  tags: ['red', String(n['driver'])],
  detail: `Red ${n['name']} (${n['driver']}) con subred ${n['subnet']}. ${n['containers']} endpoints conectados. MTU 1500, cifrado overlay en tránsito.`,
})

const dockerVolumeRow = (v: Row, index: number): InfraResourceRow => ({
  id: rowId('vol', v['name'], index),
  title: String(v['name']),
  status: statusLabel(v['status']),
  fields: [
    { label: 'Driver', value: String(v['driver']) },
    { label: 'Mountpoint', value: String(v['mountpoint']), mono: true },
    { label: 'Tamaño', value: String(v['size']) },
    { label: 'Adjunto', value: String(v['attached']) },
  ],
  tags: ['volumen', 'persistencia'],
  detail: `Volumen ${v['name']} (${v['size']}) montado en ${v['attached']}. Snapshots diarios habilitados. IOPS provisionados según host subyacente.`,
})

const dockerLogRow = (c: Row, index: number): InfraResourceRow => ({
  id: rowId('log', c['name'], index),
  title: `Logs · ${c['name']}`,
  subtitle: String(c['host']),
  status: 'streaming',
  fields: [
    { label: 'Última línea', value: 'GET /health 200 · 12ms', mono: true },
    { label: 'Nivel', value: 'INFO' },
    { label: 'Retención', value: '7 días' },
    { label: 'Destino', value: 'Loki + S3' },
  ],
  tags: ['logs', 'observabilidad'],
  detail: `[2026-06-02T10:00:01Z] ${c['name']}: started\n[2026-06-02T10:05:00Z] GET /api/v1/status 200\n[2026-06-02T10:12:33Z] worker: job #42 completed`,
  sync: 'Tail en vivo',
})

const k8sPodRow = (p: Row, index: number): InfraResourceRow => ({
  id: rowId('pod', p['name'], index),
  title: String(p['name']),
  subtitle: String(p['namespace']),
  status: statusLabel(p['status']),
  fields: [
    { label: 'Namespace', value: String(p['namespace']) },
    { label: 'Nodo', value: String(p['node']) },
    { label: 'Reinicios', value: String(p['restarts']) },
    { label: 'QoS', value: Number(p['restarts']) > 3 ? 'Burstable' : 'Guaranteed' },
  ],
  metrics: [
    { label: 'CPU', value: Number(p['cpu'] ?? 0) },
    { label: 'RAM', value: Number(p['ram'] ?? 0) },
  ],
  tags: ['pod', String(p['namespace'])],
  detail: `Pod ${p['name']} programado en ${p['node']}. Probes liveness/readiness activas. Sidecar de métricas Prometheus habilitado.`,
})

const k8sClusterRow = (c: Row, index: number): InfraResourceRow => ({
  id: rowId('cluster', c['name'], index),
  title: String(c['name']),
  subtitle: String(c['provider']),
  status: statusLabel(c['status']),
  fields: [
    { label: 'Proveedor', value: String(c['provider']) },
    { label: 'Versión', value: String(c['version']) },
    { label: 'Región', value: String(c['region']) },
    { label: 'Nodos / Pods', value: `${c['nodes']} / ${c['pods']}` },
  ],
  tags: ['cluster', String(c['provider'])],
  detail: `Cluster ${c['name']} (${c['provider']} ${c['version']}) en ${c['region']}. Autoscaling de nodos habilitado. Backup etcd diario.`,
})

const k8sNodeRow = (n: Row, index: number): InfraResourceRow => ({
  id: rowId('node', n['name'], index),
  title: String(n['name']),
  subtitle: String(n['cluster']),
  status: statusLabel(n['status']),
  fields: [
    { label: 'Cluster', value: String(n['cluster']) },
    { label: 'Rol', value: String(n['role']) },
    { label: 'Pods', value: String(n['pods']) },
    { label: 'Cordon', value: 'No' },
  ],
  metrics: [
    { label: 'CPU', value: Number(n['cpu'] ?? 0) },
    { label: 'RAM', value: Number(n['ram'] ?? 0) },
  ],
  tags: ['nodo', String(n['role'])],
  detail: `Nodo ${n['name']} (${n['role']}) con ${n['pods']} pods. Kubelet sincronizado. Disco /var/lib/kubelet al 61%.`,
})

const k8sNamespaceRow = (n: Row, index: number): InfraResourceRow => ({
  id: rowId('ns', n['name'], index),
  title: String(n['name']),
  subtitle: String(n['cluster']),
  status: statusLabel(n['status']),
  fields: [
    { label: 'Cluster', value: String(n['cluster']) },
    { label: 'Pods', value: String(n['pods']) },
    { label: 'Cuotas', value: String(n['quotas']) },
    { label: 'NetworkPolicy', value: 'default-deny + allow-dns' },
  ],
  tags: ['namespace'],
  detail: `Namespace ${n['name']} con cuotas ${n['quotas']}. RBAC restringido a equipo de plataforma.`,
})

const k8sDeploymentRow = (d: Row, index: number): InfraResourceRow => ({
  id: rowId('dep', d['name'], index),
  title: String(d['name']),
  subtitle: String(d['namespace']),
  status: statusLabel(d['status']),
  fields: [
    { label: 'Namespace', value: String(d['namespace']) },
    { label: 'Réplicas', value: String(d['replicas']) },
    { label: 'Estrategia', value: String(d['strategy']) },
    { label: 'Imagen', value: String(d['image']), mono: true },
  ],
  tags: ['deployment', String(d['strategy'])],
  detail: `Deployment ${d['name']} con estrategia ${d['strategy']}. Rollout progresivo con maxUnavailable 0.`,
})

const k8sServiceRow = (s: Row, index: number): InfraResourceRow => ({
  id: rowId('svc', s['name'], index),
  title: String(s['name']),
  subtitle: String(s['namespace']),
  status: statusLabel(s['status']),
  fields: [
    { label: 'Tipo', value: String(s['type']) },
    { label: 'Puertos', value: String(s['ports']), mono: true },
    { label: 'Endpoints', value: String(s['endpoints']) },
    { label: 'Session affinity', value: 'ClientIP' },
  ],
  tags: ['service', String(s['type'])],
  detail: `Service ${s['name']} (${s['type']}) expone ${s['ports']} hacia ${s['endpoints']} endpoints.`,
})

const k8sEventRow = (e: Row, index: number): InfraResourceRow => ({
  id: rowId('evt', e['object'], index),
  title: String(e['reason']),
  subtitle: String(e['object']),
  status: String(e['type']).toLowerCase().includes('warn') ? 'warning' : 'running',
  fields: [
    { label: 'Tipo', value: String(e['type']) },
    { label: 'Objeto', value: String(e['object']), mono: true },
    { label: 'Mensaje', value: String(e['message']) },
    { label: 'Ventana', value: 'Últimos 15 min' },
  ],
  tags: ['evento', String(e['type'])],
  detail: String(e['message']),
  sync: 'Plano de control',
})

const vpsServerRow = (h: VpsHostRow, index: number): InfraResourceRow => ({
  id: rowId('vps', h.id, index),
  title: h.name,
  subtitle: h.host,
  hostId: h.id,
  hostName: h.name,
  hostIp: h.host,
  status: statusLabel(h.status ?? 'online'),
  fields: [
    { label: 'IP / Host', value: h.host, mono: true },
    { label: 'Proveedor', value: String(h.provider ?? '—') },
    { label: 'Ubicación', value: String(h.location ?? '—') },
    { label: 'SO', value: String(h.os ?? '—') },
    { label: 'Usuario SSH', value: String(h.user ?? 'ubuntu'), mono: true },
    { label: 'Docker', value: h.docker ? 'Detectado' : 'No' },
    { label: 'Kubernetes', value: h.kubernetes ? 'Detectado' : 'No' },
  ],
  metrics: [
    { label: 'CPU', value: h.cpu ?? 0 },
    { label: 'RAM', value: h.ram ?? 0 },
    { label: 'Disco', value: h.disk ?? 0 },
  ],
  tags: [String(h.provider ?? 'vps'), h.location ?? ''].filter(Boolean),
  providerLogo: providerLogo(h.provider),
  detail: `Servidor ${h.name} (${h.provider}) en ${h.location}. Acceso SSH por clave, auditoría de sesiones y discovery automático de runtimes.`,
  sync: 'Agentless · 5 min',
})

const vpsSshRow = (k: Row, index: number): InfraResourceRow => ({
  id: rowId('ssh', k['name'], index),
  title: String(k['name']),
  status: statusLabel(k['status']),
  fields: [
    { label: 'Huella', value: String(k['fingerprint']), mono: true },
    { label: 'Usuarios autorizados', value: String(k['users']) },
    { label: 'Último uso', value: new Date(String(k['lastUsed'])).toLocaleString('es-ES') },
    { label: 'Algoritmo', value: String(k['name']).includes('ed25519') ? 'ED25519' : 'RSA 4096' },
  ],
  tags: ['ssh', 'acceso'],
  detail: `Clave ${k['name']} autorizada en ${k['users']} usuarios. Rotación recomendada cada 90 días.`,
})

const vpsServiceRow = (s: Row, index: number): InfraResourceRow => ({
  id: rowId('svc', `${s['host']}-${s['unit']}`, index),
  title: String(s['unit']),
  subtitle: String(s['host']),
  status: statusLabel(s['status']),
  fields: [
    { label: 'Host', value: String(s['host']) },
    { label: 'Estado systemd', value: String(s['state']) },
    { label: 'Activo desde', value: String(s['since']) },
    { label: 'Puertos', value: String(s['port']), mono: true },
  ],
  tags: ['systemd', String(s['host'])],
  detail: `Unidad ${s['unit']} en ${s['host']} — estado ${s['state']}. Reinicio automático habilitado.`,
})

const vpsDockerRow = (h: VpsHostRow, index: number): InfraResourceRow => ({
  id: rowId('vdock', h.id, index),
  title: h.name,
  subtitle: h.host,
  hostId: h.id,
  hostName: h.name,
  hostIp: h.host,
  status: 'running',
  fields: [
    { label: 'Engine', value: 'Docker 26.x' },
    { label: 'Socket', value: '/var/run/docker.sock', mono: true },
    { label: 'Contenedores', value: 'Detectados vía SSH' },
    { label: 'Compose', value: 'v2 plugin instalado' },
  ],
  tags: ['docker', 'discovery'],
  detail: `Docker Engine activo en ${h.name}. Inventario sincronizado con la sección Docker.`,
})

const vpsK8sRow = (h: VpsHostRow, index: number): InfraResourceRow => ({
  id: rowId('vk8s', h.id, index),
  title: h.name,
  subtitle: h.host,
  hostId: h.id,
  hostName: h.name,
  hostIp: h.host,
  status: 'running',
  fields: [
    { label: 'Agente', value: 'kubelet / k3s' },
    { label: 'API', value: '6443/TCP' },
    { label: 'Rol', value: index === 0 ? 'control-plane' : 'worker' },
    { label: 'CNI', value: 'Calico' },
  ],
  tags: ['kubernetes', 'nodo'],
  detail: `Nodo Kubernetes detectado en ${h.name}. Ver detalle completo en la sección Kubernetes.`,
})

const vpsPortRow = (p: Row, index: number): InfraResourceRow => ({
  id: rowId('port', `${p['host']}-${p['port']}`, index),
  title: `${p['host']}:${p['port']}`,
  subtitle: String(p['service']),
  hostName: String(p['host']),
  status: statusLabel(p['status']),
  fields: [
    { label: 'Host', value: String(p['host']) },
    { label: 'Servicio', value: String(p['service']) },
    { label: 'Exposición', value: String(p['exposure']) },
    { label: 'Firewall', value: String(p['status']).includes('warn') ? 'Revisar regla' : 'Aprobado' },
    { label: 'Escaneo', value: 'Último: hace 6 h' },
  ],
  tags: ['puerto', String(p['service'])],
  detail: `Puerto ${p['port']} (${p['service']}) en ${p['host']}. Exposición: ${p['exposure']}.`,
})

const vpsMetricsRow = (h: VpsHostRow, index: number): InfraResourceRow => ({
  id: rowId('metric', h.id, index),
  title: h.name,
  subtitle: 'Recolección agentless',
  hostId: h.id,
  hostName: h.name,
  hostIp: h.host,
  status: 'running',
  fields: [
    { label: 'Intervalo', value: '5 min' },
    { label: 'Uptime', value: '99.97%' },
    { label: 'Load avg', value: '1.2 / 1.0 / 0.8' },
    { label: 'Disco IOPS', value: '1.8k read · 420 write' },
  ],
  metrics: [
    { label: 'CPU', value: h.cpu ?? 0 },
    { label: 'RAM', value: h.ram ?? 0 },
    { label: 'Disco', value: h.disk ?? 0 },
  ],
  tags: ['métricas', 'observabilidad'],
  detail: `Métricas de ${h.name}: CPU ${h.cpu}%, RAM ${h.ram}%, disco ${h.disk}%. Alertas configuradas en umbral 85%.`,
})

const vpsAuditRow = (a: Row, index: number): InfraResourceRow => ({
  id: rowId('audit', `${a['user']}-${index}`, index),
  title: String(a['action']),
  subtitle: String(a['host']),
  status: statusLabel(a['status']),
  fields: [
    { label: 'Usuario', value: String(a['user']) },
    { label: 'Host', value: String(a['host']) },
    { label: 'Duración', value: String(a['duration']) },
    { label: 'Timestamp', value: new Date(String(a['at'])).toLocaleString('es-ES') },
  ],
  tags: ['auditoría', 'ssh'],
  detail: `Sesión registrada: ${a['user']} ejecutó «${a['action']}» en ${a['host']} (${a['duration']}).`,
})
