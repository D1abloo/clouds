# Implementation plan - functional multi-cloud launch wizard

**Fecha:** 2026-06-12

## Objetivo

Implementar una interfaz grafica funcional para lanzar, probar y eliminar recursos desde AI Infra Studio en:

- AWS EC2
- GCP Compute Engine
- IONOS VPS

## Plan ejecutado

| Paso | Estado | Evidencia |
| --- | --- | --- |
| Mapear sidebar, rutas y layout | Done | `sidebar-route-map.md` |
| Crear ruta canonica de AI Infra Studio | Done | `/automation/ai-infra-studio` |
| Conectar CTAs contextuales | Done | AWS EC2, GCP y IONOS Servidores abren wizard preseleccionado |
| Separar UI por proveedor | Done | `AwsLaunchForm`, `GcpLaunchForm`, `IonosVpsLaunchForm` |
| Añadir componentes visibles del wizard | Done | Pasos, coste, progreso, logs, prueba, eliminacion, arquitectura |
| Registrar inventario local del wizard | Done | `CloudLaunchActivityService` |
| Integrar Observabilidad y FinOps | Done | Logs e instancias FinOps leen actividad del wizard |
| Validar build | Done | `npm run build -w apps/frontend-angular` |
| Pruebas reales cloud | Blocked | Variables cloud esperadas no estan configuradas localmente |
| Push GitHub | Blocked | Credencial GitHub HTTPS devuelve 401 y SSH no tiene clave valida |

## Componentes conectados

| Componente | Selector | Archivo |
| --- | --- | --- |
| CloudLaunchWizard | `app-cloud-launch-wizard` | `features/cloud/cloud-launch-wizard.component.ts` |
| CloudProviderSelector | `app-cloud-provider-selector` | `features/cloud/launch/cloud-provider-selector.component.ts` |
| AwsLaunchForm | `app-aws-launch-form` | `features/cloud/launch/aws-launch-form.component.ts` |
| GcpLaunchForm | `app-gcp-launch-form` | `features/cloud/launch/gcp-launch-form.component.ts` |
| IonosVpsLaunchForm | `app-ionos-vps-launch-form` | `features/cloud/launch/ionos-vps-launch-form.component.ts` |
| CloudAccountStep | `app-cloud-account-step` | `features/cloud/launch/cloud-account-step.component.ts` |
| CloudRegionZoneStep | `app-cloud-region-zone-step` | `features/cloud/launch/cloud-region-zone-step.component.ts` |
| CloudNetworkStep | `app-cloud-network-step` | `features/cloud/launch/cloud-network-step.component.ts` |
| CloudComputeStep | `app-cloud-compute-step` | `features/cloud/launch/cloud-compute-step.component.ts` |
| CloudImageStep | `app-cloud-image-step` | `features/cloud/launch/cloud-image-step.component.ts` |
| LaunchReview | `app-launch-review` | `features/cloud/launch/launch-review.component.ts` |
| LaunchProgress | `app-launch-progress` | `features/cloud/launch/launch-progress.component.ts` |
| LaunchTestPanel | `app-launch-test-panel` | `features/cloud/launch/launch-test-panel.component.ts` |
| LaunchDeletePanel | `app-launch-delete-panel` | `features/cloud/launch/launch-delete-panel.component.ts` |
| LaunchErrorCard | `app-launch-error-card` | `features/cloud/launch/launch-error-card.component.ts` |
| CloudResourceInventoryCard | `app-cloud-resource-inventory-card` | `features/cloud/launch/cloud-resource-inventory-card.component.ts` |
| InfraCopilotPanel | `app-infra-copilot-panel` | `features/cloud/launch/infra-copilot-panel.component.ts` |
| CloudLaunchLogs | `app-cloud-launch-logs` | `features/cloud/launch/cloud-launch-logs.component.ts` |
| CloudCostEstimateCard | `app-cloud-cost-estimate-card` | `features/cloud/launch/cloud-cost-estimate-card.component.ts` |
| CloudArchitecturePreview | `app-cloud-architecture-preview` | `features/cloud/launch/cloud-architecture-preview.component.ts` |

## Adapters y servicios

El wizard reutiliza servicios existentes en lugar de duplicar backend:

- `CloudAccountsService`: validate, regions, zones, networks, images, instance types, preflight y launch.
- `InstancesService`: discover/test y stop/delete compatible.
- `CloudLaunchActivityService`: registro frontend de inventario/logs/coste para recursos creados desde AI Infra Studio.

IONOS queda implementado como flujo UI/local hasta disponer de `IONOS_TOKEN` o adaptador backend nativo.
