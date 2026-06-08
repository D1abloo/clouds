import { Routes } from '@angular/router'
import { authGuard, guestGuard } from './core/guards/auth.guard'
import { MainLayoutComponent } from './layout/main-layout/main-layout.component'
import { NAVIGATION_ROUTES } from './core/routing/navigation.routes'
import { PUBLIC_ROUTES } from './features/public/public.routes'

export const routes: Routes = [
  ...PUBLIC_ROUTES,
  {
    path: 'login/oauth/callback',
    loadComponent: () =>
      import('./features/login/oauth-callback.component').then((m) => m.OAuthCallbackComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
        data: { breadcrumb: 'Dashboard' },
      },
      ...NAVIGATION_ROUTES,
      {
        path: 'instances/:id',
        loadComponent: () =>
          import('./features/instances/instance-detail.component').then(
            (m) => m.InstanceDetailComponent,
          ),
        data: { breadcrumb: 'Instance Detail', breadcrumbLeaf: true },
      },
      {
        path: 'terminal/:vpsId',
        loadComponent: () =>
          import('./features/terminal/terminal-page.component').then(
            (m) => m.TerminalPageComponent,
          ),
        data: { breadcrumb: 'Terminal' },
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
]
