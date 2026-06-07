export interface InfraActionSpec {
  title: string
  summary: string
  impact: string
  duration: string
  steps: string[]
  prerequisites?: string[]
  resources?: string[]
}

const dockerActions: Record<string, InfraActionSpec> = {
  'Iniciar contenedor demo': {
    title: 'Iniciar contenedor demo',
    summary: 'Despliega nginx-demo:latest en vps-prod-docker-01 con puerto 8080 publicado.',
    impact: '1 contenedor nuevo · ~128 MB RAM · sin downtime en servicios existentes',
    duration: '~45 s',
    steps: [
      'Pull de imagen nginx:1.25-alpine desde registry interno',
      'Creación de red bridge checkout-net si no existe',
      'Start con restart policy unless-stopped y healthcheck HTTP',
      'Registro en inventario y apertura de métricas cAdvisor',
    ],
    resources: ['vps-prod-docker-01', 'red checkout-net'],
  },
  'Actualizar inventario': {
    title: 'Actualizar inventario Docker',
    summary: 'Discovery SSH multi-host: contenedores, imágenes, redes y volúmenes.',
    impact: 'Sincronización de todo el parque Docker gestionado',
    duration: '1–2 min',
    steps: [
      'Conexión a hosts con Docker Engine activo',
      'Listado docker ps / images / network ls / volume ls',
      'Merge con inventario central y detección de drift',
    ],
    prerequisites: ['Clave SSH ops-team-ed25519', 'Socket docker accesible'],
  },
  'Ejecutar prune': {
    title: 'Prune de recursos Docker',
    summary: 'Elimina contenedores detenidos, redes huérfanas e imágenes dangling.',
    impact: 'Libera ~2.4 GB estimados · irreversible para capas no referenciadas',
    duration: '~30 s',
    steps: [
      'docker container prune -f',
      'docker network prune -f',
      'docker image prune -f',
      'Informe de espacio recuperado',
    ],
    resources: ['vps-prod-docker-01', 'vps-staging-docker'],
  },
  'Pull imagen': {
    title: 'Pull de imagen',
    summary: 'Descarga checkout-api:v2.4.1 en hosts de staging.',
    impact: '412 MB transferidos · sin reinicio automático',
    duration: '~2 min',
    steps: ['Autenticación en registry', 'Pull multi-arch amd64', 'Verificación de firma cosign'],
  },
  'Inspeccionar red': {
    title: 'Inspeccionar red overlay',
    summary: 'Topología de checkout-net: endpoints, subred y reglas iptables.',
    impact: 'Solo lectura',
    duration: 'Instantáneo',
    steps: ['docker network inspect checkout-net', 'Mapa de contenedores adjuntos', 'Export JSON'],
  },
  'Exportar compose': {
    title: 'Exportar Docker Compose',
    summary: 'Genera compose.yaml desde stacks en ejecución en producción.',
    impact: 'Archivo descargable · no modifica runtime',
    duration: '~15 s',
    steps: ['Introspección de servicios', 'Generación v3.8', 'Validación schema'],
  },
}

const k8sActions: Record<string, InfraActionSpec> = {
  'Escalar deployment': {
    title: 'Escalar deployment checkout-api',
    summary: 'Rolling update de 3 → 5 réplicas con maxUnavailable 0.',
    impact: 'Mayor capacidad en namespace checkout · sin corte de tráfico',
    duration: '~3 min',
    steps: [
      'kubectl scale deploy/checkout-api --replicas=5',
      'Espera de readiness en nuevos pods',
      'Actualización de HPA y endpoints del Service',
    ],
    resources: ['prod-eu-west', 'namespace checkout'],
  },
  'Actualizar clusters': {
    title: 'Actualizar clusters Kubernetes',
    summary: 'Discovery de pods, nodes, deployments y eventos en todos los clusters.',
    impact: 'Refresh completo del inventario K8s',
    duration: '2–4 min',
    steps: ['kubeconfig por cluster', 'Listado API resources', 'Merge de métricas metrics-server'],
  },
  'Aplicar manifiesto': {
    title: 'Aplicar manifiesto YAML',
    summary: 'kubectl apply -f deployment checkout-api v2.4.1.',
    impact: 'Rolling update controlado · rollback disponible',
    duration: '~2 min',
    steps: ['Validación dry-run', 'Apply en namespace checkout', 'Watch rollout status'],
  },
  'Port-forward': {
    title: 'Port-forward',
    summary: 'Túnel local 8080 → Service checkout-api:8080.',
    impact: 'Sesión temporal · solo tu usuario',
    duration: 'Mientras la sesión esté activa',
    steps: ['kubectl port-forward svc/checkout-api 8080:8080', 'Auditoría de acceso'],
  },
  'Ver eventos': {
    title: 'Ver eventos del cluster',
    summary: 'Últimos 50 eventos Warning/Normal en prod-eu-west.',
    impact: 'Solo lectura',
    duration: 'Instantáneo',
    steps: ['kubectl get events -A --sort-by=.lastTimestamp', 'Filtro por severidad'],
  },
  'Exportar kubeconfig': {
    title: 'Exportar kubeconfig',
    summary: 'Contexto prod-eu-west con credenciales temporales (1 h).',
    impact: 'Token de corta duración · auditoría activada',
    duration: '~5 s',
    steps: ['Generación de token OIDC', 'Descarga kubeconfig', 'Registro en auditoría'],
  },
}

