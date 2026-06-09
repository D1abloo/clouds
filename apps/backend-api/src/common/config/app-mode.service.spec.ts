import { ConfigService } from '@nestjs/config'
import { AppModeService } from './app-mode.service'

describe('AppModeService', () => {
  const build = (env: Record<string, string>) => {
    const config = {
      get: (key: string, fallback?: string) => env[key] ?? fallback,
    } as ConfigService
    return new AppModeService(config)
  }

  it('canUseDemoFallback es false en PRO producción', () => {
    const mode = build({
      DEMO_MODE: 'false',
      PRO_MODE: 'true',
      APP_ENV: 'production',
    })
    expect(mode.canUseDemoFallback()).toBe(false)
  })

  it('canUseDemoFallback es true solo con DEMO_MODE=true', () => {
    const mode = build({ DEMO_MODE: 'true', PRO_MODE: 'false' })
    expect(mode.canUseDemoFallback()).toBe(true)
  })

  it('canUseDemoFallback es true con DEMO_MODE y PRO_MODE en producción', () => {
    const mode = build({
      DEMO_MODE: 'true',
      PRO_MODE: 'true',
      APP_ENV: 'production',
    })
    expect(mode.canUseDemoFallback()).toBe(true)
  })
})
