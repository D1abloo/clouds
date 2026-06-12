# AI Infra Studio launch flow - sidebar and route map

Fecha de revision: 2026-06-12

## Arquitectura encontrada

| Pieza | Archivo | Funcion |
| --- | --- | --- |
| Layout principal autenticado | `apps/frontend-angular/src/app/app.routes.ts` -> `MainLayoutComponent` | Monta sidebar, topbar, tabs de area y `router-outlet`. |
| Layout visual | `apps/frontend-angular/src/app/layout/main-layout/main-layout.component.ts` | Renderiza `app-sidebar`, `app-module-area-tabs` y la pagina activa. |
| Configuracion real de sidebar/tabs | `apps/frontend-angular/src/app/core/routing/area-nav.config.ts` | Define secciones principales, ramas internas de Nubes/VPS y tabs superiores. |
| Sidebar | `apps/frontend-angular/src/app/layout/sidebar/sidebar.component.ts` | Renderiza grupos desde `SIDEBAR_MAIN_MODULES`. |
| Grupos y ramas | `apps/frontend-angular/src/app/layout/sidebar/sidebar-nav-group.component.ts`, `sidebar-nav-branch.component.ts` | Renderizan secciones principales y ramas AWS/GCP/IONOS/etc. |
| Rutas privadas | `apps/frontend-angular/src/app/core/routing/navigation.routes.ts` | Define rutas bajo el layout autenticado. |

## Mapa de rutas y cambios

| Seccion sidebar | Ruta actual | Componente que renderiza | Archivo frontend asociado | Boton lanzamiento actual | Modificacion necesaria |
| --- | --- | --- | --- | --- | --- |
| Resumen -> Tablero | `/dashboard` | `DashboardComponent` | `features/dashboard/dashboard.component.ts` | No | Sin cambios. |
| Resumen -> Centro de mando | `/command-center` | `CommandCenterComponent` | `features/overview/command-center-page.component.ts` | No | Sin cambios. |
| Resumen -> Explorador de recursos | `/resource-explorer` | `ResourceExplorerComponent` | `features/advanced/resource-explorer.component.ts` | No | Sin cambios. |
| Resumen -> Mapa de topologia | `/topology-map` | `TopologyMapComponent` | `features/advanced/topology-map.component.ts` | No | Sin cambios. |
| Resumen -> Centro de salud | `/health-center` | `HealthCenterComponent` | `features/overview/health-center-page.component.ts` | No | Sin cambios. |
| Nubes -> AWS -> Resumen | `/cloud/aws/overview` | `CloudProviderPageComponent` | `features/cloud/cloud-provider-page.component.ts` | Si: `Lanzar instancia AWS` | CTA abre `/automation/ai-infra-studio?provider=aws`. |
| Nubes -> AWS -> Cuentas | `/cloud/aws/accounts` | `CloudProviderPageComponent` | `features/cloud/cloud-provider-page.component.ts` | No | Sin cambios funcionales. |
| Nubes -> AWS -> EC2 | `/cloud/aws/instances` | `CloudProviderPageComponent` | `features/cloud/cloud-provider-page.component.ts` | Si: `Lanzar instancia AWS` | Abre wizard central con AWS preseleccionado. |
| Nubes -> AWS -> Red | `/cloud/aws/network` | `CloudProviderPageComponent` | `features/cloud/cloud-provider-page.component.ts` | No | Sin cambios. |
| Nubes -> AWS -> Facturacion | `/cloud/aws/billing` | `CloudProviderPageComponent` | `features/cloud/cloud-provider-page.component.ts` | No | Sin cambios. |
| Nubes -> AWS -> Metricas | `/cloud/aws/metrics` | `CloudProviderPageComponent` | `features/cloud/cloud-provider-page.component.ts` | No | Sin cambios. |
| Nubes -> GCP -> Resumen | `/cloud/gcp/overview` | `CloudProviderPageComponent` | `features/cloud/cloud-provider-page.component.ts` | Si: `Lanzar instancia GCP` | CTA abre `/automation/ai-infra-studio?provider=gcp`. |
| Nubes -> GCP -> Proyectos | `/cloud/gcp/accounts` | `CloudProviderPageComponent` | `features/cloud/cloud-provider-page.component.ts` | No | Sin cambios funcionales. |
| Nubes -> GCP -> Compute | `/cloud/gcp/instances` | `CloudProviderPageComponent` | `features/cloud/cloud-provider-page.component.ts` | Si: `Lanzar instancia GCP` | Abre wizard central con GCP preseleccionado. |
| Nubes -> Azure | `/cloud/azure/*` | `CloudProviderPageComponent` | `features/cloud/cloud-provider-page.component.ts` | Generico en instancias | Sin cambios requeridos por este prompt. |
| Nubes -> Clouding | `/cloud/clouding/*` | `CloudProviderPageComponent` | `features/cloud/cloud-provider-page.component.ts` | Generico en instancias | Sin cambios requeridos por este prompt. |
| VPS -> IONOS -> Resumen | `/vps/ionos/overview` | `VpsProviderPageComponent` | `features/infrastructure/vps-provider-page.component.ts` | Si: `Crear VPS IONOS` | CTA abre `/automation/ai-infra-studio?provider=ionos`. |
| VPS -> IONOS -> Servidores | `/vps/ionos/servers` | `VpsProviderPageComponent` | `features/infrastructure/vps-provider-page.component.ts` | Si: `Crear VPS IONOS` | Abre wizard central con IONOS preseleccionado. |
| VPS -> IONOS -> Metricas | `/vps/ionos/metrics` | `VpsProviderPageComponent` | `features/infrastructure/vps-provider-page.component.ts` | No | Sin cambios funcionales. |
| Infraestructura -> Instancias | `/instances/all-instances` | `InstancesListComponent` | `features/instances/instances-list.component.ts` | Si, generico | Integra backend + recursos del wizard y muestra proveedor, nombre, region/zona, estado, IP publica, tipo/tamano, coste, fecha y acciones ver/probar/eliminar. |
| Automatizacion -> AI Infra Studio | `/automation/ai-infra-studio` | `AiInfraStudioComponent` | `features/infra/ai-infra-studio.component.ts` | Wizard embebido | Ruta canonica creada; `/infra/ai-studio` redirige por compatibilidad. |
| Automatizacion -> Jenkins | `/jenkins/jobs` | `JenkinsPageComponent` | `features/jenkins/jenkins-page.component.ts` | No | Sin cambios. |
| Observabilidad -> Logs | `/logs` | `LogsCenterComponent` | `features/platform-modules/platform-modules.component.ts` + `features/observability/launch-logs-panel.component.ts` | Si | Muestra eventos de lanzamiento/prueba/eliminacion del wizard. |
| FinOps -> Instancias | `/finops/instances` | `FinopsInstancesPageComponent` | `features/finops/finops-instances-page.component.ts` | Si | Mezcla datos de coste generados por el wizard con la tabla FinOps. |
| FinOps -> Facturacion | `/finops/billing` | `FinopsBillingPageComponent` | `features/finops/finops-billing-page.component.ts` | No | Preparado via datos de coste por recurso; no se reconstruye facturacion. |

