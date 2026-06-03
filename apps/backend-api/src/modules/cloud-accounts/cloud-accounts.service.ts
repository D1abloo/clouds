import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { CreateCloudAccountDto } from './dto/create-cloud-account.dto'
import { LaunchInstanceDto } from './dto/launch-instance.dto'
import { CloudAdapterRegistry } from './cloud-adapter.registry'
import { CloudSyncService } from './cloud-sync.service'
import { SecretsVaultService } from './secrets-vault.service'

@Injectable()
export class CloudAccountsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private registry: CloudAdapterRegistry,
    private sync: CloudSyncService,
    private vault: SecretsVaultService,
  ) {}

  async getDefaultProject() {
    const project = await this.prisma.project.findFirst({ where: { slug: 'default', deletedAt: null } })
    if (!project) throw new NotFoundException('Default project not found — run database seed')
    return { id: project.id, name: project.name, slug: project.slug }
  }

  async create(dto: CreateCloudAccountDto, userId?: string) {
    const creds = dto.credentials ?? {}
    const secretPayload: Record<string, string> = {
      credentialType: creds.credentialType ?? 'demo',
      demoMode: creds.demoMode ?? 'true',
      roleArn: creds.roleArn ?? '',
      externalId: creds.externalId ?? '',
      accessKeyId: creds.accessKeyId ?? '',
      secretAccessKey: creds.secretAccessKey ?? '',
      oidcProvider: creds.oidcProvider ?? '',
      serviceAccountJson: creds.serviceAccountJson ?? '',
      tenantId: creds.tenantId ?? '',
      clientId: creds.clientId ?? '',
      clientSecret: creds.clientSecret ?? '',
      managedIdentity: creds.managedIdentity ?? '',
    }

    const account = await this.prisma.cloudAccount.create({
      data: {
        projectId: dto.projectId,
        name: dto.name,
        provider: dto.provider,
        accountId: dto.accountId,
        defaultRegion: dto.defaultRegion,
        config: (dto.config ?? {}) as object,
        credentials: {
          create: [
            {
              credentialType: creds.credentialType ?? 'demo',
              secretRef: this.vault.storeSecrets(secretPayload),
            },
          ],
        },
      },
      include: { credentials: true },
    })

    await this.audit.create({
      userId,
      action: 'cloud_account.create',
      resource: 'cloud_account',
      resourceId: account.id,
    })

    return this.sanitizeAccount(account)
  }

  async findAll(projectId?: string, provider?: string) {
    const accounts = await this.prisma.cloudAccount.findMany({
      where: {
        deletedAt: null,
        ...(projectId ? { projectId } : {}),
        ...(provider ? { provider: provider as never } : {}),
      },
      include: { credentials: { select: { id: true, credentialType: true, createdAt: true } }, regions: true },
      orderBy: { name: 'asc' },
    })
    return accounts.map((a) => this.sanitizeAccount(a))
  }

  async findOne(id: string) {
    const account = await this.prisma.cloudAccount.findFirst({
      where: { id, deletedAt: null },
      include: { regions: true, credentials: { select: { credentialType: true } } },
    })
    if (!account) throw new NotFoundException('Cloud account not found')
    return this.sanitizeAccount(account as unknown as Record<string, unknown>)
  }

  async getProvider(id: string) {
    const account = await this.prisma.cloudAccount.findUnique({ where: { id } })
    if (!account) throw new NotFoundException('Cloud account not found')
    return account.provider
  }

  async validateConnection(id: string, userId?: string) {
    const result = await this.registry.validateConnection(id)
    await this.audit.create({
      userId,
      action: 'cloud_account.validate',
      resource: 'cloud_account',
      resourceId: id,
      metadata: { valid: result.valid },
    })
    return result
  }

  async listRegions(id: string) {
    return this.registry.listRegions(id)
  }

  async listNetworks(id: string, region?: string) {
    return this.registry.listNetworks(id, region)
  }

  async listSecurityGroups(id: string, region?: string) {
    return this.registry.listSecurityGroups(id, region)
  }

  async listImages(id: string, region: string) {
    const account = await this.prisma.cloudAccount.findUnique({ where: { id } })
    const resolved = region || account?.defaultRegion || 'us-east-1'
    return this.registry.listImages(id, resolved)
  }

  async listInstanceTypes(id: string, region: string) {
    const account = await this.prisma.cloudAccount.findUnique({ where: { id } })
    const resolved = region || account?.defaultRegion || 'us-east-1'
    return this.registry.listInstanceTypes(id, resolved)
  }

  async syncInventory(id: string, userId?: string) {
    return this.sync.fullSync(id, userId)
  }

  async launchInstance(id: string, dto: LaunchInstanceDto, userId?: string) {
    return this.sync.launchInstance(id, dto, userId)
  }

  async listAccountInstances(accountId: string, region?: string) {
    const account = await this.prisma.cloudAccount.findFirst({
      where: { id: accountId, deletedAt: null },
    })
    if (!account) throw new NotFoundException('Cloud account not found')

    return this.prisma.instance.findMany({
      where: {
        cloudAccountId: accountId,
        deletedAt: null,
        ...(region ? { region } : {}),
      },
      orderBy: [{ region: 'asc' }, { name: 'asc' }],
    })
  }

  private sanitizeAccount(account: Record<string, unknown>) {
    const creds = account['credentials'] as { credentialType?: string }[] | undefined
    const { credentials: _c, ...rest } = account
    return {
      ...rest,
      hasCredentials: !!(creds?.length),
      credentialType: creds?.[0]?.credentialType,
      status: (account['syncStatus'] as string) ?? 'idle',
    }
  }
}
