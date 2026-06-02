import { Controller, Get, Post, Param, Body } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { CloudProvider } from '@prisma/client'
import { TerraformService } from './terraform.service'
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator'

@ApiTags('Terraform')
@ApiBearerAuth()
@Controller('terraform')
export class TerraformController {
  constructor(private service: TerraformService) {}

  @Post('runs')
  @ApiOperation({ summary: 'Create Terraform run from instance form' })
  createRun(
    @Body() body: { provider: CloudProvider; workspaceName: string; config: Record<string, unknown> },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createRun(body, user.sub)
  }

  @Post('runs/:id/plan')
  plan(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.plan(id, user.sub)
  }

  @Post('runs/:id/apply')
  apply(@Param('id') id: string, @Body() body: { confirmed: boolean }, @CurrentUser() user: JwtPayload) {
    return this.service.apply(id, user.sub, body.confirmed)
  }

  @Post('runs/:id/destroy')
  destroy(
    @Param('id') id: string,
    @Body() body: { confirmed: boolean; reinforced: boolean },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.destroy(id, user.sub, body.confirmed, body.reinforced)
  }

  @Get('runs/:id/logs')
  logs(@Param('id') id: string) {
    return this.service.getLogs(id)
  }

  @Post('templates')
  saveTemplate(@Body() body: { name: string; provider: CloudProvider; config: Record<string, unknown> }) {
    return this.service.saveTemplate(body.name, body.provider, body.config)
  }

  @Get('templates')
  listTemplates() {
    return this.service.listTemplates()
  }
}
