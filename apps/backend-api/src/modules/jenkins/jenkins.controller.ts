import { Controller, Get, Post, Param, Body } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { JenkinsService } from './jenkins.service'
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator'

@ApiTags('Jenkins')
@ApiBearerAuth()
@Controller('jenkins')
export class JenkinsController {
  constructor(private service: JenkinsService) {}

  @Post('servers')
  createServer(@Body() body: { name: string; url: string; secretRef: string }, @CurrentUser() user: JwtPayload) {
    return this.service.createServer(body, user.sub)
  }

  @Get('servers')
  listServers() {
    return this.service.listServers()
  }

  @Post('servers/:id/validate')
  validate(@Param('id') id: string) {
    return this.service.validateConnection(id)
  }

  @Get('servers/:id/jobs')
  listJobs(@Param('id') id: string) {
    return this.service.listJobs(id)
  }

  @Post('servers/:id/jobs/:jobName/build')
  @ApiOperation({ summary: 'Trigger Jenkins job with parameters' })
  trigger(
    @Param('id') id: string,
    @Param('jobName') jobName: string,
    @Body() body: { parameters?: Record<string, string> },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.triggerBuild(id, jobName, body.parameters ?? {}, user.sub)
  }

  @Get('servers/:id/jobs/:jobName/builds/:buildNum/logs')
  logs(@Param('id') id: string, @Param('jobName') jobName: string, @Param('buildNum') buildNum: string) {
    return this.service.getBuildLogs(id, jobName, +buildNum)
  }
}
