import { Body, Controller, Get, Ip, Post, Query, Req } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import type { Request } from 'express'
import { Public } from '../../common/decorators/auth.decorators'
import { PublicService } from './public.service'
import { ContactFormDto, PublicRegisterDto, ResendVerificationDto } from './dto/public.dto'

@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Registro público con verificación de email' })
  register(@Body() dto: PublicRegisterDto, @Ip() ip: string, @Req() req: Request) {
    return this.publicService.register(dto, ip, req.headers['user-agent'])
  }

  @Public()
  @Get('verify-email')
  @ApiOperation({ summary: 'Verificar email con token' })
  verifyEmail(@Query('token') token: string, @Ip() ip: string) {
    return this.publicService.verifyEmail(token, ip)
  }

  @Public()
  @Post('resend-verification')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  resendVerification(@Body() dto: ResendVerificationDto, @Ip() ip: string, @Req() req: Request) {
    return this.publicService.resendVerification(dto.email, ip, req.headers['user-agent'])
  }

  @Public()
  @Post('contact')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  contact(@Body() dto: ContactFormDto, @Ip() ip: string) {
    return this.publicService.submitContact(dto, ip)
  }
}
