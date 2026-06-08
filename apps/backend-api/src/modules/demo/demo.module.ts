import { Module } from '@nestjs/common'
import { DemoController } from './demo.controller'
import { DemoService } from './demo.service'
import { AppModeModule } from '../../common/config/app-mode.module'

@Module({
  imports: [AppModeModule],
  controllers: [DemoController],
  providers: [DemoService],
  exports: [DemoService],
})
export class DemoModule {}
