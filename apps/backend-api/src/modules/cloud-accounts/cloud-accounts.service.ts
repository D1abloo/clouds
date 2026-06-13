import { Injectable, NotFoundException, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../common/prisma/prisma.service'
import { OrganizationScopeService } from '../../common/organization/organization-scope.service'
import { RedisService } from '../../common/redis/redis.service'
import { AuditService } from '../audit/audit.service'
import { CreateCloudAccountDto } from './dto/create-cloud-account.dto'
import { LaunchInstanceDto } from './dto/launch-instance.dto'
import { CreateSubnetDto, LaunchPreflightDto } from './dto/launch-preflight.dto'
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
    private config: ConfigService,
    private orgScope: OrganizationScopeService,
    @Optional() private redis?: RedisService,
  ) {}

  async getDefaultProject(userId: string) {
    const project = await this.orgScope.getPrimaryProject(userId)
    if (!project) {
      throw new NotFoundException('No hay espacio de trabajo — contacta con soporte')
    }
    return { id: project.id, name: project.name, slug: project.slug }
  }

  private async assertAccountAccess(accountId: string, userId: string) {
    const account = await this.prisma.cloudAccount.findFirst({
      where: { id: accountId, deletedAt: null },
    })
    if (!account) throw new NotFoundException('Cloud account not found')
    await this.orgScope.assertProjectInScope(userId, account.projectId)
    return account
  }

  async create(dto: CreateCloudAccountDto, userId?: string) {
    if (userId) {
      await this.orgScope.assertProjectInScope(userId, dto.projectId)
    }
    const creds = dto.credentials ?? {}
    const secretPayload: Record<string, string> = {
      credentialType: creds.credentialType ?? 'access_key',
      demoMode: 'false',
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
              credentialType: creds.credentialType ?? 'access_key',
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

  async findAll(filters?: { projectId?: string; projectIds?: string[]; provider?: string }) {
    const projectScope =
      filters?.projectId != null
        ? { projectId: filters.projectId }
        : filters?.projectIds?.length
          ? { projectId: { in: filters.projectIds } }
          : { projectId: { in: [] as string[] } }

    const accounts = await this.prisma.cloudAccount.findMany({
      where: {
        deletedAt: null,
        ...projectScope,
        ...(filters?.provider ? { provider: filters.provider as never } : {}),
      },
      include: { credentials: { select: { id: true, credentialType: true, createdAt: true } }, regions: true },
      orderBy: { name: 'asc' },
    })
    return accounts.map((a) => this.sanitizeAccount(a))
  }

  async findOne(id: string, userId?: string) {
    if (userId) {
      await this.assertAccountAccess(id, userId)
    }
    const account = await this.prisma.cloudAccount.findFirst({
      where: { id, deletedAt: null },
      include: { regions: true, credentials: { select: { credentialType: true } } },
    })
    if (!account) throw new NotFoundException('Cloud account not found')
    return this.sanitizeAccount(account as unknown as Record<string, unknown>)
  }

  async getProvider(id: string, userId?: string) {
    const account = userId
      ? await this.assertAccountAccess(id, userId)
      : await this.prisma.cloudAccount.findUnique({ where: { id } })
    if (!account) throw new NotFoundException('Cloud account not found')
    return account.provider
  }

  async validateConnection(id: string, userId?: string) {
    if (userId) await this.assertAccountAccess(id, userId)
    const result = await this.registry.validateConnection(id)
    await this.audit.create({
      userId,
      action: result.valid ? 'cloud_account.validate' : 'cloud_account.validate_failed',
      resource: 'cloud_account',
      resourceId: id,
      metadata: { valid: result.valid, message: result.message },
    })
    return result
  }

  async validatePreview(dto: CreateCloudAccountDto, userId?: string) {
    if (userId) {
      await this.orgScope.assertProjectInScope(userId, dto.projectId)
    }
    const creds = dto.credentials ?? {}
    const credentials: Record<string, string> = {
      credentialType: creds.credentialType ?? 'access_key',
      demoMode: 'false',
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

    const ctx = {
      accountId: 'preview',
      projectId: dto.projectId,
      provider: dto.provider,
      name: dto.name,
      accountExternalId: dto.accountId,
      defaultRegion: dto.defaultRegion,
      config: (dto.config ?? {}) as Record<string, unknown>,
      credentials,
    }

    const result = await this.registry.validatePreview(ctx)
    await this.audit.create({
      userId,
      action: result.valid ? 'cloud_account.validate_preview' : 'cloud_account.validate_failed',
      resource: 'cloud_account',
      resourceId: dto.projectId,
      metadata: { provider: dto.provider, valid: result.valid, message: result.message },
    })
    return result
  }

  async listRegions(id: string, userId?: string) {
    if (userId) await this.assertAccountAccess(id, userId)
    return this.withCatalogCache(id, 'regions', 'global', () => this.registry.listRegions(id))
  }

  async listNetworks(id: string, region?: string, userId?: string) {
    if (userId) await this.assertAccountAccess(id, userId)
    const resolved = await this.resolveCatalogRegion(id, region)
    return this.withCatalogCache(id, 'networks', resolved, () => this.registry.listNetworks(id, resolved))
  }

  async listSecurityGroups(id: string, region?: string, userId?: string) {
    if (userId) await this.assertAccountAccess(id, userId)
    const resolved = await this.resolveCatalogRegion(id, region)
    return this.withCatalogCache(id, 'security-groups', resolved, () => this.registry.listSecurityGroups(id, resolved))
  }

  async listImages(id: string, region: string, userId?: string) {
    if (userId) await this.assertAccountAccess(id, userId)
    const resolved = await this.resolveCatalogRegion(id, region)
    return this.withCatalogCache(id, 'images', resolved, () => this.registry.listImages(id, resolved))
  }

  async listInstanceTypes(id: string, region: string, userId?: string) {
    if (userId) await this.assertAccountAccess(id, userId)
    const resolved = await this.resolveCatalogRegion(id, region)
    return this.withCatalogCache(id, 'instance-types', resolved, () => this.registry.listInstanceTypes(id, resolved))
  }

  async listKeyPairs(id: string, region: string, userId?: string) {
    if (userId) await this.assertAccountAccess(id, userId)
    const resolved = await this.resolveCatalogRegion(id, region)
    return this.withCatalogCache(id, 'key-pairs', resolved, () => this.registry.listKeyPairs(id, resolved))
  }

  async syncInventory(id: string, userId?: string) {
    if (userId) await this.assertAccountAccess(id, userId)
    return this.sync.fullSync(id, userId)
  }

  async launchInstance(id: string, dto: LaunchInstanceDto, userId?: string) {
    if (userId) await this.assertAccountAccess(id, userId)
    const result = await this.sync.launchInstance(id, dto, userId)
    await this.invalidateCatalogCache(id, dto.region)
    return result
  }

  async validateLaunchPreflight(id: string, dto: LaunchPreflightDto, userId?: string) {
    if (userId) await this.assertAccountAccess(id, userId)
    return this.registry.validateLaunchPreflight(id, dto)
  }

  async createSubnet(id: string, dto: CreateSubnetDto, userId?: string) {
    if (userId) await this.assertAccountAccess(id, userId)
    const result = await this.registry.createSubnet(id, dto)
    await this.invalidateCatalogCache(id, dto.region)
    return result
  }

  async listAvailabilityZones(id: string, region: string, userId?: string) {
    if (userId) await this.assertAccountAccess(id, userId)
    const resolved = await this.resolveCatalogRegion(id, region)
    return this.withCatalogCache(id, 'availability-zones', resolved, () => this.registry.listAvailabilityZones(id, resolved))
  }

  async remove(id: string, userId?: string) {
    const account = userId
      ? await this.assertAccountAccess(id, userId)
      : await this.prisma.cloudAccount.findFirst({ where: { id, deletedAt: null } })
    if (!account) throw new NotFoundException('Cloud account not found')

    const now = new Date()

    await this.prisma.$transaction([
      this.prisma.instance.updateMany({
        where: { cloudAccountId: id, deletedAt: null },
        data: { deletedAt: now, status: 'TERMINATED' },
      }),
      this.prisma.cloudCredential.deleteMany({ where: { cloudAccountId: id } }),
      this.prisma.cloudRegion.deleteMany({ where: { cloudAccountId: id } }),
      this.prisma.cloudAccount.update({
        where: { id },
        data: { deletedAt: now, isActive: false, syncStatus: 'removed' },
      }),
    ])

    await this.audit.create({
      userId,
      action: 'cloud_account.delete',
      resource: 'cloud_account',
      resourceId: id,
      metadata: { name: account.name, provider: account.provider },
    })

    return { deleted: true, message: `Cuenta «${account.name}» eliminada correctamente` }
  }

  async listAccountInstances(accountId: string, region?: string, userId?: string) {
    const account = userId
      ? await this.assertAccountAccess(accountId, userId)
      : await this.prisma.cloudAccount.findFirst({
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

  private catalogCacheTtlSeconds(): number {
    const raw = this.config.get<string>('CLOUD_CATALOG_CACHE_TTL_SECONDS')
    const parsed = Number(raw)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 600
  }

  private async resolveCatalogRegion(id: string, region?: string) {
    if (region?.trim()) return region.trim()
    const account = await this.prisma.cloudAccount.findUnique({ where: { id }, select: { defaultRegion: true } })
    return account?.defaultRegion || 'us-east-1'
  }

  private async catalogCachePrefix(id: string) {
    const account = await this.prisma.cloudAccount.findUnique({ where: { id }, select: { provider: true } })
    return `cloudCatalog:${account?.provider ?? 'unknown'}:${id}:`
  }

  private async catalogCacheKey(id: string, type: string, region: string) {
    const prefix = await this.catalogCachePrefix(id)
    return `${prefix}${region}:${type}`
  }

  private async withCatalogCache<T>(id: string, type: string, region: string, load: () => Promise<T>): Promise<T> {
    if (!this.redis) return load()
    const key = await this.catalogCacheKey(id, type, region)
    try {
      const hit = await this.redis.get(key)
      if (hit) {
        const parsed = JSON.parse(hit) as { data?: T }
        if ('data' in parsed) return parsed.data as T
      }
    } catch {
      // Redis cache is an optimization; provider calls remain the source of truth.
    }

    const data = await load()
    try {
      await this.redis.set(
        key,
        JSON.stringify({
          data,
          cachedAt: new Date().toISOString(),
          type,
          region,
        }),
        this.catalogCacheTtlSeconds(),
      )
    } catch {
      // Do not fail cloud catalog reads if Redis is unavailable.
    }
    return data
  }

  private async invalidateCatalogCache(id: string, _region?: string): Promise<void> {
    if (!this.redis) return
    try {
      await this.redis.delByPrefix(await this.catalogCachePrefix(id))
    } catch {
      // Cache invalidation must never block launch or resource creation.
    }
  }
}
