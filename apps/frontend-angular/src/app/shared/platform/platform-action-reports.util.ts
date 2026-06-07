import type { NavLogoKey } from '../theme/nav-logo.types'
import { applyObservabilityMeta } from './observability-meta.util'

export type PlatformOpStatus = 'ok' | 'warn' | 'fail'
export type PlatformArea = 'observability' | 'security' | 'admin'

export interface PlatformOpKpi {
  label: string
  value: string
  tone?: 'ok' | 'warn' | 'crit'
  icon?: string
}

export interface PlatformOpStep {
  label: string
  status: PlatformOpStatus
  detail: string
  durationMs?: number
}

export interface PlatformOpSection {
  title: string
  icon?: string
  items?: string[]
  table?: { headers: string[]; rows: string[][] }
  code?: string
  steps?: PlatformOpStep[]
}

export interface PlatformActionReport {
  area: PlatformArea
  moduleId: string
  sectionId: string
  actionId: string
  title: string
  subtitle: string
  summary?: string
  resourceName?: string
  generatedAt: string
  durationSec: number
  status: PlatformOpStatus
  alerts?: { severity: PlatformOpStatus; message: string }[]
  impact?: string
  kpis: PlatformOpKpi[]
  sections: PlatformOpSection[]
  recommendations: string[]
  exportBase: string
  primaryLogo?: NavLogoKey
  integrationLogos?: NavLogoKey[]
  stackLabel?: string
}

const slug = (v: string): string =>
  v.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)

const rowLabel = (row?: Record<string, unknown>): string =>
  String(row?.['name'] ?? row?.['title'] ?? row?.['id'] ?? row?.['action'] ?? row?.['finding'] ?? row?.['email'] ?? 'recurso')

const base = (
  area: PlatformArea,
  moduleId: string,
  sectionId: string,
  actionId: string,
  title: string,
  subtitle: string,
  resourceName?: string,
): PlatformActionReport => ({
  area,
  moduleId,
  sectionId,
  actionId,
  title,
  subtitle,
  resourceName,
  generatedAt: new Date().toLocaleString('es-ES'),
  durationSec: 1 + Math.floor(Math.random() * 5),
  status: 'ok',
  kpis: [],
  sections: [],
  recommendations: [],
  exportBase: slug(`${moduleId}-${actionId}-${resourceName ?? 'global'}`),
})

export const resolveModuleArea = (moduleId: string): PlatformArea => {
  const observability = ['logs', 'incidents', 'cost-optimizer', 'reports', 'change-management', 'metrics', 'billing', 'alerts', 'notifications']
  const security = ['security-center', 'secrets-manager', 'compliance', 'access-control', 'audit']
  if (observability.includes(moduleId)) return 'observability'
  if (security.includes(moduleId)) return 'security'
  return 'admin'
}

const jsonSection = (title: string, data: unknown): PlatformOpSection => ({
  title,
  icon: 'data_object',
  code: JSON.stringify(data, null, 2),
})

const chartTable = (title: string, headers: string[], rows: string[][]): PlatformOpSection => ({
  title,
  icon: 'bar_chart',
  table: { headers, rows },
})

