# Pro Live Ops Hardening

## Componentes modificados

- Backend VPS: `apps/backend-api/src/modules/vps/*`
- Frontend VPS: `apps/frontend-angular/src/app/features/vps/*`
- Infraestructura VPS: `apps/frontend-angular/src/app/features/infrastructure/vps-*`
- Jenkins backend/frontend: `apps/backend-api/src/modules/jenkins/*`, `apps/frontend-angular/src/app/features/jenkins/*`
- AI Assist/Copilot: `apps/backend-api/src/modules/copilot/*`, `apps/frontend-angular/src/app/features/advanced/ai-assistant.component.ts`
- Login publico: `apps/frontend-angular/src/app/features/login/login.component.ts`
- Inventario Jenkins/Docker/Kubernetes: `apps/backend-api/src/modules/inventory/inventory.service.ts`

## Cambios principales

- El alta de VPS queda limitada a conexion SSH con servidor, usuario y contrasena.
- La contrasena SSH se cifra con `SecretsVaultService` y no se expone en respuestas API.
- La validacion de VPS, deteccion Docker/Kubernetes y ejecucion de comandos usan SSH real.
- La vista VPS ya no rellena servidores, servicios, puertos o metricas con datos demo.
- Jenkins exige usuario/API token, valida contra Jenkins real y encola builds con `build` o `buildWithParameters`.
- El inventario Jenkins incluye `serverId` para que los despliegues puedan resolverse desde la UI.
- AI Assist recibe contexto de instancias, VPS, Jenkins, facturacion, logs y rutas principales del panel.
- OAuth en modo PRO ya no emite sesiones fallback si faltan secretos de proveedor.
- El login mantiene el enfoque multi-cloud y mejora iconos sociales redondos, coloreados y animados.

## Pruebas realizadas

- `npm run build -w apps/backend-api`
- `npm run build -w apps/frontend-angular -- --configuration production`
- `npm run test -w apps/backend-api`
- `npm run test -w apps/frontend-angular -- --watch=false --browsers=ChromeHeadless`

## Observaciones

- `npm run lint` no puede completarse en este checkout porque `eslint` no esta instalado en varios workspaces y Angular no tiene target `lint` configurado.
- `npm test` raiz ejecuta los tests, pero Angular queda en modo watcher; por eso se ejecuto el comando frontend con `--watch=false`.
