# AWS EC2 — Prueba de lanzamiento (AI Infra Studio)

**Fecha:** 2026-06-12  
**Entorno:** https://spendlyx.com (PRO) · VPS 82.223.54.195  
**Cuenta:** AWS Producción (`6924c18f-bc35-4308-bdd9-f37c52a680c6`)

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
| Lanzamiento real | Bloqueado DryRun | `Request would have succeeded, but DryRun flag is set.` |

## Detección subnet/AZ (fix UI)

El wizard muestra `LaunchErrorCard` con opciones cuando no hay subnet por defecto:

- Cambiar zona de disponibilidad
- Seleccionar subnet existente
- Crear subnet
- Cambiar VPC
- Cancelar

**API reproducida:**

```bash
# Sin subnet en eu-west-1a → 400 con mensaje en español
POST /api/v1/cloud-accounts/{awsId}/instances
# Con subnet en eu-west-1c → DryRun (credenciales válidas, sin instancia creada)
```

## Etiquetas de prueba

```
created_by=ai-infra-studio
environment=test
auto_delete=true
```

## Estado final

- **Instancias AWS de prueba en ejecución:** 0
- **Bloqueante para lanzamiento real:** DryRun activo en adaptador AWS (credenciales OK)
- **UI wizard:** Desplegado en frontend (build 2026-06-12)

## Rutas UI

- `/cloud/aws/launch`
- `/admin/infraestructura/instancias/lanzar`
- `/infra/ai-studio` (studioMode)
