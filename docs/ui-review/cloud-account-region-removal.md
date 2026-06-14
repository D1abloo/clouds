# Cloud Account Region Removal

## Componentes Modificados

- `CloudConnectionWizardBodyComponent`: elimina los campos de region/datacenter del paso de credenciales.
- `CloudAccountWizardFacade`: deja de precargar o enviar `defaultRegion` en nuevas conexiones.
- `cloud-account-wizard.validation`: valida identidad y credenciales sin exigir region.
- `cloud-account-wizard.config`: elimina regiones por defecto de tarjetas de proveedor y agrega opciones para alcance de sincronizacion.
- `CreateCloudAccountDto`: documenta `defaultRegion` como opcional/legado.

## Cambio De UI

El paso `Credenciales` ya no muestra region obligatoria para AWS, Azure, GCP, Clouding, IONOS ni otros VPS. En su lugar muestra una nota contextual:

- AWS: credenciales a nivel de cuenta; regiones EC2 al sincronizar o lanzar.
- Azure: conexion a suscripcion; region al crear recursos.
- GCP: conexion a proyecto; region/zona al crear recursos.
- IONOS/Clouding/VPS: conexion por cuenta API; datacenter al crear recursos.

El paso `Alcance` permite:

- sincronizar todas las regiones disponibles;
- seleccionar regiones especificas mediante multi-select.

## Validaciones Corregidas

Ya no bloquean `Siguiente` por falta de region:

- AWS con IAM Role, Access Key u OIDC;
- Azure con client secret o managed identity;
- GCP con service account o workload identity;
- Clouding, IONOS, DigitalOcean, Hetzner, Linode, Vultr y Scaleway con API token.

Si el usuario escoge `Seleccionar regiones especificas`, entonces si se exige al menos una region en el paso de alcance.

## Preservacion

No se borran cuentas ni credenciales existentes. `defaultRegion` permanece opcional para compatibilidad y para cuentas antiguas que ya lo tengan informado.

## Pruebas

Validaciones esperadas:

- AWS puede avanzar sin region si account ID y credencial son validos.
- GCP puede avanzar sin region/zona si project ID y credencial son validos.
- Azure puede avanzar sin region si subscription, tenant y credencial son validos.
- Clouding/IONOS/VPS pueden avanzar sin region/datacenter si tienen token.
- El wizard de lanzamiento sigue pidiendo region y zona cuando crea infraestructura.
