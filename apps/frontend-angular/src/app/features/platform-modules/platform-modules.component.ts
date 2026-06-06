import { ChangeDetectionStrategy, Component } from '@angular/core'
import { PlatformModulePageComponent } from '../../shared/platform/platform-module-page.component'
import { InfrastructureModulePageComponent } from '../infrastructure/infrastructure-module-page.component'
import { CommandCenterPageComponent } from '../../features/overview/command-center-page.component'
import { HealthCenterPageComponent } from '../../features/overview/health-center-page.component'
import { ReportsPageComponent } from '../reports/reports-page.component'
import {
  APPROVALS_CONFIG,
  BACKUPS_CONFIG,
  COST_OPTIMIZER_CONFIG,
  DEPLOYMENTS_CONFIG,
  INCIDENTS_CONFIG,
  LOGS_CONFIG,
  NETWORK_CONFIG,
  SERVICE_CATALOG_CONFIG,
  STORAGE_CONFIG,
  USERS_CONFIG,
  RUNBOOKS_CONFIG,
  SCHEDULER_CONFIG,
  CAPACITY_PLANNER_CONFIG,
  CHANGE_MANAGEMENT_CONFIG,
  API_TOKENS_CONFIG,
  ADMIN_WEBHOOKS_CONFIG,
} from '../../shared/platform/platform-modules.demo'
import { SecurityCenterPageComponent } from '../security/security-center-page.component'
import { SecretsManagerPageComponent } from '../security/secrets-manager-page.component'
import { CompliancePageComponent } from '../security/compliance-page.component'
import { AccessControlPageComponent } from '../security/access-control-page.component'

@Component({
  selector: 'app-command-center',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommandCenterPageComponent],
  template: `<app-command-center-page />`,
})
export class CommandCenterComponent {}

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
  imports: [InfrastructureModulePageComponent],
  template: `<app-infrastructure-module-page [config]="config" />`,
})
export class BackupsComponent {
  readonly config = BACKUPS_CONFIG
}

@Component({
  selector: 'app-security-center',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SecurityCenterPageComponent],
  template: `<app-security-center-page />`,
})
export class SecurityCenterComponent {}

@Component({
  selector: 'app-secrets-manager',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SecretsManagerPageComponent],
  template: `<app-secrets-manager-page />`,
})
export class SecretsManagerComponent {}

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
  imports: [InfrastructureModulePageComponent],
  template: `<app-infrastructure-module-page [config]="config" />`,
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
  imports: [ReportsPageComponent],
  template: `<app-reports-page />`,
})
export class ReportsComponent {}

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
  imports: [InfrastructureModulePageComponent],
  template: `<app-infrastructure-module-page [config]="config" />`,
})
export class StorageComponent {
  readonly config = STORAGE_CONFIG
}

@Component({
  selector: 'app-access-control',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AccessControlPageComponent],
  template: `<app-access-control-page />`,
})
export class AccessControlComponent {}

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
  host: {
    class: 'health-center-shell',
  },
  imports: [HealthCenterPageComponent],
  template: `<app-health-center-page />`,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
      width: 100%;
    }
  `,
})
export class HealthCenterComponent {}

@Component({
  selector: 'app-compliance',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CompliancePageComponent],
  template: `<app-compliance-page />`,
})
export class ComplianceComponent {}

@Component({
  selector: 'app-capacity-planner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InfrastructureModulePageComponent],
  template: `<app-infrastructure-module-page [config]="config" />`,
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

@Component({
  selector: 'app-admin-webhooks',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlatformModulePageComponent],
  template: `<app-platform-module-page [config]="config" />`,
})
export class AdminWebhooksComponent {
  readonly config = ADMIN_WEBHOOKS_CONFIG
}
