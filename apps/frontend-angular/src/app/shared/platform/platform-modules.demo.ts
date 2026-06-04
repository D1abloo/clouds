import { chartColor } from '../theme/chart-palette'
import type { PlatformModuleConfig } from './platform-module.models'

const bars = (n = 7) =>
  Array.from({ length: n }, (_, i) => ({
    label: `${i * 4}h`,
    value: 35 + ((i * 17) % 40),
    color: chartColor(i),
  }))

const donut = () => [
  { label: 'Healthy', value: 18, color: chartColor(4) },
  { label: 'Warning', value: 4, color: chartColor(3) },
  { label: 'Critical', value: 2, color: chartColor(1) },
]

const ts = (minsAgo: number) => new Date(Date.now() - minsAgo * 60_000).toISOString()

export const COMMAND_CENTER_CONFIG: PlatformModuleConfig = {
  id: 'command-center',
  title: 'Command Center',
  description: 'Execute quick actions across instances, VPS, Docker, Kubernetes, Jenkins and Terraform. Monitor recent, pending and queued tasks.',
  icon: 'bolt',
  headerActions: [
    { label: 'Run action', icon: 'play_arrow', primary: true },
    { label: 'Clear queue', icon: 'clear_all' },
    { label: 'Refresh', icon: 'refresh' },
  ],
  summaryCards: [
    { title: 'Recent actions', value: 24, icon: 'history', iconColor: 'cyan' },
    { title: 'Pending', value: 5, icon: 'pending', iconColor: 'warn', trend: '2 critical' },
    { title: 'Queued', value: 8, icon: 'queue', iconColor: 'purple' },
    { title: 'Success rate', value: '96%', icon: 'check_circle', iconColor: 'success' },
  ],
  quickActions: [
    { label: 'Restart instance', icon: 'restart_alt' },
    { label: 'Scale K8s', icon: 'hub' },
    { label: 'Run Terraform plan', icon: 'account_tree' },
    { label: 'Trigger Jenkins', icon: 'build' },
  ],
  tabs: [
    {
      label: 'Recent',
      searchPlaceholder: 'Search actions…',
      filters: [{ key: 'target', label: 'Target', options: ['', 'AWS', 'VPS', 'Docker', 'K8s', 'Jenkins', 'Terraform'] }],
      columns: [
        { key: 'action', label: 'Action' },
        { key: 'target', label: 'Target' },
        { key: 'resource', label: 'Resource' },
        { key: 'status', label: 'Status', type: 'status' },
        { key: 'at', label: 'When', type: 'date' },
      ],
      rows: [
        { action: 'Restart', target: 'AWS', resource: 'web-prod-01', status: 'running', at: ts(12) },
        { action: 'Terraform plan', target: 'Terraform', resource: 'aws-production', status: 'applied', at: ts(45) },
        { action: 'Scale deployment', target: 'K8s', resource: 'api-gateway', status: 'running', at: ts(90) },
        { action: 'Build pipeline', target: 'Jenkins', resource: 'deploy-staging', status: 'pending', at: ts(120) },
        { action: 'Docker start', target: 'Docker', resource: 'nginx-edge', status: 'running', at: ts(180) },
      ],
      charts: [{ title: 'Actions by hour', kind: 'bar', data: bars() }],
    },
    {
      label: 'Pending',
      columns: [
        { key: 'action', label: 'Action' },
        { key: 'resource', label: 'Resource' },
        { key: 'requestedBy', label: 'Requested by' },
        { key: 'status', label: 'Status', type: 'status' },
      ],
      rows: [
        { action: 'Stop instance', resource: 'db-replica-02', requestedBy: 'ops@cloudops', status: 'pending' },
        { action: 'Terraform apply', resource: 'gcp-analytics', requestedBy: 'dev@cloudops', status: 'planning' },
        { action: 'Rollback deploy', resource: 'checkout-v2', requestedBy: 'release@cloudops', status: 'warning' },
      ],
    },
    {
      label: 'Queue',
      columns: [
        { key: 'position', label: '#' },
        { key: 'action', label: 'Action' },
        { key: 'eta', label: 'ETA' },
        { key: 'status', label: 'Status', type: 'status' },
      ],
      rows: [
        { position: 1, action: 'Sync AWS inventory', eta: '2 min', status: 'pending' },
        { position: 2, action: 'Backup VPS cluster', eta: '8 min', status: 'pending' },
        { position: 3, action: 'K8s health check', eta: '12 min', status: 'pending' },
      ],
    },
  ],
}

