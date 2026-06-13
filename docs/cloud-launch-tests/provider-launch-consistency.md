# Provider Launch Consistency

## Experiencia común

AWS, Azure, GCP, Clouding y VPS usan un wizard común. La diferencia por proveedor está limitada a:

- Nombre del proveedor y logo.
- Etiquetas de campos.
- Catálogo de regiones/zonas.
- Tipo de red.
- Tipo de seguridad.
- Tipos de instancia o planes VPS.
- Imágenes y sistemas operativos.
- Tipo de disco.
- Coste estimado.

## Campos por proveedor

AWS:
- Región, Availability Zone, VPC, subnet, Security Group, Key Pair, AMI, instance type, EBS, tags.

Azure:
- Subscription, Resource Group, region, availability zone, Virtual Network, subnet, NSG, public IP, image, VM size, OS disk, SSH key.

GCP:
- Proyecto/cuenta, región, zona, VPC network, subnetwork, firewall rule, image, boot disk, machine type, SSH key.

Clouding:
- Cuenta, región/zona, red privada, política de acceso, plantilla, plan, SSD, SSH key.

VPS:
- Cuenta, datacenter/región, red/acceso, plan, CPU, RAM, disco, sistema operativo, SSH key.

## Accesos al flujo

- `Automatización -> AI Infra Studio` abre el wizard multi-cloud.
- `Nubes -> <proveedor> -> launch` abre el wizard con cuenta del proveedor.
- Páginas VPS ahora navegan a AI Infra Studio con `provider=<slug>`, incluyendo IONOS, DigitalOcean, Hetzner, Linode, OVH, Vultr y Scaleway.

## Logs, inventario y FinOps

El wizard registra:

- proveedor,
- nombre,
- región/zona,
- estado,
- IP pública,
- tipo/tamaño,
- coste estimado por hora/mes,
- fecha de creación,
- etiquetas,
- logs de lanzamiento/prueba/eliminación.

Estos datos alimentan el inventario local de AI Infra Studio y quedan listos para Observabilidad y FinOps.

## Pruebas realizadas

- `npm run build -w apps/frontend-angular -- --configuration=production`

