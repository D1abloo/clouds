import { Module } from '@nestjs/common'
import { InstancesService } from './instances.service'
import { InstancesController } from './instances.controller'
import { CloudAccountsModule } from '../cloud-accounts/cloud-accounts.module'
import { AuditModule } from '../audit/audit.module'
import { DockerDiscoveryModule } from '../docker-discovery/docker-discovery.module'
import { KubernetesDiscoveryModule } from '../kubernetes-discovery/kubernetes-discovery.module'

@Module({
  imports: [CloudAccountsModule, AuditModule, DockerDiscoveryModule, KubernetesDiscoveryModule],
  controllers: [InstancesController],
  providers: [InstancesService],
  exports: [InstancesService],
})
export class InstancesModule {}