export const DEPLOYMENTS_CONFIG: PlatformModuleConfig = {
  id: 'deployments',
  title: 'Deployments',
  description: 'Track releases, environments, rollbacks and links to Jenkins pipelines and Kubernetes workloads.',
  icon: 'rocket_launch',
  headerActions: [
    { label: 'New deployment', icon: 'add', primary: true },
    { label: 'Rollback', icon: 'undo' },
    { label: 'Export', icon: 'download' },
  ],
  summaryCards: [
    { title: 'Active deploys', value: 6, icon: 'rocket_launch', iconColor: 'cyan' },
    { title: 'Production', value: 3, icon: 'cloud', iconColor: 'purple' },
    { title: 'Failed (24h)', value: 1, icon: 'error', iconColor: 'warn' },
    { title: 'Avg duration', value: '4m 12s', icon: 'timer', iconColor: 'success' },
  ],
  tabs: [
    {
      label: 'Deployments',
      searchPlaceholder: 'Search deployment…',
      filters: [
        { key: 'env', label: 'Environment', options: ['', 'production', 'staging', 'dev'] },
        { key: 'status', label: 'Status', options: ['', 'running', 'success', 'failed'] },
      ],
      columns: [
        { key: 'name', label: 'Release' },
        { key: 'version', label: 'Version' },
        { key: 'env', label: 'Environment' },
        { key: 'jenkins', label: 'Jenkins job' },
        { key: 'k8s', label: 'K8s workload' },
        { key: 'status', label: 'Status', type: 'status' },
      ],
      rows: [
        { name: 'checkout-api', version: 'v2.4.1', env: 'production', jenkins: 'deploy-prod', k8s: 'checkout/api', status: 'running' },
        { name: 'analytics-worker', version: 'v1.8.0', env: 'staging', jenkins: 'deploy-stg', k8s: 'data/worker', status: 'success' },
        { name: 'auth-service', version: 'v3.0.2', env: 'production', jenkins: 'deploy-prod', k8s: 'auth/deployment', status: 'failed' },
      ],
      charts: [{ title: 'Deploy frequency', kind: 'line', data: bars() }],
    },
    {
      label: 'Versions',
      columns: [
        { key: 'service', label: 'Service' },
        { key: 'current', label: 'Current' },
        { key: 'previous', label: 'Previous' },
        { key: 'deployedAt', label: 'Deployed', type: 'date' },
      ],
      rows: [
        { service: 'checkout-api', current: 'v2.4.1', previous: 'v2.4.0', deployedAt: ts(600) },
        { service: 'auth-service', current: 'v3.0.2', previous: 'v3.0.1', deployedAt: ts(1200) },
      ],
    },
    {
      label: 'Logs',
      columns: [
        { key: 'deployment', label: 'Deployment' },
        { key: 'line', label: 'Log excerpt' },
        { key: 'status', label: 'Status', type: 'status' },
      ],
      rows: [
        { deployment: 'checkout-api', line: 'Rollout complete: 3/3 pods ready', status: 'success' },
        { deployment: 'auth-service', line: 'ImagePullBackOff on pod auth-7f2…', status: 'failed' },
      ],
    },
  ],
}

export const BACKUPS_CONFIG: PlatformModuleConfig = {
  id: 'backups',
  title: 'Backups',
  description: 'Snapshots, scheduled backups, last run status, restore demo and failed backup alerts.',
  icon: 'backup',
  headerActions: [
    { label: 'Create backup', icon: 'add', primary: true },
    { label: 'Restore demo', icon: 'restore' },
    { label: 'Run now', icon: 'play_arrow' },
  ],
  summaryCards: [
    { title: 'Scheduled', value: 14, icon: 'event', iconColor: 'cyan' },
    { title: 'Last 24h OK', value: 11, icon: 'check_circle', iconColor: 'success' },
    { title: 'Failed', value: 2, icon: 'error', iconColor: 'warn' },
    { title: 'Total size', value: '2.4 TB', icon: 'storage', iconColor: 'purple' },
  ],
  tabs: [
    {
      label: 'Snapshots',
      searchPlaceholder: 'Search snapshot…',
      columns: [
        { key: 'name', label: 'Snapshot' },
        { key: 'source', label: 'Source' },
        { key: 'size', label: 'Size' },
        { key: 'status', label: 'Status', type: 'status' },
        { key: 'createdAt', label: 'Created', type: 'date' },
      ],
      rows: [
        { name: 'snap-web-prod-daily', source: 'vol-web-01', size: '120 GB', status: 'running', createdAt: ts(1440) },
        { name: 'snap-db-primary', source: 'vol-db-main', size: '500 GB', status: 'running', createdAt: ts(2880) },
        { name: 'snap-staging', source: 'vol-stg-01', size: '80 GB', status: 'warning', createdAt: ts(720) },
      ],
      charts: [{ title: 'Backup volume trend', kind: 'bar', data: bars() }],
    },
    {
      label: 'Schedules',
      columns: [
        { key: 'name', label: 'Schedule' },
        { key: 'cron', label: 'Cron' },
        { key: 'retention', label: 'Retention' },
        { key: 'status', label: 'Status', type: 'status' },
      ],
      rows: [
        { name: 'Daily AWS EBS', cron: '0 2 * * *', retention: '30 days', status: 'running' },
        { name: 'Weekly VPS tar', cron: '0 3 * * 0', retention: '12 weeks', status: 'running' },
      ],
    },
    {
      label: 'Alerts',
      columns: [
        { key: 'backup', label: 'Backup' },
        { key: 'message', label: 'Message' },
        { key: 'severity', label: 'Severity', type: 'severity' },
        { key: 'status', label: 'Status', type: 'status' },
      ],
      rows: [
        { backup: 'snap-staging', message: 'Backup exceeded window — retry scheduled', severity: 'warning', status: 'warning' },
        { backup: 'k8s-etcd', message: 'Connection timeout to backup agent', severity: 'critical', status: 'failed' },
      ],
    },
  ],
}

