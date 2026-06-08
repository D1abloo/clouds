import { Global, Module } from '@nestjs/common'
import { OrganizationScopeService } from './organization-scope.service'

@Global()
@Module({
  providers: [OrganizationScopeService],
  exports: [OrganizationScopeService],
})
export class OrganizationScopeModule {}
