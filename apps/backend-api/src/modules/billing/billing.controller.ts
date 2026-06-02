import { Controller, Get, Post, Param } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { CloudProvider } from '@prisma/client'
import { BillingService } from './billing.service'

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(private service: BillingService) {}

  @Get('summary')
  summary() {
    return this.service.getSummary()
  }

  @Post('sync/:provider/:accountId')
  sync(@Param('provider') provider: CloudProvider, @Param('accountId') accountId: string) {
    return this.service.syncBilling(provider, accountId)
  }
}
