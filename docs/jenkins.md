# Jenkins

## Desarrollo local

Jenkins se levanta con Docker Compose:

```bash
./scripts/dev-up.sh
```

| URL | Puerto |
|-----|--------|
| UI Jenkins | http://localhost:8080 |

Contraseña inicial: ver logs del contenedor `cloudops-jenkins`:

```bash
docker logs cloudops-jenkins 2>&1 | grep -A1 "password"
```

## Integración CloudOps

- API: `/api/v1/jenkins`
- Listar jobs, disparar builds, consultar estado
- WebSocket para eventos de build en tiempo real

## Configuración recomendada

1. Crear usuario de servicio en Jenkins
2. Generar API token
3. Guardar URL y token en variables de entorno / Vault
4. Conectar agentes o usar el controller para pipelines simples

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `JENKINS_URL` | Base URL del controller |
| `JENKINS_USER` | Usuario API |
| `JENKINS_API_TOKEN` | Token |

## Kubernetes

Exponer Jenkins solo en red interna; el backend accede vía `JENKINS_URL` del ConfigMap.

## Seguridad

- No exponer Jenkins públicamente sin autenticación
- Rotar API tokens
- Auditar jobs que ejecutan scripts en infraestructura productiva
