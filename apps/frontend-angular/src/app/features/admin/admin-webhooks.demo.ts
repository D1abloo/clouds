const ts = (secAgo: number) => new Date(Date.now() - secAgo * 1000).toISOString()

export type AdminWebhookRow = {
  id: string
  name: string
  url: string
  events: string
  secret: string
  status: string
  active: boolean
}

export type WebhookDeliveryRow = {
  id: string
  event: string
  webhook: string
  status: string
  latency: string
  httpCode: number
  at: string
}

export type WebhookFailureRow = {
  id: string
  event: string
  webhook: string
  error: string
  attempts: number
  at: string
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
    events: 'alert.created, alert.resolved',
    secret: 'whsec_a1b2c3d4',
    status: 'running',
    active: true,
  },
  {
    id: 'wh-2',
    name: 'Sync facturación',
    url: 'https://api.finance.internal/hooks/cloudops',
    events: 'billing.updated, invoice.paid',
    secret: 'whsec_e5f6g7h8',
    status: 'running',
    active: true,
  },
  {
    id: 'wh-3',
    name: 'Eventos Terraform',
    url: 'https://ci.internal/hooks/terraform',
    events: 'terraform.apply.finished',
    secret: 'whsec_i9j0k1l2',
    status: 'running',
    active: true,
  },
  {
    id: 'wh-4',
    name: 'PagerDuty incidentes',
    url: 'https://events.pagerduty.com/integration/demo',
    events: 'incident.opened, incident.acknowledged',
    secret: 'whsec_m3n4o5p6',
    status: 'warning',
    active: false,
  },
]

export const ADMIN_WEBHOOK_DELIVERIES: WebhookDeliveryRow[] = [
  { id: 'd-1', event: 'instance.created', webhook: 'Alertas Slack', status: 'success', latency: '142 ms', httpCode: 200, at: ts(15) },
  { id: 'd-2', event: 'jenkins.build.failed', webhook: 'Alertas Slack', status: 'success', latency: '198 ms', httpCode: 200, at: ts(45) },
  { id: 'd-3', event: 'deployment.finished', webhook: 'Eventos Terraform', status: 'success', latency: '89 ms', httpCode: 200, at: ts(72) },
  { id: 'd-4', event: 'alert.created', webhook: 'Sync facturación', status: 'failed', latency: 'timeout', httpCode: 503, at: ts(90) },
  { id: 'd-5', event: 'billing.updated', webhook: 'Sync facturación', status: 'success', latency: '110 ms', httpCode: 200, at: ts(180) },
]

export const ADMIN_WEBHOOK_FAILURES: WebhookFailureRow[] = [
  { id: 'f-1', event: 'alert.created', webhook: 'Sync facturación', error: 'HTTP 503 Service Unavailable', attempts: 3, at: ts(90) },
  { id: 'f-2', event: 'billing.invoice.failed', webhook: 'PagerDuty incidentes', error: 'ECONNREFUSED — host unreachable', attempts: 2, at: ts(240) },
]

export const ADMIN_WEBHOOK_PAYLOADS: WebhookPayloadRow[] = [
  {
    id: 'p-1',
    event: 'instance.created',
    webhook: 'Alertas Slack',
    size: '2.1 KB',
    body: '{\n  "type": "instance.created",\n  "id": "i-0a2b3c4d",\n  "provider": "aws",\n  "region": "eu-west-1"\n}',
    at: ts(15),
  },
  {
    id: 'p-2',
    event: 'jenkins.build.failed',
    webhook: 'Alertas Slack',
    size: '3.4 KB',
    body: '{\n  "job": "deploy-api",\n  "build": 128,\n  "status": "FAILED",\n  "branch": "main"\n}',
    at: ts(45),
  },
  {
    id: 'p-3',
    event: 'alert.created',
    webhook: 'Sync facturación',
    size: '1.8 KB',
    body: '{\n  "severity": "critical",\n  "title": "CPU > 90%",\n  "resource": "web-prod-01"\n}',
    at: ts(90),
  },
]

export const ADMIN_WEBHOOK_CONFIG = [
  { key: 'timeout', label: 'Timeout de entrega', value: '30 segundos' },
  { key: 'retries', label: 'Reintentos máximos', value: '3' },
  { key: 'backoff', label: 'Backoff', value: 'Exponencial (5s, 15s, 45s)' },
  { key: 'signature', label: 'Firma HMAC', value: 'SHA-256 — cabecera X-CloudOps-Signature' },
  { key: 'ip', label: 'IPs de origen', value: '10.0.0.0/8 (plataforma CloudOps)' },
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
  'incident.opened',
]
