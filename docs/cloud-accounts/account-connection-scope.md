# Cloud Account Connection Scope

## Principio

Las cuentas cloud se conectan a nivel de proveedor y cuenta, proyecto o suscripcion. La region no forma parte del alta de una cuenta:

- AWS se conecta por cuenta IAM, IAM Role, Access Key u OIDC.
- Azure se conecta por tenant, subscription y service principal o identidad administrada.
- GCP se conecta por project ID y service account o workload identity.
- Clouding, IONOS y proveedores VPS se conectan por cuenta/API token.

La region se elige despues, cuando se necesita operar sobre recursos regionales.

## Donde Se Usa La Region

La region sigue siendo obligatoria para operaciones que crean o consultan recursos regionales:

- lanzar una instancia o VPS;
- crear VPC, VNet, subnet o red privada;
- listar AMIs, machine types, firewalls o key pairs de una region;
- filtrar inventario;
- consultar costes o metricas regionales.

El wizard de lanzamiento mantiene sus campos de region, zona, red, subnet, security group, imagen y tipo de instancia.

## Alcance De Sincronizacion

El alta de cuenta guarda por defecto:

```text
syncScope = all_regions
```

Si el usuario decide limitar la sincronizacion, el wizard guarda:

```text
syncScope = selected_regions
enabledRegions = [...]
```

Estos valores viven en `cloudAccount.config`. No sustituyen al campo regional de lanzamiento.

## Compatibilidad

El modelo conserva `defaultRegion` como campo opcional y legado para no romper cuentas existentes ni integraciones antiguas. Las nuevas conexiones no lo rellenan automaticamente con valores como `us-east-1`, `westeurope` o `us-central1-a`.

No se borran cuentas, credenciales, workspaces ni inventario. No se requiere migracion destructiva porque `defaultRegion` ya es nullable en Prisma.