export const SECURITY_CENTER_CONFIG: PlatformModuleConfig = {
  id: 'security-center',
  title: 'Security Center',
  description: 'Security risks, open ports, exposed services, firewalls, SSH keys, secrets exposure and recommendations.',
  icon: 'security',
  headerActions: [
    { label: 'Run scan', icon: 'radar', primary: true },
    { label: 'Export report', icon: 'download' },
    { label: 'Remediate', icon: 'healing' },
  ],
  summaryCards: [
    { title: 'Risk score', value: '72/100', icon: 'shield', iconColor: 'warn', trend: 'Medium' },
    { title: 'Open ports', value: 18, icon: 'settings_ethernet', iconColor: 'warn' },
    { title: 'Exposed services', value: 4, icon: 'public_off', iconColor: 'warn' },
    { title: 'Recommendations', value: 9, icon: 'lightbulb', iconColor: 'cyan' },
  ],
  tabs: [
    {
      label: 'Risks',
      filters: [{ key: 'severity', label: 'Severity', options: ['', 'critical', 'warning', 'info'] }],
      columns: [
        { key: 'finding', label: 'Finding' },
        { key: 'resource', label: 'Resource' },
        { key: 'severity', label: 'Severity', type: 'severity' },
        { key: 'status', label: 'Status', type: 'status' },
      ],
      rows: [
        { finding: 'SSH port 22 open to 0.0.0.0/0', resource: 'vps-bastion-01', severity: 'critical', status: 'failed' },
        { finding: 'S3 bucket public read', resource: 'aws-logs-archive', severity: 'critical', status: 'warning' },
        { finding: 'Unused admin IAM key', resource: 'aws-root-alt', severity: 'warning', status: 'warning' },
      ],
      charts: [{ title: 'Risk by category', kind: 'donut', data: donut() }],
    },
    {
      label: 'Open ports',
      columns: [
        { key: 'host', label: 'Host' },
        { key: 'port', label: 'Port' },
        { key: 'service', label: 'Service' },
        { key: 'exposure', label: 'Exposure' },
      ],
      rows: [
        { host: 'web-prod-01', port: '443', service: 'https', exposure: 'Public LB' },
        { host: 'vps-bastion', port: '22', service: 'ssh', exposure: '0.0.0.0/0' },
      ],
    },
    {
      label: 'Recommendations',
      columns: [
        { key: 'title', label: 'Recommendation' },
        { key: 'impact', label: 'Impact' },
        { key: 'status', label: 'Status', type: 'status' },
      ],
      rows: [
        { title: 'Restrict SSH to VPN CIDR', impact: 'High', status: 'pending' },
        { title: 'Enable MFA for admin users', impact: 'High', status: 'running' },
        { title: 'Rotate API tokens > 90 days', impact: 'Medium', status: 'pending' },
      ],
    },
  ],
}

export const SECRETS_MANAGER_CONFIG: PlatformModuleConfig = {
  id: 'secrets-manager',
  title: 'Secrets Manager',
  description: 'SSH keys, cloud credentials, API tokens, Vault references, rotation policy and audit trail.',
  icon: 'key',
  headerActions: [
    { label: 'Add secret', icon: 'add', primary: true },
    { label: 'Rotate selected', icon: 'sync' },
    { label: 'Audit log', icon: 'history' },
  ],
  summaryCards: [
    { title: 'Total secrets', value: 47, icon: 'vpn_key', iconColor: 'purple' },
    { title: 'Expiring soon', value: 5, icon: 'schedule', iconColor: 'warn' },
    { title: 'Vault refs', value: 12, icon: 'lock', iconColor: 'cyan' },
    { title: 'Rotated (30d)', value: 8, icon: 'autorenew', iconColor: 'success' },
  ],
  tabs: [
    {
      label: 'Secrets',
      searchPlaceholder: 'Search secret…',
      filters: [{ key: 'type', label: 'Type', options: ['', 'ssh', 'cloud', 'api', 'vault'] }],
      columns: [
        { key: 'name', label: 'Name' },
        { key: 'type', label: 'Type' },
        { key: 'reference', label: 'Reference' },
        { key: 'expires', label: 'Expires' },
        { key: 'status', label: 'Status', type: 'status' },
      ],
      rows: [
        { name: 'aws-prod-deploy', type: 'cloud', reference: 'vault/aws/prod#deploy', expires: '2026-09-01', status: 'running' },
        { name: 'ssh-ops-team', type: 'ssh', reference: 'vault/ssh/ops', expires: '2026-07-15', status: 'running' },
        { name: 'github-ci-token', type: 'api', reference: 'vault/ci/github', expires: '2026-06-10', status: 'warning' },
      ],
    },
    {
      label: 'Rotation',
      columns: [
        { key: 'secret', label: 'Secret' },
        { key: 'policy', label: 'Policy' },
        { key: 'lastRotated', label: 'Last rotated', type: 'date' },
        { key: 'status', label: 'Status', type: 'status' },
      ],
      rows: [
        { secret: 'aws-prod-deploy', policy: 'Every 90 days', lastRotated: ts(43200), status: 'running' },
        { secret: 'github-ci-token', policy: 'Every 60 days', lastRotated: ts(86400), status: 'warning' },
      ],
    },
    {
      label: 'Audit',
      columns: [
        { key: 'action', label: 'Action' },
        { key: 'secret', label: 'Secret' },
        { key: 'user', label: 'User' },
        { key: 'at', label: 'When', type: 'date' },
      ],
      rows: [
        { action: 'READ', secret: 'aws-prod-deploy', user: 'terraform-sa', at: ts(30) },
        { action: 'ROTATE', secret: 'ssh-ops-team', user: 'admin@cloudops', at: ts(3600) },
      ],
    },
  ],
}

