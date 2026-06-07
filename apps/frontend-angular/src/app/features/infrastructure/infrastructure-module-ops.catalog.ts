import type { InfraOperation, InfraResourceRow } from './infrastructure-workspace.types'

const isRunning = (status: string): boolean => /run|activ|ok|success|healthy|ready/i.test(status)
const isStopped = (status: string): boolean => /stop|deten|exit|fail|error|failed/i.test(status)
const isWarning = (status: string): boolean => /warn|pend|degrad/i.test(status)

const op = (
  base: InfraOperation,
  disabled = false,
  disabledReason?: string,
): InfraOperation => (disabled ? { ...base, disabled: true, disabledReason } : base)

const dockerContainerOps = (row: InfraResourceRow): InfraOperation[] => {
  const running = isRunning(row.status)
  const stopped = isStopped(row.status)
  return [
    op({ id: 'inspect', label: 'Inspeccionar contenedor', icon: 'search', description: 'Estado, imagen, puertos, red, variables y recursos.' }),
    op({ id: 'logs', label: 'Ver logs', icon: 'article', description: 'Visor de stdout/stderr del contenedor.' }),
    op({ id: 'restart', label: 'Reiniciar contenedor', icon: 'restart_alt', description: 'Reinicio graceful.', confirm: '¿Reiniciar el contenedor?' }, stopped, 'El contenedor está detenido'),
    op({ id: 'stop', label: 'Detener contenedor', icon: 'stop_circle', description: 'Envía SIGTERM y detiene el contenedor.', confirm: '¿Detener el contenedor?' }, stopped, 'El contenedor ya está detenido'),
    op({ id: 'start', label: 'Iniciar contenedor', icon: 'play_circle', description: 'Arranca el contenedor detenido.' }, running, 'El contenedor ya está en ejecución'),
    op({ id: 'shell', label: 'Exec shell', icon: 'terminal', description: 'Terminal interactiva dentro del contenedor (demo).' }, !running, 'Solo disponible con contenedor en ejecución'),
    op({ id: 'image', label: 'Ver imagen', icon: 'layers', description: 'Capas, digest y tags de la imagen base.' }),
    op({ id: 'usage', label: 'Ver uso de recursos', icon: 'monitoring', description: 'CPU, RAM, disco e I/O en tiempo real.' }),
  ]
}

const dockerHostOps = (row: InfraResourceRow): InfraOperation[] => [
  op({ id: 'inspect', label: 'Inspeccionar host', icon: 'dns', description: 'Engine, versión, sockets y capacidad.' }),
  op({ id: 'sync', label: 'Sincronizar inventario', icon: 'sync', description: 'Refrescar contenedores e imágenes del host.' }),
  op({ id: 'list-containers', label: 'Ver contenedores', icon: 'view_in_ar', description: `Listado de contenedores en ${row.title}.` }),
]

const dockerImageOps = (row: InfraResourceRow): InfraOperation[] => [
  op({ id: 'image', label: 'Ver imagen', icon: 'layers', description: 'Metadatos, capas y vulnerabilidades.' }),
  op({ id: 'inspect', label: 'Inspeccionar', icon: 'search', description: 'Historial de build y configuración.' }),
  op({ id: 'pull', label: 'Pull imagen', icon: 'download', description: `Descargar ${row.title} en hosts gestionados.` }),
]

const dockerNetworkOps = (row: InfraResourceRow): InfraOperation[] => [
  op({ id: 'inspect', label: 'Inspeccionar red', icon: 'hub', description: 'Driver, subred y contenedores conectados.' }),
  op({ id: 'traffic', label: 'Ver tráfico', icon: 'swap_horiz', description: 'Flujos entre contenedores en la red.' }),
  op({ id: 'connect', label: 'Conectar contenedor', icon: 'link', description: `Adjuntar contenedor a ${row.title}.` }),
]

const dockerVolumeOps = (row: InfraResourceRow): InfraOperation[] => [
  op({ id: 'inspect', label: 'Inspeccionar volumen', icon: 'sd_storage', description: 'Mountpoint, driver y contenedor adjunto.' }),
  op({ id: 'usage', label: 'Ver uso', icon: 'pie_chart', description: 'Espacio usado y tendencia.' }),
  op({ id: 'snapshot', label: 'Crear snapshot', icon: 'photo_camera', description: 'Snapshot on-demand del volumen.', confirm: '¿Crear snapshot del volumen?' }),
]

