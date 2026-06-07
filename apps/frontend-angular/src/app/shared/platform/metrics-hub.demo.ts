export type MetricsHubRow = {
  name: string
  status: string
  detail: string
  cost?: string
  cpu?: string
  memory?: string
  source?: string
}

const METRICS_BY_SECTION: Record<string, MetricsHubRow[]> = {
  overview: [
    { name: 'checkout-api', status: 'running', detail: 'K8s · eu-west-1 · 3 réplicas', cpu: '42%', memory: '61%', source: 'prometheus' },
    { name: 'nginx-edge', status: 'running', detail: 'Docker · CDN edge', cpu: '18%', memory: '34%', source: 'prometheus' },
    { name: 'postgres-primary', status: 'warning', detail: 'RDS · conexiones altas', cpu: '28%', memory: '78%', source: 'cloudwatch' },
    { name: 'redis-cache', status: 'running', detail: 'ElastiCache · hit ratio 94%', cpu: '12%', memory: '45%', source: 'prometheus' },
    { name: 'jenkins-controller', status: 'running', detail: 'Build queue 2 jobs', cpu: '35%', memory: '52%', source: 'prometheus' },
    { name: 'grafana', status: 'running', detail: 'Dashboards 24 activos', cpu: '8%', memory: '22%', source: 'grafana' },
  ],
  dashboards: [
    { name: 'Infra overview', status: 'running', detail: '12 paneles · 8 datasources', source: 'grafana' },
    { name: 'K8s workloads', status: 'running', detail: 'CPU, mem, restarts, HPA', source: 'grafana' },
    { name: 'SLO error budget', status: 'warning', detail: 'Budget 18% restante', source: 'grafana' },
    { name: 'Cloud cost vs usage', status: 'running', detail: 'AWS + GCP correlación', source: 'grafana' },
  ],
  slo: [
    { name: 'checkout-api availability', status: 'running', detail: 'SLO 99.9% · actual 99.94%', source: 'prometheus' },
    { name: 'api latency p99', status: 'warning', detail: 'Umbral 500ms · actual 620ms', source: 'prometheus' },
    { name: 'payment webhook success', status: 'running', detail: 'SLO 99.5% · actual 99.8%', source: 'prometheus' },
  ],
  exporters: [
    { name: 'node-exporter-fleet', status: 'running', detail: '24 targets UP', source: 'prometheus' },
    { name: 'cadvisor-k8s', status: 'running', detail: '18 pods scraped', source: 'prometheus' },
    { name: 'blackbox-http', status: 'error', detail: '2 probes FAIL · status.cloudops.dev', source: 'prometheus' },
  ],
}

export const metricsHubRows = (section: string): MetricsHubRow[] =>
  METRICS_BY_SECTION[section] ?? METRICS_BY_SECTION['overview']

export const metricsHubDescription = (section: string): string => {
  const map: Record<string, string> = {
    overview: 'Vista unificada de métricas Prometheus, Grafana y cloud providers.',
    dashboards: 'Dashboards Grafana con paneles de infra, K8s, SLO y costes.',
    slo: 'Objetivos de nivel de servicio, error budget y burn rate.',
    exporters: 'Exporters Prometheus: node, cAdvisor, blackbox y custom.',
  }
  return map[section] ?? map['overview']
}
