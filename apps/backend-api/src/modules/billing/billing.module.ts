import { Module, forwardRef } from '@nestjs/common'
import { BillingService, AwsBillingService, GcpBillingService, AzureBillingService } from './billing.service'
import { BillingController } from './billing.controller'
import { RealtimeModule } from '../realtime/realtime.module'

@Module({
  imports: [forwardRef(() => RealtimeModule)],
  controllers: [BillingController],
  providers: [BillingService, AwsBillingService, GcpBillingService, AzureBillingService],
  exports: [BillingService],
})
export class BillingModule {}
