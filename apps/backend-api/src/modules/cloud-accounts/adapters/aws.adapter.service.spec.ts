import { Test, TestingModule } from '@nestjs/testing'
import { AwsAdapterService } from './aws.adapter.service'

describe('AwsAdapterService', () => {
  let service: AwsAdapterService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AwsAdapterService],
    }).compile()
    service = module.get(AwsAdapterService)
  })

  it('should validate mock credentials', async () => {
    const result = await service.validateCredentials()
    expect(result.valid).toBe(true)
  })

  it('should list mock instances', async () => {
    const instances = await service.listInstances()
    expect(instances.length).toBeGreaterThan(0)
  })
})