const vpsActions: Record<string, InfraActionSpec> = {
  'Añadir VPS': {
    title: 'Añadir servidor VPS',
    summary: 'Formulario completo: identidad, acceso SSH, metadatos y discovery post-alta agentless.',
    impact: 'Nuevo nodo en inventario · validación SSH · sync Servicios/Puertos/Métricas',
    duration: '~1–2 min',
    prerequisites: [
      'Clave pública en authorized_keys del usuario',
      'Puerto SSH accesible desde CloudOps (VPN o bastion)',
      'Nombre único en inventario (ej. vps-prod-api-01)',
    ],
    steps: [
      'Identidad: nombre, entorno, IP/hostname y puerto',
      'SSH: usuario, método auth, clave y bastion opcional',
      'Metadatos: proveedor, región, SO, etiquetas y notas',
      'Discovery: Docker, K8s, puertos, métricas y auditoría',
      'Prueba de conexión y registro en inventario',
    ],
  },
  'Validar todos': {
    title: 'Validar todos los VPS',
    summary:
      'Validación SSH batch sobre el inventario completo: DNS, TCP/22, handshake, host key, autenticación por clave, shell de prueba y auditoría de sesión.',
    impact: '{{count}} hosts · solo lectura · sin cambios de configuración',
    duration: '~2 min',
    prerequisites: [
      'Claves ops-team-ed25519 autorizadas en authorized_keys',
      'Acceso CloudOps a puerto SSH (VPN o bastion)',
      'Hosts registrados con IP/hostname válidos',
    ],
    steps: [
      'Resolución DNS e ICMP por host en paralelo',
      'Handshake SSH-2.0 + verificación host key (known_hosts)',
      'Probe de autenticación ED25519 y shell test (echo OK)',
      'Agregación KPIs: OK / warn / fail / offline · latencia P95',
      'Informe batch con recomendaciones y export CSV/JSON/PDF',
      'Actualización de badges de estado en inventario',
    ],
    resources: ['Inventario VPS completo', 'Bucket audit-cloudops', 'Slack #cloudops'],
  },
  Sincronizar: {
    title: 'Sincronizar inventario VPS',
    summary: 'Métricas agentless, systemd, puertos y claves autorizadas.',
    impact: 'Refresh de todas las pestañas VPS',
    duration: '3–5 min',
    steps: ['Recolección CPU/RAM/disco', 'systemctl list-units', 'ss -tulpn para puertos'],
  },
  'Abrir terminal': {
    title: 'Terminal SSH',
    summary: 'Abre sesión en el bastion con grabación de auditoría.',
    impact: 'Sesión interactiva registrada',
    duration: 'Según uso',
    steps: ['Selección de host', 'Jump via bastion si aplica', 'Log en /audit'],
  },
  'Auditar puertos': {
    title: 'Auditoría de puertos · flota VPS',
    summary:
      'Escaneo SYN en todos los hosts del inventario, comparación con POL-VPS-NET v2.4 y generación de informe exportable.',
    impact: 'Informe de riesgos y violaciones · sin cambios en firewall ni SG',
    duration: '~2–4 min según tamaño de flota',
    prerequisites: [
      'Hosts accesibles por SSH (agentless)',
      'Política POL-EXP-03 cargada en CloudOps',
      'Inventario VPS sincronizado',
    ],
    steps: [
      'Escaneo remoto ss -tulpn + SYN top 1024 por host',
      'Detección exposición 0.0.0.0/0 vs VPN/subred privada',
      'Comparación con reglas POL-SSH-01, POL-DB-02, POL-EXP-03',
      'Score de cumplimiento por host y violaciones priorizadas',
      'Informe ejecutivo con export CSV, JSON, Markdown y PDF',
    ],
  },
  'Rotar claves SSH': {
    title: 'Rotación de claves SSH',
    summary:
      'Auditoría de authorized_keys, plan de rotación ED25519 y revocación de huellas legacy en todo el inventario VPS.',
    impact: 'Ventana de mantenimiento recomendada · rollback desde snapshot S3 · validación batch post-rotación',
    duration: '~10 min',
    prerequisites: [
      'Backup authorized_keys en s3://cloudops-ssh-audit',
      'Ventana aprobada por owners (notificación T-24h)',
      'MFA activo en bastion para accesos administrativos',
    ],
    steps: [
      'Inventario batch authorized_keys en todos los hosts registrados',
      'Cruce de huellas con vault corporativo y política POL-SSH-90',
      'Generación de par ED25519 v2 en HSM interno',
      'Deploy authorized_keys y revocación de legacy-root',
      'Validación SSH batch y registro en auditoría CloudOps',
    ],
    resources: ['ops-team-ed25519', 'ci-deploy-rsa', 'legacy-root (revocar)'],
  },
}

