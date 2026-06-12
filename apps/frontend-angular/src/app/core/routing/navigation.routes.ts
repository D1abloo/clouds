import { Routes } from '@angular/router'
import {
  isGithubResourceSection,
  isGitlabResourceSection,
} from '../../features/repositories/repositories-route-matchers'
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
    data: { breadcrumb: 'Explorador de recursos' },
  },
  {
    path: 'topology-map',
    loadComponent: () =>
      import('../../features/advanced/topology-map.component').then((m) => m.TopologyMapComponent),
    data: { breadcrumb: 'Mapa de topología' },
  },
  {
    path: 'ai-assistant',
    loadComponent: () =>
      import('../../features/advanced/ai-assistant.component').then((m) => m.AiAssistantComponent),
    data: { breadcrumb: 'Asistente IA' },
  },
  { path: 'command-center', ...platform('CommandCenterComponent', 'Centro de mando') },
  { path: 'deployments', ...platform('DeploymentsComponent', 'Despliegues') },
  { path: 'backups', ...platform('BackupsComponent', 'Copias de seguridad') },
  { path: 'security-center', ...platform('SecurityCenterComponent', 'Centro de seguridad') },
  { path: 'secrets-manager', ...platform('SecretsManagerComponent', 'Gestor de secretos') },
  { path: 'logs', ...platform('LogsCenterComponent', 'Logs') },
  { path: 'incidents', ...platform('IncidentsComponent', 'Incidentes') },
  { path: 'network', ...platform('NetworkComponent', 'Red') },
  { path: 'storage', ...platform('StorageComponent', 'Almacenamiento') },
  { path: 'cost-optimizer', ...platform('CostOptimizerComponent', 'Optimizador de costes') },
  { path: 'reports', ...platform('ReportsComponent', 'Informes') },
  {
    path: 'service-catalog',
    loadComponent: () =>
      import('../../features/service-catalog/service-catalog-page.component').then(
        (m) => m.ServiceCatalogPageComponent,
      ),
    data: { breadcrumb: 'Catálogo de servicios' },
  },
  {
    path: 'approvals',
    loadComponent: () =>
      import('../../features/approvals/approvals-page.component').then((m) => m.ApprovalsPageComponent),
    data: { breadcrumb: 'Aprobaciones' },
  },
  {
    path: 'runbooks',
    loadComponent: () =>
      import('../../features/runbooks/runbooks-page.component').then((m) => m.RunbooksPageComponent),
    data: { breadcrumb: 'Catálogo' },
  },
  {
    path: 'runbooks/executions',
    loadComponent: () =>
      import('../../features/runbooks/runbooks-page.component').then((m) => m.RunbooksPageComponent),
    data: { breadcrumb: 'Ejecuciones' },
  },
  {
    path: 'scheduler',
    loadComponent: () =>
      import('../../features/scheduler/scheduler-page.component').then((m) => m.SchedulerPageComponent),
    data: { breadcrumb: 'Programador' },
  },
  { path: 'health-center', ...platform('HealthCenterComponent', 'Centro de salud') },
  { path: 'compliance', ...platform('ComplianceComponent', 'Cumplimiento / Políticas') },
  { path: 'capacity-planner', ...platform('CapacityPlannerComponent', 'Planificador de capacidad') },
  {
    path: 'change-management',
    loadComponent: () =>
      import('../../features/change-management/change-management-page.component').then(
        (m) => m.ChangeManagementPageComponent,
      ),
    data: { breadcrumb: 'Gestor de cambios' },
  },
  { path: 'access-control', ...platform('AccessControlComponent', 'Control de acceso') },
  {
    path: 'admin/api-tokens',
    loadComponent: () =>
      import('../../features/admin/admin-api-tokens-page.component').then(
        (m) => m.AdminApiTokensPageComponent,
      ),
    data: { breadcrumb: 'Tokens API' },
  },
  {
    path: 'admin/webhooks',
    loadComponent: () =>
      import('../../features/admin/admin-webhooks-page.component').then(
        (m) => m.AdminWebhooksPageComponent,
      ),
    data: { breadcrumb: 'Webhooks' },
  },
  { path: 'admin/users', ...platform('UsersAdminComponent', 'Usuarios') },
  {
    path: 'admin/roles',
    loadComponent: () =>
      import('../../features/admin/admin-roles-page.component').then((m) => m.AdminRolesPageComponent),
    data: { breadcrumb: 'Roles' },
  },
  {
    path: 'cloud/:provider/launch',
    loadComponent: () =>
      import('../../features/cloud/cloud-launch-page.component').then((m) => m.CloudLaunchPageComponent),
    data: { breadcrumb: 'Lanzar instancia' },
  },
  {
    path: 'admin/infraestructura/instancias/lanzar',
    loadComponent: () =>
      import('../../features/cloud/cloud-launch-page.component').then((m) => m.CloudLaunchPageComponent),
    data: { breadcrumb: 'Lanzar instancia' },
  },
  {
    path: 'cloud/:provider/:section',
    loadComponent: () =>
      import('../../features/cloud/cloud-provider-page.component').then(
        (m) => m.CloudProviderPageComponent,
      ),
    data: { breadcrumb: 'Nubes' },
  },
  {
    path: 'vps/:provider/:section',
    loadComponent: () =>
      import('../../features/infrastructure/vps-provider-page.component').then(
        (m) => m.VpsProviderPageComponent,
      ),
    data: { breadcrumb: 'VPS', module: 'vps' },
  },
  {
    path: 'instances/all-instances',
    loadComponent: () =>
      import('../../features/instances/instances-list.component').then((m) => m.InstancesListComponent),
    data: { breadcrumb: 'Todas las instancias' },
  },
  {
    path: 'instances/:section',
    loadComponent: () =>
      import('../../features/section-hub/section-hub.component').then((m) => m.SectionHubComponent),
    data: { module: 'instances', parentTitle: 'Instancias' },
  },
  { path: 'docker/metrics', ...hub('docker', 'Docker', 'Métricas') },
  { path: 'docker/events', ...hub('docker', 'Docker', 'Eventos') },
  { path: 'docker/overview', redirectTo: 'docker/containers', pathMatch: 'full' },
  {
    path: 'docker/:section',
    loadComponent: () =>
      import('../../features/docker/docker-page.component').then((m) => m.DockerPageComponent),
    data: { breadcrumb: 'Docker', module: 'docker' },
  },
  { path: 'kubernetes/metrics', ...hub('kubernetes', 'Kubernetes', 'Métricas') },
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
  {
    path: 'repositories/github/:section',
    canMatch: [isGithubResourceSection],
    loadComponent: () =>
      import('../../features/repositories/repositories-global-page.component').then(
        (m) => m.RepositoriesGlobalPageComponent,
      ),
    data: { breadcrumb: 'GitHub', module: 'repositories', provider: 'github' },
  },
  {
    path: 'repositories/gitlab/:section',
    canMatch: [isGitlabResourceSection],
    loadComponent: () =>
      import('../../features/repositories/repositories-global-page.component').then(
        (m) => m.RepositoriesGlobalPageComponent,
      ),
    data: { breadcrumb: 'GitLab', module: 'repositories', provider: 'gitlab' },
  },
  {
    path: 'repositories/github/:connectionId',
    loadComponent: () =>
      import('../../features/repositories/integrations/repository-connection-detail.component').then(
        (m) => m.RepositoryConnectionDetailComponent,
      ),
    data: { breadcrumb: 'Cuenta GitHub', module: 'repositories' },
  },
  {
    path: 'repositories/gitlab/:connectionId',
    loadComponent: () =>
      import('../../features/repositories/integrations/repository-connection-detail.component').then(
        (m) => m.RepositoryConnectionDetailComponent,
      ),
    data: { breadcrumb: 'Cuenta GitLab', module: 'repositories' },
  },
  {
    path: 'repositories/github',
    loadComponent: () =>
      import('../../features/repositories/github-repositories-page.component').then(
        (m) => m.GithubRepositoriesPageComponent,
      ),
    data: { breadcrumb: 'GitHub', module: 'repositories' },
  },
  {
    path: 'repositories/gitlab',
    loadComponent: () =>
      import('../../features/repositories/gitlab-repositories-page.component').then(
        (m) => m.GitlabRepositoriesPageComponent,
      ),
    data: { breadcrumb: 'GitLab', module: 'repositories' },
  },
  { path: 'repositories/webhooks', redirectTo: 'repositories/github/webhooks', pathMatch: 'full' },
  { path: 'repositories/branches', redirectTo: 'repositories/github/branches', pathMatch: 'full' },
  { path: 'repositories/commits', redirectTo: 'repositories/github/commits', pathMatch: 'full' },
  { path: 'repositories/pull-requests', redirectTo: 'repositories/github/pull-requests', pathMatch: 'full' },
  { path: 'repositories/deployments', redirectTo: 'repositories/github/deployments', pathMatch: 'full' },
  {
    path: 'repositories',
    loadComponent: () =>
      import('../../features/repositories/repositories-hub-page.component').then(
        (m) => m.RepositoriesHubPageComponent,
      ),
    data: { breadcrumb: 'Repositorios', module: 'repositories' },
  },
  { path: 'jenkins/overview', redirectTo: 'jenkins/jobs', pathMatch: 'full' },
  { path: 'jenkins/servers', ...hub('jenkins', 'Jenkins', 'Servidores') },
  { path: 'jenkins/pipelines', ...hub('jenkins', 'Jenkins', 'Pipelines') },
  {
    path: 'jenkins/:section',
    loadComponent: () =>
      import('../../features/jenkins/jenkins-page.component').then((m) => m.JenkinsPageComponent),
    data: { breadcrumb: 'Jenkins', module: 'jenkins' },
  },
  { path: 'terraform/launch-instance', redirectTo: 'automation/ai-infra-studio', pathMatch: 'full' },
  { path: 'terraform/overview', redirectTo: 'automation/ai-infra-studio', pathMatch: 'full' },
  { path: 'terraform/workspaces', redirectTo: 'automation/ai-infra-studio', pathMatch: 'full' },
  { path: 'terraform/:section', redirectTo: 'automation/ai-infra-studio', pathMatch: 'full' },
  { path: 'infra/ai-studio', redirectTo: 'automation/ai-infra-studio', pathMatch: 'full' },
  {
    path: 'automation/ai-infra-studio',
    loadComponent: () =>
      import('../../features/infra/ai-infra-studio.component').then((m) => m.AiInfraStudioComponent),
    data: { breadcrumb: 'AI Infra Studio' },
  },
  {
    path: 'finops',
    loadComponent: () =>
      import('../../features/finops/finops-hub.component').then((m) => m.FinopsHubComponent),
    data: { breadcrumb: 'FinOps' },
  },
  {
    path: 'finops/dashboard',
    loadComponent: () =>
      import('../../features/finops/finops-dashboard.component').then((m) => m.FinopsDashboardComponent),
    data: { breadcrumb: 'Panel FinOps' },
  },
  {
    path: 'finops/billing',
    loadComponent: () =>
      import('../../features/finops/finops-billing-page.component').then((m) => m.FinopsBillingPageComponent),
    data: { breadcrumb: 'Facturación FinOps' },
  },
  {
    path: 'finops/instances',
    loadComponent: () =>
      import('../../features/finops/finops-instances-page.component').then((m) => m.FinopsInstancesPageComponent),
    data: { breadcrumb: 'Instancias FinOps' },
  },
  {
    path: 'finops/cost-centers',
    loadComponent: () =>
      import('../../features/finops/finops-cost-centers-page.component').then((m) => m.FinopsCostCentersPageComponent),
    data: { breadcrumb: 'Centros de coste' },
  },
  {
    path: 'finops/alerts',
    loadComponent: () =>
      import('../../features/finops/finops-alerts-page.component').then((m) => m.FinopsAlertsPageComponent),
    data: { breadcrumb: 'Alertas FinOps' },
  },
  {
    path: 'finops/recommendations',
    loadComponent: () =>
      import('../../features/finops/finops-recommendations-page.component').then((m) => m.FinopsRecommendationsPageComponent),
    data: { breadcrumb: 'Insights IA' },
  },
  {
    path: 'finops/reports',
    loadComponent: () =>
      import('../../features/finops/finops-reports-page.component').then((m) => m.FinopsReportsPageComponent),
    data: { breadcrumb: 'Informes FinOps' },
  },
  {
    path: 'finops/settings',
    loadComponent: () =>
      import('../../features/finops/finops-settings-page.component').then((m) => m.FinopsSettingsPageComponent),
    data: { breadcrumb: 'Configuración FinOps' },
  },
  {
    path: 'terminal/:section',
    loadComponent: () =>
      import('../../features/terminal/terminal-page.component').then((m) => m.TerminalPageComponent),
    data: { breadcrumb: 'Terminal', module: 'terminal' },
  },
  { path: 'terminal', redirectTo: 'terminal/active-sessions', pathMatch: 'full' },
  { path: 'terminal/shortcuts', redirectTo: 'terminal/history', pathMatch: 'full' },
  {
    path: 'billing/:section',
    loadComponent: () =>
      import('../../features/billing/billing-page.component').then((m) => m.BillingPageComponent),
    data: { breadcrumb: 'Facturación', module: 'billing' },
  },
  { path: 'metrics/:section', ...hub('metrics', 'Métricas') },
  {
    path: 'alerts/:section',
    loadComponent: () =>
      import('../../features/alerts/alerts-page.component').then((m) => m.AlertsPageComponent),
    data: { breadcrumb: 'Alertas', module: 'alerts' },
  },
  {
    path: 'notifications/:section',
    loadComponent: () =>
      import('../../features/notifications/notifications-page.component').then(
        (m) => m.NotificationsPageComponent,
      ),
    data: { breadcrumb: 'Notificaciones', module: 'notifications' },
  },
  {
    path: 'audit/:section',
    loadComponent: () =>
      import('../../features/audit/audit-page.component').then((m) => m.AuditPageComponent),
    data: { breadcrumb: 'Auditoría', module: 'audit' },
  },
  {
    path: 'settings/copilot',
    loadComponent: () =>
      import('../../features/admin/copilot-settings-page.component').then(
        (m) => m.CopilotSettingsPageComponent,
      ),
    data: { breadcrumb: 'Copilot IA', module: 'settings' },
  },
  {
    path: 'settings/:section',
    loadComponent: () =>
      import('../../features/admin/admin-settings-page.component').then(
        (m) => m.AdminSettingsPageComponent,
      ),
    data: { breadcrumb: 'Configuración', module: 'settings' },
  },
  { path: 'accounts', redirectTo: 'cloud/aws/accounts', pathMatch: 'full' },
  { path: 'accounts/aws', redirectTo: 'cloud/aws/accounts', pathMatch: 'full' },
  { path: 'accounts/gcp', redirectTo: 'cloud/gcp/accounts', pathMatch: 'full' },
  { path: 'accounts/azure', redirectTo: 'cloud/azure/accounts', pathMatch: 'full' },
  {
    path: 'admin/configuracion/integraciones',
    redirectTo: 'settings/integrations',
    pathMatch: 'full',
  },
  {
    path: 'admin/configuracion/integraciones/github/conectar',
    loadComponent: () =>
      import('../../features/repositories/integrations/repository-connection-wizard.component').then(
        (m) => m.RepositoryConnectionWizardComponent,
      ),
    data: { breadcrumb: 'Conectar GitHub', provider: 'github', module: 'settings' },
  },
  {
    path: 'admin/configuracion/integraciones/gitlab/conectar',
    loadComponent: () =>
      import('../../features/repositories/integrations/repository-connection-wizard.component').then(
        (m) => m.RepositoryConnectionWizardComponent,
      ),
    data: { breadcrumb: 'Conectar GitLab', provider: 'gitlab', module: 'settings' },
  },
  {
    path: 'admin/configuracion/integraciones/:provider/nueva',
    loadComponent: () =>
      import('../../features/cloud-accounts/cloud-connection-wizard-page.component').then(
        (m) => m.CloudConnectionWizardPageComponent,
      ),
    data: { breadcrumb: 'Nueva integración' },
  },
  {
    path: 'admin/configuracion/integraciones/:provider/conectar',
    loadComponent: () =>
      import('../../features/cloud-accounts/cloud-connection-wizard-page.component').then(
        (m) => m.CloudConnectionWizardPageComponent,
      ),
    data: { breadcrumb: 'Conectar integración' },
  },
  {
    path: 'admin/infraestructura/vps/nuevo',
    loadComponent: () =>
      import('../../features/infrastructure/vps-connection-wizard-page.component').then(
        (m) => m.VpsConnectionWizardPageComponent,
      ),
    data: { breadcrumb: 'Nuevo servidor VPS' },
  },
  {
    path: 'settings/integrations',
    loadComponent: () =>
      import('../../features/integrations/integrations-hub-page.component').then(
        (m) => m.IntegrationsHubPageComponent,
      ),
    data: { breadcrumb: 'Integraciones', module: 'settings' },
  },
  { path: 'cloud/aws', redirectTo: 'cloud/aws/overview', pathMatch: 'full' },
  { path: 'cloud/gcp', redirectTo: 'cloud/gcp/overview', pathMatch: 'full' },
  { path: 'cloud/azure', redirectTo: 'cloud/azure/overview', pathMatch: 'full' },
  { path: 'cloud/clouding', redirectTo: 'cloud/clouding/overview', pathMatch: 'full' },
  { path: 'vps/digitalocean', redirectTo: 'vps/digitalocean/overview', pathMatch: 'full' },
  { path: 'vps/hetzner', redirectTo: 'vps/hetzner/overview', pathMatch: 'full' },
  { path: 'vps/linode', redirectTo: 'vps/linode/overview', pathMatch: 'full' },
  { path: 'vps/ovh', redirectTo: 'vps/ovh/overview', pathMatch: 'full' },
  { path: 'vps/ionos', redirectTo: 'vps/ionos/overview', pathMatch: 'full' },
  { path: 'vps/vultr', redirectTo: 'vps/vultr/overview', pathMatch: 'full' },
  { path: 'vps/scaleway', redirectTo: 'vps/scaleway/overview', pathMatch: 'full' },
  { path: 'vps/overview', redirectTo: 'vps/digitalocean/overview', pathMatch: 'full' },
  { path: 'vps', redirectTo: 'vps/digitalocean/overview', pathMatch: 'full' },
  { path: 'instances', redirectTo: 'instances/all-instances', pathMatch: 'full' },
  { path: 'docker', redirectTo: 'docker/containers', pathMatch: 'full' },
  { path: 'kubernetes', redirectTo: 'kubernetes/pods', pathMatch: 'full' },
  { path: 'jenkins', redirectTo: 'jenkins/jobs', pathMatch: 'full' },
  { path: 'terraform', redirectTo: 'automation/ai-infra-studio', pathMatch: 'full' },
  { path: 'billing', redirectTo: 'billing/overview', pathMatch: 'full' },
  { path: 'alerts', redirectTo: 'alerts/active', pathMatch: 'full' },
  { path: 'notifications', redirectTo: 'notifications/all', pathMatch: 'full' },
  { path: 'audit', redirectTo: 'audit/activity-logs', pathMatch: 'full' },
  { path: 'settings', redirectTo: 'settings/general', pathMatch: 'full' },
  { path: 'ssh', redirectTo: 'terminal/active-sessions', pathMatch: 'full' },
  { path: 'admin', redirectTo: 'admin/users', pathMatch: 'full' },
]
