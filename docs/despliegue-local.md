# Despliegue local

## Prerrequisitos

- Docker y Docker Compose
- Node.js 20+

## Pasos

```bash
# 1. Clonar e instalar
git clone <repo-url>
cd cloudops-control-center
npm install

# 2. Configurar entorno
cp .env.example .env

# 3. Infraestructura
docker compose -f infra/docker-compose.yml up -d

# 4. Base de datos
npm run prisma:migrate
npm run prisma:seed

# 5. Aplicación
npm run dev:backend
npm run dev:frontend
```

## Servicios Docker

| Servicio | Puerto |
|----------|--------|
| PostgreSQL | 5432 |
| Redis | 6379 |
| Jenkins | 8080 |
| Vault | 8200 |
| Prometheus | 9090 |

## Swagger

Disponible en `http://localhost:3000/api/docs` cuando el backend está en marcha.
