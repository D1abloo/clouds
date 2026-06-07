import { Module, forwardRef } from '@nestjs/common'
import { AlertsService } from './alerts.service'
import { AlertsController } from './alerts.controller'
import { NotificationsModule } from '../notifications/notifications.module'
import { RealtimeModule } from '../realtime/realtime.module'
import { IntegrationsModule } from '../integrations/integrations.module'

@Module({
  imports: [NotificationsModule, IntegrationsModule, forwardRef(() => RealtimeModule)],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
