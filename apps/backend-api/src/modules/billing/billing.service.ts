import { ForbiddenException, Injectable } from '@nestjs/common'
import { CloudProvider } from '@prisma/client'
import { PrismaService } from '../../common/prisma/prisma.service'
import { RealtimeGateway } from '../realtime/realtime.gateway'
import { OrganizationScopeService } from '../../common/organization/organization-scope.service'

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
export class CloudingBillingService {
  async fetchCosts(_accountId: string) {
    return {
      daily: 18.4,
      weekly: 128.0,
      monthly: 520.0,
      byService: { Instances: 380, Storage: 90, Network: 50 },
    }
  }
}

@Injectable()
export class BillingService {
  constructor(
    private prisma: PrismaService,
    private aws: AwsBillingService,
    private gcp: GcpBillingService,
    private azure: AzureBillingService,
    private clouding: CloudingBillingService,
    private realtime: RealtimeGateway,
    private orgScope: OrganizationScopeService,
  ) {}

  private emptySummary() {
    return {
      records: [],
      byProvider: {} as Record<string, number>,
      totalMonthly: 0,
      totalCost: 0,
      daily: 0,
      weekly: 0,
      currency: 'USD',
      period: 'Current month',
      forecastMonthly: 0,
      varianceVsPreviousMonth: 0,
      isEstimated: true,
    }
  }

  private async ownedBillingAccountIds(userId: string): Promise<string[]> {
    const scope = await this.orgScope.resolveForUser(userId)
    if (!scope.projectIds.length) return []

    const cloudAccounts = await this.prisma.cloudAccount.findMany({
      where: { projectId: { in: scope.projectIds }, deletedAt: null },
      select: { id: true, accountId: true, provider: true },
    })
    if (!cloudAccounts.length) return []

    const orConditions = cloudAccounts.flatMap((ca) => [
      { provider: ca.provider, accountId: ca.id },
      ...(ca.accountId ? [{ provider: ca.provider, accountId: ca.accountId }] : []),
    ])

    const billingAccounts = await this.prisma.billingAccount.findMany({
      where: { OR: orConditions },
      select: { id: true },
    })
    return billingAccounts.map((b) => b.id)
  }

  private getService(provider: CloudProvider) {
    switch (provider) {
      case CloudProvider.AWS: return this.aws
      case CloudProvider.GCP: return this.gcp
      case CloudProvider.AZURE: return this.azure
      case CloudProvider.CLOUDING: return this.clouding
    }
  }

  async syncBilling(provider: CloudProvider, accountId: string, userId: string) {
    const scope = await this.orgScope.resolveForUser(userId)
    const owned = await this.prisma.cloudAccount.findFirst({
      where: {
        projectId: { in: scope.projectIds },
        provider,
        deletedAt: null,
        OR: [{ id: accountId }, { accountId }],
      },
    })
    if (!owned) {
      throw new ForbiddenException('Sin acceso a esta cuenta cloud')
    }

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

  async getSummary(userId: string) {
    const billingAccountIds = await this.ownedBillingAccountIds(userId)
    if (!billingAccountIds.length) return this.emptySummary()

    const records = await this.prisma.billingRecord.findMany({
      where: { billingAccountId: { in: billingAccountIds } },
      include: { billingAccount: true },
      orderBy: { periodStart: 'desc' },
      take: 200,
    })

    const byProvider = records.reduce((acc, r) => {
      const p = r.billingAccount.accountId === 'vps-external-demo'
        ? 'VPS'
        : r.billingAccount.provider
      acc[p] = (acc[p] ?? 0) + r.amount
      return acc
    }, {} as Record<string, number>)

    const monthlyRecords = records.filter((r) => r.service !== 'daily' && r.service !== 'total')
    const totalMonthly = monthlyRecords.reduce((s, r) => s + r.amount, 0)
    const daily = records.find((r) => r.service === 'daily')?.amount ?? totalMonthly / 30
    const weekly = records.find((r) => r.service === 'total' && r.periodEnd.getTime() - r.periodStart.getTime() < 8 * 86400000)?.amount ?? daily * 7
    const previousMonthEstimate = totalMonthly * 0.92
    const variancePct = previousMonthEstimate
      ? ((totalMonthly - previousMonthEstimate) / previousMonthEstimate) * 100
      : 0

    return {
      records,
      byProvider,
      totalMonthly,
      totalCost: totalMonthly,
      daily,
      weekly,
      currency: 'USD',
      period: 'Current month',
      forecastMonthly: totalMonthly * 1.08,
      varianceVsPreviousMonth: variancePct,
      isEstimated: true,
    }
  }
}
