import { BadRequestException, Controller, Get, Post, Delete, Param, Body, Query, Res } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { ConfigService } from '@nestjs/config'
import type { Response } from 'express'
import { Public } from '../../common/decorators/auth.decorators'
import { GithubAccountsService } from './github-accounts.service'
import { GithubOAuthService } from './github-oauth.service'
import { GithubRepositoriesService } from './github-repositories.service'
import { GithubBranchesService } from './github-branches.service'
import { GithubCommitsService } from './github-commits.service'
import { GithubPullRequestsService } from './github-pull-requests.service'
import { GithubWebhooksService } from './github-webhooks.service'
import { GithubDeploymentsService } from './github-deployments.service'
import { GithubWorkflowsService } from './github-workflows.service'
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator'

@ApiTags('GitHub')
@ApiBearerAuth()
@Controller('github')
export class GithubController {
  constructor(
    private readonly config: ConfigService,
    private readonly oauth: GithubOAuthService,
    private readonly accounts: GithubAccountsService,
    private readonly repositories: GithubRepositoriesService,
    private readonly branches: GithubBranchesService,
    private readonly commits: GithubCommitsService,
    private readonly pullRequests: GithubPullRequestsService,
    private readonly webhooks: GithubWebhooksService,
    private readonly deployments: GithubDeploymentsService,
    private readonly workflows: GithubWorkflowsService,
  ) {}

  @Get('oauth/start')
  @ApiOperation({ summary: 'Iniciar OAuth GitHub para integración de repositorios' })
  oauthStart(@CurrentUser() user: JwtPayload, @Query('returnUrl') returnUrl?: string) {
    return this.oauth.start(user.sub, returnUrl)
  }

  @Public()
  @Get('oauth/callback')
  @ApiOperation({ summary: 'Callback OAuth GitHub — intercambio code → token de repositorio' })
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
    const fallback = `${appUrl}/admin/configuracion/integraciones/github/conectar`

    if (oauthError) {
      const message =
        oauthError === 'access_denied'
          ? 'Autorización OAuth cancelada.'
          : 'No se pudo completar la autorización con GitHub.'
      return res.redirect(`${fallback}?oauth_error=${encodeURIComponent(message)}`)
    }

