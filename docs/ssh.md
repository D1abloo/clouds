# SSH y terminal web

## Flujo

1. Registrar VPS en `/api/v1/vps` con host, puerto y credenciales (o clave referenciada en Vault)
2. Abrir sesión SSH desde el frontend
3. Comandos validados por `command-validator` antes de ejecutarse
4. Salida transmitida por WebSocket (`SshGateway`)

## Validación de comandos

El backend bloquea patrones peligrosos (rm -rf /, fork bombs, etc.). Ampliar reglas en:

`apps/backend-api/src/modules/ssh/command-validator.ts`

## Auditoría

Cada sesión y comando relevante se registra vía `AuditModule`.

## Buenas prácticas

- Usar claves SSH en lugar de contraseñas cuando sea posible
- Limitar usuarios Linux a cuentas de solo operación necesaria
- Deshabilitar root login directo en VPS
- Timeout de sesión en gateway (configuración futura)

## Variables

| Variable | Uso |
|----------|-----|
| `SSH_SESSION_TIMEOUT_MS` | Inactividad (futuro) |
| `SSH_MAX_SESSIONS_PER_USER` | Límite concurrente (futuro) |

## Kubernetes

El pod `backend-api` necesita egress hacia IPs de VPS externas; ajustar `network-policy.yaml` si aplica.
