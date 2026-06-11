import { Injectable } from '@nestjs/common'
import { CloudProvider } from '@prisma/client'
import { BillingService } from '../billing/billing.service'

@Injectable()
export class BillingSyncWorker {
  constructor(private readonly billing: BillingService) {}

  syncForAccount = async (provider: CloudProvider, accountId: string, userId: string) => {
    return this.billing.syncBilling(provider, accountId, userId)
  }
}
