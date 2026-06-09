import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator'
import { CreateUserShortcutDto } from './dto/user-shortcut.dto'
import { UserShortcutsService } from './user-shortcuts.service'

@ApiTags('User shortcuts')
@ApiBearerAuth()
@Controller('user-shortcuts')
export class UserShortcutsController {
  constructor(private readonly shortcuts: UserShortcutsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.shortcuts.listForUser(user.sub)
  }

  @Post()
  add(@CurrentUser() user: JwtPayload, @Body() body: CreateUserShortcutDto) {
    return this.shortcuts.add(user.sub, body)
  }

  @Delete('route/:route')
  removeByRoute(@CurrentUser() user: JwtPayload, @Param('route') route: string) {
    const decoded = decodeURIComponent(route)
    return this.shortcuts.removeByRoute(user.sub, decoded.startsWith('/') ? decoded : `/${decoded}`)
  }
}
