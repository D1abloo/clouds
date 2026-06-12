# Empty states y campos vacios

Fecha: 2026-06-12

## Regla de producto

Cuando no hay datos reales disponibles, la interfaz debe mostrar un estado vacio claro con:

- titulo especifico,
- descripcion accionable,
- accion recomendada cuando aplique,
- enlace o ruta de configuracion si el modulo depende de una integracion.

No se deben usar textos tipo lorem ipsum ni datos falsos no marcados como demo.

## Componentes revisados

| Area | Archivo | Estado |
| --- | --- | --- |
| Empty state compartido | `shared/components/empty-state/empty-state.component.ts` | Tiene titulo, descripcion y accion opcional. |
| Copys por modulo | `core/routing/module-requirements.config.ts` y `module-requirements.util.ts` | Centralizan mensajes de conexion requerida y datos pendientes. |
| Modulos genericos | `shared/platform/platform-module-page.component.ts` | Usa `app-empty-state` cuando no hay filas. |
| Hubs de seccion | `features/section-hub/section-hub.component.ts` | Usa empty state y CTA opcional de conexion. |
| Alertas, terminal, VPS, repositorios | Varias paginas | Ya tienen mensajes especificos para listas vacias y filtros sin resultado. |
| Publico/contacto | `features/public/contact-page.component.ts` | Campos con placeholder y validacion visible. |
| Publico/docs | `features/public/docs-page.component.ts` | Empty state de busqueda actualizado con sugerencias relevantes. |

## Cambios de este alcance

- Contacto publico: placeholders utiles para nombre, email, asunto y mensaje.
- Contacto publico: mensaje de validacion cuando el formulario esta incompleto.
- Documentacion publica: sugerencias de busqueda orientadas a AI Infra Studio, AWS, IONOS y logs.
- Home/producto publicos: explican que las secciones live muestran estados vacios profesionales hasta conectar integraciones.

## Zonas a vigilar

- Rutas internas antiguas `/finops/*` no forman parte del sidebar visible; si se vuelven a publicar, revisar sus textos internos.
- Cualquier tabla nueva debe usar `app-empty-state` o un mensaje equivalente con accion clara.