export const LOGS_CONFIG: PlatformModuleConfig = {
  id: 'logs',
  title: 'Logs',
  description: 'Centralized logs from system, Docker, Kubernetes, Jenkins, Terraform, SSH and audit with search and filters.',
  icon: 'article',
  headerActions: [
    { label: 'Live tail', icon: 'stream', primary: true },
    { label: 'Export', icon: 'download' },
    { label: 'Save query', icon: 'bookmark' },
  ],
  summaryCards: [
    { title: 'Events (1h)', value: '12.4k', icon: 'receipt_long', iconColor: 'cyan' },
    { title: 'Errors', value: 84, icon: 'error', iconColor: 'warn' },
    { title: 'Sources', value: 6, icon: 'source', iconColor: 'purple' },
    { title: 'Retention', value: '30 days', icon: 'archive', iconColor: 'success' },
  ],
  tabs: [
    {
      label: 'All logs',
      searchPlaceholder: 'Search logs…',
      filters: [
        { key: 'source', label: 'Source', options: ['', 'system', 'docker', 'kubernetes', 'jenkins', 'terraform', 'ssh', 'audit'] },
        { key: 'level', label: 'Level', options: ['', 'error', 'warning', 'info'] },
      ],
      columns: [
        { key: 'time', label: 'Time', type: 'date' },
        { key: 'source', label: 'Source' },
        { key: 'level', label: 'Level', type: 'severity' },
        { key: 'message', label: 'Message' },
      ],
      rows: [
        { time: ts(2), source: 'kubernetes', level: 'error', message: 'Pod checkout-api-7f2 crash loop — OOMKilled' },
        { time: ts(5), source: 'jenkins', level: 'info', message: 'Build #842 deploy-staging SUCCESS' },
        { time: ts(8), source: 'terraform', level: 'info', message: 'Plan complete: 3 to add, 0 to change' },
        { time: ts(15), source: 'ssh', level: 'warning', message: 'Failed login attempt from 203.0.113.44' },
        { time: ts(22), source: 'docker', level: 'info', message: 'Container nginx-edge started' },
      ],
      charts: [{ title: 'Log volume', kind: 'bar', data: bars() }],
    },
    {
      label: 'Errors',
      columns: [
        { key: 'source', label: 'Source' },
        { key: 'count', label: 'Count' },
        { key: 'lastSeen', label: 'Last seen', type: 'date' },
      ],
      rows: [
        { source: 'kubernetes', count: 42, lastSeen: ts(2) },
        { source: 'jenkins', count: 12, lastSeen: ts(45) },
      ],
    },
  ],
}

