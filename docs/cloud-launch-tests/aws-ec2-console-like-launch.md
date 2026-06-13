# AWS EC2 console-like launch

## Componentes modificados

- `apps/frontend-angular/src/app/features/cloud/cloud-launch-wizard.component.ts`
- `apps/frontend-angular/src/app/features/cloud/cloud-launch-wizard.component.html`
- `apps/frontend-angular/src/app/features/cloud/launch/provider-native-launch-panel.component.ts`
- `apps/backend-api/src/modules/cloud-accounts/cloud-accounts.service.ts`
- `apps/backend-api/src/common/redis/redis.service.ts`

## Campos implementados

La pantalla AWS usa el titulo `Launch an instance`, panel derecho `Summary` y secciones desplegables:

- Name and tags: `Name`, tags recomendados `created_by=ai-infra-studio`, `environment=test`, `auto_delete=true`.
- Application and OS Images / AMI: buscador, tabs de AMI, cards de Amazon Linux, Ubuntu, Windows, Red Hat, SUSE y Debian si el catalogo las devuelve.
- Instance type: familia, vCPU, RAM y precio/hora.
- Key pair / login: selector y accion `Create new key pair`.
- Network settings: region, AZ, VPC, subnet, public IP, security group y acciones para crear VPC/subnet/security group.
- Configure storage: disco, tipo, IOPS, throughput y cifrado.
- Advanced details: IAM role, user data, shutdown behavior, metadata, monitoring y termination protection.

## Recursos inline

El panel permite preparar VPC, subnet, security group y key pair desde el mismo flujo. La creacion real de subnet usa el endpoint existente cuando hay cuenta AWS real; el resto prepara dependencias seleccionables para no bloquear sin explicacion.

## Pruebas

- `npm run build -w apps/frontend-angular -- --configuration=production`: OK.
- Prueba real AWS: pendiente de ejecutar desde UI si hay credenciales IAM con permisos EC2/VPC. No se ha creado ningun recurso real en esta revision.

## Estado final

La interfaz AWS queda integrada en `Automatizacion -> AI Infra Studio` y rutas cloud existentes; no se duplico sidebar ni se borraron cuentas.
