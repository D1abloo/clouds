# Terraform

## Estructura del repositorio

```txt
infra/terraform/
  aws/instance/
  gcp/compute-instance/
  azure/virtual-machine/
```

Cada módulo contiene `main.tf` de ejemplo para aprovisionar una VM de prueba.

## Uso desde CloudOps

1. Configurar cuenta cloud en la UI o API (`/cloud-accounts`)
2. Crear un run Terraform desde `/terraform`
3. El backend ejecuta `init`, `plan`, `apply` o `destroy` en workspace aislado (fase posterior)

## Desarrollo local

```bash
cd infra/terraform/aws/instance
terraform init
terraform plan -var="instance_type=t3.micro"
```

Variables específicas por proveedor están en cada `main.tf`.

## Estado

- Desarrollo: estado local (no commitear `terraform.tfstate`)
- Producción: backend remoto S3 + DynamoDB, GCS, o Azure Storage

## Buenas prácticas

- Usar workspaces o prefijos por proyecto/tenant
- Revisar planes antes de apply
- Etiquetar recursos con `project`, `environment`, `managed-by=cloudops`
- IAM con permisos mínimos para el runner

## Worker TerraformRunner

El worker `TerraformRunner` (fase futura) procesará cola de runs; ver `apps/workers/README.md`.
