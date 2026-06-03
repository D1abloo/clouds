import { Controller, Get, Post } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { DemoService } from './demo.service'
import { Public } from '../../common/decorators/auth.decorators'
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator'

@ApiTags('Demo')
@ApiBearerAuth()
@Controller('demo')
export class DemoController {
  constructor(private readonly demo: DemoService) {}

  @Get('status')
  @Public()
  @ApiOperation({ summary: 'Demo mode status and dataset counts' })
  status() {
    return this.demo.getStatus()
  }

  @Post('seed')
  @ApiOperation({ summary: 'Load demo dataset (admin, DEMO_MODE required)' })
  seed(@CurrentUser() user: JwtPayload) {
    return this.demo.seed(user)
  }

  @Post('reset')
  @ApiOperation({ summary: 'Clear and reload demo dataset (admin)' })
  reset(@CurrentUser() user: JwtPayload) {
    return this.demo.reset(user)
  }
}
