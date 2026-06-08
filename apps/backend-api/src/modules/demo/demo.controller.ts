import { Controller, Get, Post, ForbiddenException } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { DemoService } from './demo.service'
import { Public } from '../../common/decorators/auth.decorators'
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator'
import { AppModeService } from '../../common/config/app-mode.service'

@ApiTags('Demo')
@ApiBearerAuth()
@Controller('demo')
export class DemoController {
  constructor(
    private readonly demo: DemoService,
    private readonly mode: AppModeService,
  ) {}

  private assertDemoRoutesAllowed = (): void => {
    if (this.mode.isProMode() && !this.mode.isDemoMode()) {
      throw new ForbiddenException(
        'Modo demo deshabilitado en producción. Configure DEMO_MODE=true solo en entornos locales.',
      )
    }
  }

  @Get('status')
  @Public()
  @ApiOperation({ summary: 'Demo mode status and dataset counts' })
  status() {
    this.assertDemoRoutesAllowed()
    return this.demo.getStatus()
  }

  @Post('seed')
  @ApiOperation({ summary: 'Load demo dataset (admin, DEMO_MODE required)' })
  seed(@CurrentUser() user: JwtPayload) {
    this.assertDemoRoutesAllowed()
    return this.demo.seed(user)
  }

  @Post('reset')
  @ApiOperation({ summary: 'Clear and reload demo dataset (admin)' })
  reset(@CurrentUser() user: JwtPayload) {
    this.assertDemoRoutesAllowed()
    return this.demo.reset(user)
  }
}
