import { Module, forwardRef } from '@nestjs/common'
import { DockerDiscoveryService } from './docker-discovery.service'
import { DockerDiscoveryController } from './docker-discovery.controller'
import { RealtimeModule } from '../realtime/realtime.module'

@Module({
  imports: [forwardRef(() => RealtimeModule)],
  controllers: [DockerDiscoveryController],
  providers: [DockerDiscoveryService],
  exports: [DockerDiscoveryService],
})
export class DockerDiscoveryModule {}
