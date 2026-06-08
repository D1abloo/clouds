import { Controller, Get, Post, Delete, Param, Body, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { GitlabAccountsService } from './gitlab-accounts.service'
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator'

@ApiTags('GitLab')
@ApiBearerAuth()
@Controller('gitlab')
export class GitlabController {
  constructor(private readonly accounts: GitlabAccountsService) {}

  @Get('accounts')
  @ApiOperation({ summary: 'Listar cuentas GitLab' })
  listAccounts() {
    return this.accounts.list()
  }

  @Post('accounts/validate-preview')
  @ApiOperation({ summary: 'Validar token GitLab antes de guardar' })
  validatePreview(
    @CurrentUser() user: JwtPayload,
    @Body() body: { token: string; baseUrl?: string; authType?: string },
  ) {
    return this.accounts.validatePreview(user.sub, body)
  }

  @Post('accounts/preview-projects')
  @ApiOperation({ summary: 'Listar proyectos remotos antes de guardar cuenta' })
  previewProjects(@Body() body: { token: string; baseUrl?: string; excludeArchived?: boolean }) {
    return this.accounts.previewProjects(body)
  }

  @Post('accounts')
  createAccount(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      label?: string
      connectionName?: string
      username?: string
      token?: string
      authType?: string
      baseUrl?: string
      syncFrequency?: string
    },
  ) {
    return this.accounts.create(user.sub, body)
  }

  @Get('accounts/:id')
  getAccount(@Param('id') id: string) {
    return this.accounts.getOne(id)
  }

  @Post('accounts/:id/validate')
  validateAccount(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.accounts.validate(user.sub, id)
  }

  @Post('accounts/:id/sync')
  syncAccount(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body?: { selectedProjectIds?: number[]; excludeArchived?: boolean },
  ) {
    return this.accounts.sync(user.sub, id, body)
  }

  @Delete('accounts/:id')
  deleteAccount(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.accounts.remove(user.sub, id)
  }

  @Get('projects')
  listProjects(@Query('accountId') accountId?: string) {
    return this.accounts.listProjects(accountId)
  }
}
