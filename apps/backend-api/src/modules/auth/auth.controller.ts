import { Controller, Post, Body, Req, Ip, Get, Param, Query, Res } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { ConfigService } from '@nestjs/config'
import type { Response } from 'express'
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
    const demoMode = this.config.get<string>('DEMO_MODE', 'false') === 'true'
    const proMode = this.config.get<string>('PRO_MODE', 'true') === 'true' || !demoMode
    const normalized = provider.toLowerCase()
    if (normalized !== 'google' && normalized !== 'github') {
      return { demoMode, proMode, message: 'Proveedor OAuth no soportado' }
    }

    const clientId =
      normalized === 'google'
        ? this.config.get<string>('GOOGLE_CLIENT_ID')
        : this.config.get<string>('GITHUB_CLIENT_ID')
    const authUrl = this.config.get<string>('AUTH_URL', 'http://localhost:4200')
    const callbackBase = this.config.get<string>(
      'OAUTH_CALLBACK_URL',
      `${authUrl}/api/v1/auth/oauth/callback`,
    )

    if (proMode && clientId) {
      const redirectUri = `${callbackBase.replace(/\/$/, '')}/${normalized}`
      const redirectUrl =
        normalized === 'google'
          ? `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent('openid email profile')}&access_type=online&prompt=select_account`
          : `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user%20user:email`
      return { redirectUrl, demoMode: false, proMode: true }
    }

    if (proMode && !clientId) {
      return {
        demoMode: false,
        proMode: true,
        connectionRequired: true,
        message: `Configure ${normalized === 'google' ? 'GOOGLE_CLIENT_ID' : 'GITHUB_CLIENT_ID'} para OAuth en modo PRO`,
      }
    }

    return {
      demoMode: true,
      proMode: false,
      message: `OAuth ${normalized} simulado — disponible en modo demo`,
    }
  }

  @Public()
  @Get('oauth/callback/:provider')
  @ApiOperation({ summary: 'OAuth callback — intercambio code → sesión JWT' })
  async oauthCallback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('error') oauthError: string,
    @Ip() ip: string,
    @Res() res: Response,
  ) {
    const authUrl = this.config.get<string>('AUTH_URL', 'http://localhost:4200').replace(/\/$/, '')

    if (oauthError) {
      const message =
        oauthError === 'access_denied'
          ? 'Inicio de sesión OAuth cancelado.'
          : oauthError === 'bad_verification_code'
            ? 'No se pudo validar el código OAuth. Inténtalo de nuevo.'
            : oauthError.startsWith('No se ') || oauthError.startsWith('GitHub ') || oauthError.startsWith('Google ')
              ? oauthError
              : 'No se pudo completar el inicio de sesión con OAuth. Inténtalo de nuevo.'
      return res.redirect(`${authUrl}/login?oauth_error=${encodeURIComponent(message)}`)
    }

    try {
      const session = await this.authService.oauthCallback(provider, code, ip)
      const userJson = encodeURIComponent(JSON.stringify(session.user))
      return res.redirect(
        `${authUrl}/login/oauth/callback#token=${encodeURIComponent(session.accessToken)}&user=${userJson}`,
      )
    } catch (err) {
      const raw =
        err instanceof Error && 'message' in err
          ? String((err as { message?: string }).message ?? 'oauth_failed')
          : 'oauth_failed'
      const message =
        raw === 'bad_verification_code'
          ? 'No se pudo validar el código OAuth. Inténtalo de nuevo.'
          : raw.startsWith('No se ') || raw.startsWith('GitHub ') || raw.startsWith('Google ')
            ? raw
            : 'No se pudo completar el inicio de sesión con OAuth. Inténtalo de nuevo.'
      return res.redirect(`${authUrl}/login?oauth_error=${encodeURIComponent(message)}`)
    }
  }
}
