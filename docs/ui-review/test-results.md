# Test results

Fecha: 2026-06-12

## Comandos ejecutados

| Comando | Resultado | Nota |
| --- | --- | --- |
| `npm run lint` | Fallo de tooling | `eslint` no esta instalado/disponible en backend, workers y packages; Angular no tiene target `lint`. |
| `npm test` | Fallo inicial | Detecto mocks incompletos en specs existentes: `assertProjectInScope`, `ProModeService.loaded` y spy de favoritos. |
| `npm test -w apps/backend-api -- --runInBand` | OK | 6 suites, 19 tests. |
| `npm test -w apps/frontend-angular -- --watch=false --browsers=ChromeHeadless` | OK | 57 tests. |
| `npm run build -w apps/frontend-angular` | OK | Compila frontend; solo warnings heredados de Angular/Sass/CommonJS. |
| `npm run build` | OK | Build raiz de backend, frontend, workers y packages. |

## Verificaciones manuales / ligeras

| Verificacion | Resultado |
| --- | --- |
| Sidebar sin seccion principal FinOps | OK: `SIDEBAR_MAIN_MODULES` no contiene `finops`. |
| Rutas publicas `/`, `/producto`, `/docs`, `/planes`, `/contacto` | OK: HTTP 200 en `http://localhost:4200`. |
| AI Infra Studio | Conservado en `/automation/ai-infra-studio`. |
| Login y registro | Rutas conservadas. |
| Migraciones/seeds/cleanup | No ejecutados. |
| Scripts destructivos | Revisados y documentados como no ejecutados. |
| `git diff --cached --check` | OK. |
| Escaneo de secretos en diff staged | OK: solo aparece el nombre documental `IONOS_TOKEN`, sin valor sensible. |

## Warnings no bloqueantes

El build mantiene warnings preexistentes de imports no usados en componentes, `?.`/`??` redundantes, Sass `@import` deprecado y dependencias CommonJS (`html2canvas`, `canvg`, `core-js`, `raf`, `rgbcolor`).
