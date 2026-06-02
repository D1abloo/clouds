import { Module, forwardRef } from '@nestjs/common'
import { KubernetesDiscoveryService, SystemDiscoveryService } from './kubernetes-discovery.service'
import { KubernetesDiscoveryController } from './kubernetes-discovery.controller'
import { RealtimeModule } from '../realtime/realtime.module'

@Module({
  imports: [forwardRef(() => RealtimeModule)],
  controllers: [KubernetesDiscoveryController],
  providers: [KubernetesDiscoveryService, SystemDiscoveryService],
  exports: [KubernetesDiscoveryService, SystemDiscoveryService],
})
export class KubernetesDiscoveryModule {}
