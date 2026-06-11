import { Controller, Get, Post, Delete, Param, Body, Query, Res } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { ConfigService } from '@nestjs/config'
import type { Response } from 'express'
import { Public } from '../../common/decorators/auth.decorators'
import { GitlabAccountsService } from './gitlab-accounts.service'
import { GitlabOAuthService } from './gitlab-oauth.service'
import { GitlabResourcesService } from './gitlab-resources.service'
import { GitlabDeploymentsService } from './gitlab-deployments.service'
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator'

@ApiTags('GitLab')
@ApiBearerAuth()
@Controller('gitlab')
export class GitlabController {
  constructor(
    private readonly config: ConfigService,
    private readonly oauth: GitlabOAuthService,
    private readonly accounts: GitlabAccountsService,
    private readonly resources: GitlabResourcesService,
    private readonly deployments: GitlabDeploymentsService,
  ) {}

  @Get('oauth/start')
  @ApiOperation({ summary: 'Iniciar OAuth GitLab para integración de repositorios' })
  oauthStart(@CurrentUser() user: JwtPayload, @Query('returnUrl') returnUrl?: string) {
    return this.oauth.start(user.sub, returnUrl)
  }

  @Public()
  @Get('oauth/callback')
  @ApiOperation({ summary: 'Callback OAuth GitLab — intercambio code → token de repositorio' })
  async oauthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') oauthError: string,
    @Res() res: Response,
  ) {
    const appUrl = (this.config.get<string>('APP_URL') ?? this.config.get<string>('AUTH_URL', 'http://localhost:4200')).replace(
      /\/$/,
      '',
    )
    const fallback = `${appUrl}/admin/configuracion/integraciones/gitlab/conectar`

    if (oauthError) {
      const message =
        oauthError === 'access_denied'
          ? 'Autorización OAuth cancelada.'
          : 'No se pudo completar la autorización con GitLab.'
      return res.redirect(`${fallback}?oauth_error=${encodeURIComponent(message)}`)
    }

    try {
      const { redirectUrl } = await this.oauth.handleCallback(code, state)
      return res.redirect(redirectUrl)
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'No se pudo completar la autorización con GitLab.'
      return res.redirect(`${fallback}?oauth_error=${encodeURIComponent(message)}`)
    }
  }

  @Get('accounts')
  @ApiOperation({ summary: 'Listar cuentas GitLab' })
  listAccounts(@CurrentUser() user: JwtPayload) {
    return this.accounts.list(user.sub)
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
  previewProjects(
    @Body() body: { token: string; baseUrl?: string; excludeArchived?: boolean; authType?: string },
  ) {
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

  @Get('branches')
  @ApiOperation({ summary: 'Listar ramas GitLab de proyectos conectados' })
  listBranches(@CurrentUser() user: JwtPayload) {
    return this.resources.listBranches(user.sub)
  }

  @Get('commits')
  @ApiOperation({ summary: 'Listar commits GitLab de proyectos conectados' })
  listCommits(@CurrentUser() user: JwtPayload) {
    return this.resources.listCommits(user.sub)
  }

  @Get('merge-requests')
  @ApiOperation({ summary: 'Listar Merge Requests GitLab' })
  listMergeRequests(@CurrentUser() user: JwtPayload) {
    return this.resources.listMergeRequests(user.sub)
  }

  @Get('webhooks')
  @ApiOperation({ summary: 'Listar webhooks GitLab de proyectos conectados' })
  listWebhooks(@CurrentUser() user: JwtPayload) {
    return this.resources.listWebhooks(user.sub)
  }

  @Get('deployments')
  @ApiOperation({ summary: 'Listar despliegues/pipelines GitLab' })
  listDeployments(@CurrentUser() user: JwtPayload) {
    return this.resources.listDeployments(user.sub)
  }

  @Post('projects/:id/deploy')
  @ApiOperation({ summary: 'Disparar pipeline / despliegue GitLab' })
  deployProject(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body()
    body: {
      branch: string
      environment: string
      strategy?: string
      targetName?: string
      targetType?: string
      notes?: string
    },
  ) {
    return this.deployments.deploy(user.sub, id, body)
  }

  @Get('deployments/:id/logs')
  deploymentLogs(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.deployments.getLogs(id, user.sub)
  }
}