export const INCIDENTS_CONFIG: PlatformModuleConfig = {
  id: 'incidents',
  title: 'Incidents',
  description: 'Open and resolved incidents with severity, timeline, affected resources and remediation actions.',
  icon: 'crisis_alert',
  headerActions: [
    { label: 'Declare incident', icon: 'add', primary: true },
    { label: 'Post update', icon: 'campaign' },
    { label: 'Resolve', icon: 'check_circle' },
  ],
  summaryCards: [
    { title: 'Open', value: 3, icon: 'error', iconColor: 'warn' },
    { title: 'Critical', value: 1, icon: 'priority_high', iconColor: 'warn' },
    { title: 'Resolved (7d)', value: 7, icon: 'done_all', iconColor: 'success' },
    { title: 'MTTR', value: '42m', icon: 'timer', iconColor: 'cyan' },
  ],
  tabs: [
    {
      label: 'Open',
      filters: [{ key: 'severity', label: 'Severity', options: ['', 'critical', 'warning', 'info'] }],
      columns: [
        { key: 'id', label: 'ID' },
        { key: 'title', label: 'Title' },
        { key: 'severity', label: 'Severity', type: 'severity' },
        { key: 'resources', label: 'Affected' },
        { key: 'status', label: 'Status', type: 'status' },
      ],
      rows: [
        { id: 'INC-1042', title: 'Checkout API latency spike', severity: 'critical', resources: 'k8s/checkout, ALB', status: 'failed' },
        { id: 'INC-1041', title: 'Backup agent unreachable', severity: 'warning', resources: 'vps-backup-01', status: 'warning' },
      ],
      charts: [{ title: 'Incidents by severity', kind: 'donut', data: donut() }],
    },
    {
      label: 'Timeline',
      columns: [
        { key: 'incident', label: 'Incident' },
        { key: 'event', label: 'Event' },
        { key: 'at', label: 'When', type: 'date' },
      ],
      rows: [
        { incident: 'INC-1042', event: 'Detected — p99 > 2s', at: ts(90) },
        { incident: 'INC-1042', event: 'Scaled checkout-api +2 pods', at: ts(60) },
        { incident: 'INC-1042', event: 'Status page updated', at: ts(45) },
      ],
    },
    {
      label: 'Resolved',
      columns: [
        { key: 'id', label: 'ID' },
        { key: 'title', label: 'Title' },
        { key: 'duration', label: 'Duration' },
        { key: 'status', label: 'Status', type: 'status' },
      ],
      rows: [
        { id: 'INC-1038', title: 'Jenkins agent disk full', duration: '1h 12m', status: 'success' },
        { id: 'INC-1035', title: 'Terraform state lock', duration: '28m', status: 'success' },
      ],
    },
  ],
}

export const NETWORK_CONFIG: PlatformModuleConfig = {
  id: 'network',
  title: 'Network',
  description: 'VPC/VNet, subnets, firewalls, security groups, load balancers, IPs, ports and traffic overview.',
  icon: 'hub',
  headerActions: [
    { label: 'Add rule', icon: 'add', primary: true },
    { label: 'Sync topology', icon: 'sync' },
    { label: 'Traffic map', icon: 'map' },
  ],
  summaryCards: [
    { title: 'VPCs / VNets', value: 8, icon: 'account_tree', iconColor: 'purple' },
    { title: 'Subnets', value: 24, icon: 'device_hub', iconColor: 'cyan' },
    { title: 'Load balancers', value: 6, icon: 'balance', iconColor: 'success' },
    { title: 'Public IPs', value: 14, icon: 'language', iconColor: 'warn' },
  ],
  tabs: [
    {
      label: 'VPC / VNet',
      searchPlaceholder: 'Search network…',
      columns: [
        { key: 'name', label: 'Name' },
        { key: 'cidr', label: 'CIDR' },
        { key: 'provider', label: 'Provider' },
        { key: 'subnets', label: 'Subnets' },
        { key: 'status', label: 'Status', type: 'status' },
      ],
      rows: [
        { name: 'vpc-prod-main', cidr: '10.0.0.0/16', provider: 'AWS', subnets: 6, status: 'running' },
        { name: 'vnet-core', cidr: '10.1.0.0/16', provider: 'Azure', subnets: 4, status: 'running' },
      ],
      charts: [{ title: 'Traffic (Mbps)', kind: 'line', data: bars() }],
    },
    {
      label: 'Firewalls & SG',
      columns: [
        { key: 'name', label: 'Group' },
        { key: 'rules', label: 'Rules' },
        { key: 'attached', label: 'Attached to' },
        { key: 'status', label: 'Status', type: 'status' },
      ],
      rows: [
        { name: 'sg-web-public', rules: 4, attached: 'ALB, web-tier', status: 'running' },
        { name: 'nsg-db-internal', rules: 2, attached: 'db-subnet', status: 'running' },
      ],
    },
    {
      label: 'Load balancers',
      columns: [
        { key: 'name', label: 'Name' },
        { key: 'type', label: 'Type' },
        { key: 'targets', label: 'Targets' },
        { key: 'status', label: 'Status', type: 'status' },
      ],
      rows: [
        { name: 'alb-checkout', type: 'ALB', targets: 6, status: 'running' },
        { name: 'ilb-internal-api', type: 'Internal', targets: 3, status: 'running' },
      ],
    },
  ],
}

