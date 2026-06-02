import { Controller, Get, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { AuditService } from './audit.service'
import { RequirePermissions } from '../../common/decorators/auth.decorators'

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @RequirePermissions('audit:read')
  @ApiOperation({ summary: 'List audit logs' })
  findAll(@Query('page') page = 1, @Query('pageSize') pageSize = 20) {
    return this.auditService.findAll(+page, +pageSize)
  }
}
