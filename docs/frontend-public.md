# Frontend publico

Fecha: 2026-06-12

## Objetivo

El frontend publico debe explicar Spendlyx como una plataforma cloud e IA para lanzar, observar y automatizar infraestructura. La experiencia publica cubre landing, producto, casos de uso, documentacion, planes, contacto, registro, login y paginas legales sin interferir con el acceso al panel privado.

## Cambios realizados

| Area | Archivo | Cambio |
| --- | --- | --- |
| SEO publico | `apps/frontend-angular/src/app/features/public/public.routes.ts` | Titulos y descripciones orientados a AI Infra Studio, cloud publica, VPS, inventario, seguridad y repositorios. |
| Layout publico | `apps/frontend-angular/src/app/features/public/public-layout.component.ts` | Navegacion con entrada a AI Studio, Docs y footer con secciones de producto reales. |
| Tema publico | `apps/frontend-angular/src/app/features/public/public-theme.ts` | Hero visual mas operativo, sin depender de Inter, con paleta cloud/infra y textura de grid. |
| Home | `apps/frontend-angular/src/app/features/public/home-page.component.ts` | Nueva propuesta de valor: lanzamiento AWS/GCP/IONOS, VPS, logs, inventario, seguridad, GitHub/GitLab y automatizacion. |
| Producto | `apps/frontend-angular/src/app/features/public/product-page.component.ts` | Pagina reestructurada por AI Infra Studio, proveedores, inventario/logs/coste, seguridad y repositorios. |
| Docs publicas | `apps/frontend-angular/src/app/features/public/docs-page.component.ts`, `docs.content.ts` | Guia nueva de AI Infra Studio y copy actualizado a la estructura real del sidebar. |
| Casos de uso | `apps/frontend-angular/src/app/features/public/use-cases-page.component.ts` | Casos para DevOps, startups, multi-proveedor cloud, VPS, observabilidad, seguridad y coste operativo. |
| Planes | `apps/frontend-angular/src/app/features/public/pricing-page.component.ts` | Plan PRO explicado como activacion para equipos cloud/IA con proveedores reales. |
| Contacto | `apps/frontend-angular/src/app/features/public/contact-page.component.ts` | Placeholders, mensaje de validacion y asuntos alineados con AI Infra Studio. |

## Rutas publicas revisadas

| Ruta | Estado |
| --- | --- |
| `/` | Home publica mejorada. |
| `/producto` | Pagina de producto ampliada con anclas `ai-infra-studio`, `providers`, `inventory` y `security`. |
| `/casos-de-uso` | Copy actualizado. |
| `/docs` | Busqueda y contenido actualizado. |
| `/planes` | Plan PRO actualizado. |
| `/contacto` | Formulario con placeholders y validacion visible. |
| `/registro` | Conservada. |
| `/login` | Conservada fuera del layout publico, sin cambios en este alcance. |
| `/privacidad`, `/cookies`, `/terminos`, `/aviso-legal` | Conservadas. |

## Criterios de contenido

- No se inventan datos reales.
- Las metricas publicas siguen leyendo de `PublicApiService`; si falla la API, se muestran ceros controlados.
- Las capacidades descritas corresponden a rutas y modulos existentes: AI Infra Studio, Nubes, VPS, Infraestructura, Automatizacion, Repositorios, Observabilidad, Seguridad y Administracion.
- No hay enlaces publicos a la seccion principal FinOps.