export const COST_OPTIMIZER_CONFIG: PlatformModuleConfig = {
  id: 'cost-optimizer',
  title: 'Cost Optimizer',
  description: 'Savings recommendations, underutilized instances, orphaned resources, forecast and estimated savings.',
  icon: 'savings',
  headerActions: [
    { label: 'Apply recommendation', icon: 'savings', primary: true },
    { label: 'Refresh analysis', icon: 'refresh' },
    { label: 'Export', icon: 'download' },
  ],
  summaryCards: [
    { title: 'Est. monthly savings', value: '$2,840', icon: 'savings', iconColor: 'success', trend: '+12% vs last month' },
    { title: 'Recommendations', value: 15, icon: 'lightbulb', iconColor: 'cyan' },
    { title: 'Underutilized', value: 7, icon: 'trending_down', iconColor: 'warn' },
    { title: 'Orphaned', value: 4, icon: 'link_off', iconColor: 'warn' },
  ],
  tabs: [
    {
      label: 'Recommendations',
      columns: [
        { key: 'resource', label: 'Resource' },
        { key: 'issue', label: 'Issue' },
        { key: 'savings', label: 'Est. savings/mo' },
        { key: 'status', label: 'Status', type: 'status' },
      ],
      rows: [
        { resource: 'i-0a2b3c4d (m5.2xlarge)', issue: 'CPU avg 8% — downsize to m5.large', savings: '$420', status: 'pending' },
        { resource: 'vol-orphan-001', issue: 'Unattached EBS volume', savings: '$85', status: 'warning' },
        { resource: 'gcp-analytics-vm', issue: 'Reserved instance candidate', savings: '$310', status: 'running' },
      ],
      charts: [{ title: 'Savings by category', kind: 'donut', data: donut() }],
    },
    {
      label: 'Forecast',
      columns: [
        { key: 'month', label: 'Month' },
        { key: 'projected', label: 'Projected' },
        { key: 'optimized', label: 'With optimizations' },
      ],
      rows: [
        { month: 'Jul 2026', projected: '$18,200', optimized: '$15,360' },
        { month: 'Aug 2026', projected: '$18,450', optimized: '$15,510' },
      ],
      charts: [{ title: 'Cost forecast', kind: 'line', data: bars() }],
    },
  ],
}

export const REPORTS_CONFIG: PlatformModuleConfig = {
  id: 'reports',
  title: 'Reports',
  description: 'Generate and export demo reports for cost, security, availability, activity and infrastructure.',
  icon: 'assessment',
  headerActions: [
    { label: 'Generate report', icon: 'add', primary: true },
    { label: 'Schedule', icon: 'event' },
    { label: 'Download PDF', icon: 'picture_as_pdf' },
  ],
  summaryCards: [
    { title: 'Templates', value: 8, icon: 'description', iconColor: 'purple' },
    { title: 'Generated (30d)', value: 22, icon: 'history', iconColor: 'cyan' },
    { title: 'Scheduled', value: 5, icon: 'event', iconColor: 'success' },
    { title: 'Last run', value: '2h ago', icon: 'schedule', iconColor: 'primary' },
  ],
  tabs: [
    {
      label: 'Reports',
      searchPlaceholder: 'Search report…',
      filters: [{ key: 'type', label: 'Type', options: ['', 'cost', 'security', 'availability', 'activity', 'infra'] }],
      columns: [
        { key: 'name', label: 'Report' },
        { key: 'type', label: 'Type' },
        { key: 'period', label: 'Period' },
        { key: 'status', label: 'Status', type: 'status' },
        { key: 'generatedAt', label: 'Generated', type: 'date' },
      ],
      rows: [
        { name: 'Monthly cloud cost', type: 'cost', period: 'May 2026', status: 'success', generatedAt: ts(120) },
        { name: 'Security posture', type: 'security', period: 'Q2 2026', status: 'success', generatedAt: ts(1440) },
        { name: 'SLA availability', type: 'availability', period: 'Last 30d', status: 'running', generatedAt: ts(60) },
      ],
    },
    {
      label: 'Templates',
      columns: [
        { key: 'name', label: 'Template' },
        { key: 'format', label: 'Format' },
        { key: 'sections', label: 'Sections' },
      ],
      rows: [
        { name: 'Executive cost summary', format: 'PDF + CSV', sections: 'AWS, GCP, Azure, VPS' },
        { name: 'Compliance audit pack', format: 'PDF', sections: 'Access, secrets, changes' },
      ],
    },
  ],
}

export const SERVICE_CATALOG_CONFIG: PlatformModuleConfig = {
  id: 'service-catalog',
  title: 'Service Catalog',
  description: 'Reusable templates for instances, Terraform, Jenkins, Docker and Kubernetes workloads.',
  icon: 'category',
  headerActions: [
    { label: 'New template', icon: 'add', primary: true },
    { label: 'Import', icon: 'upload' },
    { label: 'Publish', icon: 'publish' },
  ],
  summaryCards: [
    { title: 'Templates', value: 24, icon: 'folder_copy', iconColor: 'purple' },
    { title: 'Published', value: 18, icon: 'check_circle', iconColor: 'success' },
    { title: 'Launches (30d)', value: 56, icon: 'rocket_launch', iconColor: 'cyan' },
    { title: 'Categories', value: 5, icon: 'category', iconColor: 'primary' },
  ],
  tabs: [
    {
      label: 'Catalog',
      searchPlaceholder: 'Search template…',
      filters: [{ key: 'category', label: 'Category', options: ['', 'instance', 'terraform', 'jenkins', 'docker', 'kubernetes'] }],
      columns: [
        { key: 'name', label: 'Template' },
        { key: 'category', label: 'Category' },
        { key: 'version', label: 'Version' },
        { key: 'owner', label: 'Owner' },
        { key: 'status', label: 'Status', type: 'status' },
      ],
      rows: [
        { name: 'AWS web tier (t3.medium)', category: 'instance', version: 'v3', owner: 'platform-team', status: 'running' },
        { name: 'GCP GKE standard cluster', category: 'kubernetes', version: 'v2', owner: 'platform-team', status: 'running' },
        { name: 'CI/CD microservice pipeline', category: 'jenkins', version: 'v5', owner: 'devops', status: 'running' },
        { name: 'Terraform VPC module', category: 'terraform', version: 'v1.4', owner: 'infra', status: 'running' },
      ],
      charts: [{ title: 'Launches by category', kind: 'bar', data: bars(5) }],
    },
    {
      label: 'Recent launches',
      columns: [
        { key: 'template', label: 'Template' },
        { key: 'user', label: 'User' },
        { key: 'at', label: 'When', type: 'date' },
        { key: 'status', label: 'Status', type: 'status' },
      ],
      rows: [
        { template: 'AWS web tier', user: 'dev@cloudops', at: ts(30), status: 'success' },
        { template: 'Docker nginx stack', user: 'ops@cloudops', at: ts(180), status: 'running' },
      ],
    },
  ],
}

