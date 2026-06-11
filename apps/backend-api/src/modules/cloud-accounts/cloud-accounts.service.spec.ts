import { ConfigService } from '@nestjs/config'
import { CloudProvider } from '@prisma/client'
import { CloudAccountsService } from './cloud-accounts.service'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { CloudAdapterRegistry } from './cloud-adapter.registry'
import { CloudSyncService } from './cloud-sync.service'
import { SecretsVaultService } from './secrets-vault.service'

describe('CloudAccountsService.validatePreview', () => {
  const registry = {
    validatePreview: jest.fn().mockResolvedValue({ valid: true, message: 'OK', permissions: [] }),
  }
  const audit = { create: jest.fn().mockResolvedValue(undefined) }
  const config = { get: jest.fn().mockReturnValue('false') } as unknown as ConfigService

  const service = new CloudAccountsService(
    {} as PrismaService,
    audit as unknown as AuditService,
    registry as unknown as CloudAdapterRegistry,
    {} as CloudSyncService,
    {} as SecretsVaultService,
    config,
    {} as import('../../common/organization/organization-scope.service').OrganizationScopeService,
  )

  beforeEach(() => jest.clearAllMocks())

  it('audita validación fallida con action cloud_account.validate_failed', async () => {
    registry.validatePreview.mockResolvedValueOnce({ valid: false, message: 'Credenciales inválidas' })
    const dto = {
      projectId: '00000000-0000-0000-0000-000000000001',
      name: 'Test',
      provider: CloudProvider.AWS,
      credentials: { credentialType: 'access_key', accessKeyId: 'X', secretAccessKey: 'Y' },
    }
    const result = await service.validatePreview(dto, 'user-1')
    expect(result.valid).toBe(false)
    expect(audit.create).toHaveBeenCalled()
    const call = audit.create.mock.calls[0][0] as { action: string }
    expect(call.action).toBe('cloud_account.validate_failed')
  })

  it('audita validación correcta', async () => {
    const dto = {
      projectId: '00000000-0000-0000-0000-000000000001',
      name: 'Test',
      provider: CloudProvider.AWS,
      credentials: { credentialType: 'iam_role', roleArn: 'arn:aws:iam::123:role/R' },
    }
    await service.validatePreview(dto, 'user-1')
    const call = audit.create.mock.calls[0][0] as { action: string }
    expect(call.action).toBe('cloud_account.validate_preview')
  })
})
