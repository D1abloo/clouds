# AWS EC2 — Prueba de lanzamiento (AI Infra Studio)

**Fecha:** 2026-06-12
**Entorno local:** `/home/isaac/Escritorio/SAAS`
**Credenciales locales:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` missing

## Objetivo

Validar el flujo del asistente gráfico para AWS EC2, incluida la detección de subnets por zona de disponibilidad.

## Resultados

| Paso | Resultado | Evidencia |
|------|-----------|-----------|
| Listar AZ `eu-west-1` | OK | `["eu-west-1a","eu-west-1b","eu-west-1c"]` |
| Catálogo AMI región | OK | `ami-05d6feeb792ebaeff` (Debian 12) |
| Subnet en `eu-west-1a` | Error esperado | Sin subnet por defecto en AZ |
| Subnet en `eu-west-1c` | OK | `subnet-0e761e2c223cb79e2` disponible |
| Preflight imagen inválida | Error detectado | UI/backend rechaza AMI inexistente |
| Lanzamiento real local | Bloqueado | No hay variables AWS configuradas en esta sesion |

## Detección subnet/AZ (fix UI)

El wizard muestra `LaunchErrorCard` con opciones cuando no hay subnet por defecto:

- Cambiar zona de disponibilidad
- Seleccionar subnet existente
- Crear subnet
- Cambiar VPC
- Cancelar

**API reproducida:**

```bash
# Sin subnet en eu-west-1a -> 400 con mensaje en espanol
POST /api/v1/cloud-accounts/{awsId}/instances
# Con subnet en eu-west-1c -> preflight/launch cuando existan credenciales
```

## Etiquetas de prueba

```
created_by=ai-infra-studio
environment=test
auto_delete=true
```

## Estado final

- **Instancias AWS de prueba en ejecucion:** 0
- **Bloqueante para lanzamiento real local:** variables AWS ausentes
- **UI wizard:** Build local OK (2026-06-12)

## Rutas UI

- `/automation/ai-infra-studio?provider=aws`
- `/cloud/aws/instances` -> `Lanzar instancia AWS`
- `/admin/infraestructura/instancias/lanzar` (compatibilidad)
