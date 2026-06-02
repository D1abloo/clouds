import { Controller, Get, Post, Param } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { SshService } from './ssh.service'
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator'

@ApiTags('SSH')
@ApiBearerAuth()
@Controller('ssh')
export class SshController {
  constructor(private service: SshService) {}

  @Post('sessions/:vpsId')
  createSession(@Param('vpsId') vpsId: string, @CurrentUser() user: JwtPayload) {
    return this.service.createSession(vpsId, user.sub)
  }

  @Post('sessions/:sessionId/end')
  endSession(@Param('sessionId') sessionId: string, @CurrentUser() user: JwtPayload) {
    return this.service.endSession(sessionId, user.sub)
  }

  @Get('sessions/vps/:vpsId')
  listSessions(@Param('vpsId') vpsId: string) {
    return this.service.listSessions(vpsId)
  }
}
