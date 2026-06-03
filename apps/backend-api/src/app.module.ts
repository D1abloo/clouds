import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { PrismaModule } from './common/prisma/prisma.module'
import { RedisModule } from './common/redis/redis.module'
import { JwtAuthGuard } from './common/guards/jwt-auth.guard'
import { PermissionsGuard } from './common/guards/permissions.guard'
import { AuthModule } from './modules/auth/auth.module'
import { UsersModule } from './modules/users/users.module'
import { RolesModule } from './modules/roles/roles.module'
import { PermissionsModule } from './modules/permissions/permissions.module'
import { CloudAccountsModule } from './modules/cloud-accounts/cloud-accounts.module'
import { InstancesModule } from './modules/instances/instances.module'
import { VpsModule } from './modules/vps/vps.module'
import { SshModule } from './modules/ssh/ssh.module'
import { DockerDiscoveryModule } from './modules/docker-discovery/docker-discovery.module'
import { KubernetesDiscoveryModule } from './modules/kubernetes-discovery/kubernetes-discovery.module'
import { JenkinsModule } from './modules/jenkins/jenkins.module'
import { TerraformModule } from './modules/terraform/terraform.module'
import { MetricsModule } from './modules/metrics/metrics.module'
import { BillingModule } from './modules/billing/billing.module'
import { AlertsModule } from './modules/alerts/alerts.module'
import { NotificationsModule } from './modules/notifications/notifications.module'
import { AuditModule } from './modules/audit/audit.module'
import { RealtimeModule } from './modules/realtime/realtime.module'
import { HealthModule } from './modules/health/health.module'
import { DemoModule } from './modules/demo/demo.module'
import { InventoryModule } from './modules/inventory/inventory.module'
import { DockerModule } from './modules/docker/docker.module'
import { KubernetesApiModule } from './modules/kubernetes/kubernetes.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    CloudAccountsModule,
    InstancesModule,
    VpsModule,
    SshModule,
    DockerDiscoveryModule,
    KubernetesDiscoveryModule,
    JenkinsModule,
    TerraformModule,
    MetricsModule,
    BillingModule,
    AlertsModule,
    NotificationsModule,
    AuditModule,
    RealtimeModule,
    HealthModule,
    DemoModule,
    InventoryModule,
    DockerModule,
    KubernetesApiModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
