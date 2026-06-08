import { Routes } from '@angular/router'

export const PUBLIC_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./public-layout.component').then((m) => m.PublicLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./home-page.component').then((m) => m.HomePageComponent),
        data: { seo: { title: 'Spendlyx | Panel live para gestión cloud y operaciones', description: 'Spendlyx centraliza nubes, infraestructura, automatización y observabilidad en un panel PRO multi-usuario.', path: '/' } },
      },
      {
        path: 'producto',
        loadComponent: () => import('./product-page.component').then((m) => m.ProductPageComponent),
        data: { seo: { title: 'Producto | Spendlyx', description: 'Descubre cómo Spendlyx ayuda a tu equipo a gestionar recursos cloud, despliegues y operaciones.', path: '/producto' } },
      },
      {
        path: 'casos-de-uso',
        loadComponent: () => import('./use-cases-page.component').then((m) => m.UseCasesPageComponent),
        data: { seo: { title: 'Casos de uso | Spendlyx', description: 'Casos de uso de Spendlyx para DevOps, startups, agencias y equipos de infraestructura.', path: '/casos-de-uso' } },
      },
      {
        path: 'docs',
        loadComponent: () => import('./docs-page.component').then((m) => m.DocsPageComponent),
        data: { seo: { title: 'Documentación | Spendlyx', description: 'Guía de uso del panel Spendlyx para usuarios.', path: '/docs' } },
      },
      {
        path: 'planes',
        loadComponent: () => import('./pricing-page.component').then((m) => m.PricingPageComponent),
        data: { seo: { title: 'Planes | Spendlyx', description: 'Plan PRO Spendlyx — acceso bajo solicitud.', path: '/planes' } },
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
    data: { seo: { title: 'Crear cuenta | Spendlyx', description: 'Crea tu cuenta de Spendlyx.', path: '/registro' } },
  },
  {
    path: 'verificar-email',
    loadComponent: () => import('./verify-email-page.component').then((m) => m.VerifyEmailPageComponent),
  },
  {
    path: 'verificar-email/enviado',
    loadComponent: () => import('./verify-email-sent-page.component').then((m) => m.VerifyEmailSentPageComponent),
  },
  {
    path: 'verificar-email/error',
    loadComponent: () => import('./verify-email-error-page.component').then((m) => m.VerifyEmailErrorPageComponent),
  },
  {
    path: 'reenviar-verificacion',
    loadComponent: () => import('./resend-verification-page.component').then((m) => m.ResendVerificationPageComponent),
  },
]
