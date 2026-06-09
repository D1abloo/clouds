const ts = (secAgo: number) => new Date(Date.now() - secAgo * 1000).toISOString()

export type AdminWebhookRow = {
  id: string
  name: string
  url: string
  events: string
  secret: string
  status: string
  active: boolean
  created?: string
  lastDelivery?: string
  successRate?: number
  owner?: string
  description?: string
}

export type WebhookDeliveryRow = {
  id: string
  event: string
  webhook: string
  status: string
  latency: string
  httpCode: number
  at: string
  payloadSize?: string
  attempt?: number
  signature?: string
  responseBody?: string
}

export type WebhookFailureRow = {
  id: string
  event: string
  webhook: string
  error: string
  attempts: number
  at: string
  nextRetry?: string
}

export type WebhookPayloadRow = {
  id: string
  event: string
  webhook: string
  size: string
  body: string
  at: string
}

export const ADMIN_WEBHOOKS_LIST: AdminWebhookRow[] = [
  {
    id: 'wh-1',
    name: 'Alertas Slack',
    url: 'https://hooks.slack.com/services/T00/B00/demo',
    events: 'alert.created, alert.resolved, jenkins.build.failed',
    secret: 'whsec_a1b2c3d4',
    status: 'running',
    active: true,
    created: ts(86400 * 120),
    lastDelivery: ts(15),
    successRate: 99.2,
    owner: 'ops@cloudops',
    description: 'Canal #cloudops-alerts — notificaciones críticas y builds fallidos.',
  },
  {
    id: 'wh-2',
    name: 'Sync facturación',
    url: 'https://api.finance.internal/hooks/cloudops',
    events: 'billing.updated, invoice.paid, billing.invoice.failed',
    secret: 'whsec_e5f6g7h8',
    status: 'running',
    active: true,
    created: ts(86400 * 200),
    lastDelivery: ts(90),
    successRate: 94.8,
    owner: 'finance@cloudops',
    description: 'Sincroniza eventos de facturación con ERP interno vía VPN.',
  },
  {
    id: 'wh-3',
    name: 'Eventos Terraform',
    url: 'https://ci.internal/hooks/terraform',
    events: 'terraform.apply.finished, deployment.finished',
    secret: 'whsec_i9j0k1l2',
    status: 'running',
    active: true,
    created: ts(86400 * 90),
    lastDelivery: ts(72),
    successRate: 100,
    owner: 'platform@cloudops',
    description: 'Dispara validaciones post-apply y actualiza estado en ServiceNow.',
  },
  {
    id: 'wh-4',
    name: 'PagerDuty incidentes',
    url: 'https://events.pagerduty.com/integration/demo',
    events: 'incident.opened, incident.acknowledged, alert.created',
    secret: 'whsec_m3n4o5p6',
    status: 'warning',
    active: false,
    created: ts(86400 * 60),
    lastDelivery: ts(86400 * 2),
    successRate: 72.1,
    owner: 'sre@cloudops',
    description: 'Desactivado temporalmente — migración a nuevo routing key.',
  },
  {
    id: 'wh-5',
    name: 'Audit SIEM',
    url: 'https://siem.internal/ingest/cloudops',
    events: 'audit.event, security.finding, user.login',
    secret: 'whsec_q7r8s9t0',
    status: 'running',
    active: true,
    created: ts(86400 * 30),
    lastDelivery: ts(300),
    successRate: 98.5,
    owner: 'security@cloudops',
    description: 'Ingesta de eventos de auditoría y seguridad al SIEM corporativo.',
  },
]

export const ADMIN_WEBHOOK_DELIVERIES: WebhookDeliveryRow[] = [
  { id: 'd-1', event: 'instance.created', webhook: 'Alertas Slack', status: 'success', latency: '142 ms', httpCode: 200, at: ts(15), payloadSize: '2.1 KB', attempt: 1, signature: 'sha256=abc123…' },
  { id: 'd-2', event: 'jenkins.build.failed', webhook: 'Alertas Slack', status: 'success', latency: '198 ms', httpCode: 200, at: ts(45), payloadSize: '3.4 KB', attempt: 1, signature: 'sha256=def456…' },
  { id: 'd-3', event: 'deployment.finished', webhook: 'Eventos Terraform', status: 'success', latency: '89 ms', httpCode: 200, at: ts(72), payloadSize: '1.6 KB', attempt: 1, signature: 'sha256=ghi789…' },
  { id: 'd-4', event: 'alert.created', webhook: 'Sync facturación', status: 'failed', latency: 'timeout', httpCode: 503, at: ts(90), payloadSize: '1.8 KB', attempt: 3, signature: 'sha256=jkl012…', responseBody: 'Service Unavailable' },
  { id: 'd-5', event: 'billing.updated', webhook: 'Sync facturación', status: 'success', latency: '110 ms', httpCode: 200, at: ts(180), payloadSize: '2.0 KB', attempt: 1, signature: 'sha256=mno345…' },
  { id: 'd-6', event: 'audit.event', webhook: 'Audit SIEM', status: 'success', latency: '67 ms', httpCode: 202, at: ts(300), payloadSize: '4.2 KB', attempt: 1, signature: 'sha256=pqr678…' },
  { id: 'd-7', event: 'terraform.apply.finished', webhook: 'Eventos Terraform', status: 'success', latency: '124 ms', httpCode: 200, at: ts(420), payloadSize: '5.1 KB', attempt: 1, signature: 'sha256=stu901…' },
]

