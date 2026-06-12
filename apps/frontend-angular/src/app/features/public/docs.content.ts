export type DocBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; level: 2 | 3; text: string; anchor: string }
  | { type: 'list'; ordered?: boolean; items: string[] }
  | { type: 'steps'; items: { title: string; body: string }[] }
  | { type: 'callout'; variant: 'info' | 'tip' | 'warning' | 'success'; title?: string; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }

export type DocArticle = {
  id: string
  title: string
  description: string
  icon: string
  categoryId: string
  readMinutes: number
  tags: string[]
  blocks: DocBlock[]
  related?: string[]
}

export type DocCategory = {
  id: string
  title: string
  icon: string
  description: string
}

export const DOC_CATEGORIES: DocCategory[] = [
  { id: 'start', title: 'Primeros pasos', icon: 'rocket_launch', description: 'Cuenta, acceso y configuración inicial' },
  { id: 'overview', title: 'Resumen y visibilidad', icon: 'space_dashboard', description: 'Tablero, centro de mando y salud' },
  { id: 'cloud', title: 'Nubes e infraestructura', icon: 'cloud_queue', description: 'AWS, GCP, Azure, IONOS, instancias y VPS' },
  { id: 'automation', title: 'Automatización', icon: 'build_circle', description: 'AI Infra Studio, CI/CD, runbooks y programador' },
  { id: 'repos', title: 'Repositorios', icon: 'folder_special', description: 'GitHub, GitLab y despliegues' },
  { id: 'observability', title: 'Observabilidad', icon: 'visibility', description: 'Métricas, alertas, facturación e informes' },
  { id: 'security', title: 'Seguridad y administración', icon: 'shield', description: 'Usuarios, roles, tokens y auditoría' },
  { id: 'help', title: 'Ayuda y buenas prácticas', icon: 'help_outline', description: 'FAQ, soporte y recomendaciones' },
]

const p = (text: string): DocBlock => ({ type: 'paragraph', text })
const h2 = (text: string, anchor: string): DocBlock => ({ type: 'heading', level: 2, text, anchor })
const h3 = (text: string, anchor: string): DocBlock => ({ type: 'heading', level: 3, text, anchor })
const ul = (...items: string[]): DocBlock => ({ type: 'list', items })
const steps = (...items: { title: string; body: string }[]): DocBlock => ({ type: 'steps', items })
const callout = (
  variant: 'info' | 'tip' | 'warning' | 'success',
  text: string,
  title?: string,
): DocBlock => ({ type: 'callout', variant, title, text })
const table = (headers: string[], rows: string[][]): DocBlock => ({ type: 'table', headers, rows })

