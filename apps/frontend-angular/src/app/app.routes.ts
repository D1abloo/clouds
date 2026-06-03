import { Routes } from '@angular/router'
import { authGuard, guestGuard } from './core/guards/auth.guard'
import { MainLayoutComponent } from './layout/main-layout/main-layout.component'

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent),
    canActivate: [guestGuard],
    data: { breadcrumb: 'Login' },
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
        data: { breadcrumb: 'Dashboard' },
      },
      {
        path: 'accounts/aws',
        loadComponent: () =>
          import('./features/cloud-accounts/cloud-provider-hub.component').then(
            (m) => m.CloudProviderHubComponent,
          ),
        data: { provider: 'AWS', title: 'AWS', breadcrumb: 'AWS' },
      },
      {
        path: 'accounts/gcp',
        loadComponent: () =>
          import('./features/cloud-accounts/cloud-provider-hub.component').then(
            (m) => m.CloudProviderHubComponent,
          ),
        data: { provider: 'GCP', title: 'GCP', breadcrumb: 'GCP' },
      },
      {
        path: 'accounts/azure',
        loadComponent: () =>
          import('./features/cloud-accounts/cloud-provider-hub.component').then(
            (m) => m.CloudProviderHubComponent,
          ),
        data: { provider: 'AZURE', title: 'Azure', breadcrumb: 'Azure' },
      },
      {
        path: 'vps',
        loadComponent: () =>
          import('./features/vps/vps-list.component').then((m) => m.VpsListComponent),
        data: { breadcrumb: 'VPS' },
      },
      {
        path: 'instances',
        loadComponent: () =>
          import('./features/instances/instances-list.component').then(
            (m) => m.InstancesListComponent,
          ),
        data: { breadcrumb: 'Instances' },
      },
      {
        path: 'instances/:id',
        loadComponent: () =>
          import('./features/instances/instance-detail.component').then(
            (m) => m.InstanceDetailComponent,
          ),
        data: { breadcrumb: 'Instance Detail', breadcrumbLeaf: true },
      },
      {
        path: 'terminal',
        loadComponent: () =>
          import('./features/terminal/terminal-page.component').then(
            (m) => m.TerminalPageComponent,
          ),
        data: { breadcrumb: 'Terminal' },
      },
      {
        path: 'terminal/:vpsId',
        loadComponent: () =>
          import('./features/terminal/terminal-page.component').then(
            (m) => m.TerminalPageComponent,
          ),
        data: { breadcrumb: 'Terminal' },
      },
      {
        path: 'docker',
        loadComponent: () =>
          import('./features/docker/docker-page.component').then(
            (m) => m.DockerPageComponent,
          ),
        data: { breadcrumb: 'Docker' },
      },
      {
        path: 'kubernetes',
        loadComponent: () =>
          import('./features/kubernetes/kubernetes-page.component').then(
            (m) => m.KubernetesPageComponent,
          ),
        data: { breadcrumb: 'Kubernetes' },
      },
      {
        path: 'jenkins',
        loadComponent: () =>
          import('./features/jenkins/jenkins-page.component').then(
            (m) => m.JenkinsPageComponent,
          ),
        data: { breadcrumb: 'Jenkins' },
      },
      {
        path: 'terraform',
        loadComponent: () =>
          import('./features/terraform/terraform-page.component').then(
            (m) => m.TerraformPageComponent,
          ),
        data: { breadcrumb: 'Terraform' },
      },
      {
        path: 'billing',
        loadComponent: () =>
          import('./features/billing/billing-page.component').then(
            (m) => m.BillingPageComponent,
          ),
        data: { breadcrumb: 'Billing' },
      },
      {
        path: 'alerts',
        loadComponent: () =>
          import('./features/alerts/alerts-page.component').then(
            (m) => m.AlertsPageComponent,
          ),
        data: { breadcrumb: 'Alerts' },
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/notifications/notifications-page.component').then(
            (m) => m.NotificationsPageComponent,
          ),
        data: { breadcrumb: 'Notifications' },
      },
      {
        path: 'audit',
        loadComponent: () =>
          import('./features/audit/audit-page.component').then(
            (m) => m.AuditPageComponent,
          ),
        data: { breadcrumb: 'Audit' },
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings-page.component').then(
            (m) => m.SettingsPageComponent,
          ),
        data: { breadcrumb: 'Settings' },
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
]