export const APPROVALS_CONFIG: PlatformModuleConfig = {
  id: 'approvals',
  title: 'Approvals',
  description: 'Approve or reject sensitive actions: Terraform apply/destroy, instance stop/delete and resource removal.',
  icon: 'rule',
  headerActions: [
    { label: 'Approve selected', icon: 'check', primary: true },
    { label: 'Reject', icon: 'close' },
    { label: 'Delegate', icon: 'forward' },
  ],
  summaryCards: [
    { title: 'Pending', value: 4, icon: 'pending_actions', iconColor: 'warn' },
    { title: 'Approved today', value: 6, icon: 'check_circle', iconColor: 'success' },
    { title: 'Rejected', value: 1, icon: 'cancel', iconColor: 'warn' },
    { title: 'SLA breaches', value: 0, icon: 'timer_off', iconColor: 'success' },
  ],
  tabs: [
    {
      label: 'Pending',
      columns: [
        { key: 'action', label: 'Action' },
        { key: 'resource', label: 'Resource' },
        { key: 'requester', label: 'Requester' },
        { key: 'risk', label: 'Risk', type: 'severity' },
        { key: 'status', label: 'Status', type: 'status' },
      ],
      rows: [
        { action: 'Terraform destroy', resource: 'aws-staging-vpc', requester: 'dev@cloudops', risk: 'critical', status: 'pending' },
        { action: 'Stop instance', resource: 'db-primary-prod', requester: 'ops@cloudops', risk: 'critical', status: 'pending' },
        { action: 'Terraform apply', resource: 'gcp-analytics', requester: 'infra@cloudops', risk: 'warning', status: 'pending' },
        { action: 'Delete volume', resource: 'vol-orphan-001', requester: 'cost@cloudops', risk: 'warning', status: 'pending' },
      ],
    },
    {
      label: 'History',
      columns: [
        { key: 'action', label: 'Action' },
        { key: 'decision', label: 'Decision' },
        { key: 'approver', label: 'Approver' },
        { key: 'at', label: 'When', type: 'date' },
      ],
      rows: [
        { action: 'Terraform apply prod', decision: 'Approved', approver: 'admin@cloudops', at: ts(3600) },
        { action: 'Delete S3 bucket', decision: 'Rejected', approver: 'security@cloudops', at: ts(7200) },
      ],
    },
  ],
}

export const STORAGE_CONFIG: PlatformModuleConfig = {
  id: 'storage',
  title: 'Storage',
  description: 'Cloud volumes, disks, object storage buckets and attachment status across providers.',
  icon: 'storage',
  headerActions: [
    { label: 'Create volume', icon: 'add', primary: true },
    { label: 'Attach', icon: 'link' },
    { label: 'Sync', icon: 'sync' },
  ],
  summaryCards: [
    { title: 'Volumes', value: 38, icon: 'sd_storage', iconColor: 'purple' },
    { title: 'Attached', value: 31, icon: 'link', iconColor: 'success' },
    { title: 'Unattached', value: 4, icon: 'link_off', iconColor: 'warn' },
    { title: 'Total capacity', value: '12.8 TB', icon: 'database', iconColor: 'cyan' },
  ],
  tabs: [
    {
      label: 'Volumes',
      searchPlaceholder: 'Search volume…',
      filters: [{ key: 'provider', label: 'Provider', options: ['', 'AWS', 'GCP', 'Azure', 'VPS'] }],
      columns: [
        { key: 'id', label: 'ID' },
        { key: 'size', label: 'Size' },
        { key: 'type', label: 'Type' },
        { key: 'attached', label: 'Attached to' },
        { key: 'status', label: 'Status', type: 'status' },
      ],
      rows: [
        { id: 'vol-web-01', size: '100 GB', type: 'gp3', attached: 'web-prod-01', status: 'running' },
        { id: 'vol-db-main', size: '500 GB', type: 'io2', attached: 'db-primary', status: 'running' },
        { id: 'vol-orphan-001', size: '50 GB', type: 'standard', attached: '—', status: 'warning' },
      ],
      charts: [{ title: 'Capacity by provider', kind: 'donut', data: donut() }],
    },
    {
      label: 'Object storage',
      columns: [
        { key: 'bucket', label: 'Bucket' },
        { key: 'provider', label: 'Provider' },
        { key: 'size', label: 'Size' },
        { key: 'status', label: 'Status', type: 'status' },
      ],
      rows: [
        { bucket: 'cloudops-logs-prod', provider: 'AWS S3', size: '820 GB', status: 'running' },
        { bucket: 'gcp-backups-eu', provider: 'GCS', size: '1.2 TB', status: 'running' },
      ],
    },
  ],
}