export const DOC_ARTICLES: DocArticle[] = [
  {
    id: 'intro',
    title: 'Qué es Spendlyx',
    description: 'Visión general del panel PRO multi-usuario para operaciones cloud.',
    icon: 'hub',
    categoryId: 'start',
    readMinutes: 4,
    tags: ['introducción', 'panel', 'pro'],
    related: ['register', 'integrations'],
    blocks: [
      p('Spendlyx es un panel de operaciones cloud en español que unifica nubes públicas, infraestructura, automatización, repositorios y observabilidad en una sola interfaz.'),
      p('Está pensado para equipos DevOps, SRE, agencias y startups que necesitan visibilidad real sobre sus recursos — sin saltar entre diez herramientas distintas.'),
      h2('Qué puedes hacer con Spendlyx', 'capacidades'),
      ul(
        'Conectar cuentas AWS, GCP, Azure, IONOS y proveedores VPS y sincronizar inventario en vivo',
        'Lanzar infraestructura desde AI Infra Studio con wizard, validaciones, coste y logs',
        'Gestionar instancias, Docker, Kubernetes y VPS desde un inventario unificado',
        'Ejecutar acciones operativas desde el centro de mando con trazabilidad',
        'Revisar facturación general y costes estimados por instancia y proveedor',
        'Integrar Jenkins, runbooks, GitHub y GitLab',
        'Configurar alertas, auditoría y control de acceso por roles (RBAC)',
      ),
      callout(
        'info',
        'En modo PRO los datos provienen de PostgreSQL y de las integraciones que configures. Si una sección no tiene fuente conectada, verás un estado vacío o el mensaje «Configuración requerida» — nunca datos simulados.',
        'Modo PRO',
      ),
      h2('Arquitectura del panel', 'arquitectura'),
      p('El panel se organiza en módulos del menú lateral: Resumen, Nubes, VPS, Infraestructura, Automatización, Repositorios, Observabilidad, Seguridad y Administración. Cada módulo agrupa pestañas relacionadas para que encuentres rápido lo que necesitas.'),
    ],
  },
  {
    id: 'register',
    title: 'Crear tu cuenta',
    description: 'Registro, verificación de correo y primer acceso al panel.',
    icon: 'person_add',
    categoryId: 'start',
    readMinutes: 3,
    tags: ['registro', 'email', 'verificación'],
    related: ['login', 'integrations'],
    blocks: [
      h2('Registro paso a paso', 'pasos'),
      steps(
        {
          title: 'Completa el formulario',
          body: 'Ve a Crear cuenta e introduce nombre, empresa, correo y contraseña (mínimo 8 caracteres). Debes aceptar términos y política de privacidad.',
        },
        {
          title: 'Verifica tu correo',
          body: 'Recibirás un enlace de validación válido 24 horas. Sin verificación no podrás iniciar sesión con email y contraseña.',
        },
        {
          title: 'Accede al panel',
          body: 'Tras verificar, inicia sesión. Se creará automáticamente tu organización y espacio de trabajo principal.',
        },
      ),
      callout(
        'tip',
        'También puedes registrarte o acceder con Google o GitHub si el administrador de la plataforma ha configurado OAuth en el servidor.',
        'OAuth',
      ),
      h2('Problemas frecuentes', 'problemas'),
      table(
        ['Situación', 'Qué hacer'],
        [
          ['No llega el correo', 'Revisa spam. Usa Reenviar verificación desde el enlace del error de login.'],
          ['Enlace expirado', 'Solicita un nuevo enlace en /reenviar-verificacion'],
          ['Email ya registrado', 'Usa Iniciar sesión o recupera acceso con soporte'],
        ],
      ),
    ],
  },
  {
    id: 'login',
    title: 'Iniciar sesión',
    description: 'Acceso con correo, OAuth y resolución de errores comunes.',
    icon: 'login',
    categoryId: 'start',
    readMinutes: 2,
    tags: ['login', 'oauth', 'sesión'],
    related: ['register', 'users'],
    blocks: [
      p('En la pantalla de inicio de sesión puedes usar correo y contraseña, o los botones de Google y GitHub cuando estén habilitados en tu instancia.'),
      h2('Opciones de acceso', 'opciones'),
      ul(
        'Correo + contraseña (requiere email verificado)',
        'Continuar con Google',
        'Continuar con GitHub',
      ),
      callout(
        'warning',
        'Si ves «Tu cuenta aún no ha sido verificada», debes completar la verificación por correo antes de acceder con email y contraseña.',
        'Cuenta no verificada',
      ),
      h2('Seguridad de sesión', 'seguridad'),
      p('Las sesiones usan tokens JWT. Cierra sesión desde el menú de usuario si compartes equipo. En producción, Spendlyx opera bajo HTTPS en spendlyx.com.'),
    ],
  },
  {
    id: 'integrations',
    title: 'Conectar integraciones',
    description: 'Cómo enlazar nubes, repositorios y herramientas externas.',
    icon: 'link',
    categoryId: 'start',
    readMinutes: 5,
    tags: ['integraciones', 'aws', 'gcp', 'github'],
    related: ['cloud-aws', 'repos-github'],
    blocks: [
      p('Las integraciones se configuran desde Configuración → Cuentas cloud, Repositorios o los asistentes de conexión en cada sección del panel.'),
      h2('Tipos de conexión', 'tipos'),
      table(
        ['Integración', 'Método', 'Dónde configurar'],
        [
          ['AWS', 'Access Key + Secret o rol IAM', 'Nubes → AWS → Cuentas / Configuración'],
          ['GCP', 'Cuenta de servicio JSON', 'Nubes → GCP → Proyectos'],
          ['Azure', 'App registration / Service Principal', 'Nubes → Azure → Suscripciones'],
          ['GitHub', 'OAuth o Personal Access Token', 'Repositorios → GitHub → Conectar'],
          ['GitLab', 'OAuth o PAT', 'Repositorios → GitLab'],
          ['Jenkins', 'URL + credenciales API', 'Automatización → Jenkins'],
        ],
      ),
      h2('Sincronización', 'sync'),
      p('Tras conectar una cuenta cloud, usa Sincronizar o espera la sincronización automática en segundo plano (cada ~30 s en las vistas de nube). El inventario se reconcilia: las instancias eliminadas en el proveedor se marcan como terminadas y dejan de aparecer en la vista activa.'),
      callout(
        'success',
        'Comprueba el estado en la tarjeta de cuenta: última sincronización, región por defecto y mensaje de error si la validación falló.',
        'Estado de conexión',
      ),
    ],
  },
  {
    id: 'dashboard',
    title: 'Tablero principal',
    description: 'KPIs, actividad reciente y lectura del estado operativo.',
    icon: 'dashboard',
    categoryId: 'overview',
    readMinutes: 4,
    tags: ['tablero', 'kpi', 'métricas'],
    related: ['command-center', 'health-center'],
    blocks: [
      p('El Tablero es tu vista de aterrizaje tras iniciar sesión. Resume el estado de la flota, costes, alertas y actividad reciente del equipo.'),
      h2('Elementos del tablero', 'elementos'),
      ul(
        'KPIs de instancias activas, salud y gasto estimado',
        'Selector de rango temporal (día, semana, mes)',
        'Timeline de actividad y acciones recientes',
        'Tabla de flota con acceso rápido al detalle de instancia',
        'Paneles de resumen por proveedor cloud',
      ),
      h2('Interpretación', 'interpretacion'),
      p('Si no hay integraciones conectadas, los KPIs mostrarán cero o estados vacíos con indicaciones para conectar cuentas. Esto es comportamiento esperado en modo PRO: no se rellenan con datos de demostración.'),
      callout(
        'tip',
        'Usa el selector de espacio de trabajo (si tu organización tiene varios proyectos) para acotar métricas a un entorno concreto.',
        'Multi-workspace',
      ),
    ],
  },
  {
    id: 'command-center',
    title: 'Centro de mando',
    description: 'Acciones operativas, plataformas conectadas y ejecución con trazabilidad.',
    icon: 'terminal',
    categoryId: 'overview',
    readMinutes: 5,
    tags: ['centro de mando', 'acciones', 'operaciones'],
    related: ['dashboard', 'approvals'],
    blocks: [
      p('El Centro de mando concentra acciones rápidas sobre AWS, GCP, Kubernetes, Jenkins, Terraform, Docker y más — con historial y tasas de éxito basadas en auditoría real.'),
      h2('Plataformas', 'plataformas'),
      p('Cada tarjeta de plataforma muestra tareas activas y última acción. Los conteos provienen del inventario sincronizado y de ejecuciones registradas, no de valores fijos.'),
      h2('Ejecutar una acción', 'ejecutar'),
      steps(
        {
          title: 'Elige la plataforma',
          body: 'Pulsa la tarjeta AWS, GCP, Jenkins, etc.',
        },
        {
          title: 'Selecciona acción y recurso',
          body: 'El asistente lista solo recursos reales de tu inventario. Si no hay recursos, verás un aviso para conectar la integración.',
        },
        {
          title: 'Confirma y revisa',
          body: 'Las acciones sensibles pueden requerir aprobación según tu rol. El resultado queda en auditoría.',
        },
      ),
      callout(
        'info',
        'Las acciones recientes y el porcentaje de éxito se calculan a partir del registro de auditoría del módulo.',
        'Trazabilidad',
      ),
    ],
  },
  {
    id: 'health-center',
    title: 'Centro de salud',
    description: 'Estado de salud de recursos, incidentes y metadatos.',
    icon: 'monitor_heart',
    categoryId: 'overview',
    readMinutes: 4,
    tags: ['salud', 'incidentes', 'recursos'],
    related: ['alerts', 'resource-explorer'],
    blocks: [
      p('El Centro de salud agrupa el estado de instancias y recursos monitorizados, con filtros por severidad y proveedor.'),
      h2('Vistas disponibles', 'vistas'),
      ul(
        'Resumen de recursos afectados y saludables',
        'Detalle de incidente con metadatos del recurso',
        'Panel lateral con información de cuenta y región',
        'Enlaces al explorador de recursos y a la nube correspondiente',
      ),
      h2('Sin datos de salud', 'vacio'),
      p('Si no hay instancias activas o integraciones de métricas, la vista estará vacía. Conecta cuentas cloud y sincroniza inventario para poblar el centro de salud.'),
    ],
  },
  {
    id: 'resource-explorer',
    title: 'Explorador y topología',
    description: 'Inventario unificado y mapa de relaciones entre recursos.',
    icon: 'manage_search',
    categoryId: 'overview',
    readMinutes: 4,
    tags: ['explorador', 'topología', 'inventario'],
    related: ['cloud-aws', 'instances'],
    blocks: [
      h2('Explorador de recursos', 'explorador'),
      p('Lista recursos descubiertos desde cuentas conectadas. Filtra por proveedor, tipo, región y estado. Abre el panel de detalle para ver metadatos, etiquetas y acciones disponibles.'),
      h2('Mapa de topología', 'topologia'),
      p('Visualiza la relación cuenta → región → red → instancias. Selecciona una cuenta cloud en el selector para generar el grafo a partir de datos sincronizados.'),
      callout(
        'tip',
        'En móvil y tablet usa gestos de arrastre y zoom en el mapa. El menú lateral del panel se abre con el icono de hamburguesa.',
        'Dispositivos táctiles',
      ),
    ],
  },
  {
    id: 'cloud-aws',
    title: 'Nubes: AWS, GCP y Azure',
    description: 'Planos de control por proveedor, EC2/Compute y facturación.',
    icon: 'cloud',
    categoryId: 'cloud',
    readMinutes: 6,
    tags: ['aws', 'gcp', 'azure', 'ec2'],
    related: ['integrations', 'billing'],
    blocks: [
      p('Cada proveedor tiene su propio plano de control con pestañas: Resumen, Cuentas/Proyectos, Instancias, Red, Facturación y Métricas.'),
      h2('AWS', 'aws'),
      ul(
        'Resumen: KPIs de cuentas, instancias en ejecución y coste MTD',
        'Cuentas: credenciales, estado de sync y última sincronización',
        'EC2: tabla de instancias con filtros por región, estado y terminadas',
        'Red: VPCs y grupos de seguridad sincronizados',
        'Facturación: desglose por cuenta y servicio',
      ),
      h2('GCP y Azure', 'gcp-azure'),
      p('GCP usa Compute Engine en lugar de EC2; Azure usa Máquinas virtuales. La estructura de pestañas es equivalente. Conecta la cuenta desde el asistente de cada proveedor.'),
      h2('Instancias terminadas', 'terminadas'),
      p('En el filtro de estado elige «Borradas / Terminadas» para ver instancias que ya no existen en el proveedor pero permanecen en el historial de Spendlyx.'),
      callout(
        'warning',
        'Las instancias mostradas son las devueltas por la API del proveedor tras sincronizar. Si una VM no aparece, comprueba región, permisos IAM y que la sync haya finalizado sin errores.',
        'Inventario en vivo',
      ),
    ],
  },
  {
    id: 'instances',
    title: 'Instancias e infraestructura',
    description: 'Listado global, Docker, Kubernetes, red y almacenamiento.',
    icon: 'layers',
    categoryId: 'cloud',
    readMinutes: 5,
    tags: ['instancias', 'docker', 'kubernetes'],
    related: ['cloud-aws', 'vps'],
    blocks: [
      h2('Todas las instancias', 'listado'),
      p('Vista unificada de VMs cloud y servidores VPS. Filtra por proveedor, región y estado. Desde cada fila puedes iniciar, detener o abrir el detalle según tu rol.'),
      h2('Docker y Kubernetes', 'containers'),
      ul(
        'Docker: hosts, contenedores, imágenes y redes (requiere host descubierto)',
        'Kubernetes: clusters, pods, deployments y servicios',
        'Acciones de descubrimiento desde el detalle de instancia compatible',
      ),
      h2('Red, almacenamiento y copias', 'otros'),
      p('Las secciones Red, Almacenamiento, Copias de seguridad y Planificador de capacidad amplían la vista de infraestructura cuando existen datos en el backend.'),
    ],
  },
  {
    id: 'vps',
    title: 'Proveedores VPS',
    description: 'DigitalOcean, Hetzner, Linode y OVH.',
    icon: 'dns',
    categoryId: 'cloud',
    readMinutes: 3,
    tags: ['vps', 'digitalocean', 'hetzner'],
    related: ['instances', 'integrations'],
    blocks: [
      p('El módulo VPS replica la estructura de Nubes para proveedores bare-metal y VPS: resumen, cuentas, servidores, facturación y métricas por proveedor.'),
      p('Añade servidores manualmente o conecta API del proveedor cuando esté disponible. Las operaciones SSH y terminal dependen de la configuración de acceso en cada servidor.'),
    ],
  },
  {
    id: 'ai-infra-studio',
    title: 'AI Infra Studio',
    description: 'Wizard multi-cloud para lanzar, probar y eliminar infraestructura.',
    icon: 'auto_awesome',
    categoryId: 'automation',
    readMinutes: 5,
    tags: ['ai infra studio', 'lanzamiento', 'aws', 'gcp', 'ionos'],
    related: ['cloud-aws', 'instances', 'vps'],
    blocks: [
      p('AI Infra Studio es la pantalla principal para crear infraestructura desde Spendlyx. Vive en Automatización → AI Infra Studio y respeta la navegación real del panel.'),
      h2('Entradas del flujo', 'entradas'),
      ul(
        'Automatización → AI Infra Studio abre el wizard multi-cloud completo',
        'Nubes → AWS → EC2 abre el mismo flujo con AWS preseleccionado',
        'Nubes → GCP abre el mismo flujo con GCP preseleccionado',
        'VPS → IONOS → Servidores abre el mismo flujo con IONOS preseleccionado',
      ),
      h2('Campos por proveedor', 'campos'),
      table(
        ['Proveedor', 'Campos principales'],
        [
          ['AWS EC2', 'Cuenta, región, AZ, VPC, subnet, security group, key pair, AMI, tipo, disco, nombre, tags y coste'],
          ['GCP Compute Engine', 'Proyecto, cuenta, región, zona, VPC network, subnet, firewall rule, machine type, boot disk, image, SSH key y labels'],
          ['IONOS VPS', 'Cuenta IONOS, datacenter, región, plan VPS, CPU, RAM, disco, sistema operativo, SSH key, nombre y coste'],
        ],
      ),
      h2('Después de crear', 'despues'),
      ul(
        'El recurso debe aparecer en Infraestructura → Instancias con proveedor, estado, IP, tamaño, coste y acciones',
        'Los eventos de lanzamiento, prueba y eliminación se consultan en el wizard y en Observabilidad → Logs',
        'Los datos de coste quedan preparados para Facturación general y Optimizador de costes',
      ),
      callout(
        'warning',
        'Si faltan datos obligatorios, el wizard debe indicar el campo pendiente antes de continuar. No debe dejar el botón siguiente bloqueado sin explicación.',
        'Validación visible',
      ),
    ],
  },
  {
    id: 'jenkins-terraform',
    title: 'Jenkins, runbooks y automatización',
    description: 'Pipelines CI/CD, procedimientos y tareas programadas.',
    icon: 'build',
    categoryId: 'automation',
    readMinutes: 5,
    tags: ['jenkins', 'runbooks', 'cicd'],
    related: ['repos-github', 'deployments'],
    blocks: [
      h2('Jenkins', 'jenkins'),
      ul(
        'Conecta tu servidor Jenkins con URL y token API',
        'Lista jobs, builds y etapas de pipeline',
        'Lanza builds y revisa logs desde el panel',
        'Estado vacío hasta conectar un Jenkins real',
      ),
      h2('Terraform', 'terraform'),
      ul(
        'Workspaces vinculados a backends remotos o locales',
        'Planes y applies con historial de ejecución',
        'Integración con aprobaciones para cambios en producción',
      ),
      callout(
        'info',
        'Sin servidor Jenkins o workspaces Terraform configurados, verás pantallas de configuración requerida — no jobs ni runs de ejemplo.',
        'Datos live',
      ),
    ],
  },
  {
    id: 'runbooks-scheduler',
    title: 'Runbooks y programador',
    description: 'Procedimientos automatizados y tareas programadas.',
    icon: 'auto_stories',
    categoryId: 'automation',
    readMinutes: 4,
    tags: ['runbooks', 'scheduler', 'automatización'],
    related: ['command-center', 'approvals'],
    blocks: [
      h2('Runbooks', 'runbooks'),
      p('Crea procedimientos con pasos, objetivos (instancias, clusters) y ejecución manual o bajo demanda. El catálogo y el calendario de ejecuciones tienen pestañas dedicadas.'),
      h2('Programador', 'scheduler'),
      p('Define tareas recurrentes (cron) vinculadas a runbooks o acciones del sistema. Revisa próximas ejecuciones y historial en la misma sección.'),
    ],
  },
  {
    id: 'repos-github',
    title: 'Repositorios GitHub y GitLab',
    description: 'Conexión, sync, ramas, commits, PRs y despliegues.',
    icon: 'code',
    categoryId: 'repos',
    readMinutes: 6,
    tags: ['github', 'gitlab', 'repositorios'],
    related: ['integrations', 'jenkins-terraform'],
    blocks: [
      h2('Conectar GitHub', 'github'),
      steps(
        {
          title: 'OAuth o PAT',
          body: 'Usa el asistente en Repositorios → GitHub. OAuth redirige a GitHub; con PAT pegas un token con permisos repo.',
        },
        {
          title: 'Sincronizar',
          body: 'Tras conectar, sincroniza para importar repositorios a la base de datos.',
        },
        {
          title: 'Explorar',
          body: 'Ramas, commits, pull requests, webhooks y despliegues tienen rutas dedicadas en el menú Repositorios.',
        },
      ),
      h2('GitLab', 'gitlab'),
      p('Misma filosofía con proyectos GitLab. Requiere OAuth o token configurado en el servidor Spendlyx.'),
      callout(
        'tip',
        'Los datos de ramas y commits se actualizan al pulsar Sincronizar en cada sección o tras webhooks configurados.',
        'Mantener datos al día',
      ),
    ],
  },
  {
    id: 'billing',
    title: 'Facturación y costes',
    description: 'Gasto cloud, optimizador y facturación por instancia.',
    icon: 'payments',
    categoryId: 'observability',
    readMinutes: 5,
    tags: ['facturación', 'costes', 'billing'],
    related: ['cloud-aws', 'dashboard'],
    blocks: [
      p('La sección Facturación agrega gasto por proveedor (AWS, GCP, Azure), tendencias MTD y desglose por servicio o instancia cuando las APIs de billing están disponibles.'),
      h2('Requisitos', 'requisitos'),
      ul(
        'Cuenta cloud conectada con permisos de lectura de costes',
        'Sincronización de billing desde el panel o job programado',
        'Para detalle por instancia: inventario EC2/Compute sincronizado',
      ),
      h2('Optimizador de costes', 'optimizador'),
      p('Revisa recomendaciones de rightsizing, instancias detenidas con coste residual y alertas de presupuesto en Optimizador de costes (Observabilidad).'),
      callout(
        'info',
        'La vista de login pública muestra una captura del módulo de facturación como referencia visual del panel.',
        'Vista previa',
      ),
    ],
  },
  {
    id: 'alerts',
    title: 'Alertas, logs e informes',
    description: 'Monitorización, incidentes y notificaciones.',
    icon: 'notifications_active',
    categoryId: 'observability',
    readMinutes: 4,
    tags: ['alertas', 'logs', 'métricas'],
    related: ['health-center', 'billing'],
    blocks: [
      h2('Módulos de observabilidad', 'modulos'),
      table(
        ['Sección', 'Uso'],
        [
          ['Métricas', 'Dashboards y series temporales'],
          ['Logs', 'Búsqueda y agregación de eventos'],
          ['Alertas', 'Reglas activas y silenciadas'],
          ['Incidentes', 'Gestión de ciclo de vida'],
          ['Notificaciones', 'Bandeja de avisos del panel'],
          ['Informes', 'Exportes y resúmenes periódicos'],
        ],
      ),
      p('Cada subsección requiere fuentes configuradas (Prometheus, Loki, cloud APIs, etc.). Sin fuente, la tabla estará vacía con mensaje orientativo.'),
    ],
  },
  {
    id: 'users',
    title: 'Usuarios, roles y tokens',
    description: 'RBAC, invitaciones y API tokens.',
    icon: 'group',
    categoryId: 'security',
    readMinutes: 5,
    tags: ['usuarios', 'roles', 'rbac', 'api'],
    related: ['audit', 'login'],
    blocks: [
      h2('Roles disponibles', 'roles'),
      table(
        ['Rol', 'Alcance típico'],
        [
          ['Superadministrador', 'Acceso total a la plataforma'],
          ['Administrador', 'Gestión de org, usuarios e integraciones'],
          ['Operador', 'Ejecución de acciones y despliegues'],
          ['Auditor', 'Lectura + auditoría'],
          ['Solo lectura', 'Consulta sin cambios'],
        ],
      ),
      h2('Tokens API', 'tokens'),
      p('Crea tokens con alcance limitado para scripts y CI. Revócalos cuando dejen de usarse. Los tokens heredan permisos del rol asignado.'),
      callout(
        'warning',
        'Principio de mínimo privilegio: asigna el rol más restrictivo que permita la tarea.',
        'Seguridad',
      ),
    ],
  },
  {
    id: 'audit',
    title: 'Auditoría y cumplimiento',
    description: 'Registro de actividad, seguridad y políticas.',
    icon: 'fact_check',
    categoryId: 'security',
    readMinutes: 3,
    tags: ['auditoría', 'seguridad', 'compliance'],
    related: ['users', 'command-center'],
    blocks: [
      p('Auditoría registra quién hizo qué, sobre qué recurso y cuándo. Filtra por usuario, acción, recurso y rango de fechas.'),
      h2('Otras secciones de seguridad', 'otras'),
      ul(
        'Centro de seguridad: postura y hallazgos',
        'Gestor de secretos: credenciales centralizadas',
        'Cumplimiento / Políticas: controles y evidencias',
        'Control de acceso: matrices de permisos',
      ),
    ],
  },
  {
    id: 'faq',
    title: 'Preguntas frecuentes',
    description: 'Respuestas rápidas sobre el panel y soporte.',
    icon: 'quiz',
    categoryId: 'help',
    readMinutes: 5,
    tags: ['faq', 'soporte', 'ayuda'],
    related: ['intro', 'integrations'],
    blocks: [
      h2('General', 'general'),
      h3('¿Por qué veo pantallas vacías?', 'vacio'),
      p('En modo PRO solo se muestran datos reales. Conecta la integración correspondiente y sincroniza.'),
      h3('¿Hay modo demo?', 'demo'),
      p('La instancia pública spendlyx.com opera en modo PRO sin datos simulados.'),
      h3('¿Multi-usuario?', 'multi'),
      p('Sí. Organizaciones, espacios de trabajo y membresías permiten varios usuarios con roles distintos.'),
      h2('Soporte', 'soporte'),
      p('Contacto: info@spendlyx.com o el formulario en /contacto.'),
    ],
  },
  {
    id: 'best-practices',
    title: 'Buenas prácticas',
    description: 'Recomendaciones para operar Spendlyx con seguridad.',
    icon: 'verified',
    categoryId: 'help',
    readMinutes: 4,
    tags: ['buenas prácticas', 'seguridad', 'operaciones'],
    related: ['users', 'audit'],
    blocks: [
      ul(
        'Rota credenciales cloud y tokens API periódicamente',
        'Usa roles de solo lectura para usuarios que no ejecutan cambios',
        'Revisa auditoría tras cambios en producción',
        'Configura alertas de presupuesto en cuentas cloud',
        'Mantén sincronización activa para inventario fiable',
        'Exporta informes de facturación para conciliación mensual',
      ),
      callout(
        'success',
        'Documenta en runbooks los procedimientos repetitivos (reinicios, escalados, backups) para que el equipo los ejecute desde el panel con trazabilidad.',
        'Operaciones maduras',
      ),
    ],
  },
]

export const getDocById = (id: string): DocArticle | undefined =>
  DOC_ARTICLES.find((a) => a.id === id)

export const getDocsByCategory = (categoryId: string): DocArticle[] =>
  DOC_ARTICLES.filter((a) => a.categoryId === categoryId)

export const searchDocs = (query: string): DocArticle[] => {
  const q = query.trim().toLowerCase()
  if (!q) return DOC_ARTICLES
  return DOC_ARTICLES.filter(
    (a) =>
      a.title.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.tags.some((t) => t.includes(q)) ||
      a.blocks.some((b) => {
        if (b.type === 'paragraph' || b.type === 'callout') return b.text.toLowerCase().includes(q)
        if (b.type === 'heading') return b.text.toLowerCase().includes(q)
        if (b.type === 'list') return b.items.some((i) => i.toLowerCase().includes(q))
        if (b.type === 'steps') return b.items.some((s) => `${s.title} ${s.body}`.toLowerCase().includes(q))
        if (b.type === 'table')
          return b.rows.some((r) => r.some((c) => c.toLowerCase().includes(q)))
        return false
      }),
  )
}