## Rutas de lanzamiento encontradas

| Ruta | Estado actual | Accion |
| --- | --- | --- |
| `/cloud/:provider/launch` | Existe y renderiza `CloudLaunchPageComponent`. | Se mantiene por compatibilidad; CTAs pedidos abren el flujo central. |
| `/admin/infraestructura/instancias/lanzar` | Existe y renderiza `CloudLaunchPageComponent`. | Mantener como compatibilidad desde inventario. |
| `/infra/ai-studio` | Existe como redirect. | Redirige hacia `/automation/ai-infra-studio`. |
| `/automation/ai-infra-studio` | Existe. | Ruta canonica en Automatizacion. |
| `/vps/ionos/launch` | No existe. | No se crea navegacion paralela; el CTA de IONOS abre `/automation/ai-infra-studio?provider=ionos`. |

## Componentes clave del wizard

| Componente | Archivo | Estado |
| --- | --- | --- |
| Wizard activo | `features/cloud/cloud-launch-wizard.component.ts/html/scss` | Contiene pasos de proveedor, cuenta, region, red, compute, imagen, revisar, lanzar, prueba y eliminar en modo studio. Soporta preseleccion por ruta, cuenta seleccionable, IONOS no bloqueante y logs embebidos. |
| Formulario AWS | `features/cloud/launch/aws-launch-form.component.ts` | Tiene region, AZ, VPC, subnet, security group, key pair e IP publica. |
| Formulario GCP | `features/cloud/launch/gcp-launch-form.component.ts` | Tiene region, zona, VPC network, subnet, firewall rule y SSH key; el wizard completa proyecto/cuenta, tipo, boot disk, imagen, labels, coste y acciones. |
| Formulario IONOS | `features/cloud/launch/ionos-vps-launch-form.component.ts` | Expone cuenta en el wizard y formulario propio con region, datacenter, plan, CPU, RAM, disco, OS, SSH key y nombre. |

## Notas de integracion

- No se debe duplicar el sidebar: todas las entradas usan `SIDEBAR_MAIN_MODULES`.
- El inventario global ya consulta `GET /instances`, que devuelve cloud + VPS. Para IONOS sin adaptador nativo se preparara un registro local de wizard que el frontend puede mezclar en inventario, logs y FinOps.
- Los logs backend de AWS/GCP llegan por `instance.launch.progress`; se mostraran embebidos y se registraran tambien en una fuente local visible desde Observabilidad -> Logs.
