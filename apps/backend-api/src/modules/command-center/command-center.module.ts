import { Module } from '@nestjs/common'
import { CommandCenterController } from './command-center.controller'
import { CommandCenterService } from './command-center.service'
import { InstancesModule } from '../instances/instances.module'
import { CloudAccountsModule } from '../cloud-accounts/cloud-accounts.module'
import { TerraformModule } from '../terraform/terraform.module'
import { JenkinsModule } from '../jenkins/jenkins.module'
import { VpsModule } from '../vps/vps.module'
import { KubernetesApiModule } from '../kubernetes/kubernetes.module'
import { IntegrationsModule } from '../integrations/integrations.module'

import { AuditModule } from '../audit/audit.module'
import { PrismaModule } from '../../common/prisma/prisma.module'

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    IntegrationsModule,
    InstancesModule,
    CloudAccountsModule,
    TerraformModule,
    JenkinsModule,
    VpsModule,
    KubernetesApiModule,
  ],
  controllers: [CommandCenterController],
  providers: [CommandCenterService],
  exports: [CommandCenterService],
})
export class CommandCenterModule {}
