import { Controller, Get, Post, Delete, Param, Body, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { GithubAccountsService } from './github-accounts.service'
import { GithubRepositoriesService } from './github-repositories.service'
import { GithubBranchesService } from './github-branches.service'
import { GithubCommitsService } from './github-commits.service'
import { GithubPullRequestsService } from './github-pull-requests.service'
import { GithubWebhooksService } from './github-webhooks.service'
import { GithubDeploymentsService } from './github-deployments.service'
import { GithubDemoService } from './github-demo.service'
import { ConfigService } from '@nestjs/config'
import { assertDemoModeEnabled } from '../../common/utils/demo-runtime.util'
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator'

@ApiTags('GitHub')
@ApiBearerAuth()
@Controller('github')
export class GithubController {
  constructor(
    private readonly accounts: GithubAccountsService,
    private readonly repositories: GithubRepositoriesService,
    private readonly branches: GithubBranchesService,
    private readonly commits: GithubCommitsService,
    private readonly pullRequests: GithubPullRequestsService,
    private readonly webhooks: GithubWebhooksService,
    private readonly deployments: GithubDeploymentsService,
    private readonly demo: GithubDemoService,
    private readonly config: ConfigService,
  ) {}

  @Get('demo/repos')
  @ApiOperation({ summary: 'Repositorios ficticios del modo demo' })
  demoRepos() {
    assertDemoModeEnabled(this.config)
    return {
      demoMode: true,
      count: this.demo.listMemoryRepos().length,
      items: this.demo.listMemoryRepos(),
    }
  }

  @Post('demo/connect')
  @ApiOperation({ summary: 'Conectar cuenta GitHub demo (sin credenciales reales)' })
  connectDemo(@CurrentUser() user: JwtPayload) {
    assertDemoModeEnabled(this.config)
    return this.accounts.connectDemo(user.sub)
  }

  // ── Accounts (new API) ─────────────────────────────────────
  @Get('accounts')
  @ApiOperation({ summary: 'Listar cuentas GitHub' })
  listAccounts() {
    return this.accounts.list()
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
      useDemoData?: boolean
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

  // ── Legacy connection aliases ──────────────────────────────
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
      await this.accounts.legacyConnect(user.sub, {})
      const accountId = (await this.accounts.getLegacyConnection(user.sub)).accountId!
      const sync = await this.accounts.sync(user.sub, accountId)
      const repos = await this.repositories.list()
      return { synced: sync.synced, repos: repos.items, lastSyncAt: sync.lastSyncAt }
    }
    const sync = await this.accounts.sync(user.sub, conn.accountId)
    const repos = await this.repositories.list()
    return { synced: sync.synced, repos: repos.items, lastSyncAt: sync.lastSyncAt }
  }

  // ── Repositories ───────────────────────────────────────────
  @Get('repositories')
  listRepositories(@Query('accountId') accountId?: string) {
    return this.repositories.list(accountId)
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
    },
  ) {
    return this.deployments.deploy(user.sub, id, body)
  }

  // ── Webhooks ───────────────────────────────────────────────
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

  // ── Deployments ────────────────────────────────────────────
  @Get('deployments')
  listDeployments() {
    return this.deployments.listAll()
  }

  @Get('deployments/:id/logs')
  deploymentLogs(@Param('id') id: string) {
    return this.deployments.getLogs(id)
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