const dockerLogOps = (row: InfraResourceRow): InfraOperation[] => [
  op({ id: 'logs', label: 'Ver logs', icon: 'article', description: 'Stream agregado del contenedor.' }),
  op({ id: 'export-logs', label: 'Exportar logs', icon: 'download', description: 'Descargar últimas 24 h.' }),
  op({ id: 'inspect', label: 'Inspeccionar contenedor', icon: 'search', description: 'Ir al detalle del contenedor origen.' }),
]

const k8sPodOps = (row: InfraResourceRow): InfraOperation[] => {
  const running = isRunning(row.status)
  return [
    op({ id: 'inspect', label: 'Inspeccionar recurso', icon: 'search', description: 'Labels, annotations, contenedores y estado.' }),
    op({ id: 'logs', label: 'Ver logs del pod', icon: 'article', description: 'Logs del contenedor principal.' }),
    op({ id: 'describe', label: 'Describir recurso', icon: 'description', description: 'Salida estilo kubectl describe.' }),
    op({ id: 'shell', label: 'Exec shell', icon: 'terminal', description: 'Shell en el contenedor del pod (demo).' }, !running, 'Solo pods en estado Running'),
    op({ id: 'events', label: 'Ver eventos', icon: 'notifications', description: 'Eventos recientes del pod.' }),
  ]
}

const k8sDeploymentOps = (row: InfraResourceRow): InfraOperation[] => [
  op({ id: 'inspect', label: 'Inspeccionar deployment', icon: 'search', description: 'Réplicas, estrategia y selector.' }),
  op({ id: 'describe', label: 'Describir recurso', icon: 'description', description: 'Condiciones y historial de rollout.' }),
  op({ id: 'rollout-restart', label: 'Reiniciar rollout', icon: 'restart_alt', description: 'Rolling restart de todos los pods.', confirm: '¿Reiniciar el rollout? Se recrearán los pods gradualmente.' }),
  op({ id: 'scale-form', label: 'Escalar réplicas', icon: 'unfold_more', description: 'Cambiar número de réplicas deseadas.' }),
  op({ id: 'yaml', label: 'Ver manifiesto YAML', icon: 'code', description: 'Manifiesto aplicado en el cluster.' }),
  op({ id: 'events', label: 'Ver eventos', icon: 'notifications', description: 'Eventos del deployment y pods.' }),
]

const k8sServiceOps = (row: InfraResourceRow): InfraOperation[] => [
  op({ id: 'inspect', label: 'Inspeccionar service', icon: 'search', description: 'Tipo, selector, puertos y endpoints.' }),
  op({ id: 'describe', label: 'Describir recurso', icon: 'description', description: 'Detalle del service y endpoints.' }),
  op({ id: 'endpoints', label: 'Ver endpoints', icon: 'device_hub', description: 'Pods detrás del service.' }),
  op({ id: 'yaml', label: 'Ver manifiesto YAML', icon: 'code', description: 'Manifiesto del service.' }),
]

const k8sNamespaceOps = (row: InfraResourceRow): InfraOperation[] => [
  op({ id: 'inspect', label: 'Inspeccionar namespace', icon: 'search', description: 'Cuotas, límites y recursos.' }),
  op({ id: 'quotas', label: 'Ver cuotas', icon: 'speed', description: 'ResourceQuota y LimitRange.' }),
  op({ id: 'events', label: 'Ver eventos', icon: 'notifications', description: 'Eventos del namespace.' }),
]

const k8sNodeOps = (row: InfraResourceRow): InfraOperation[] => [
  op({ id: 'inspect', label: 'Inspeccionar nodo', icon: 'search', description: 'Capacity, allocatable y taints.' }),
  op({ id: 'describe', label: 'Describir nodo', icon: 'description', description: 'Condiciones y pods programados.' }),
  op({ id: 'usage', label: 'Ver uso', icon: 'monitoring', description: 'CPU/RAM/disco del nodo.' }),
]