const platformActions: Record<string, InfraActionSpec> = {
  'Añadir regla': {
    title: 'Añadir regla de red',
    summary: 'Crea regla inbound/outbound en security group seleccionado.',
    impact: 'Cambio inmediato en firewall cloud',
    duration: '~30 s',
    steps: ['Selección de SG/VNet', 'Definición CIDR y puertos', 'Apply y validación'],
  },
  'Sincronizar topología': {
    title: 'Sincronizar topología de red',
    summary: 'Importa VPC, subnets, LB y peering de AWS/GCP/Azure.',
    impact: 'Refresh del mapa multi-cloud',
    duration: '2–3 min',
    steps: ['API DescribeVpcs', 'Merge subredes', 'Actualización de diagrama'],
  },
  'Crear volumen': {
    title: 'Crear volumen',
    summary: 'Provisiona volumen gp3/io2 con snapshot inicial opcional.',
    impact: 'Coste mensual según IOPS/tamaño',
    duration: '~1 min',
    steps: ['Selección AZ y tipo', 'Creación EBS/PD/Disk', 'Etiquetado obligatorio'],
  },
  'Crear backup': {
    title: 'Crear backup',
    summary: 'Snapshot on-demand del volumen o recurso seleccionado.',
    impact: 'Snapshot incremental · retención según política',
    duration: '5–30 min según tamaño',
    steps: ['Lock de escritura opcional', 'Snapshot API', 'Verificación de integridad'],
  },
  'Generar plan': {
    title: 'Generar plan de capacidad',
    summary: 'Análisis de rightsizing y proyección de crecimiento 90 días.',
    impact: 'Informe ejecutivo · sin cambios automáticos',
    duration: '~2 min',
    steps: ['Agregación métricas 30d', 'Modelo de forecast', 'Recomendaciones €/mes'],
  },
  'Mapa de tráfico': {
    title: 'Mapa de tráfico',
    summary: 'Visualización de flujos activos entre VPC, subnets y balanceadores.',
    impact: 'Solo lectura · detecta exposiciones anómalas',
    duration: '~1 min',
    steps: ['Agregación flow logs', 'Mapa de flujos', 'Alertas 0.0.0.0/0'],
  },
  'Adjuntar': {
    title: 'Adjuntar volumen',
    summary: 'Asocia volumen EBS/PD/Disk a instancia seleccionada.',
    impact: 'Requiere remontaje en OS · posible breve I/O pause',
    duration: '~30 s',
    steps: ['AttachVolume API', 'Detección dispositivo', 'Validación mount'],
  },
  Sincronizar: {
    title: 'Sincronizar almacenamiento',
    summary: 'Refresh de volúmenes, snapshots y métricas IOPS.',
    impact: 'Actualiza inventario storage',
    duration: '1–2 min',
    steps: ['List volumes', 'Merge snapshots', 'Métricas CloudWatch/Monitor'],
  },
  'Restaurar (demo)': {
    title: 'Restaurar backup (demo)',
    summary: 'Simula restauración desde snapshot sin cambios en producción.',
    impact: 'Demo · ventana de mantenimiento en prod real',
    duration: '~5 min',
    steps: ['Selección snapshot', 'Dry-run', 'Restore simulado'],
  },
  'Ejecutar ahora': {
    title: 'Ejecutar backup ahora',
    summary: 'Dispara job de backup on-demand fuera de schedule.',
    impact: 'Snapshot incremental · retención según política',
    duration: '5–30 min',
    steps: ['Lock opcional', 'Snapshot API', 'Verificación integridad'],
  },
  'Aplicar resize': {
    title: 'Aplicar resize',
    summary: 'Cambia tipo de instancia según recomendación de rightsizing.',
    impact: 'Requiere reinicio · ventana de mantenimiento',
    duration: '~10 min',
    steps: ['Stop instancia', 'ModifyInstanceType', 'Start y healthcheck'],
  },
  Exportar: {
    title: 'Exportar plan',
    summary: 'Descarga informe de capacidad en CSV/JSON/Markdown.',
    impact: 'Solo lectura',
    duration: 'Instantáneo',
    steps: ['Generar informe', 'Export multi-formato'],
  },
}

const catalogs: Record<string, Record<string, InfraActionSpec>> = {
  docker: dockerActions,
  kubernetes: k8sActions,
  vps: vpsActions,
  network: platformActions,
  storage: platformActions,
  backups: platformActions,
  'capacity-planner': platformActions,
}

export const getInfraActionSpec = (moduleId: string, label: string): InfraActionSpec | null => {
  const catalog = catalogs[moduleId] ?? platformActions
  return catalog[label] ?? platformActions[label] ?? null
}

export const fallbackActionSpec = (label: string): InfraActionSpec => ({
  title: label,
  summary: `Ejecuta la acción «${label}» en el entorno demo con trazabilidad completa.`,
  impact: 'Operación simulada · sin cambios en producción real',
  duration: '~1 min',
  steps: ['Validación de permisos', 'Ejecución demo', 'Registro en auditoría', 'Notificación al operador'],
})
