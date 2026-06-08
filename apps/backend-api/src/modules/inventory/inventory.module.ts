import { Module } from '@nestjs/common'
import { AppModeModule } from '../../common/config/app-mode.module'
import { GithubModule } from '../github/github.module'
import { InventoryController } from './inventory.controller'
import { InventoryService } from './inventory.service'

@Module({
  imports: [GithubModule, AppModeModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