export const buildPlatformActionReport = (
  moduleId: string,
  actionId: string,
  opts?: {
    actionLabel?: string
    tabLabel?: string
    row?: Record<string, unknown>
    area?: PlatformArea
  },
): PlatformActionReport => {
  const area = opts?.area ?? resolveModuleArea(moduleId)
  const row = opts?.row
  const tab = opts?.tabLabel ?? 'general'
  const label = opts?.actionLabel ?? actionId
  const res = rowLabel(row)

  const r = base(area, moduleId, tab, actionId, label, `Operación completada · ${moduleId}`, res)

  switch (moduleId) {
    case 'logs':
      if (actionId === 'live-tail') {
        r.title = 'Tail en vivo'
        r.subtitle = 'Stream de logs agregado · 6 fuentes'
        r.kpis = [
          { label: 'Eventos/s', value: '842', icon: 'speed' },
          { label: 'Errores', value: '12', icon: 'error', tone: 'warn' },
          { label: 'Fuentes', value: '6', icon: 'source' },
          { label: 'Retención', value: '30 días', icon: 'archive' },
        ]
        r.sections = [
          jsonSection('Últimas líneas', { level: 'error', source: 'kubernetes', message: 'OOMKilled checkout-api-7f2' }),
          chartTable('Volumen por hora', ['Hora', 'Eventos', 'Errores'], [
            ['08:00', '1.2k', '8'],
            ['09:00', '1.4k', '14'],
            ['10:00', '1.1k', '6'],
          ]),
        ]
      } else if (actionId === 'detail' || actionId === 'view') {
        r.title = `Detalle de log · ${res}`
        r.kpis = [
          { label: 'Nivel', value: String(row?.['level'] ?? 'info'), icon: 'flag' },
          { label: 'Fuente', value: String(row?.['source'] ?? 'system'), icon: 'source' },
        ]
        r.sections = [jsonSection('Entrada completa', row ?? {})]
      } else if (actionId === 'export') {
        r.title = 'Exportación de logs'
        r.kpis = [{ label: 'Registros', value: '12.400', icon: 'receipt_long' }, { label: 'Formato', value: 'JSONL', icon: 'description' }]
        r.sections = [{ title: 'Archivos generados', icon: 'folder', items: ['logs-2026-06-06.jsonl.gz', 'manifest.json'] }]
      } else {
        r.title = label
        r.summary = `Consulta guardada y filtros aplicados en pestaña ${tab}.`
      }
      r.recommendations = ['Configura alertas sobre patrones de error recurrentes.']
      break

    case 'incidents':
      if (actionId === 'declare') {
        r.title = 'Incidente declarado'
        r.status = 'warn'
        r.kpis = [{ label: 'ID', value: 'INC-1043', icon: 'tag' }, { label: 'Severidad', value: 'Crítica', icon: 'priority_high', tone: 'crit' }]
        r.sections = [{ title: 'Pasos iniciales', icon: 'checklist', steps: [
          { label: 'War room abierto', status: 'ok', detail: '#incident-response', durationMs: 120 },
          { label: 'On-call notificado', status: 'ok', detail: 'PagerDuty + Slack', durationMs: 340 },
          { label: 'Status page', status: 'ok', detail: 'Investigando degradación', durationMs: 80 },
        ]}]
      } else if (actionId === 'resolve') {
        r.title = `Incidente resuelto · ${res}`
        r.kpis = [{ label: 'MTTR', value: '38 min', icon: 'timer' }, { label: 'Impacto', value: 'Bajo', icon: 'trending_down' }]
      } else if (actionId === 'detail') {
        r.title = `Incidente · ${res}`
        r.sections = [
          chartTable('Línea temporal', ['Evento', 'Cuándo'], [
            ['Detectado', 'hace 90 min'],
            ['Escalado a SRE', 'hace 60 min'],
            ['Mitigación aplicada', 'hace 15 min'],
          ]),
          jsonSection('Metadatos', row ?? {}),
        ]
      } else {
        r.title = label
        r.summary = `Actualización publicada en canal #incidents y status page.`
      }
      r.recommendations = ['Documenta post-mortem en las próximas 48 h.']
      break

    case 'cost-optimizer':
      if (actionId === 'apply') {
        r.title = 'Recomendación aplicada'
        r.kpis = [
          { label: 'Ahorro est.', value: String(row?.['savings'] ?? '$420/mes'), icon: 'savings', tone: 'ok' },
          { label: 'Recurso', value: res, icon: 'dns' },
        ]
        r.sections = [{ title: 'Cambios planificados', icon: 'edit', items: ['Redimensionar instancia m5.2xlarge → m5.large', 'Ventana de mantenimiento: domingo 04:00 UTC'] }]
      } else if (actionId === 'detail') {
        r.title = `Análisis · ${res}`
        r.sections = [
          chartTable('Uso CPU 30 días', ['Semana', 'Promedio'], [['S1', '8%'], ['S2', '9%'], ['S3', '7%'], ['S4', '8%']]),
          { title: 'Recomendación', icon: 'lightbulb', items: [String(row?.['issue'] ?? 'Optimizar tamaño de instancia')] },
        ]
      } else if (actionId === 'export') {
        r.title = 'Informe de optimización'
        r.kpis = [{ label: 'Ahorro total', value: '$2.840/mes', icon: 'savings' }, { label: 'Recs.', value: '15', icon: 'list' }]
      } else {
        r.title = label
        r.summary = 'Análisis refrescado con datos de las últimas 24 h.'
      }
      r.recommendations = ['Revisa recursos huérfanos antes del cierre de mes.']
      break

    case 'reports':
      if (actionId === 'generate') {
        r.title = 'Informe generado'
        r.kpis = [{ label: 'Plantilla', value: 'Resumen ejecutivo', icon: 'description' }, { label: 'Páginas', value: '24', icon: 'article' }]
        r.sections = [{ title: 'Secciones incluidas', icon: 'list', items: ['Costes cloud', 'Postura de seguridad', 'Disponibilidad SLA', 'Actividad operativa'] }]
      } else if (actionId === 'download') {
        r.title = `Descarga · ${res}`
        r.sections = [{ title: 'Archivo', icon: 'picture_as_pdf', items: [`${res}.pdf`, `${res}-datos.csv`] }]
      } else if (actionId === 'detail') {
        r.title = `Informe · ${res}`
        r.sections = [jsonSection('Metadatos del informe', row ?? {})]
      } else {
        r.title = label
        r.summary = 'Programación de envío configurada: lunes 08:00 UTC.'
      }
      break

    case 'change-management':
      if (actionId === 'detail') {
        r.title = `Cambio · ${res}`
        r.kpis = [
          { label: 'Usuario', value: String(row?.['user'] ?? '—'), icon: 'person' },
          { label: 'Severidad', value: String(row?.['severity'] ?? 'info'), icon: 'flag' },
        ]
        r.sections = [
          chartTable('Diff resumido', ['Campo', 'Antes', 'Después'], [
            ['Estado', String(row?.['before'] ?? '—'), String(row?.['after'] ?? '—')],
          ]),
          jsonSection('Registro completo', row ?? {}),
        ]
      } else if (actionId === 'export') {
        r.title = 'Changelog exportado'
        r.kpis = [{ label: 'Cambios', value: '47', icon: 'history' }, { label: 'Críticos', value: '3', icon: 'priority_high', tone: 'warn' }]
      } else {
        r.title = label
        r.summary = 'Filtro de cambios críticos aplicado a la vista actual.'
      }
      break

    case 'security-center':
      if (actionId === 'scan') {
        r.title = 'Escaneo de seguridad'
        r.kpis = [
          { label: 'Riesgo', value: '72/100', icon: 'shield', tone: 'warn' },
          { label: 'Hallazgos', value: '18', icon: 'bug_report' },
          { label: 'Críticos', value: '4', icon: 'error', tone: 'crit' },
        ]
        r.sections = [chartTable('Por categoría', ['Categoría', 'Count'], [['Puertos', '6'], ['IAM', '4'], ['S3', '3'], ['SSH', '5']])]
      } else if (actionId === 'remediate') {
        r.title = `Remediación · ${res}`
        r.status = 'warn'
        r.sections = [{ title: 'Acciones', icon: 'healing', steps: [
          { label: 'Regla SG actualizada', status: 'ok', detail: 'Puerto 22 restringido a VPN', durationMs: 1200 },
          { label: 'Validación', status: 'ok', detail: 'Escaneo de puertos OK', durationMs: 3400 },
        ]}]
      } else if (actionId === 'detail') {
        r.title = `Hallazgo · ${res}`
        r.alerts = [{ severity: 'warn', message: 'Requiere aprobación de cambio en producción.' }]
        r.sections = [jsonSection('Detalle del hallazgo', row ?? {})]
      } else {
        r.title = label
        r.summary = 'Informe de postura exportado en PDF y CSV.'
      }
      r.recommendations = ['Habilita MFA para todos los usuarios con rol admin.']
      break

    case 'secrets-manager':
      if (actionId === 'add') {
        r.title = 'Secreto añadido'
        r.kpis = [{ label: 'Tipo', value: 'API', icon: 'vpn_key' }, { label: 'Vault', value: 'vault/prod#new', icon: 'lock' }]
        r.sections = [{ title: 'Política de rotación', icon: 'autorenew', items: ['Cada 90 días', 'Notificación 14 días antes'] }]
      } else if (actionId === 'rotate') {
        r.title = `Rotación · ${res}`
        r.sections = [{ title: 'Pasos', icon: 'sync', steps: [
          { label: 'Nueva versión generada', status: 'ok', detail: 'v3 activa', durationMs: 800 },
          { label: 'Consumidores actualizados', status: 'ok', detail: '3 servicios', durationMs: 2100 },
          { label: 'Versión anterior revocada', status: 'ok', detail: 'v2 invalidada', durationMs: 400 },
        ]}]
      } else if (actionId === 'detail') {
        r.title = `Secreto · ${res}`
        r.sections = [jsonSection('Metadatos (sin valor)', { ...row, value: '[REDACTED]' })]
      } else {
        r.title = label
        r.summary = 'Entrada de auditoría registrada con usuario y timestamp.'
      }
      break

    case 'compliance':
      if (actionId === 'scan') {
        r.title = 'Escaneo de cumplimiento'
        r.kpis = [{ label: 'Puntuación', value: '87%', icon: 'verified' }, { label: 'Violaciones', value: '14', icon: 'gpp_bad', tone: 'warn' }]
        r.sections = [chartTable('Por regla', ['Regla', 'Violaciones'], [['require-tags', '4'], ['require-backup', '2'], ['no-public-ssh', '1']])]
      } else if (actionId === 'remediate') {
        r.title = `Remediación · ${res}`
        r.sections = [{ title: 'Plan', icon: 'task_alt', items: [String(row?.['recommendation'] ?? 'Aplicar política recomendada')] }]
      } else if (actionId === 'detail') {
        r.title = `Violación · ${res}`
        r.sections = [jsonSection('Registro de violación', row ?? {})]
      } else {
        r.title = label
      }
      break

    case 'access-control':
      if (actionId === 'grant') {
        r.title = 'Acceso concedido'
        r.kpis = [{ label: 'Rol', value: 'Operator', icon: 'badge' }, { label: 'Ámbito', value: 'Staging', icon: 'layers' }]
      } else if (actionId === 'detail') {
        r.title = `Asignación · ${res}`
        r.sections = [
          chartTable('Permisos efectivos', ['Permiso', 'Estado'], [['instances.read', '✓'], ['terraform.apply', '✗']]),
          jsonSection('Política', row ?? {}),
        ]
      } else {
        r.title = label
        r.summary = 'Revisión de políticas IAM completada sin conflictos.'
      }
      break

    case 'users':
      if (actionId === 'invite') {
        r.title = 'Invitación enviada'
        r.kpis = [{ label: 'Email', value: 'nuevo@cloudops.local', icon: 'mail' }, { label: 'Rol', value: 'Developer', icon: 'badge' }]
        r.sections = [{ title: 'Pasos', icon: 'forward_to_inbox', steps: [
          { label: 'Email de invitación', status: 'ok', detail: 'Enviado', durationMs: 420 },
          { label: 'Enlace MFA', status: 'ok', detail: 'Válido 72 h', durationMs: 0 },
        ]}]
      } else if (actionId === 'detail') {
        r.title = `Usuario · ${res}`
        r.sections = [jsonSection('Perfil', row ?? {})]
      } else if (actionId === 'disable') {
        r.title = `Usuario desactivado · ${res}`
        r.status = 'warn'
        r.impact = 'Sesiones activas revocadas en 30 s.'
      } else {
        r.title = label
        r.summary = 'Sincronización SSO completada: 24 usuarios actualizados.'
      }
      break

    case 'api-tokens':
      if (actionId === 'create') {
        r.title = 'Token API creado'
        r.kpis = [{ label: 'Prefijo', value: 'cops_live_••••', icon: 'vpn_key' }, { label: 'Scopes', value: '3', icon: 'policy' }]
        r.sections = [jsonSection('Token (solo visible ahora)', { token: 'cops_live_demo_only_show_once', scopes: ['read:metrics', 'write:jenkins'] })]
        r.alerts = [{ severity: 'warn', message: 'Copia el token ahora; no se volverá a mostrar.' }]
      } else if (actionId === 'revoke') {
        r.title = `Token revocado · ${res}`
        r.status = 'warn'
        r.impact = 'Las peticiones con este token devolverán HTTP 401.'
      } else if (actionId === 'rotate') {
        r.title = `Token rotado · ${res}`
        r.sections = [{ title: 'Rotación', icon: 'autorenew', steps: [
          { label: 'Nuevo token emitido', status: 'ok', detail: 'Prefijo actualizado', durationMs: 200 },
          { label: 'Gracia 24 h', status: 'ok', detail: 'Token anterior válido', durationMs: 0 },
        ]}]
      } else if (actionId === 'detail') {
        r.title = `Token · ${res}`
        r.sections = [jsonSection('Metadatos', row ?? {})]
      } else {
        r.title = label
      }
      break

    case 'admin-webhooks':
      if (actionId === 'create') {
        r.title = 'Webhook creado'
        r.kpis = [{ label: 'Eventos', value: '4', icon: 'webhook' }, { label: 'Firma', value: 'HMAC-SHA256', icon: 'verified' }]
      } else if (actionId === 'test') {
        r.title = `Prueba de entrega · ${res}`
        r.sections = [{ title: 'Resultado HTTP', icon: 'send', steps: [
          { label: 'POST destino', status: 'ok', detail: 'HTTP 200 · 142 ms', durationMs: 142 },
          { label: 'Firma validada', status: 'ok', detail: 'X-CloudOps-Signature OK', durationMs: 12 },
        ]}]
      } else if (actionId === 'payload') {
        r.title = `Payload · ${res}`
        r.sections = [jsonSection('Cuerpo JSON', { type: row?.['event'] ?? 'alert.created', data: row })]
      } else if (actionId === 'retry') {
        r.title = 'Reintento programado'
        r.status = 'warn'
        r.sections = [{ title: 'Cola', icon: 'replay', items: ['Backoff exponencial: 30s → 60s → 120s'] }]
      } else {
        r.title = label
      }
      break

    case 'metrics':
      r.title = label
      r.summary = 'Métricas agregadas de infraestructura, contenedores y servicios cloud.'
      r.kpis = [
        { label: 'Recursos', value: '12', icon: 'dns' },
        { label: 'Saludables', value: '9', icon: 'check_circle', tone: 'ok' },
        { label: 'CPU prom.', value: '34%', icon: 'memory' },
        { label: 'Alertas', value: '2', icon: 'warning', tone: 'warn' },
      ]
      r.sections = [
        chartTable('CPU por servicio (24 h)', ['Servicio', 'Promedio', 'p99'], [
          ['checkout-api', '42%', '78%'],
          ['nginx-edge', '18%', '35%'],
          ['postgres-primary', '28%', '51%'],
        ]),
        chartTable('Series Prometheus', ['Métrica', 'Scrape', 'Estado'], [
          ['http_requests_total', '15s', 'UP'],
          ['container_cpu_usage', '30s', 'UP'],
          ['node_memory_available', '30s', 'UP'],
        ]),
        { title: 'Dashboards Grafana', icon: 'dashboard', items: ['Infra overview', 'K8s workloads', 'SLO error budget'] },
      ]
      r.impact = 'Datos demo sincronizados desde Prometheus y exporters node/cAdvisor.'
      break

    case 'roles':
      r.title = label
      r.kpis = [{ label: 'Roles', value: '8', icon: 'badge' }, { label: 'Permisos', value: '32', icon: 'policy' }]
      r.sections = [chartTable('Matriz RBAC', ['Rol', 'Usuarios'], [['Super Admin', '2'], ['Developer', '12'], ['Viewer', '6']])]
      break

    case 'billing':
      if (actionId === 'sync') {
        r.title = 'Facturación sincronizada'
        r.summary = 'Importación completada desde APIs de facturación AWS, GCP, Azure y VPS.'
        r.kpis = [
          { label: 'Proveedores', value: '4', icon: 'cloud' },
          { label: 'Mes actual', value: '$18.200', icon: 'payments' },
          { label: 'Variación', value: '+3.2%', icon: 'trending_up', tone: 'warn' },
          { label: 'Líneas', value: '847', icon: 'receipt_long' },
        ]
        r.sections = [
          chartTable('Desglose por proveedor', ['Proveedor', 'Importe', '%'], [
            ['AWS', '$7.280', '40%'],
            ['GCP', '$5.460', '30%'],
            ['Azure', '$3.640', '20%'],
            ['VPS', '$1.820', '10%'],
          ]),
          chartTable('Top servicios', ['Servicio', 'Coste', 'Tendencia'], [
            ['EC2 compute', '$3.120', '+4%'],
            ['GKE clusters', '$2.890', '+1%'],
            ['S3 storage', '$1.240', '−2%'],
          ]),
        ]
        r.impact = 'Próxima sincronización automática en 6 h.'
      } else if (actionId === 'export') {
        r.title = 'Exportación CSV / PDF'
        r.summary = 'Informes de facturación listos para descarga.'
        r.kpis = [{ label: 'Periodo', value: 'Jun 2026', icon: 'calendar_month' }, { label: 'Registros', value: '847', icon: 'table_rows' }]
        r.sections = [{ title: 'Archivos generados', icon: 'download', items: ['billing-2026-06.csv', 'billing-summary.pdf', 'cost-by-service.json'] }]
      } else {
        r.title = label
        r.summary = `Análisis detallado · ${String(row?.['provider'] ?? 'todos los proveedores')}`
        r.kpis = [
          { label: 'Importe', value: String(row?.['amount'] ?? '$940'), icon: 'payments' },
          { label: 'Proveedor', value: String(row?.['provider'] ?? 'AWS'), icon: 'cloud' },
        ]
        r.sections = [
          chartTable('Tendencia diaria', ['Día', 'Coste', 'Δ'], [['Lun', '$820', '+2%'], ['Mar', '$940', '+8%'], ['Mié', '$880', '−6%']]),
          { title: 'Desglose servicios', icon: 'pie_chart', items: ['compute 60%', 'storage 25%', 'network 15%'] },
        ]
      }
      r.recommendations = ['Revisa picos de coste en EC2 y GKE antes del cierre de mes.']
      break

    case 'alerts':
      if (actionId === 'resolve') {
        r.title = `Alerta resuelta · ${res}`
        r.summary = 'Estado actualizado y notificación de resolución enviada.'
        r.kpis = [
          { label: 'Duración', value: '2h 14m', icon: 'timer' },
          { label: 'Severidad', value: String(row?.['severity'] ?? 'warning'), icon: 'flag' },
          { label: 'Recurso', value: String(row?.['resource'] ?? res), icon: 'dns' },
        ]
        r.sections = [{ title: 'Acciones tomadas', icon: 'healing', items: ['Escalado a SRE', 'Pods escalados +2', 'Alerta silenciada automáticamente'] }]
      } else if (actionId === 'silence') {
        r.title = `Alerta silenciada · ${res}`
        r.status = 'warn'
        r.summary = 'Silencio activo durante 1 hora. No se enviarán notificaciones push ni email.'
        r.kpis = [{ label: 'Expira', value: '60 min', icon: 'schedule' }, { label: 'Motivo', value: 'Mantenimiento', icon: 'build' }]
      } else if (actionId === 'escalate') {
        r.title = `Escalado · ${res}`
        r.summary = 'On-call y canales de incidentes notificados.'
        r.sections = [
          { title: 'Destinos', icon: 'campaign', items: ['PagerDuty: ops-primary', 'Slack: #incidents', 'Email: sre-oncall@cloudops.local'] },
          chartTable('Cadena de escalado', ['Nivel', 'Contacto', 'SLA'], [['L1', 'ops-primary', '5 min'], ['L2', 'sre-lead', '15 min']]),
        ]
      } else if (actionId === 'create-rule') {
        r.title = 'Regla de alerta creada'
        r.summary = 'Regla activa en Prometheus Alertmanager.'
        r.kpis = [
          { label: 'Métrica', value: 'CPU > 90%', icon: 'memory' },
          { label: 'Severidad', value: 'Crítica', icon: 'error', tone: 'crit' },
          { label: 'Ventana', value: '5 min', icon: 'schedule' },
        ]
        r.sections = [{ title: 'Canales', icon: 'notifications', items: ['Slack #alerts', 'Email infra', 'Webhook PagerDuty'] }]
      } else if (actionId === 'detail') {
        r.title = `Alerta · ${res}`
        r.summary = String(row?.['title'] ?? 'Detalle de alerta activa')
        r.kpis = [
          { label: 'Severidad', value: String(row?.['severity'] ?? '—'), icon: 'flag' },
          { label: 'Estado', value: String(row?.['status'] ?? '—'), icon: 'info' },
          { label: 'Recurso', value: String(row?.['resource'] ?? '—'), icon: 'dns' },
        ]
        r.sections = [
          jsonSection('Contexto completo', row ?? {}),
          chartTable('Métrica asociada', ['Campo', 'Valor'], [['Query', 'cpu_usage > 0.9'], ['Valor actual', '94%'], ['Umbral', '90%']]),
        ]
      } else {
        r.title = label
        r.sections = [
          chartTable('Distribución severidad', ['Severidad', 'Count'], [['Crítica', '3'], ['Advertencia', '8'], ['Info', '5']]),
          { title: 'Fuentes', icon: 'source', items: ['Prometheus', 'CloudWatch', 'Grafana alerts'] },
        ]
      }
      break

    case 'notifications':
      if (actionId === 'mark-read') {
        r.title = 'Notificación marcada como leída'
        r.resourceName = res
        r.summary = String(row?.['message'] ?? 'Notificación procesada')
        r.kpis = [
          { label: 'Canal', value: 'In-app', icon: 'notifications' },
          { label: 'Severidad', value: String(row?.['severity'] ?? 'info'), icon: 'flag' },
        ]
      } else if (actionId === 'mark-all-read') {
        r.title = 'Todas marcadas como leídas'
        r.summary = 'Bandeja de notificaciones actualizada.'
        r.kpis = [{ label: 'Procesadas', value: String(row?.['count'] ?? '12'), icon: 'done_all' }, { label: 'Pendientes', value: '0', icon: 'inbox' }]
      } else if (actionId === 'channel-toggle') {
        r.title = `Canal ${res} actualizado`
        r.summary = 'Preferencias de notificación guardadas en el perfil de usuario.'
        r.sections = [{ title: 'Canales activos', icon: 'hub', items: ['In-app ✓', 'Email ✓', 'Slack ✓', 'Webhook —', 'Teams —'] }]
      } else if (actionId === 'detail') {
        r.title = res
        r.summary = String(row?.['message'] ?? '')
        r.kpis = [
          { label: 'Tipo', value: String(row?.['type'] ?? 'alert'), icon: 'category' },
          { label: 'Leída', value: row?.['read'] ? 'Sí' : 'No', icon: 'mark_email_read' },
        ]
        r.sections = [jsonSection('Notificación completa', row ?? {})]
      } else {
        r.title = label
        r.summary = 'Preferencias de enrutamiento de alertas e incidentes.'
      }
      break

    case 'audit':
      if (actionId === 'export') {
        r.title = 'Auditoría exportada'
        r.kpis = [{ label: 'Eventos', value: String(row?.['count'] ?? '156'), icon: 'history' }, { label: 'Formato', value: 'CSV', icon: 'table_chart' }]
        r.sections = [{ title: 'Archivo', icon: 'download', items: ['audit-2026-06-06.csv'] }]
      } else if (actionId === 'detail') {
        r.title = `Evento · ${res}`
        r.sections = [
          jsonSection('Registro completo', row ?? {}),
          { title: 'Trazabilidad', icon: 'timeline', steps: [
            { label: 'Autenticación', status: 'ok', detail: 'JWT válido', durationMs: 12 },
            { label: 'Autorización', status: 'ok', detail: 'RBAC: admin', durationMs: 8 },
            { label: 'Acción ejecutada', status: 'ok', detail: String(row?.['action'] ?? '—'), durationMs: 45 },
          ]},
        ]
      } else {
        r.title = label
      }
      break

    case 'settings':
      if (actionId === 'save') {
        r.title = 'Configuración guardada'
        r.summary = 'Preferencias aplicadas en esta sesión (demo).'
      } else if (actionId === 'demo-load') {
        r.title = 'Datos demo cargados'
        r.kpis = [{ label: 'Instancias', value: '24', icon: 'dns' }, { label: 'VPS', value: '8', icon: 'computer' }]
      } else if (actionId === 'demo-reset') {
        r.title = 'Demo reiniciado'
        r.status = 'warn'
        r.impact = 'Todos los datos simulados vuelven al estado inicial.'
      } else {
        r.title = label
      }
      break

    case 'ai-assistant':
      r.title = label
      r.summary = 'Consulta procesada con contexto de inventario, costes y alertas (demo).'
      r.sections = [{ title: 'Fuentes consultadas', icon: 'database', items: ['Inventario AWS', 'Métricas K8s', 'Alertas activas', 'Cost Optimizer'] }]
      break

    default:
      r.title = label
      r.summary = `Acción ${actionId} ejecutada en módulo ${moduleId}.`
      if (row) r.sections = [jsonSection('Contexto', row)]
  }

  if (!r.recommendations.length && area === 'security') {
    r.recommendations = ['Revisa los hallazgos críticos en las próximas 24 h.']
  }
  if (!r.recommendations.length && area === 'observability') {
    r.recommendations = ['Configura dashboards para las métricas clave de este módulo.']
  }

  return area === 'observability' ? applyObservabilityMeta(r) : r
}

