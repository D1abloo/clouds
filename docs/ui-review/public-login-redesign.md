# Rediseño del login publico multi-cloud

Fecha: 2026-06-12

## Componentes modificados

- `apps/frontend-angular/src/app/features/login/login.component.ts`
- `apps/frontend-angular/src/app/features/login/login.animations.ts`

## Enfoque multi-cloud aplicado

- El hero deja de comunicar una experiencia centrada en AWS Billing.
- El mensaje principal pasa a ser: `Controla tu infraestructura multi-cloud desde un solo panel`.
- Se describen capacidades transversales: inventario, costes, metricas, automatizacion, seguridad y operaciones en tiempo real.
- El visual principal es un mini dashboard multi-cloud con AWS, GCP, Azure, IONOS, DigitalOcean, Hetzner, OVH y Vultr como senales de infraestructura.

## Cambios visuales

- Nueva composicion premium en dos columnas, con formulario prioritario en movil.
- Mini consola con tarjetas de proveedores, nodos conectados y metricas operativas.
- Badges de capacidades: inventario multi-cloud, costes y alertas, IA, VPS/cloud servers, credenciales cifradas y observabilidad.
- Card de login mas amplio, con mejor padding, borde, sombra y jerarquia visual.
- Paleta centralizada con `--primary`, `--accent`, `--secondary`, fondos suaves, bordes y estados de exito/error.

## Mejoras de formulario

- Labels reales para correo y contrasena.
- Placeholder de correo: `tu@empresa.com`.
- Placeholder de contrasena: `Introduce tu contrasena`.
- Iconos internos en ambos campos.
- Ayudas compactas: workspace asociado y minimo de 8 caracteres.
- Boton mostrar/ocultar contrasena con `aria-label` y `aria-pressed`.
- Error visible para correo invalido y contrasena demasiado corta.
- Focus glow azul y contraste reforzado en inputs, botones y enlaces.

## Animaciones

- `pageZone`: fade inicial.
- `cardZone`: entrada suave de zonas principales.
- `softFloat`: entrada y flotacion sutil del visual multi-cloud.
- `backgroundLineMove`: movimiento de lineas/nodos.
- `oauthBtn`, `formField`, `submitZone`, `errorZone`: microinteracciones de botones, campos, envio y errores.

Se respeta `prefers-reduced-motion`.

## Pruebas realizadas

```bash
npm run lint
npm test
npm run build
npm run build -w apps/frontend-angular
npm test -w apps/frontend-angular -- --watch=false --browsers=ChromeHeadless
npm run build -w apps/frontend-angular -- --configuration=production
```

Resultados:

- `npm run lint`: no operativo en el checkout actual. Faltan binarios `eslint` en varios workspaces y Angular no tiene target `lint` configurado para `ng lint`.
- `npm test`: backend completo correcto, frontend completo correcto; el comando raiz queda abierto por el modo servidor/watch de Angular tras completar 57/57, por eso se valido de forma determinista con `--watch=false`.
- `npm test -w apps/backend-api`: 6 suites correctas, 19 tests correctos.
- `npm test -w apps/frontend-angular -- --watch=false --browsers=ChromeHeadless`: 57/57 tests correctos.
- `npm run build`: correcto en backend, frontend, workers y paquetes compartidos.
- `npm run build -w apps/frontend-angular`: correcto.
- `npm run build -w apps/frontend-angular -- --configuration=production`: correcto.

Notas: las builds mantienen warnings existentes de Angular/Sass/CommonJS, sin errores bloqueantes.

## Comprobaciones manuales

- `/login` debe cargar sin mensaje AWS-only.
- Google y GitHub deben seguir usando los handlers existentes.
- El boton principal se habilita solo con correo valido y contrasena minima.
- El campo de contrasena permite mostrar/ocultar sin enviar el formulario.
- Desktop mantiene dos columnas equilibradas.
- Movil prioriza el formulario y resume el hero sin overflow horizontal.
