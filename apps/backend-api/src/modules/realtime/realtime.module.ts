import { Module } from '@nestjs/common'
import { RealtimeGateway } from './realtime.gateway'
import { RealtimeSseController } from './realtime-sse.controller'

@Module({
  controllers: [RealtimeSseController],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
