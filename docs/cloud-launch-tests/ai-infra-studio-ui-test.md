# AI Infra Studio — Prueba UI del asistente de lanzamiento

**Fecha:** 2026-06-12
**Build frontend:** OK (`npm run build -w apps/frontend-angular`)
**Dev server local:** `http://localhost:4200/`

## Componentes verificados (código + build)

| Componente | Selector | Estado |
|------------|----------|--------|
| CloudLaunchWizard | `app-cloud-launch-wizard` | OK |
| CloudProviderSelector | `app-cloud-provider-selector` | OK |
| AwsLaunchForm | `app-aws-launch-form` | OK |
| GcpLaunchForm | `app-gcp-launch-form` | OK |
| IonosVpsLaunchForm | `app-ionos-vps-launch-form` | OK |
| CloudAccountStep | `app-cloud-account-step` | OK |
| CloudRegionZoneStep | `app-cloud-region-zone-step` | OK |
| CloudNetworkStep | `app-cloud-network-step` | OK |
| CloudComputeStep | `app-cloud-compute-step` | OK |
| CloudImageStep | `app-cloud-image-step` | OK |
| LaunchReview | `app-launch-review` | OK |
| LaunchProgress | `app-launch-progress` | OK |
| LaunchProgressPanel | `app-launch-progress-panel` | OK |
| LaunchTestPanel | `app-launch-test-panel` | OK |
| LaunchDeletePanel | `app-launch-delete-panel` | OK |
| LaunchErrorCard | `app-launch-error-card` | OK |
| CloudResourceInventoryCard | `app-cloud-resource-inventory-card` | OK |
| InfraCopilotPanel | `app-infra-copilot-panel` | OK |
| CloudLaunchLogs | `app-cloud-launch-logs` | OK |
| CloudCostEstimateCard | `app-cloud-cost-estimate-card` | OK |
| CloudArchitecturePreview | `app-cloud-architecture-preview` | OK |

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
| `/automation/ai-infra-studio` | `AiInfraStudioComponent` → wizard `studioMode=true` |
| `/infra/ai-studio` | Redirect compatible |
| `/cloud/aws/instances` | CTA `Lanzar instancia AWS` → wizard con `provider=aws` |
| `/cloud/gcp/overview` | CTA `Lanzar instancia GCP` → wizard con `provider=gcp` |
| `/vps/ionos/servers` | CTA `Crear VPS IONOS` → wizard con `provider=ionos` |
| `/instances/all-instances` | Inventario backend + actividad del wizard |
| `/logs` | Logs de actividad del wizard |

## Pruebas funcionales API (relacionadas)

- AWS subnet/AZ: error UI documentado con acciones de cambio de zona, subnet, VPC temporal y cancelacion.
- GCP: UI propia y preflight conectado a `CloudAccountsService`; lanzamiento real no ejecutado en esta sesion por falta de variables cloud locales.
- IONOS: UI propia, registro local, prueba y eliminacion simulada; lanzamiento real pendiente de `IONOS_TOKEN`/adaptador backend.

## Screenshots

Carpeta `screenshots/` reservada para capturas manuales post-login en:

- `/automation/ai-infra-studio`
- `/cloud/aws/launch` (paso Red con error subnet)

## Build

```
npm run build -w apps/frontend-angular
→ Output: apps/frontend-angular/dist/frontend-angular (exit 0)
```

## Secrets

No se incluyeron credenciales en el repositorio. Documentación usa IDs de cuenta y nombres de instancia de prueba únicamente.