const k8sClusterOps = (row: InfraResourceRow): InfraOperation[] => [
  op({ id: 'inspect', label: 'Inspeccionar cluster', icon: 'hub', description: 'Versión, nodos y addons.' }),
  op({ id: 'sync', label: 'Sincronizar', icon: 'sync', description: 'Refrescar inventario del cluster.' }),
  op({ id: 'kubeconfig', label: 'Exportar kubeconfig', icon: 'vpn_key', description: `Credenciales de ${row.title}.` }),
]

const k8sEventOps = (row: InfraResourceRow): InfraOperation[] => [
  op({ id: 'inspect', label: 'Inspeccionar evento', icon: 'search', description: 'Objeto, razón y contador.' }),
  op({ id: 'related', label: 'Ver recurso relacionado', icon: 'open_in_new', description: 'Ir al recurso que originó el evento.' }),
  op({ id: 'events', label: 'Ver eventos similares', icon: 'notifications', description: 'Eventos correlacionados.' }),
]

const networkVpcOps = (row: InfraResourceRow): InfraOperation[] => [
  op({ id: 'inspect', label: 'Inspeccionar red', icon: 'account_tree', description: 'VPC, CIDR, gateway, DNS y región.' }),
  op({ id: 'rules', label: 'Ver reglas', icon: 'security', description: 'Security groups y NACLs asociados.' }),
  op({ id: 'connectivity', label: 'Diagnóstico conectividad', icon: 'network_check', description: 'Pruebas de rutas y reachability.' }),
  op({ id: 'traffic', label: 'Ver tráfico', icon: 'map', description: 'Métricas de tráfico entrante/saliente.' }),
  op({ id: 'dependencies', label: 'Ver dependencias', icon: 'device_hub', description: 'Recursos que dependen de esta VPC.' }),
]

const networkSubnetOps = (row: InfraResourceRow): InfraOperation[] => [
  op({ id: 'inspect', label: 'Inspeccionar subred', icon: 'device_hub', description: 'CIDR, AZ, route table y recursos.' }),
  op({ id: 'ping', label: 'Probar ping', icon: 'wifi_tethering', description: 'ICMP hacia gateway y hosts clave.' }),
  op({ id: 'traceroute', label: 'Probar traceroute', icon: 'route', description: 'Ruta hacia destino externo.' }),
  op({ id: 'traffic', label: 'Ver tráfico', icon: 'map', description: 'Tráfico por subred.' }),
]

const networkFirewallOps = (row: InfraResourceRow): InfraOperation[] => [
  op({ id: 'rules', label: 'Ver reglas', icon: 'security', description: 'Reglas inbound/outbound del grupo.' }),
  op({ id: 'inspect', label: 'Inspeccionar grupo', icon: 'search', description: 'Recursos asociados y reglas activas.' }),
  op({ id: 'connectivity', label: 'Diagnóstico conectividad', icon: 'network_check', description: 'Simular flujo contra reglas.' }),
  op({ id: 'audit', label: 'Auditoría', icon: 'policy', description: 'Historial de cambios en reglas.' }, false),
]

const networkLbOps = (row: InfraResourceRow): InfraOperation[] => [
  op({ id: 'inspect', label: 'Inspeccionar balanceador', icon: 'balance', description: 'Tipo, listeners y health checks.' }),
  op({ id: 'traffic', label: 'Ver tráfico', icon: 'map', description: 'RPS, latencia y errores.' }),
  op({ id: 'health', label: 'Health checks', icon: 'favorite', description: 'Estado de targets y umbrales.' }),
  op({ id: 'dependencies', label: 'Ver dependencias', icon: 'device_hub', description: 'Servicios y backends asociados.' }),
]

const networkDnsOps = (row: InfraResourceRow): InfraOperation[] => [
  op({ id: 'inspect', label: 'Inspeccionar registro', icon: 'language', description: 'Tipo, TTL, target y zona.' }),
  op({ id: 'ping', label: 'Probar ping', icon: 'wifi_tethering', description: 'Resolución DNS + ICMP.' }),
  op({ id: 'traceroute', label: 'Probar traceroute', icon: 'route', description: 'Ruta hacia el destino resuelto.' }),
  op({ id: 'ports', label: 'Ver puertos abiertos', icon: 'radar', description: 'Escaneo de puertos en el destino.' }),
]

