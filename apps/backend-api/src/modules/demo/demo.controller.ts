import { Controller, Get, Post } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { DemoService } from './demo.service'
import { Public } from '../../common/decorators/auth.decorators'

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
  @ApiOperation({ summary: 'Load demo dataset (DEMO_MODE required)' })
  seed() {
    return this.demo.seed()
  }

  @Post('reset')
  @ApiOperation({ summary: 'Clear and reload demo dataset' })
  reset() {
    return this.demo.reset()
  }
}
