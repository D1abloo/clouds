import { Injectable } from '@nestjs/common'
import { CloudProvider } from '@prisma/client'
import { PrismaService } from '../../common/prisma/prisma.service'
import { RealtimeGateway } from '../realtime/realtime.gateway'

@Injectable()
export class AwsBillingService {
  async fetchCosts(_accountId: string) {
    return { daily: 45.2, weekly: 312.5, monthly: 1250.0, byService: { EC2: 800, S3: 150, RDS: 300 } }
  }
}

@Injectable()
export class GcpBillingService {
  async fetchCosts(_accountId: string) {
    return { daily: 32.1, weekly: 220.0, monthly: 890.0, byService: { 'Compute Engine': 600, Storage: 90, SQL: 200 } }
  }
}

@Injectable()
export class AzureBillingService {
  async fetchCosts(_accountId: string) {
    return { daily: 28.5, weekly: 195.0, monthly: 780.0, byService: { VMs: 500, Storage: 80, SQL: 200 } }
  }
}

@Injectable()
export class BillingService {
  constructor(
    private prisma: PrismaService,
    private aws: AwsBillingService,
    private gcp: GcpBillingService,
    private azure: AzureBillingService,
    private realtime: RealtimeGateway,
  ) {}

  private getService(provider: CloudProvider) {
    switch (provider) {
      case CloudProvider.AWS: return this.aws
      case CloudProvider.GCP: return this.gcp
      case CloudProvider.AZURE: return this.azure
    }
  }

  async syncBilling(provider: CloudProvider, accountId: string) {
    const costs = await this.getService(provider).fetchCosts(accountId)

    let billingAccount = await this.prisma.billingAccount.findFirst({
      where: { provider, accountId },
    })

    if (!billingAccount) {
      billingAccount = await this.prisma.billingAccount.create({
        data: { provider, accountId },
      })
    }

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    await this.prisma.billingRecord.create({
      data: {
        billingAccountId: billingAccount.id,
        amount: costs.monthly,
        service: 'total',
        periodStart: monthStart,
        periodEnd: now,
        isEstimated: true,
      },
    })

    this.realtime.emitBillingUpdate({ provider, accountId, costs })
    return { provider, accountId, costs, isEstimated: true }
  }

  async getSummary() {
    const records = await this.prisma.billingRecord.findMany({
      include: { billingAccount: true },
      orderBy: { periodStart: 'desc' },
      take: 100,
    })

    const byProvider = records.reduce((acc, r) => {
      const p = r.billingAccount.provider
      acc[p] = (acc[p] ?? 0) + r.amount
      return acc
    }, {} as Record<string, number>)

    return { records, byProvider, totalMonthly: Object.values(byProvider).reduce((s, v) => s + v, 0) }
  }
}
