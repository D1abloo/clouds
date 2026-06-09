import { Module } from '@nestjs/common'
import { UserShortcutsController } from './user-shortcuts.controller'
import { UserShortcutsService } from './user-shortcuts.service'

@Module({
  controllers: [UserShortcutsController],
  providers: [UserShortcutsService],
  exports: [UserShortcutsService],
})
export class UserShortcutsModule {}