const storageVolumeOps = (row: InfraResourceRow): InfraOperation[] => {
  const attached = !/huérf|orphan|sin adjunt|—/i.test(row.fields.find((f) => f.label.toLowerCase().includes('adjunt'))?.value ?? '')
  return [
    op({ id: 'inspect', label: 'Inspeccionar volumen', icon: 'search', description: 'Tipo, tamaño, región, cifrado y estado.' }),
    op({ id: 'usage', label: 'Ver uso', icon: 'pie_chart', description: 'Porcentaje usado, libre y tendencia.' }),
    op({ id: 'metrics', label: 'Ver métricas', icon: 'monitoring', description: 'IOPS, latencia y throughput.' }),
    op({ id: 'attach', label: 'Adjuntar volumen', icon: 'link', description: 'Adjuntar a una instancia.' }, attached, 'El volumen ya está adjunto'),
    op({ id: 'detach', label: 'Desadjuntar volumen', icon: 'link_off', description: 'Desadjuntar de la instancia.', confirm: '¿Desadjuntar el volumen? Verifica que no esté en uso.' }, !attached, 'El volumen no está adjunto'),
    op({ id: 'snapshot', label: 'Crear snapshot', icon: 'photo_camera', description: 'Snapshot on-demand.', confirm: '¿Crear snapshot del volumen?' }),
    op({ id: 'snapshots-list', label: 'Ver snapshots', icon: 'photo_library', description: 'Snapshots existentes del volumen.' }),
    op({ id: 'expand-form', label: 'Ampliar capacidad', icon: 'unfold_more', description: 'Aumentar tamaño del volumen.' }),
  ]
}

const storageBucketOps = (row: InfraResourceRow): InfraOperation[] => [
  op({ id: 'inspect', label: 'Inspeccionar bucket', icon: 'search', description: 'Región, clase, cifrado y políticas.' }),
  op({ id: 'usage', label: 'Ver uso', icon: 'pie_chart', description: 'Objetos, tamaño y crecimiento.' }),
  op({ id: 'metrics', label: 'Ver métricas', icon: 'monitoring', description: 'Requests, latencia y errores.' }),
  op({ id: 'lifecycle', label: 'Ver lifecycle', icon: 'schedule', description: 'Reglas de transición y expiración.' }),
]

const storageCapacityOps = (row: InfraResourceRow): InfraOperation[] => [
  op({ id: 'usage', label: 'Ver uso', icon: 'pie_chart', description: 'Utilización y umbral configurado.' }),
  op({ id: 'forecast', label: 'Ver predicción', icon: 'trending_up', description: 'Proyección de llenado.' }),
  op({ id: 'alert', label: 'Alerta capacidad', icon: 'notifications', description: 'Configurar umbral de alerta.' }),
]

const backupSnapshotOps = (row: InfraResourceRow): InfraOperation[] => [
  op({ id: 'detail', label: 'Ver detalle del backup', icon: 'info', description: 'Origen, destino, tamaño, duración y política.' }),
  op({ id: 'run-now', label: 'Ejecutar backup ahora', icon: 'play_arrow', description: 'Backup on-demand.', confirm: '¿Ejecutar backup ahora?' }),
  op({ id: 'restore', label: 'Restaurar backup', icon: 'restore', description: 'Restauración con impacto en producción.', confirm: '⚠ RESTAURACIÓN DEMO\n\nEsto sobrescribirá datos del origen. ¿Continuar?' }),
  op({ id: 'history', label: 'Ver historial', icon: 'history', description: 'Ejecuciones anteriores del job.' }),
  op({ id: 'verify', label: 'Validar integridad', icon: 'verified', description: 'Checksum y prueba de restauración.' }),
  op({ id: 'report', label: 'Descargar reporte', icon: 'download', description: 'Informe PDF/CSV del backup.' }),
  op({ id: 'delete', label: 'Eliminar backup', icon: 'delete', description: 'Eliminar snapshot permanentemente.', confirm: '¿Eliminar este backup? No se puede deshacer.' }),
]

