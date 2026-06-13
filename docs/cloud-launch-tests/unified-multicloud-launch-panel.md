# Unified Multicloud Launch Panel

## Componentes modificados

- `apps/frontend-angular/src/app/features/cloud/cloud-launch-wizard.component.ts`
- `apps/frontend-angular/src/app/features/cloud/cloud-launch-wizard.component.html`
- `apps/frontend-angular/src/app/features/cloud/cloud-launch-wizard.component.scss`
- `apps/frontend-angular/src/app/features/cloud/launch/cloud-launch.types.ts`
- `apps/frontend-angular/src/app/features/cloud/launch/cloud-provider-selector.component.ts`
- `apps/frontend-angular/src/app/features/cloud/launch/ionos-vps-launch-form.component.ts`
- `apps/frontend-angular/src/app/features/cloud/launch/infra-copilot-panel.component.ts`
- `apps/frontend-angular/src/app/features/cloud/launch/cloud-launch-logs.component.ts`
- `apps/frontend-angular/src/app/features/infrastructure/vps-provider-page.component.ts`

## Qué se unificó

El wizard de AI Infra Studio usa la misma estructura para AWS, Azure, GCP, Clouding y proveedores VPS:

1. Proveedor
2. Cuenta
3. Región / Zona
4. Red
5. Compute
6. Imagen
7. Revisar
8. Lanzar
9. Prueba
10. Eliminar

La interfaz comparte header, stepper, panel de cuenta, formularios, validaciones, revisión, coste, logs, progreso, prueba y eliminación. Solo cambian etiquetas, catálogos y recursos específicos del proveedor.

## Proveedores adaptados

- AWS EC2
- Azure Virtual Machines
- GCP Compute Engine
- Clouding.io
- IONOS VPS
- DigitalOcean
- Hetzner
- Linode / Akamai
- OVH
- Vultr
- Scaleway

## Recursos inline

Desde el paso Red se pueden preparar dependencias sin salir del wizard:

- VPC / VNet / VPC network / red privada
- Subnet / subnetwork
- Security Group / NSG / firewall
- SSH key
- Resource group en Azure

AWS mantiene además la creación real de subnet mediante `cloud-accounts/:id/networks/subnets`. En proveedores donde el backend todavía no ofrece endpoint de creación, el wizard crea una dependencia inline seleccionable y registrada en logs/preflight para mantener el flujo sin botones muertos.

## Mejoras visuales

- Selector multi-cloud con logos de proveedor y estado activo.
- Panel de dependencias con acciones rápidas.
- Copilot lateral con resumen, recomendaciones, dependencias creadas y checks.
- Logs con severidad visual e iconos.
- Botones y cards con foco visible y estados consistentes.

## Pruebas realizadas

- `npm run build -w apps/frontend-angular -- --configuration=production`

