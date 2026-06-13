# Azure VM launch panel

## Componentes modificados

- `apps/frontend-angular/src/app/features/cloud/launch/provider-native-launch-panel.component.ts`
- `apps/frontend-angular/src/app/features/cloud/cloud-launch-wizard.component.*`

## Interfaz

Azure usa un flujo inspirado en Azure Portal con secciones:

- Basics.
- Disks.
- Networking.
- Management.
- Monitoring.
- Advanced.
- Tags.
- Review + create.

## Campos implementados

Subscription, resource group, VM name, region, availability options, security type, image, size, authentication type, username, SSH public key, OS disk type, virtual network, subnet, public IP, NSG, inbound ports via security group, boot diagnostics/monitoring, tags y summary.

## Recursos inline

Desde el panel se puede crear/preparar resource group, virtual network, subnet, NSG, public IP y SSH key antes de validar o crear.

## Pruebas

- Build Angular production: OK.
- Prueba real Azure: pendiente de credenciales Service Principal/subscription con permisos para crear VM y recursos temporales. No se han creado recursos Azure reales.

## Estado final

Azure ya no reutiliza la experiencia AWS; tiene copy, secciones, labels y accion `Create VM` propios.
