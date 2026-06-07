import { Controller, Post, Body, Req, Ip, Get, Param } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { ConfigService } from '@nestjs/config'
import { AuthService } from './auth.service'
import { LoginDto, RegisterDto } from './dto/login.dto'
import { MfaSetupDto } from './dto/mfa.dto'
import { Public } from '../../common/decorators/auth.decorators'
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator'

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

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

  @Public()
  @Get('oauth/:provider')
  @ApiOperation({ summary: 'OAuth redirect (Google/GitHub) — demo fallback or PRO redirect URL' })
  oauthStart(@Param('provider') provider: string) {
    const demoMode = this.config.get<string>('DEMO_MODE', 'true') === 'true'
    const normalized = provider.toLowerCase()
    if (normalized !== 'google' && normalized !== 'github') {
      return { demoMode, message: 'Proveedor OAuth no soportado' }
    }

    const clientId =
      normalized === 'google'
        ? this.config.get<string>('GOOGLE_CLIENT_ID')
        : this.config.get<string>('GITHUB_CLIENT_ID')
    const callbackBase = this.config.get<string>('OAUTH_CALLBACK_URL', 'http://localhost:4200/auth/callback')

    if (!demoMode && clientId) {
      const redirectUrl =
        normalized === 'google'
          ? `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(`${callbackBase}/google`)}&response_type=code&scope=openid%20email%20profile`
          : `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(`${callbackBase}/github`)}&scope=read:user%20user:email`
      return { redirectUrl, demoMode: false }
    }

    return {
      demoMode: true,
      message: `OAuth ${normalized} simulado — en PRO configure ${normalized === 'google' ? 'GOOGLE_CLIENT_ID' : 'GITHUB_CLIENT_ID'}`,
    }
  }
}
