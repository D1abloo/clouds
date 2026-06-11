import { APP_INITIALIZER, ApplicationConfig, inject, provideZoneChangeDetection } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { ProModeService } from './core/services/pro-mode.service'
import { ServerTimeService } from './core/services/server-time.service'
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
} from '@angular/router'
import { provideHttpClient, withInterceptors } from '@angular/common/http'
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async'
import { routes } from './app.routes'
import { authInterceptor } from './core/interceptors/auth.interceptor'

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled',
      }),
    ),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
    {
      provide: APP_INITIALIZER,
      useFactory: () => {
        const pro = inject(ProModeService)
        const serverTime = inject(ServerTimeService)
        return () =>
          Promise.all([
            firstValueFrom(pro.loadStatus$()),
            serverTime.init(),
          ]).then(() => undefined)
      },
      multi: true,
    },
  ],
}
