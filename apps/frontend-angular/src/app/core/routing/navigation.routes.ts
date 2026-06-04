import { Routes } from '@angular/router'

const hub = (module: string, parentTitle: string, breadcrumb?: string) => ({
  loadComponent: () =>
    import('../../features/section-hub/section-hub.component').then((m) => m.SectionHubComponent),
  data: { module, parentTitle, breadcrumb: breadcrumb ?? parentTitle },
})

const platform = (exportName: string, breadcrumb: string) => ({
  loadComponent: () =>
    import('../../features/platform-modules/platform-modules.component').then(
      (m) => m[exportName as keyof typeof m] as typeof m.CommandCenterComponent,
    ),
  data: { breadcrumb },
})

export const NAVIGATION_ROUTES: Routes = [
  {
    path: 'resource-explorer',
    loadComponent: () =>
      import('../../features/advanced/resource-explorer.component').then((m) => m.ResourceExplorerComponent),
    data: { breadcrumb: 'Resource Explorer' },
  },
  {
    path: 'topology-map',
    loadComponent: () =>
      import('../../features/advanced/topology-map.component').then((m) => m.TopologyMapComponent),
    data: { breadcrumb: 'Topology Map' },
  },
  {
    path: 'ai-assistant',
    loadComponent: () =>
      import('../../features/advanced/ai-assistant.component').then((m) => m.AiAssistantComponent),
    data: { breadcrumb: 'AI Assistant' },
  },
  { path: 'command-center', ...platform('CommandCenterComponent', 'Command Center') },
  { path: 'deployments', ...platform('DeploymentsComponent', 'Deployments') },
  { path: 'backups', ...platform('BackupsComponent', 'Backups') },
  { path: 'security-center', ...platform('SecurityCenterComponent', 'Security Center') },
  { path: 'secrets-manager', ...platform('SecretsManagerComponent', 'Secrets Manager') },
  { path: 'logs', ...platform('LogsCenterComponent', 'Logs') },
  { path: 'incidents', ...platform('IncidentsComponent', 'Incidents') },
  { path: 'network', ...platform('NetworkComponent', 'Network') },
  { path: 'storage', ...platform('StorageComponent', 'Storage') },
  { path: 'cost-optimizer', ...platform('CostOptimizerComponent', 'Cost Optimizer') },
  { path: 'reports', ...platform('ReportsComponent', 'Reports') },
  { path: 'service-catalog', ...platform('ServiceCatalogComponent', 'Service Catalog') },
  { path: 'approvals', ...platform('ApprovalsComponent', 'Approvals') },
  { path: 'runbooks', ...platform('RunbooksComponent', 'Runbooks') },
  { path: 'scheduler', ...platform('SchedulerComponent', 'Scheduler') },
  { path: 'health-center', ...platform('HealthCenterComponent', 'Health Center') },
  { path: 'compliance', ...platform('ComplianceComponent', 'Compliance') },
  { path: 'capacity-planner', ...platform('CapacityPlannerComponent', 'Capacity Planner') },
  { path: 'change-management', ...platform('ChangeManagementComponent', 'Change Management') },
  { path: 'access-control', ...platform('AccessControlComponent', 'Access Control') },
  { path: 'admin/api-tokens', ...platform('ApiTokensComponent', 'API Tokens') },
  { path: 'admin/webhooks', redirectTo: 'admin/api-tokens', pathMatch: 'full' },
  { path: 'admin/users', ...platform('UsersAdminComponent', 'Users') },
  { path: 'admin/roles', ...hub('roles', 'Roles', 'Roles') },
  {
    path: 'admin/demo-mode',
    loadComponent: () =>
      import('../../features/settings/settings-page.component').then((m) => m.SettingsPageComponent),
    data: { breadcrumb: 'Demo Mode', module: 'settings' },
  },
  {
    path: 'cloud/:provider/:section',
    loadComponent: () =>
      import('../../features/cloud-accounts/cloud-provider-hub.component').then(
        (m) => m.CloudProviderHubComponent,
      ),
    data: { breadcrumb: 'Cloud' },
  },
  {
    path: 'vps/:section',
    loadComponent: () =>
      import('../../features/section-hub/section-hub.component').then((m) => m.SectionHubComponent),
    data: { module: 'vps', parentTitle: 'VPS / Bare Metal' },
  },
  {
    path: 'instances/all-instances',
    loadComponent: () =>
      import('../../features/instances/instances-list.component').then((m) => m.InstancesListComponent),
    data: { breadcrumb: 'Instances' },
  },
  {
    path: 'instances/:section',
    loadComponent: () =>
      import('../../features/section-hub/section-hub.component').then((m) => m.SectionHubComponent),
    data: { module: 'instances', parentTitle: 'Instances' },
  },
  { path: 'docker/metrics', ...hub('docker', 'Docker', 'Metrics') },
  { path: 'docker/events', ...hub('docker', 'Docker', 'Events') },
  { path: 'docker/overview', redirectTo: 'docker/containers', pathMatch: 'full' },
  {
    path: 'docker/:section',
    loadComponent: () =>
      import('../../features/docker/docker-page.component').then((m) => m.DockerPageComponent),
    data: { breadcrumb: 'Docker', module: 'docker' },
  },
  { path: 'kubernetes/metrics', ...hub('kubernetes', 'Kubernetes', 'Metrics') },
  { path: 'kubernetes/logs', ...hub('kubernetes', 'Kubernetes', 'Logs') },
  { path: 'kubernetes/ingress', ...hub('kubernetes', 'Kubernetes', 'Ingress') },
  { path: 'kubernetes/overview', redirectTo: 'kubernetes/pods', pathMatch: 'full' },
  {
    path: 'kubernetes/:section',
    loadComponent: () =>
      import('../../features/kubernetes/kubernetes-page.component').then(
        (m) => m.KubernetesPageComponent,
      ),
    data: { breadcrumb: 'Kubernetes', module: 'kubernetes' },
  },
  { path: 'jenkins/overview', redirectTo: 'jenkins/jobs', pathMatch: 'full' },
  { path: 'jenkins/servers', ...hub('jenkins', 'Jenkins', 'Servers') },
  { path: 'jenkins/pipelines', ...hub('jenkins', 'Jenkins', 'Pipelines') },
  {
    path: 'jenkins/:section',
    loadComponent: () =>
      import('../../features/jenkins/jenkins-page.component').then((m) => m.JenkinsPageComponent),
    data: { breadcrumb: 'Jenkins', module: 'jenkins' },
  },
  {
    path: 'terraform/launch-instance',
    loadComponent: () =>
      import('../../terraform/terraform.component').then((m) => m.TerraformComponent),
    data: { breadcrumb: 'Launch Instance', openLaunch: true },
  },
  {
    path: 'terraform/overview',
    loadComponent: () =>
      import('../../terraform/terraform.component').then((m) => m.TerraformComponent),
    data: { breadcrumb: 'Terraform' },
  },
  {
    path: 'terraform/workspaces',
    loadComponent: () =>
      import('../../terraform/terraform.component').then((m) => m.TerraformComponent),
    data: { breadcrumb: 'Workspaces' },
  },
  { path: 'terraform/:section', ...hub('terraform', 'Terraform') },
  {
    path: 'terminal/:section',
    loadComponent: () =>
      import('../../features/terminal/terminal-page.component').then((m) => m.TerminalPageComponent),
    data: { breadcrumb: 'Terminal', module: 'terminal' },
  },
  { path: 'terminal', redirectTo: 'terminal/active-sessions', pathMatch: 'full' },
  {
    path: 'billing/:section',
    loadComponent: () =>
      import('../../features/billing/billing-page.component').then((m) => m.BillingPageComponent),
    data: { breadcrumb: 'Billing', module: 'billing' },
  },
  { path: 'metrics/:section', ...hub('metrics', 'Metrics') },
  {
    path: 'alerts/:section',
    loadComponent: () =>
      import('../../features/alerts/alerts-page.component').then((m) => m.AlertsPageComponent),
    data: { breadcrumb: 'Alerts', module: 'alerts' },
  },
  {
    path: 'notifications/:section',
    loadComponent: () =>
      import('../../features/notifications/notifications-page.component').then(
        (m) => m.NotificationsPageComponent,
      ),
    data: { breadcrumb: 'Notifications', module: 'notifications' },
  },
  {
    path: 'audit/:section',
    loadComponent: () =>
      import('../../features/audit/audit-page.component').then((m) => m.AuditPageComponent),
    data: { breadcrumb: 'Audit', module: 'audit' },
  },
  {
    path: 'settings/:section',
    loadComponent: () =>
      import('../../features/settings/settings-page.component').then((m) => m.SettingsPageComponent),
    data: { breadcrumb: 'Settings', module: 'settings' },
  },
  { path: 'accounts/aws', redirectTo: 'cloud/aws/overview', pathMatch: 'full' },
  { path: 'accounts/gcp', redirectTo: 'cloud/gcp/overview', pathMatch: 'full' },
  { path: 'accounts/azure', redirectTo: 'cloud/azure/overview', pathMatch: 'full' },
  { path: 'cloud/aws', redirectTo: 'cloud/aws/overview', pathMatch: 'full' },
  { path: 'cloud/gcp', redirectTo: 'cloud/gcp/overview', pathMatch: 'full' },
  { path: 'cloud/azure', redirectTo: 'cloud/azure/overview', pathMatch: 'full' },
  { path: 'vps', redirectTo: 'vps/overview', pathMatch: 'full' },
  { path: 'instances', redirectTo: 'instances/all-instances', pathMatch: 'full' },
  { path: 'docker', redirectTo: 'docker/containers', pathMatch: 'full' },
  { path: 'kubernetes', redirectTo: 'kubernetes/pods', pathMatch: 'full' },
  { path: 'jenkins', redirectTo: 'jenkins/jobs', pathMatch: 'full' },
  { path: 'terraform', redirectTo: 'terraform/workspaces', pathMatch: 'full' },
  { path: 'billing', redirectTo: 'billing/overview', pathMatch: 'full' },
  { path: 'alerts', redirectTo: 'alerts/active', pathMatch: 'full' },
  { path: 'notifications', redirectTo: 'notifications/all', pathMatch: 'full' },
  { path: 'audit', redirectTo: 'audit/activity-logs', pathMatch: 'full' },
  { path: 'settings', redirectTo: 'settings/general', pathMatch: 'full' },
  { path: 'ssh', redirectTo: 'terminal/active-sessions', pathMatch: 'full' },
  { path: 'admin', redirectTo: 'admin/users', pathMatch: 'full' },
]
