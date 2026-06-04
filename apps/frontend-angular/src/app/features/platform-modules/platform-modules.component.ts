import { ChangeDetectionStrategy, Component } from '@angular/core'
import { PlatformModulePageComponent } from '../../shared/platform/platform-module-page.component'
import {
  APPROVALS_CONFIG,
  BACKUPS_CONFIG,
  COMMAND_CENTER_CONFIG,
  COST_OPTIMIZER_CONFIG,
  DEPLOYMENTS_CONFIG,
  INCIDENTS_CONFIG,
  LOGS_CONFIG,
  NETWORK_CONFIG,
  REPORTS_CONFIG,
  SECRETS_MANAGER_CONFIG,
  SECURITY_CENTER_CONFIG,
  SERVICE_CATALOG_CONFIG,
  STORAGE_CONFIG,
  ACCESS_CONTROL_CONFIG,
  USERS_CONFIG,
  RUNBOOKS_CONFIG,
  SCHEDULER_CONFIG,
  HEALTH_CENTER_CONFIG,
  COMPLIANCE_CONFIG,
  CAPACITY_PLANNER_CONFIG,
  CHANGE_MANAGEMENT_CONFIG,
  API_TOKENS_CONFIG,
} from '../../shared/platform/platform-modules.demo'

@Component({
  selector: 'app-command-center',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlatformModulePageComponent],
  template: `<app-platform-module-page [config]="config" />`,
})
export class CommandCenterComponent {
  readonly config = COMMAND_CENTER_CONFIG
}

@Component({
  selector: 'app-deployments',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlatformModulePageComponent],
  template: `<app-platform-module-page [config]="config" />`,
})
export class DeploymentsComponent {
  readonly config = DEPLOYMENTS_CONFIG
}

@Component({
  selector: 'app-backups',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlatformModulePageComponent],
  template: `<app-platform-module-page [config]="config" />`,
})
export class BackupsComponent {
  readonly config = BACKUPS_CONFIG
}

@Component({
  selector: 'app-security-center',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlatformModulePageComponent],
  template: `<app-platform-module-page [config]="config" />`,
})
export class SecurityCenterComponent {
  readonly config = SECURITY_CENTER_CONFIG
}

@Component({
  selector: 'app-secrets-manager',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlatformModulePageComponent],
  template: `<app-platform-module-page [config]="config" />`,
})
export class SecretsManagerComponent {
  readonly config = SECRETS_MANAGER_CONFIG
}

@Component({
  selector: 'app-logs-center',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlatformModulePageComponent],
  template: `<app-platform-module-page [config]="config" />`,
})
export class LogsCenterComponent {
  readonly config = LOGS_CONFIG
}

@Component({
  selector: 'app-incidents',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlatformModulePageComponent],
  template: `<app-platform-module-page [config]="config" />`,
})
export class IncidentsComponent {
  readonly config = INCIDENTS_CONFIG
}

@Component({
  selector: 'app-network',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlatformModulePageComponent],
  template: `<app-platform-module-page [config]="config" />`,
})
export class NetworkComponent {
  readonly config = NETWORK_CONFIG
}

@Component({
  selector: 'app-cost-optimizer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlatformModulePageComponent],
  template: `<app-platform-module-page [config]="config" />`,
})
export class CostOptimizerComponent {
  readonly config = COST_OPTIMIZER_CONFIG
}

@Component({
  selector: 'app-reports',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlatformModulePageComponent],
  template: `<app-platform-module-page [config]="config" />`,
})
export class ReportsComponent {
  readonly config = REPORTS_CONFIG
}

@Component({
  selector: 'app-service-catalog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlatformModulePageComponent],
  template: `<app-platform-module-page [config]="config" />`,
})
export class ServiceCatalogComponent {
  readonly config = SERVICE_CATALOG_CONFIG
}

@Component({
  selector: 'app-approvals',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlatformModulePageComponent],
  template: `<app-platform-module-page [config]="config" />`,
})
export class ApprovalsComponent {
  readonly config = APPROVALS_CONFIG
}

@Component({
  selector: 'app-storage',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlatformModulePageComponent],
  template: `<app-platform-module-page [config]="config" />`,
})
export class StorageComponent {
  readonly config = STORAGE_CONFIG
}

@Component({
  selector: 'app-access-control',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlatformModulePageComponent],
  template: `<app-platform-module-page [config]="config" />`,
})
export class AccessControlComponent {
  readonly config = ACCESS_CONTROL_CONFIG
}

@Component({
  selector: 'app-users-admin',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlatformModulePageComponent],
  template: `<app-platform-module-page [config]="config" />`,
})
export class UsersAdminComponent {
  readonly config = USERS_CONFIG
}

@Component({
  selector: 'app-runbooks',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlatformModulePageComponent],
  template: `<app-platform-module-page [config]="config" />`,
})
export class RunbooksComponent {
  readonly config = RUNBOOKS_CONFIG
}

@Component({
  selector: 'app-scheduler',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlatformModulePageComponent],
  template: `<app-platform-module-page [config]="config" />`,
})
export class SchedulerComponent {
  readonly config = SCHEDULER_CONFIG
}

@Component({
  selector: 'app-health-center',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlatformModulePageComponent],
  template: `<app-platform-module-page [config]="config" />`,
})
export class HealthCenterComponent {
  readonly config = HEALTH_CENTER_CONFIG
}

@Component({
  selector: 'app-compliance',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlatformModulePageComponent],
  template: `<app-platform-module-page [config]="config" />`,
})
export class ComplianceComponent {
  readonly config = COMPLIANCE_CONFIG
}

@Component({
  selector: 'app-capacity-planner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlatformModulePageComponent],
  template: `<app-platform-module-page [config]="config" />`,
})
export class CapacityPlannerComponent {
  readonly config = CAPACITY_PLANNER_CONFIG
}

@Component({
  selector: 'app-change-management',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlatformModulePageComponent],
  template: `<app-platform-module-page [config]="config" />`,
})
export class ChangeManagementComponent {
  readonly config = CHANGE_MANAGEMENT_CONFIG
}

@Component({
  selector: 'app-api-tokens',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlatformModulePageComponent],
  template: `<app-platform-module-page [config]="config" />`,
})
export class ApiTokensComponent {
  readonly config = API_TOKENS_CONFIG
}
