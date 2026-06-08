import { Controller, Get, Post, Param, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { NotificationsService } from './notifications.service'
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator'

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query('unreadOnly') unreadOnly?: string) {
    return this.service.findByUser(user.sub, unreadOnly === 'true')
  }

  @Get('unread-summary')
  unreadSummary(@CurrentUser() user: JwtPayload) {
    return this.service.unreadSummary(user.sub)
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: JwtPayload) {
    return this.service.markAllRead(user.sub)
  }

  @Post(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.markRead(id, user.sub)
  }
}
