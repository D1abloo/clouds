import { Routes } from '@angular/router'
import { publicGuestGuard } from '../../core/guards/auth.guard'

export const PUBLIC_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./public-layout.component').then((m) => m.PublicLayoutComponent),
    canActivate: [publicGuestGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./home-page.component').then((m) => m.HomePageComponent),
        data: { seo: { title: 'Spendlyx | Plataforma cloud e IA para infraestructura', description: 'Lanza, observa y automatiza infraestructura en AWS, GCP, Azure, IONOS y VPS desde AI Infra Studio con inventario, seguridad y repositorios integrados.', path: '/' } },
      },
      {
        path: 'producto',
        loadComponent: () => import('./product-page.component').then((m) => m.ProductPageComponent),
        data: { seo: { title: 'Producto | Spendlyx', description: 'AI Infra Studio, inventario multi-cloud, VPS, observabilidad, seguridad, GitHub/GitLab y automatización para equipos DevOps y CloudOps.', path: '/producto' } },
      },
      {
        path: 'casos-de-uso',
        loadComponent: () => import('./use-cases-page.component').then((m) => m.UseCasesPageComponent),
        data: { seo: { title: 'Casos de uso | Spendlyx', description: 'Casos de uso de Spendlyx para DevOps, startups, agencias y equipos de infraestructura.', path: '/casos-de-uso' } },
      },
      {
        path: 'docs',
        loadComponent: () => import('./docs-page.component').then((m) => m.DocsPageComponent),
        data: {
          seo: {
            title: 'Documentación de usuario | Spendlyx',
            description:
              'Guías completas del panel Spendlyx: AI Infra Studio, nubes AWS/GCP/Azure, VPS, inventario, observabilidad, automatización, repositorios y seguridad.',
            path: '/docs',
          },
        },
      },
      {
        path: 'planes',
        loadComponent: () => import('./pricing-page.component').then((m) => m.PricingPageComponent),
        data: { seo: { title: 'Planes | Spendlyx', description: 'Plan PRO Spendlyx para equipos que lanzan y gobiernan infraestructura cloud con IA.', path: '/planes' } },
      },
      {
        path: 'contacto',
        loadComponent: () => import('./contact-page.component').then((m) => m.ContactPageComponent),
        data: { seo: { title: 'Contacto | Spendlyx', description: 'Contacta con el equipo de Spendlyx.', path: '/contacto' } },
      },
      {
        path: 'privacidad',
        loadComponent: () => import('./legal-page.component').then((m) => m.LegalPageComponent),
        data: { legal: 'privacidad', seo: { title: 'Privacidad | Spendlyx', description: 'Política de privacidad de Spendlyx.', path: '/privacidad' } },
      },
      {
        path: 'cookies',
        loadComponent: () => import('./legal-page.component').then((m) => m.LegalPageComponent),
        data: { legal: 'cookies', seo: { title: 'Cookies | Spendlyx', description: 'Política de cookies de Spendlyx.', path: '/cookies' } },
      },
      {
        path: 'terminos',
        loadComponent: () => import('./legal-page.component').then((m) => m.LegalPageComponent),
        data: { legal: 'terminos', seo: { title: 'Términos | Spendlyx', description: 'Términos y condiciones de Spendlyx.', path: '/terminos' } },
      },
      {
        path: 'aviso-legal',
        loadComponent: () => import('./legal-page.component').then((m) => m.LegalPageComponent),
        data: { legal: 'aviso-legal', seo: { title: 'Aviso legal | Spendlyx', description: 'Aviso legal de Spendlyx.', path: '/aviso-legal' } },
      },
    ],
  },
  {
    path: 'registro',
    loadComponent: () => import('./register-page.component').then((m) => m.RegisterPageComponent),
    canActivate: [publicGuestGuard],
    data: { seo: { title: 'Crear cuenta | Spendlyx', description: 'Crea tu cuenta de Spendlyx.', path: '/registro' } },
  },
  {
    path: 'verificar-email',
    loadComponent: () => import('./verify-email-page.component').then((m) => m.VerifyEmailPageComponent),
    canActivate: [publicGuestGuard],
  },
  {
    path: 'verificar-email/enviado',
    loadComponent: () => import('./verify-email-sent-page.component').then((m) => m.VerifyEmailSentPageComponent),
    canActivate: [publicGuestGuard],
  },
  {
    path: 'verificar-email/error',
    loadComponent: () => import('./verify-email-error-page.component').then((m) => m.VerifyEmailErrorPageComponent),
    canActivate: [publicGuestGuard],
  },
  {
    path: 'reenviar-verificacion',
    loadComponent: () => import('./resend-verification-page.component').then((m) => m.ResendVerificationPageComponent),
    canActivate: [publicGuestGuard],
  },
]
