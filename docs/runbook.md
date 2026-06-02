# Runbook operativo

## Contactos y severidad

| Severidad | Respuesta | Ejemplo |
|-----------|-----------|---------|
| P1 | < 15 min | API caída, login imposible |
| P2 | < 1 h | Workers detenidos, métricas stale |
| P3 | < 1 día | Error UI no crítico |

## Health checks

```bash
curl -s http://localhost:3000/api/v1/health
kubectl get pods -n cloudops
```

## Procedimientos comunes

### API no responde

1. `kubectl logs -n cloudops deploy/backend-api --tail=100`
2. Verificar PostgreSQL y Redis
3. Comprobar Secret `cloudops-secrets` (`database-url`)
4. Reiniciar deployment: `kubectl rollout restart deploy/backend-api -n cloudops`

### Migraciones fallidas

```bash
./scripts/migrate.sh deploy
# o desde pod:
kubectl exec -it deploy/backend-api -n cloudops -- npx prisma migrate deploy
```

### Workers sin actividad

1. Logs: `kubectl logs -n cloudops deploy/workers`
2. Verificar `REDIS_URL` y `DATABASE_URL`
3. Revisar intervalos en ConfigMap

### Jenkins desconectado

1. Comprobar contenedor/servicio Jenkins
2. Validar `JENKINS_URL` y token API
3. Probar desde backend: endpoint health Jenkins (si existe)

### Disco PostgreSQL lleno

1. Expandir PVC o volumen
2. `VACUUM` / retención de audit logs
3. Archivar datos históricos de métricas

## Backup

- PostgreSQL: snapshot diario + WAL si aplica
- Vault: backup unseal keys offline seguro
- Manifests K8s: versionados en Git

## Rollback de imagen

```bash
kubectl set image deploy/backend-api backend-api=ghcr.io/org/cloudops-backend:<previous-sha> -n cloudops
kubectl rollout status deploy/backend-api -n cloudops
```

## Post-incidente

1. Timeline en issue interno
2. Actualizar este runbook si hubo gap de procedimiento
3. Añadir alerta Prometheus para evitar recurrencia
