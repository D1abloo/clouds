# Clouding launch panel

## Componentes modificados

- `apps/frontend-angular/src/app/features/cloud/launch/provider-native-launch-panel.component.ts`
- `apps/frontend-angular/src/app/features/cloud/cloud-launch-wizard.component.*`

## Interfaz

Clouding usa una pantalla adaptada a Clouding.io con secciones:

- Servidor.
- Red y seguridad.
- Disco y backups.

## Campos implementados

Cuenta Clouding conectada, datacenter/region, nombre del servidor, imagen/sistema operativo, plan, vCPU, RAM, disco SSD, IP publica, SSH key, firewall, backups si aplica, coste estimado, summary y boton `Crear servidor`.

## Recursos inline

Permite preparar SSH key, firewall, red/configuracion disponible y disco/configuracion de servidor dentro del flujo.

## Pruebas

- Build Angular production: OK.
- Prueba real Clouding: pendiente de token Clouding con permisos para crear/eliminar servidor. No se han dejado recursos Clouding activos.

## Estado final

Clouding mantiene su propio panel y branding, integrado en AI Infra Studio.