    try {
      const { redirectUrl } = await this.oauth.handleCallback(code, state)
      return res.redirect(redirectUrl)
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'No se pudo completar la autorización con GitHub.'
      return res.redirect(`${fallback}?oauth_error=${encodeURIComponent(message)}`)
    }
  }

  @Get('accounts')
  @ApiOperation({ summary: 'Listar cuentas GitHub' })
  listAccounts(@CurrentUser() user: JwtPayload) {
    return this.accounts.list(user.sub)
  }

  @Post('accounts/validate-preview')
  @ApiOperation({ summary: 'Validar token GitHub antes de guardar' })
  validatePreview(
    @CurrentUser() user: JwtPayload,
    @Body() body: { token: string; baseUrl?: string; authType?: string },
  ) {
    return this.accounts.validatePreview(user.sub, body)
  }

  @Post('accounts/preview-repos')
  @ApiOperation({ summary: 'Listar repos remotos antes de guardar cuenta' })
  previewRepos(@Body() body: { token: string; baseUrl?: string; excludeArchived?: boolean }) {
    return this.accounts.previewRepos(body)
  }

  @Post('accounts')
  createAccount(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      label?: string
      username?: string
      token?: string
      organization?: string
      accountType?: string
      authMethod?: string
      scopes?: string[]
      environment?: string
      autoSync?: boolean
      syncInterval?: string
      repoScope?: string
      webhookUrl?: string
      webhookSecret?: string
      webhookEvents?: string[]
      description?: string
      contactEmail?: string
    },
  ) {
    return this.accounts.create(user.sub, body)
  }

  @Get('accounts/:id')
  @ApiOperation({ summary: 'Detalle de cuenta GitHub' })
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
    @Body()
    body?: {
      scopes?: string[]
      repoScope?: string
      organization?: string
      accountType?: string
      selectedRepoIds?: number[]
      excludeArchived?: boolean
    },
  ) {
    return this.accounts.sync(user.sub, id, body)
  }

  @Delete('accounts/:id')
  deleteAccount(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.accounts.remove(user.sub, id)
  }

  @Get('connection')
  connection(@CurrentUser() user: JwtPayload) {
    return this.accounts.getLegacyConnection(user.sub)
  }

  @Post('connect')
  connect(@CurrentUser() user: JwtPayload, @Body() body: { token?: string; username?: string }) {
    return this.accounts.legacyConnect(user.sub, body)
  }

  @Post('disconnect')
  disconnect(@CurrentUser() user: JwtPayload) {
    return this.accounts.legacyDisconnect(user.sub)
  }

  @Post('sync')
  async legacySync(@CurrentUser() user: JwtPayload) {
    const conn = await this.accounts.getLegacyConnection(user.sub)
    if (!conn.accountId) {
      throw new BadRequestException('No hay cuenta GitHub conectada')
    }
    const sync = await this.accounts.sync(user.sub, conn.accountId)
    const repos = await this.repositories.list(undefined, user.sub)
    return { synced: sync.synced, repos: repos.items, lastSyncAt: sync.lastSyncAt }
  }

  @Get('branches')
  @ApiOperation({ summary: 'Listar todas las ramas GitHub sincronizadas' })
  listAllBranches(@CurrentUser() user: JwtPayload) {
    return this.branches.listAll(user.sub)
  }

  @Get('commits')
  @ApiOperation({ summary: 'Listar todos los commits GitHub sincronizados' })
  listAllCommits(@CurrentUser() user: JwtPayload) {
    return this.commits.listAll(user.sub)
  }

  @Get('pull-requests')
  @ApiOperation({ summary: 'Listar todos los Pull Requests GitHub sincronizados' })
  listAllPullRequests(@CurrentUser() user: JwtPayload) {
    return this.pullRequests.listAll(user.sub)
  }

  @Get('repositories')
  listRepositories(@CurrentUser() user: JwtPayload, @Query('accountId') accountId?: string) {
    return this.repositories.list(accountId, user.sub)
  }

  @Get('repositories/:id')
  getRepository(@Param('id') id: string) {
    return this.repositories.getOne(id)
  }

  @Post('repositories/:id/sync')
  syncRepository(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.repositories.syncOne(user.sub, id)
  }

  @Get('repositories/:id/branches')
  listBranches(@Param('id') id: string) {
    return this.branches.listByRepo(id)
  }

  @Get('repositories/:id/commits')
  listCommits(@Param('id') id: string, @Query('branch') branch?: string) {
    return this.commits.listByRepo(id, branch)
  }

  @Get('repositories/:id/pull-requests')
  listPullRequests(@Param('id') id: string) {
    return this.pullRequests.listByRepo(id)
  }

  @Get('repositories/:id/webhooks')
  listRepoWebhooks(@Param('id') id: string) {
    return this.webhooks.listByRepo(id)
  }

  @Post('repositories/:id/deploy')
  deployRepository(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body()
    body: {
      branch: string
      targetType: 'instance' | 'vps' | 'docker' | 'kubernetes'
      targetId: string
      targetName?: string
      environment?: string
      strategy?: string
      notes?: string
    },
  ) {
    return this.deployments.deploy(user.sub, id, body)
  }

  @Get('webhooks')
  listWebhooks() {
    return this.webhooks.listAll()
  }

  @Post('webhooks')
  createWebhook(
    @CurrentUser() user: JwtPayload,
    @Body() body: { repoId?: string; accountId?: string; event: string; url: string; secret?: string },
  ) {
    return this.webhooks.create(user.sub, body)
  }

  @Delete('webhooks/:id')
  deleteWebhook(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.webhooks.remove(user.sub, id)
  }

  @Get('deploy-targets')
  @ApiOperation({ summary: 'Destinos de despliegue del workspace (instancias y VPS)' })
  deployTargets(@CurrentUser() user: JwtPayload) {
    return this.deployments.listDeployTargets(user.sub)
  }

  @Get('workflow-runs')
  @ApiOperation({ summary: 'GitHub Actions — ejecuciones recientes en vivo' })
  workflowRuns(@CurrentUser() user: JwtPayload) {
    return this.workflows.listForUser(user.sub)
  }

  @Get('deployments')
  listDeployments(@CurrentUser() user: JwtPayload) {
    return this.deployments.listAll(user.sub)
  }

  @Get('deployments/:id/logs')
  deploymentLogs(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.deployments.getLogs(id, user.sub)
  }

  @Post('deploy')
  legacyDeploy(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      repoId: string
      branch: string
      targetType: 'instance' | 'vps' | 'docker' | 'kubernetes'
      targetId: string
      targetName?: string
    },
  ) {
    return this.deployments.deploy(user.sub, body.repoId, body)
  }
}