export const buildHubReport = (
  module: string,
  section: string,
  actionId: string,
  row?: { name: string; status: string; detail: string; cost?: string; cpu?: string; memory?: string; source?: string },
): PlatformActionReport => {
  const moduleId = module === 'admin' && section === 'roles' ? 'roles' : module === 'metrics' ? 'metrics' : 'metrics'
  const area = moduleId === 'roles' ? 'admin' : 'observability'
  const r = buildPlatformActionReport(moduleId, actionId, { actionLabel: actionId, row: row as Record<string, unknown>, area })
  r.subtitle = `${module} / ${section} · dataset demo`
  if (row) {
    r.resourceName = row.name
    if (module === 'metrics' && actionId === 'detail') {
      r.title = `Métrica · ${row.name}`
      r.summary = row.detail
      r.kpis = [
        { label: 'CPU', value: row.cpu ?? '—', icon: 'memory' },
        { label: 'Memoria', value: row.memory ?? '—', icon: 'storage' },
        { label: 'Fuente', value: row.source ?? 'prometheus', icon: 'source' },
        { label: 'Estado', value: row.status, icon: 'info' },
      ]
    }
  }
  return applyObservabilityMeta(r)
}

export const exportPlatformReportText = (report: PlatformActionReport): string => {
  const lines = [
    report.title,
    report.subtitle,
    `Módulo: ${report.moduleId} · Área: ${report.area}`,
    '',
    report.summary ?? '',
    '',
  ]
  report.kpis.forEach((k) => lines.push(`${k.label}: ${k.value}`))
  report.sections.forEach((s) => {
    lines.push('', `## ${s.title}`)
    s.items?.forEach((i) => lines.push(`- ${i}`))
    s.table?.rows.forEach((row) => lines.push(row.join(' | ')))
    s.code && lines.push(s.code)
  })
  report.recommendations.forEach((rec) => lines.push('', `→ ${rec}`))
  return lines.join('\n')
}
