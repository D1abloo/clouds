import { Module, forwardRef } from '@nestjs/common'
import { MetricsService } from './metrics.service'
import { MetricsController } from './metrics.controller'
import { RealtimeModule } from '../realtime/realtime.module'

@Module({
  imports: [forwardRef(() => RealtimeModule)],
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
