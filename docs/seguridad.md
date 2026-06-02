# Seguridad

## Principios

- **Defensa en profundidad**: RBAC, red, secretos y auditoría
- **Mínimo privilegio**: permisos granulares por rol y proyecto
- **Sin secretos en código**: `.env` local, Vault/K8s Secrets en producción

## Autenticación y autorización

- JWT de acceso con expiración corta
- Refresh tokens almacenados de forma segura (fase posterior)
- `PermissionsGuard` en endpoints sensibles
- MFA preparado en modelo de usuario

## SSH y terminal web

- Validación de comandos en `command-validator` (denylist/allowlist)
- Sesiones auditadas en `AuditModule`
- No ejecutar shell interactivo sin autenticación

## Secretos cloud

- Credenciales AWS/GCP/Azure en Vault o Kubernetes Secrets
- Nunca commitear `secrets.yaml` real; usar `secrets.example.yaml` como plantilla
- Rotación periódica de claves IAM y service accounts

## Red (Kubernetes)

- NetworkPolicies en `infra/k8s/network-policy.yaml`
- Ingress con TLS (cert-manager)
- CORS restringido vía `CORS_ORIGIN`

## Headers HTTP

- `helmet` en NestJS
- Rate limiting con `@nestjs/throttler`

## Checklist pre-producción

- [ ] Cambiar `jwt-secret` y `database-url` por valores fuertes
- [ ] Habilitar TLS en ingress
- [ ] Revisar NetworkPolicies (egress `*` restringido)
- [ ] Desactivar Swagger público o proteger con auth
- [ ] Backup PostgreSQL y prueba de restore
- [ ] Escaneo de imágenes Docker en CI
- [ ] Logs centralizados sin datos sensibles

## Reporte de vulnerabilidades

Ver `CONTRIBUTING.md` — contacto privado con maintainers.
