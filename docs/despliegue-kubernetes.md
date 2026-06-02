# Despliegue en Kubernetes

## Prerrequisitos

- Cluster Kubernetes 1.28+
- `kubectl` configurado
- Ingress controller (nginx recomendado)
- Imágenes publicadas en GHCR (ver `.github/workflows/docker.yml`)

## Orden de aplicación

```bash
kubectl apply -f infra/k8s/namespace.yaml
kubectl apply -f infra/k8s/configmap.yaml
# Crear secret real desde secrets.example.yaml
kubectl apply -f infra/k8s/secrets.yaml
kubectl apply -f infra/k8s/backend-api.yaml
kubectl apply -f infra/k8s/frontend-angular.yaml
kubectl apply -f infra/k8s/workers.yaml
kubectl apply -f infra/k8s/ingress.yaml
kubectl apply -f infra/k8s/hpa.yaml
kubectl apply -f infra/k8s/network-policy.yaml
```

## Migraciones

Ejecutar un Job o init container con:

```bash
./scripts/migrate.sh deploy
```

Variables requeridas: `DATABASE_URL` desde el Secret `cloudops-secrets`.

## Ingress y TLS

Editar `infra/k8s/ingress.yaml` con tus hosts y el `ClusterIssuer` de cert-manager.

| Host | Servicio |
|------|----------|
| `cloudops.example.com` | frontend-angular |
| `api.cloudops.example.com` | backend-api |

## Escalado

HPA definido en `infra/k8s/hpa.yaml` para backend, frontend y workers.

## Red

`network-policy.yaml` restringe tráfico entre pods. Ajusta selectores según tu CNI y namespace del ingress.

## Imágenes

```bash
docker build -f infra/docker/Dockerfile.backend-api -t ghcr.io/your-org/cloudops-backend:latest .
docker build -f infra/docker/Dockerfile.frontend-angular -t ghcr.io/your-org/cloudops-frontend:latest .
docker build -f infra/docker/Dockerfile.workers -t ghcr.io/your-org/cloudops-workers:latest .
```

Actualiza las referencias `image:` en los manifests antes del despliegue.
