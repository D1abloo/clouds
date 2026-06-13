# Variables de entorno

Copia `.env.example` a `.env` y ajusta los valores.

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `NODE_ENV` | Entorno de ejecución | `development` |
| `DATABASE_URL` | Conexión PostgreSQL | `postgresql://user:pass@localhost:5432/cloudops` |
| `REDIS_URL` | Conexión Redis | `redis://localhost:6379` |
| `CLOUD_CATALOG_CACHE_TTL_SECONDS` | TTL de cache Redis para catálogos cloud no sensibles | `600` |
| `JWT_SECRET` | Secreto para firmar JWT | Cambiar en producción |
| `JWT_EXPIRES_IN` | Expiración del token | `1d` |
| `VAULT_ADDR` | URL de HashiCorp Vault | `http://localhost:8200` |
| `VAULT_TOKEN` | Token Vault (solo dev) | — |
| `JENKINS_URL` | URL Jenkins local | `http://localhost:8080` |
| `CORS_ORIGIN` | Origen permitido CORS | `http://localhost:4200` |
| `API_PORT` | Puerto del backend | `3000` |

## Producción

- Usar secretos gestionados (Vault, AWS Secrets Manager, etc.)
- Rotar `JWT_SECRET` periódicamente
- No commitear `.env`