const backupScheduledOps = (row: InfraResourceRow): InfraOperation[] => [
  op({ id: 'detail', label: 'Ver detalle', icon: 'info', description: 'Cron, ventana, retención y destino.' }),
  op({ id: 'run-now', label: 'Ejecutar backup ahora', icon: 'play_arrow', description: 'Forzar ejecución fuera de ventana.', confirm: '¿Ejecutar backup ahora?' }),
  op({ id: 'policy', label: 'Ver política de retención', icon: 'policy', description: 'Reglas daily/weekly/yearly.' }),
  op({ id: 'history', label: 'Ver historial', icon: 'history', description: 'Últimas 30 ejecuciones.' }),
  op({ id: 'verify', label: 'Validar integridad', icon: 'verified', description: 'Validar último backup exitoso.' }),
]

const backupRestoreOps = (row: InfraResourceRow): InfraOperation[] => [
  op({ id: 'detail', label: 'Ver detalle', icon: 'info', description: 'Estado, progreso y origen.' }),
  op({ id: 'verify', label: 'Validar integridad', icon: 'verified', description: 'Verificar datos restaurados.' }),
  op({ id: 'report', label: 'Descargar reporte', icon: 'download', description: 'Informe de la restauración.' }),
]

const backupAlertOps = (row: InfraResourceRow): InfraOperation[] => [
  op({ id: 'detail', label: 'Ver detalle', icon: 'info', description: 'Backup afectado y causa.' }),
  op({ id: 'run-now', label: 'Reintentar backup', icon: 'replay', description: 'Reintentar job fallido.', confirm: '¿Reintentar el backup?' }),
  op({ id: 'verify', label: 'Validar integridad', icon: 'verified', description: 'Comprobar último backup válido.' }),
  op({ id: 'history', label: 'Ver historial', icon: 'history', description: 'Historial de fallos del job.' }),
]

const capacityRecommendOps = (row: InfraResourceRow): InfraOperation[] => [
  op({ id: 'analysis', label: 'Ver análisis', icon: 'analytics', description: 'CPU, RAM, disco, red y coste.' }),
  op({ id: 'simulate-form', label: 'Simular crecimiento', icon: 'science', description: 'Proyectar demanda con % o periodo.' }),
  op({ id: 'recommend', label: 'Generar recomendación', icon: 'auto_awesome', description: 'Acciones sugeridas de rightsizing.' }),
  op({ id: 'resize', label: 'Aplicar resize', icon: 'straighten', description: 'Aplicar cambio de tamaño propuesto.', confirm: '¿Aplicar resize recomendado?' }),
  op({ id: 'export', label: 'Exportar reporte', icon: 'download', description: 'Informe ejecutivo del recurso.' }),
  op({ id: 'compare', label: 'Comparar escenarios', icon: 'compare', description: 'Actual vs recomendado.' }),
]

const capacityForecastOps = (row: InfraResourceRow): InfraOperation[] => [
  op({ id: 'forecast', label: 'Ver predicción', icon: 'trending_up', description: 'Proyección 30/60/90 días.' }),
  op({ id: 'simulate-form', label: 'Simular crecimiento', icon: 'science', description: 'Escenario what-if de demanda.' }),
  op({ id: 'thresholds-form', label: 'Ajustar umbrales', icon: 'tune', description: 'Umbrales CPU/RAM/disco para alertas.' }),
]

const capacityScenarioOps = (row: InfraResourceRow): InfraOperation[] => [
  op({ id: 'compare', label: 'Comparar escenarios', icon: 'compare', description: 'Baseline vs optimizado vs pico.' }),
  op({ id: 'simulate-form', label: 'Simular escenario', icon: 'science', description: 'Parámetros del escenario.' }),
  op({ id: 'create-plan', label: 'Crear plan de capacidad', icon: 'assignment', description: 'Guardar plan simulado.' }),
]

const capacityCostOps = (row: InfraResourceRow): InfraOperation[] => [
  op({ id: 'analysis', label: 'Ver análisis de coste', icon: 'euro', description: 'Desglose y tendencia mensual.' }),
  op({ id: 'alert', label: 'Alerta coste', icon: 'notifications', description: 'Umbral de gasto mensual.' }),
  op({ id: 'export', label: 'Exportar reporte', icon: 'download', description: 'Informe de costes.' }),
]

const matchTab = (tabId: string, ...patterns: string[]): boolean =>
  patterns.some((p) => tabId === p || tabId.includes(p))

