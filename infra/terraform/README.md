# Terraform modules

Estructura recomendada:

```txt
terraform/
  aws/
    instance/
      main.tf
      variables.tf
      outputs.tf
  gcp/
    compute-instance/
      main.tf
      variables.tf
      outputs.tf
  azure/
    virtual-machine/
      main.tf
      variables.tf
      outputs.tf
```

Cada módulo debe ser invocado por el backend/worker de Terraform después de generar variables desde la UI.

Nunca ejecutes `terraform apply` sin mostrar antes el plan al usuario.
