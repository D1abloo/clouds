# Revision del panel publico de login

Fecha: 2026-06-12

## Alcance

Se reviso la pantalla publica de acceso de Spendlyx / AI Infra Studio y se mantuvo dentro del flujo actual de autenticacion. No se cambiaron rutas, endpoints de auth, registro, OAuth ni usuarios existentes.

## Componentes modificados

- `apps/frontend-angular/src/app/features/login/login.component.ts`
- `apps/frontend-angular/src/app/features/login/login.animations.ts`

## Cambios visuales realizados

- Layout dividido con zona izquierda de producto y zona derecha de login, evitando que el acceso parezca una pantalla suelta o vacia.
- Card de login ampliado a un ancho aproximado de 420px, con mas padding, borde y sombra suave.
- Zona izquierda con mensaje de producto mas claro: costes, inventario, operaciones, metricas y alertas cloud en tiempo real.
- Beneficios visibles: costes AWS/GCP, inventario multi-cloud, alertas inteligentes y workspace privado con credenciales cifradas.
- Ilustracion del movil enmarcada en una card premium con metricas flotantes.
- Botones Google/GitHub con mayor altura, hover, foco visible y estados deshabilitados.
- Inputs con labels reales, placeholders claros e iconos de correo y contrasena.
- Boton principal con estado deshabilitado explicito: `Introduce correo y contrasena`.
- Enlaces inferiores reorganizados: crear cuenta, documentacion y reenviar verificacion.

## Animaciones anadidas

- `pageZone`: entrada suave de pantalla.
- `cardZone`: entrada del panel izquierdo y card de login.
- `softFloat`: entrada y flotacion sutil de la ilustracion.
- `backgroundLineMove`: movimiento suave de lineas decorativas.
- `oauthBtn`, `formField`, `submitZone`, `errorZone`: microinteracciones de botones, formulario, envio y errores.

Todas las animaciones respetan `prefers-reduced-motion`.

## Accesibilidad

- El panel izquierdo ahora es contenido semantico referenciado con `aria-labelledby`.
- Los campos mantienen `mat-label` real y `aria-describedby` para ayudas.
- Los iconos internos son decorativos con `aria-hidden`.
- Se anadieron focos visibles en botones y enlaces.
- Los errores siguen usando `role="alert"`.

## Pruebas ejecutadas

```bash
npm run build -w apps/frontend-angular
npm test -w apps/frontend-angular -- --watch=false --browsers=ChromeHeadless
npm run lint -w apps/frontend-angular
curl -k -I -m 20 https://spendlyx.com/login
curl -k -sS -m 25 https://spendlyx.com/api/v1/platform/status
```

Resultados:

- Build frontend correcto. Quedaron warnings existentes de Angular/Sass/CommonJS, sin error bloqueante.
- Tests frontend correctos: 57/57 en ChromeHeadless.
- Lint no ejecutable: el proyecto Angular no tiene target `lint` configurado para `ng lint`.
- Despliegue en VPS correcto. `/login` devuelve HTTP 200 y `platform/status` confirma `demoMode=false`, `proMode=true`, `appEnv=production`.
- Contenedores `cloudops-backend`, `cloudops-frontend`, `cloudops-postgres` y `cloudops-redis` healthy tras reconstruir imagenes sin cache.
- Limpieza demo ejecutada en VPS: no quedan usuarios, organizaciones, instancias, VPS ni registros de auditoria demo. El dry-run final queda a 0 en todas las tablas revisadas.

La validacion manual debe comprobar `/login` en desktop y movil, OAuth Google/GitHub, habilitado del boton al completar formulario y acceso al panel privado.