const dockerOpsByTab = (tabId: string, row: InfraResourceRow): InfraOperation[] => {
  if (matchTab(tabId, 'containers')) return dockerContainerOps(row)
  if (matchTab(tabId, 'hosts')) return dockerHostOps(row)
  if (matchTab(tabId, 'images')) return dockerImageOps(row)
  if (matchTab(tabId, 'networks')) return dockerNetworkOps(row)
  if (matchTab(tabId, 'volumes')) return dockerVolumeOps(row)
  if (matchTab(tabId, 'logs')) return dockerLogOps(row)
  return dockerContainerOps(row)
}

const k8sOpsByTab = (tabId: string, row: InfraResourceRow): InfraOperation[] => {
  if (matchTab(tabId, 'pods')) return k8sPodOps(row)
  if (matchTab(tabId, 'deployments')) return k8sDeploymentOps(row)
  if (matchTab(tabId, 'services')) return k8sServiceOps(row)
  if (matchTab(tabId, 'namespaces')) return k8sNamespaceOps(row)
  if (matchTab(tabId, 'nodes')) return k8sNodeOps(row)
  if (matchTab(tabId, 'clusters')) return k8sClusterOps(row)
  if (matchTab(tabId, 'events')) return k8sEventOps(row)
  return k8sPodOps(row)
}

const networkOpsByTab = (tabId: string, row: InfraResourceRow): InfraOperation[] => {
  if (matchTab(tabId, 'vpc', 'vnet')) return networkVpcOps(row)
  if (matchTab(tabId, 'subred')) return networkSubnetOps(row)
  if (matchTab(tabId, 'firewall', 'sg')) return networkFirewallOps(row)
  if (matchTab(tabId, 'balance')) return networkLbOps(row)
  if (matchTab(tabId, 'dns', 'ip')) return networkDnsOps(row)
  return networkVpcOps(row)
}

const storageOpsByTab = (tabId: string, row: InfraResourceRow): InfraOperation[] => {
  if (matchTab(tabId, 'vol', 'disco')) return storageVolumeOps(row)
  if (matchTab(tabId, 'bucket', 'objeto')) return storageBucketOps(row)
  if (matchTab(tabId, 'capacidad', 'uso')) return storageCapacityOps(row)
  if (matchTab(tabId, 'snapshot')) return [
    op({ id: 'inspect', label: 'Inspeccionar snapshot', icon: 'search', description: 'Origen, tamaño y estado.' }),
    op({ id: 'restore', label: 'Restaurar', icon: 'restore', description: 'Restaurar desde snapshot.', confirm: '¿Restaurar desde este snapshot?' }),
    op({ id: 'delete', label: 'Eliminar snapshot', icon: 'delete', description: 'Eliminar permanentemente.', confirm: '¿Eliminar snapshot?' }),
  ]
  return storageVolumeOps(row)
}

const backupsOpsByTab = (tabId: string, row: InfraResourceRow): InfraOperation[] => {
  if (matchTab(tabId, 'program')) return backupScheduledOps(row)
  if (matchTab(tabId, 'restaur')) return backupRestoreOps(row)
  if (matchTab(tabId, 'alert')) return backupAlertOps(row)
  return backupSnapshotOps(row)
}

const capacityOpsByTab = (tabId: string, row: InfraResourceRow): InfraOperation[] => {
  if (matchTab(tabId, 'recomend')) return capacityRecommendOps(row)
  if (matchTab(tabId, 'predic')) return capacityForecastOps(row)
  if (matchTab(tabId, 'escenario')) return capacityScenarioOps(row)
  if (matchTab(tabId, 'cost')) return capacityCostOps(row)
  return capacityRecommendOps(row)
}

export const resolveModuleOperations = (
  moduleId: string,
  tabId: string,
  row: InfraResourceRow,
): InfraOperation[] => {
  switch (moduleId) {
    case 'docker':
      return dockerOpsByTab(tabId, row)
    case 'kubernetes':
      return k8sOpsByTab(tabId, row)
    case 'network':
      return networkOpsByTab(tabId, row)
    case 'storage':
      return storageOpsByTab(tabId, row)
    case 'backups':
      return backupsOpsByTab(tabId, row)
    case 'capacity-planner':
      return capacityOpsByTab(tabId, row)
    default:
      return []
  }
}
