import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { GithubService } from './github.service'
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator'

@ApiTags('GitHub')
@ApiBearerAuth()
@Controller('github')
export class GithubController {
  constructor(private readonly service: GithubService) {}

  @Get('connection')
  @ApiOperation({ summary: 'Estado de conexión GitHub' })
  connection(@CurrentUser() user: JwtPayload) {
    return this.service.getConnection(user.sub)
  }

  @Post('connect')
  connect(@CurrentUser() user: JwtPayload, @Body() body: { token?: string; username?: string }) {
    return this.service.connect(user.sub, body)
  }

  @Post('disconnect')
  disconnect(@CurrentUser() user: JwtPayload) {
    return this.service.disconnect(user.sub)
  }

  @Post('sync')
  sync(@CurrentUser() user: JwtPayload) {
    return this.service.syncRepositories(user.sub)
  }

  @Get('repositories')
  repositories(@CurrentUser() user: JwtPayload) {
    return this.service.listRepositories(user.sub)
  }

  @Get('repositories/:repoId')
  repository(@CurrentUser() user: JwtPayload, @Param('repoId') repoId: string) {
    return this.service.getRepository(user.sub, repoId)
  }

  @Get('repositories/:repoId/branches')
  branches(@CurrentUser() user: JwtPayload, @Param('repoId') repoId: string) {
    return this.service.listBranches(user.sub, repoId)
  }

  @Get('repositories/:repoId/commits')
  commits(
    @CurrentUser() user: JwtPayload,
    @Param('repoId') repoId: string,
    @Query('branch') branch?: string,
  ) {
    return this.service.listCommits(user.sub, repoId, branch)
  }

  @Get('repositories/:repoId/pull-requests')
  pullRequests(@CurrentUser() user: JwtPayload, @Param('repoId') repoId: string) {
    return this.service.listPullRequests(user.sub, repoId)
  }

  @Get('webhooks')
  webhooks() {
    return this.service.listWebhooks()
  }

  @Get('deployments')
  deployments(@CurrentUser() user: JwtPayload) {
    return this.service.listDeployments(user.sub)
  }

  @Post('deploy')
  deploy(
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
    return this.service.deploy(user.sub, body)
  }
}
