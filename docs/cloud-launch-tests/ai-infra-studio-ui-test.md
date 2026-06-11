# AI Infra Studio — Prueba UI del asistente de lanzamiento

**Fecha:** 2026-06-12  
**Build frontend:** OK (`npm run build` local + rebuild Docker en VPS)  
**Deploy:** https://spendlyx.com — `proMode: true`, API 200

## Componentes verificados (código + build)

| Componente | Selector | Estado |
|------------|----------|--------|
| CloudLaunchWizard | `app-cloud-launch-wizard` | OK |
| CloudProviderSelector | `app-cloud-provider-selector` | OK |
| AwsLaunchForm | `app-aws-launch-form` | OK |
| GcpLaunchForm | `app-gcp-launch-form` | OK |
| IonosVpsLaunchForm | `app-ionos-vps-launch-form` | OK |
| LaunchReview | `app-launch-review` | OK |
| LaunchProgressPanel | `app-launch-progress-panel` | OK |
| LaunchErrorCard | `app-launch-error-card` | OK |
| CloudResourceInventoryCard | `app-cloud-resource-inventory-card` | OK |
| InfraCopilotPanel | `app-infra-copilot-panel` | OK |

## Pasos del wizard (studioMode)

1. Proveedor → 2. Cuenta → 3. Región/Zona → 4. Red → 5. Compute → 6. Imagen → 7. Revisar → 8. Lanzar → 9. Prueba → 10. Eliminar

## Layout

- Fondo `--bg-main: #f6f8fc`
- Tarjeta blanca `.clw__card`
- Stepper superior `.clw__stepper`
- Panel derecho Copilot Infra
- Tokens en `launch/cloud-launch.tokens.scss`

## Rutas

| Ruta | Componente |
|------|------------|
| `/infra/ai-studio` | `AiInfraStudioComponent` → wizard `studioMode=true` |
| `/cloud/aws/launch` | `CloudLaunchPageComponent` |
| `/admin/infraestructura/instancias/lanzar` | `CloudLaunchPageComponent` |

## Pruebas funcionales API (relacionadas)

- AWS subnet/AZ: error UI + API 400 documentado
- GCP launch + stop: OK
- IONOS: UI OK, backend pendiente credenciales host

## Screenshots

Carpeta `screenshots/` reservada para capturas manuales post-login en:

- `/infra/ai-studio`
- `/cloud/aws/launch` (paso Red con error subnet)

## Build

```
cd apps/frontend-angular && npm run build
→ Output: dist/frontend-angular (exit 0)
```

## Secrets

No se incluyeron credenciales en el repositorio. Documentación usa IDs de cuenta y nombres de instancia de prueba únicamente.