export const ADMIN_WEBHOOK_FAILURES: WebhookFailureRow[] = [
  { id: 'f-1', event: 'alert.created', webhook: 'Sync facturación', error: 'HTTP 503 Service Unavailable', attempts: 3, at: ts(90), nextRetry: ts(-300) },
  { id: 'f-2', event: 'billing.invoice.failed', webhook: 'PagerDuty incidentes', error: 'ECONNREFUSED — host unreachable', attempts: 2, at: ts(240), nextRetry: ts(-900) },
  { id: 'f-3', event: 'security.finding', webhook: 'Audit SIEM', error: 'HTTP 429 Too Many Requests', attempts: 1, at: ts(3600), nextRetry: ts(-1800) },
]

export const ADMIN_WEBHOOK_PAYLOADS: WebhookPayloadRow[] = [
  {
    id: 'p-1',
    event: 'instance.created',
    webhook: 'Alertas Slack',
    size: '2.1 KB',
    body: '{\n  "type": "instance.created",\n  "id": "i-0a2b3c4d",\n  "provider": "aws",\n  "region": "eu-west-1",\n  "account": "prod-001",\n  "tags": { "env": "production", "team": "platform" }\n}',
    at: ts(15),
  },
  {
    id: 'p-2',
    event: 'jenkins.build.failed',
    webhook: 'Alertas Slack',
    size: '3.4 KB',
    body: '{\n  "job": "deploy-api",\n  "build": 128,\n  "status": "FAILED",\n  "branch": "main",\n  "duration_sec": 342,\n  "failed_stage": "integration-tests"\n}',
    at: ts(45),
  },
  {
    id: 'p-3',
    event: 'alert.created',
    webhook: 'Sync facturación',
    size: '1.8 KB',
    body: '{\n  "severity": "critical",\n  "title": "CPU > 90%",\n  "resource": "web-prod-01",\n  "metric": "cpu_utilization",\n  "value": 94.2\n}',
    at: ts(90),
  },
  {
    id: 'p-4',
    event: 'terraform.apply.finished',
    webhook: 'Eventos Terraform',
    size: '5.1 KB',
    body: '{\n  "workspace": "prod-network",\n  "run_id": "run-abc123",\n  "status": "applied",\n  "resources_added": 2,\n  "resources_changed": 5,\n  "duration_sec": 187\n}',
    at: ts(420),
  },
]

export const ADMIN_WEBHOOK_CONFIG = [
  { key: 'timeout', label: 'Timeout de entrega', value: '30 segundos' },
  { key: 'retries', label: 'Reintentos máximos', value: '3' },
  { key: 'backoff', label: 'Backoff', value: 'Exponencial (5s, 15s, 45s)' },
  { key: 'signature', label: 'Firma HMAC', value: 'SHA-256 — cabecera X-CloudOps-Signature' },
  { key: 'ip', label: 'IPs de origen', value: '10.0.0.0/8 (plataforma CloudOps)' },
  { key: 'tls', label: 'TLS mínimo', value: 'TLS 1.2 — certificados válidos obligatorios' },
]

export const ADMIN_WEBHOOK_EVENT_TYPES = [
  'instance.created',
  'instance.deleted',
  'alert.created',
  'alert.resolved',
  'jenkins.build.failed',
  'deployment.finished',
  'terraform.apply.finished',
  'billing.updated',
  'billing.invoice.failed',
  'incident.opened',
  'audit.event',
  'security.finding',
  'user.login',
]

export const adminWebhookKpis = () => ({
  active: ADMIN_WEBHOOKS_LIST.filter((w) => w.active).length,
  deliveries24h: ADMIN_WEBHOOK_DELIVERIES.length + 312,
  failures: ADMIN_WEBHOOK_FAILURES.length,
  avgLatency: '118 ms',
})
