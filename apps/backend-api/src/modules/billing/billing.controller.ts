import { Controller, Get, Post, Param } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { CloudProvider } from '@prisma/client'
import { BillingService } from './billing.service'
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator'

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(private service: BillingService) {}

  @Get('summary')
  summary(@CurrentUser() user: JwtPayload) {
    return this.service.getSummary(user.sub)
  }

  @Post('sync/:provider/:accountId')
  sync(
    @Param('provider') provider: CloudProvider,
    @Param('accountId') accountId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.syncBilling(provider, accountId, user.sub)
  }
}
