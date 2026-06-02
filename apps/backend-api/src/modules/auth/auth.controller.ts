import { Controller, Post, Body, Req, Ip } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { LoginDto, RegisterDto } from './dto/login.dto'
import { MfaSetupDto } from './dto/mfa.dto'
import { Public } from '../../common/decorators/auth.decorators'
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator'

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  login(@Body() dto: LoginDto, @Ip() ip: string) {
    return this.authService.login(dto, ip)
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @Post('mfa/setup')
  @ApiOperation({ summary: 'Enable or disable MFA (optional, uses secret ref)' })
  setupMfa(@Body() dto: MfaSetupDto, @CurrentUser() user: JwtPayload) {
    return this.authService.configureMfa(user.sub, dto.enabled, dto.secretRef)
  }
}
