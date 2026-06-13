# GCP Compute Engine launch panel

## Componentes modificados

- `apps/frontend-angular/src/app/features/cloud/launch/provider-native-launch-panel.component.ts`
- `apps/frontend-angular/src/app/features/cloud/cloud-launch-wizard.component.*`

## Interfaz

GCP usa secciones inspiradas en Google Cloud Console:

- Machine configuration.
- OS and storage.
- Networking.
- Security.
- Management.
- Advanced options.
- Review.

## Campos implementados

Project, VM name, region, zone, machine family, machine type, boot disk, image, boot disk size, VPC network, subnetwork, firewall rule, external IP, SSH key, service account, labels, metadata y summary.

## Recursos inline

Permite preparar VPC network, subnetwork, firewall rule, SSH key, boot disk config y labels desde la misma pantalla.

## Pruebas

- Build Angular production: OK.
- Prueba real GCP: pendiente de service account/proyecto con permisos Compute Engine. No se han creado ni dejado VMs GCP activas.

## Estado final

GCP queda con interfaz propia y accion `Create instance`, sin copiar el layout AWS.
