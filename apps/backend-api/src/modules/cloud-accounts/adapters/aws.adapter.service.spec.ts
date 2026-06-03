import { Test, TestingModule } from '@nestjs/testing'
import { CloudProvider } from '@prisma/client'
import { AwsAdapterService } from './aws.adapter.service'
import { CloudAdapterContext } from './cloud-provider.adapter'

const mockCtx: CloudAdapterContext = {
  accountId: 'test-account',
  projectId: 'project-1',
  provider: CloudProvider.AWS,
  name: 'Test AWS',
  defaultRegion: 'us-east-1',
  config: {},
  credentials: { accessKeyId: 'AKIA_TEST', secretAccessKey: 'secret', demoMode: 'true' },
}

describe('AwsAdapterService', () => {
  let service: AwsAdapterService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AwsAdapterService],
    }).compile()
    service = module.get(AwsAdapterService)
  })

  it('should validate credentials', async () => {
    const result = await service.validateConnection(mockCtx)
    expect(result.valid).toBe(true)
  })

  it('should list instances for account', async () => {
    const instances = await service.listInstances(mockCtx)
    expect(instances.length).toBeGreaterThan(0)
  })
})
