# API REST

## Base URL

| Entorno | URL |
|---------|-----|
| Local | `http://localhost:3000/api/v1` |
| Kubernetes | `https://api.cloudops.example.com/api/v1` |

## Autenticación

Bearer JWT en header:

```http
Authorization: Bearer <access_token>
```

Obtener token: `POST /api/v1/auth/login` con `{ "email", "password" }`.

## Documentación interactiva

Swagger UI: `http://localhost:3000/api/docs` (desarrollo).

## Módulos principales

| Prefijo | Descripción |
|---------|-------------|
| `/auth` | Login, refresh, perfil |
| `/users` | Usuarios |
| `/roles`, `/permissions` | RBAC |
| `/cloud-accounts` | Cuentas AWS/GCP/Azure |
| `/instances` | Inventario cloud |
| `/vps` | VPS externas |
| `/ssh` | Sesiones terminal |
| `/docker-discovery` | Contenedores detectados |
| `/kubernetes-discovery` | Recursos K8s |
| `/jenkins` | Jobs y builds |
| `/terraform` | Runs de infraestructura |
| `/metrics` | Métricas agregadas |
| `/billing` | Costes y facturación |
| `/alerts` | Reglas y eventos |
| `/notifications` | Notificaciones usuario |
| `/health` | Health check |

## Códigos HTTP

- `200` — OK
- `201` — Creado
- `400` — Validación
- `401` — No autenticado
- `403` — Sin permiso
- `404` — No encontrado
- `429` — Rate limit (Throttler)
- `500` — Error interno

## WebSockets

Gateway en tiempo real para métricas, SSH, Jenkins y Terraform. Conectar con el mismo JWT que la API REST.

## Versionado

Prefijo fijo `v1`. Cambios breaking requerirán `v2` en rutas futuras.
