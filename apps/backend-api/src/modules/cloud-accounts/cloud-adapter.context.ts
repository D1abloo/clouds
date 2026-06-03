import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { SecretsVaultService } from './secrets-vault.service'
import { CloudAdapterContext } from './adapters/cloud-provider.adapter'

@Injectable()
export class CloudAdapterContextLoader {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vault: SecretsVaultService,
  ) {}

  async load(accountId: string): Promise<CloudAdapterContext> {
    const account = await this.prisma.cloudAccount.findFirst({
      where: { id: accountId, deletedAt: null },
      include: { credentials: true },
    })
    if (!account) throw new NotFoundException('Cloud account not found')

    const credentials: Record<string, string> = {}
    for (const cred of account.credentials) {
      Object.assign(credentials, this.vault.readSecrets(cred.secretRef))
      credentials['credentialType'] = cred.credentialType
    }

    return {
      accountId: account.id,
      projectId: account.projectId,
      provider: account.provider,
      name: account.name,
      accountExternalId: account.accountId ?? undefined,
      defaultRegion: account.defaultRegion ?? undefined,
      config: (account.config as Record<string, unknown>) ?? {},
      credentials,
    }
  }
}