export const ACCESS_CONTROL_CONFIG: PlatformModuleConfig = {
  id: 'access-control',
  title: 'Access Control',
  description: 'IAM policies, role assignments, SSH access and cloud permission boundaries.',
  icon: 'admin_panel_settings',
  headerActions: [
    { label: 'Grant access', icon: 'person_add', primary: true },
    { label: 'Review policies', icon: 'policy' },
    { label: 'Export', icon: 'download' },
  ],
  summaryCards: [
    { title: 'Users with access', value: 24, icon: 'group', iconColor: 'purple' },
    { title: 'Roles', value: 8, icon: 'badge', iconColor: 'cyan' },
    { title: 'Policies', value: 32, icon: 'policy', iconColor: 'success' },
    { title: 'Violations', value: 2, icon: 'gpp_bad', iconColor: 'warn' },
  ],
  tabs: [
    {
      label: 'Assignments',
      columns: [
        { key: 'user', label: 'User' },
        { key: 'role', label: 'Role' },
        { key: 'scope', label: 'Scope' },
        { key: 'status', label: 'Status', type: 'status' },
      ],
      rows: [
        { user: 'admin@cloudops', role: 'Super Admin', scope: 'Global', status: 'running' },
        { user: 'dev@cloudops', role: 'Developer', scope: 'Staging', status: 'running' },
        { user: 'contractor@ext', role: 'Read-only', scope: 'AWS prod', status: 'warning' },
      ],
    },
    {
      label: 'Policies',
      columns: [
        { key: 'name', label: 'Policy' },
        { key: 'resources', label: 'Resources' },
        { key: 'status', label: 'Status', type: 'status' },
      ],
      rows: [
        { name: 'terraform-apply-prod', resources: 'Terraform workspaces', status: 'running' },
        { name: 'ssh-bastion-only', resources: 'VPS SSH', status: 'running' },
      ],
    },
  ],
}

export const USERS_CONFIG: PlatformModuleConfig = {
  id: 'users',
  title: 'Users',
  description: 'Manage platform users, invitations, MFA status and last activity.',
  icon: 'group',
  headerActions: [
    { label: 'Invite user', icon: 'person_add', primary: true },
    { label: 'Export', icon: 'download' },
    { label: 'Sync SSO', icon: 'sync' },
  ],
  summaryCards: [
    { title: 'Total users', value: 24, icon: 'group', iconColor: 'purple' },
    { title: 'Active', value: 21, icon: 'check_circle', iconColor: 'success' },
    { title: 'MFA enabled', value: 18, icon: 'security', iconColor: 'cyan' },
    { title: 'Pending invites', value: 2, icon: 'mail', iconColor: 'warn' },
  ],
  tabs: [
    {
      label: 'Users',
      searchPlaceholder: 'Search user…',
      columns: [
        { key: 'email', label: 'Email' },
        { key: 'name', label: 'Name' },
        { key: 'role', label: 'Role' },
        { key: 'lastLogin', label: 'Last login', type: 'date' },
        { key: 'status', label: 'Status', type: 'status' },
      ],
      rows: [
        { email: 'admin@cloudops.local', name: 'Admin User', role: 'Super Admin', lastLogin: ts(60), status: 'running' },
        { email: 'dev@cloudops.local', name: 'Dev Team', role: 'Developer', lastLogin: ts(240), status: 'running' },
        { email: 'ops@cloudops.local', name: 'Ops Lead', role: 'Operator', lastLogin: ts(480), status: 'running' },
      ],
    },
  ],
}

export const PLATFORM_MODULE_MAP: Record<string, PlatformModuleConfig> = {
  'command-center': COMMAND_CENTER_CONFIG,
  deployments: DEPLOYMENTS_CONFIG,
  backups: BACKUPS_CONFIG,
  'security-center': SECURITY_CENTER_CONFIG,
  'secrets-manager': SECRETS_MANAGER_CONFIG,
  logs: LOGS_CONFIG,
  incidents: INCIDENTS_CONFIG,
  network: NETWORK_CONFIG,
  'cost-optimizer': COST_OPTIMIZER_CONFIG,
  reports: REPORTS_CONFIG,
  'service-catalog': SERVICE_CATALOG_CONFIG,
  approvals: APPROVALS_CONFIG,
  storage: STORAGE_CONFIG,
  'access-control': ACCESS_CONTROL_CONFIG,
  users: USERS_CONFIG,
}
