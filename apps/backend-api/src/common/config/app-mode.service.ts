import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

export type AppModeStatus = {
  demoMode: boolean
  proMode: boolean
  authUrl: string
  oauth: {
    google: boolean
    github: boolean
  }
  message: string
}

@Injectable()
export class AppModeService {
  constructor(private readonly config: ConfigService) {}

  isDemoMode = (): boolean => this.config.get<string>('DEMO_MODE', 'false') === 'true'

  isProMode = (): boolean => {
    const explicit = this.config.get<string>('PRO_MODE')
    if (explicit === 'true') return true
    if (explicit === 'false') return false
    return !this.isDemoMode()
  }

  getAuthSecret = (): string =>
    this.config.get<string>('AUTH_SECRET') ??
    this.config.get<string>('JWT_SECRET') ??
    'change_me'

  getAuthUrl = (): string =>
    this.config.get<string>('AUTH_URL') ?? 'http://localhost:4200'

  canUseDemoFallback = (): boolean => this.isDemoMode()

  getStatus = (): AppModeStatus => ({
    demoMode: this.isDemoMode(),
    proMode: this.isProMode(),
    authUrl: this.getAuthUrl(),
    oauth: {
      google: !!this.config.get<string>('GOOGLE_CLIENT_ID'),
      github: !!this.config.get<string>('GITHUB_CLIENT_ID'),
    },
    message: this.isProMode()
      ? 'Modo PRO activo — datos desde PostgreSQL y proveedores configurados'
      : 'Modo demo activo — datos simulados para pruebas',
  })
}
