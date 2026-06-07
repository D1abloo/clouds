import type { NavLogoKey } from '../theme/nav-logo.types'
import { cloudMeta, resolveReportCloud, type ReportCloudProvider } from './report-cloud.util'

export type ReportDocumentSection = {
  id: string
  title: string
  paragraphs: string[]
  bullets?: string[]
  table?: { headers: string[]; rows: string[][] }
  highlight?: string
}

export type ReportDocument = {
  id: string
  cloud: ReportCloudProvider
  cloudLabel: string
  primaryLogo: NavLogoKey
  title: string
  subtitle: string
  type: string
  typeLabel: string
  period: string
  status: string
  generatedAt: string
  author: string
  classification: string
  version: string
  logos: NavLogoKey[]
  executiveSummary: string
  kpis: { label: string; value: string; delta?: string; tone?: 'ok' | 'warn' | 'crit' }[]
  sections: ReportDocumentSection[]
  recommendations: string[]
  appendix?: string[]
}

const fmtDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })
  } catch {
    return iso
  }
}

const withCloud = (
  cloud: ReportCloudProvider,
  doc: Omit<ReportDocument, 'cloud' | 'cloudLabel' | 'primaryLogo'>,
): ReportDocument => {
  const meta = cloudMeta(cloud)
  return { ...doc, cloud, cloudLabel: meta.label, primaryLogo: meta.logo, logos: [meta.logo] }
}

const scopeSection = (cloud: ReportCloudProvider, type: string): ReportDocumentSection => {
  const meta = cloudMeta(cloud)
  const source =
    type === 'cost'
      ? meta.billingSource
      : type === 'security'
        ? `Security Hub / Security Command Center / Defender for Cloud (${meta.shortLabel})`
        : type === 'availability'
          ? `CloudWatch / Cloud Monitoring / Azure Monitor (${meta.shortLabel})`
          : `APIs ${meta.shortLabel} + inventario CloudOps`
  return {
    id: 'scope',
    title: 'Alcance del informe',
    paragraphs: [
      `Este documento evalúa el entorno ${meta.label} (${meta.shortLabel}) durante el periodo indicado en la cabecera.`,
      `Regiones incluidas: ${meta.regionsLabel}. Se excluyen cuentas sandbox personales, recursos eliminados hace más de 30 días y cargos de marketplace no aprobados por FinOps.`,
      `Fuente de datos principal: ${source}. Sincronización automatizada cada 6 horas con validación cruzada frente al inventario en tiempo real.`,
    ],
  }
}

const methodologySection = (type: string): ReportDocumentSection => ({
  id: 'methodology',
  title: 'Metodología',
  paragraphs: [
    'Las cifras monetarias están normalizadas a USD, sin impuestos locales salvo indicación expresa. Las variaciones porcentuales se calculan respecto al periodo anterior de igual duración.',
    type === 'cost'
      ? 'El desglose por servicio sigue la taxonomía del proveedor. Las recomendaciones de optimización provienen del motor FinOps (rightsizing, recursos huérfanos, reservas y políticas de retención).'
      : type === 'security'
        ? 'Los hallazgos se clasifican por severidad (crítico, alto, medio, bajo) según CVSS, exposición a Internet y criticidad del activo. Plazo de remediación crítica: 72 horas.'
        : type === 'availability'
          ? 'La disponibilidad se mide con synthetic probes cada 30 s desde tres regiones y se contrasta con métricas RED (rate, errors, duration) del stack de observabilidad.'
          : 'Los eventos operativos se correlacionan con pipelines CI/CD, cambios IaC y ventanas de mantenimiento aprobadas.',
    'Este informe es de uso interno. Su distribución queda limitada según la clasificación indicada en la cabecera.',
  ],
})

const costExtraSections = (cloud: ReportCloudProvider): ReportDocumentSection[] => {
  const meta = cloudMeta(cloud)
  const riRows: Record<ReportCloudProvider, string[][]> = {
    aws: [
      ['EC2 Reserved (m5.large)', '12 instancias', '1.240 USD/mes ahorro', 'Vigente hasta dic 2026'],
      ['RDS Reserved (db.r5.large)', '2 instancias', '380 USD/mes ahorro', 'Candidato renovación'],
      ['Savings Plan Compute', 'No contratado', 'Est. 420 USD/mes', 'Recomendado Q3'],
      ['EBS gp3 sin uso', '4 volúmenes', '340 USD/mes ahorro', 'Eliminar en 7 días'],
    ],
    gcp: [
      ['Committed use (n2-standard-4)', 'Pendiente', 'Est. 520 USD/mes', 'Recomendado'],
      ['Sustained use discount', 'Aplicado automático', '180 USD/mes', 'Activo'],
      ['BigQuery slots reservados', 'No contratado', 'Est. 200 USD/mes', 'Evaluar Enterprise'],
      ['Discos persistentes huérfanos', '2 discos', '95 USD/mes', 'Eliminar'],
    ],
    azure: [
      ['Reserva VM D4s v5 (1y)', 'Pendiente', 'Est. 380 USD/mes', 'Recomendado'],
      ['Reserva Azure SQL', '1 instancia', '120 USD/mes ahorro', 'Vigente'],
      ['Hybrid Benefit', 'No aplicado', 'Est. 90 USD/mes', 'Revisar licencias'],
      ['Discos managed huérfanos', '3 discos', '110 USD/mes', 'Eliminar'],
    ],
  }
  return [
    {
      id: 'reservations',
      title: 'Reservas, descuentos y recursos huérfanos',
      paragraphs: [
        `Análisis de compromisos de coste y recursos sin uso en ${meta.shortLabel}. Las cifras de ahorro son estimaciones basadas en tarifas on-demand del periodo.`,
      ],
      table: {
        headers: ['Concepto', 'Estado', 'Impacto estimado', 'Acción'],
        rows: riRows[cloud],
      },
    },
    {
      id: 'tagging',
      title: 'Etiquetado y chargeback',
      paragraphs: [
        'Etiquetas obligatorias: environment, owner, cost-center, service. Los recursos sin etiquetado completo no pueden asignarse a un centro de coste en el modelo FinOps.',
      ],
      table: {
        headers: ['Etiqueta', 'Cumplimiento', 'Recursos sin etiqueta', 'Plazo corrección'],
        rows: [
          ['owner', '82 %', '14 recursos', '15 días'],
          ['cost-center', '76 %', '22 recursos', '15 días'],
          ['environment', '94 %', '6 recursos', '7 días'],
          ['service', '88 %', '11 recursos', '15 días'],
        ],
      },
    },
  ]
}

const securityExtraSections = (cloud: ReportCloudProvider): ReportDocumentSection[] => {
  const meta = cloudMeta(cloud)
  return [
    {
      id: 'access-review',
      title: 'Revisión de accesos privilegiados',
      paragraphs: [
        `Inventario de cuentas con permisos elevados en ${meta.shortLabel}. Última revisión manual: 12 mayo 2026.`,
      ],
      table: {
        headers: ['Identidad', 'Rol / permiso', 'Último uso', 'MFA', 'Acción'],
        rows: [
          ['deploy-bot@cloudops', 'Admin / Owner', 'Hace 2 h', 'No', 'Reducir permisos'],
          ['finops-sa', 'Billing read-only', 'Hace 1 d', 'N/A', 'OK'],
          ['break-glass-01', 'Root / Global admin', 'Hace 45 d', 'Sí', 'Revisar necesidad'],
          ['ci-runner-prod', 'Contributor+', 'Hace 6 h', 'N/A', 'Scope a RG'],
        ],
      },
    },
    {
      id: 'scan-coverage',
      title: 'Cobertura de escaneo',
      paragraphs: [
        'Porcentaje de recursos evaluados por herramientas automáticas de postura. Objetivo organizacional: 98 %.',
      ],
      table: {
        headers: ['Ámbito', 'Recursos totales', 'Escaneados', 'Cobertura'],
        rows: [
          ['Compute', '42', '41', '97,6 %'],
          ['Almacenamiento', '28', '28', '100 %'],
          ['Red / firewall', '36', '34', '94,4 %'],
          ['Identidad / IAM', '124', '118', '95,2 %'],
        ],
      },
    },
  ]
}

const activityExtraSections = (cloud: ReportCloudProvider): ReportDocumentSection[] => {
  const meta = cloudMeta(cloud)
  return [
    {
      id: 'deployments',
      title: 'Despliegues por entorno',
      paragraphs: [`Detalle de despliegues ejecutados en ${meta.shortLabel} durante la semana.`],
      table: {
        headers: ['Entorno', 'Despliegues', 'Éxito', 'Rollbacks', 'Duración media'],
        rows: [
          ['Producción', '47', '100 %', '0', '6m 18s'],
          ['Staging', '128', '96 %', '2', '4m 02s'],
          ['QA / preview', '86', '91 %', '4', '3m 44s'],
        ],
      },
    },
    {
      id: 'terraform',
      title: 'Cambios Terraform / IaC',
      paragraphs: ['Resumen de planes y applies registrados en el periodo. Cambios críticos requirieron aprobación CAB.'],
      table: {
        headers: ['Workspace', 'Plans', 'Applies', 'Críticos', 'Estado'],
        rows: [
          ['terraform-modules', '23', '8', '1', 'OK'],
          ['network-prod', '12', '4', '1', 'OK'],
          ['k8s-demo-app', '6', '0', '1', 'Pendiente aprobación'],
        ],
      },
    },
  ]
}

const infraExtraSections = (cloud: ReportCloudProvider): ReportDocumentSection[] => {
  const meta = cloudMeta(cloud)
  return [
    {
      id: 'orphans',
      title: 'Recursos huérfanos y sin owner',
      paragraphs: [`Listado de recursos en ${meta.shortLabel} que requieren acción inmediata.`],
      table: {
        headers: ['Recurso', 'Tipo', 'Región', 'Coste est./mes', 'Acción'],
        rows: [
          ['vol-orphan-001', 'Volumen', meta.regionsLabel.split(',')[0]?.trim() ?? '—', '85 USD', 'Eliminar / adjuntar'],
          ['vol-orphan-002', 'Volumen', meta.regionsLabel.split(',')[0]?.trim() ?? '—', '62 USD', 'Eliminar'],
          ['snap-old-042', 'Snapshot', '—', '34 USD', 'Revisar retención'],
          ['ip-unattached-7', 'IP elástica', '—', '12 USD', 'Liberar'],
        ],
      },
    },
  ]
}

const availabilityExtraSections = (): ReportDocumentSection[] => [
  {
    id: 'latency',
    title: 'Latencia y rendimiento',
    paragraphs: [
      'Métricas de latencia agregadas en ventana móvil de 30 días. El SLO de p99 establece umbral de 500 ms para servicios tier-1.',
    ],
    table: {
      headers: ['Servicio', 'p50', 'p95', 'p99', 'SLO p99', 'Cumple'],
      rows: [
        ['checkout-api', '120 ms', '380 ms', '620 ms', '500 ms', 'No'],
        ['payment-webhook', '85 ms', '210 ms', '340 ms', '800 ms', 'Sí'],
        ['auth-service', '45 ms', '95 ms', '180 ms', '300 ms', 'Sí'],
        ['nginx-edge', '12 ms', '28 ms', '52 ms', '100 ms', 'Sí'],
      ],
    },
  },
  {
    id: 'error-budget',
    title: 'Error budget trimestral',
    paragraphs: [
      'Consumo del error budget de disponibilidad y latencia para el trimestre en curso. Un consumo superior al 80 % requiere congelación de cambios no críticos.',
    ],
    table: {
      headers: ['Servicio', 'Budget disp.', 'Consumido', 'Restante', 'Riesgo'],
      rows: [
        ['checkout-api', '43 min', '35 min', '18 %', 'Alto'],
        ['payment-webhook', '216 min', '92 min', '58 %', 'Bajo'],
        ['auth-service', '43 min', '18 min', '58 %', 'Bajo'],
      ],
    },
  },
]

const finalizeDoc = (
  cloud: ReportCloudProvider,
  doc: Omit<ReportDocument, 'cloud' | 'cloudLabel' | 'primaryLogo'>,
): ReportDocument => {
  const meta = cloudMeta(cloud)
  let extra: ReportDocumentSection[] = []
  if (doc.type === 'cost') extra = costExtraSections(cloud)
  if (doc.type === 'security') extra = securityExtraSections(cloud)
  if (doc.type === 'availability') extra = availabilityExtraSections()
  if (doc.type === 'activity') extra = activityExtraSections(cloud)
  if (doc.type === 'infra') extra = infraExtraSections(cloud)

  return withCloud(cloud, {
    ...doc,
    sections: [scopeSection(cloud, doc.type), methodologySection(doc.type), ...doc.sections, ...extra],
    appendix: [
      ...(doc.appendix ?? []),
      `Documento: ${doc.id} · Versión ${doc.version} · Generado ${doc.generatedAt}`,
      `Regiones: ${meta.regionsLabel} · Moneda base: USD · Zona horaria: UTC`,
      'Metodología: recolección API cada 6 h · Validación FinOps · Sin intervención manual en demo',
      `Distribución: ${doc.classification}`,
    ],
  })
}

const costReport = (cloud: ReportCloudProvider, row: Record<string, unknown>): ReportDocument => {
  const meta = cloudMeta(cloud)
  const profiles: Record<
    ReportCloudProvider,
    Pick<ReportDocument, 'title' | 'subtitle' | 'executiveSummary' | 'kpis' | 'sections' | 'recommendations' | 'appendix'>
  > = {
    aws: {
      title: 'Informe mensual de costes AWS',
      subtitle: `${meta.label} · Cost Explorer · FinOps`,
      executiveSummary:
        'El gasto AWS del periodo alcanzó 7.280 USD, un incremento del 4,1 % respecto a abril 2026 (6.994 USD). ' +
        'El 62 % del coste proviene de compute (EC2 y nodos EKS); almacenamiento S3 y EBS concentra el 22 %; bases de datos RDS el 9 %; transferencia de datos el 7 %. ' +
        'Se identificaron 6 instancias EC2 sobredimensionadas (CPU media < 12 % en 30 días), 4 volúmenes EBS huérfanos sin adjuntar y 2 buckets S3 sin política de lifecycle. ' +
        'El ahorro potencial acumulado asciende a 980 USD/mes aplicando rightsizing, eliminación de recursos huérfanos y contratación de Savings Plan compute.',
      kpis: [
        { label: 'Gasto AWS', value: '7.280 USD', delta: '+4,1 %', tone: 'warn' },
        { label: 'EC2 / EKS', value: '4.512 USD', delta: '62 % del total' },
        { label: 'Almacenamiento', value: '1.640 USD', delta: 'S3 + EBS' },
        { label: 'Ahorro potencial', value: '980 USD/mes', delta: '6 rightsizing', tone: 'ok' },
      ],
      sections: [
        {
          id: 'services',
          title: '1. Top servicios AWS',
          paragraphs: [
            'Regiones activas: ' + meta.regionsLabel + '.',
            'Los cinco servicios siguientes representan el 74 % del gasto total del periodo. El incremento en data transfer (+8,3 %) se debe principalmente a replicación cross-AZ entre eu-west-1a y eu-west-1b en el cluster checkout-api.',
          ],
          table: {
            headers: ['Servicio', 'Coste', 'Variación', 'Acción sugerida'],
            rows: [
              ['EC2 compute', '3.120 USD', '+5,2 %', 'Rightsizing m5.2xlarge → m5.large'],
              ['EKS', '1.392 USD', '+2,1 %', 'Evaluar Fargate profiles'],
              ['S3', '890 USD', '−1,4 %', 'Lifecycle a Glacier IR'],
              ['RDS', '680 USD', '→', 'Reserved instance 1y'],
              ['Data transfer', '420 USD', '+8,3 %', 'Revisar cross-AZ'],
            ],
          },
        },
        {
          id: 'accounts',
          title: '2. Desglose por cuenta vinculada',
          table: {
            headers: ['Cuenta', 'Importe', 'Principal workload', 'Estado presupuesto'],
            rows: [
              ['prod-main (123456789012)', '4.890 USD', 'checkout-api · payment-webhook', '94 %'],
              ['staging (210987654321)', '1.420 USD', 'CI runners · QA', '78 %'],
              ['data-lake (345678901234)', '970 USD', 'Athena · Glue', 'OK'],
            ],
          },
          paragraphs: [],
        },
        {
          id: 'forecast',
          title: '3. Previsión y presupuesto',
          paragraphs: [
            'Proyección junio 2026: 7.380 USD (+1,4 %). Con rightsizing y eliminación de EBS huérfanos, escenario optimizado: 6.300 USD (−13 %).',
          ],
          highlight: 'Presupuesto AWS mensual: 7.500 USD · Consumo actual: 97,1 %',
        },
      ],
      recommendations: [
        'Rightsizing en instancias con CPU media < 15 % durante 30 días (Cost Explorer).',
        'Eliminar 4 volúmenes EBS sin adjuntar (ahorro est. 340 USD/mes).',
        'Activar AWS Cost Anomaly Detection con umbral +20 % diario.',
        'Revisar políticas S3 Intelligent-Tiering en buckets con objetos > 90 días.',
      ],
      appendix: [
        `Datos extraídos de ${meta.billingSource}.`,
        `Regiones: ${meta.regionsLabel} · Moneda: USD · Periodo UTC.`,
        'Contacto: finops@cloudops.local',
      ],
    },
    gcp: {
      title: 'Informe mensual de costes GCP',
      subtitle: `${meta.label} · Billing Export · FinOps`,
      executiveSummary:
        'El gasto GCP del periodo fue de 5.460 USD (+1,8 %). GKE Standard y BigQuery representan el 58 % del total. ' +
        'Recommender sugiere 4 committed use discounts con ahorro estimado de 720 USD/mes en compute.',
      kpis: [
        { label: 'Gasto GCP', value: '5.460 USD', delta: '+1,8 %', tone: 'warn' },
        { label: 'GKE', value: '2.890 USD', delta: '53 % del total' },
        { label: 'BigQuery', value: '980 USD', delta: 'Analítica' },
        { label: 'Ahorro CUD', value: '720 USD/mes', delta: '4 recomendaciones', tone: 'ok' },
      ],
      sections: [
        {
          id: 'services',
          title: '1. Top servicios GCP',
          paragraphs: ['Proyectos: prod-analytics, prod-gke, staging-shared. Regiones: ' + meta.regionsLabel + '.'],
          table: {
            headers: ['Servicio', 'Coste', 'Variación', 'Acción sugerida'],
            rows: [
              ['GKE Standard', '2.890 USD', '+2,4 %', 'Committed use 1y'],
              ['BigQuery', '980 USD', '→', 'Revisar slots on-demand'],
              ['Cloud Storage', '640 USD', '−0,8 %', 'Nearline para backups'],
              ['Cloud SQL', '520 USD', '+1,2 %', 'Rightsizing db-custom-4'],
              ['Networking', '430 USD', '+3,1 %', 'Optimizar egress EU→US'],
            ],
          },
        },
        {
          id: 'projects',
          title: '2. Desglose por proyecto',
          table: {
            headers: ['Proyecto', 'Importe', 'Workload', 'Etiquetado'],
            rows: [
              ['prod-gke-001', '3.120 USD', 'Microservicios prod', '98 % OK'],
              ['prod-analytics', '1.680 USD', 'BigQuery · Dataflow', '92 % OK'],
              ['staging-shared', '660 USD', 'QA · previews', '85 % OK'],
            ],
          },
          paragraphs: [],
        },
        {
          id: 'forecast',
          title: '3. Previsión y presupuesto',
          paragraphs: ['Proyección junio 2026: 5.520 USD. Con CUD aplicados: 4.800 USD (−12 %).'],
          highlight: 'Presupuesto GCP mensual: 6.000 USD · Consumo actual: 91,0 %',
        },
      ],
      recommendations: [
        'Contratar committed use discount para nodos GKE de producción (n2-standard-4).',
        'Migrar datasets BigQuery de on-demand a edición Enterprise con slots reservados.',
        'Activar alertas de presupuesto en Cloud Billing con umbral 90 % y 100 %.',
        'Aplicar políticas de lifecycle en buckets GCS de logs (> 30 días → Nearline).',
      ],
      appendix: [
        `Datos extraídos de ${meta.billingSource}.`,
        `Regiones: ${meta.regionsLabel} · Moneda: USD.`,
        'Contacto: finops@cloudops.local',
      ],
    },
    azure: {
      title: 'Informe mensual de costes Azure',
      subtitle: `${meta.label} · Cost Management · FinOps`,
      executiveSummary:
        'El gasto Azure del periodo alcanzó 3.640 USD (+2,0 %). Las VMs D-series y Azure Blob concentran el 71 % del coste. ' +
        'Azure Advisor identifica 3 reservas de instancia con ahorro potencial de 540 USD/mes.',
      kpis: [
        { label: 'Gasto Azure', value: '3.640 USD', delta: '+2,0 %', tone: 'warn' },
        { label: 'VMs', value: '2.180 USD', delta: '60 % del total' },
        { label: 'Storage', value: '780 USD', delta: 'Blob + Files' },
        { label: 'Ahorro RI', value: '540 USD/mes', delta: '3 reservas', tone: 'ok' },
      ],
      sections: [
        {
          id: 'services',
          title: '1. Top servicios Azure',
          paragraphs: ['Suscripciones: prod-westeu, legacy-integration. Regiones: ' + meta.regionsLabel + '.'],
          table: {
            headers: ['Servicio', 'Coste', 'Variación', 'Acción sugerida'],
            rows: [
              ['Virtual Machines', '2.180 USD', '+2,8 %', 'Reserva 1y D4s v5'],
              ['Blob Storage', '520 USD', '→', 'Cool tier para backups'],
              ['Azure SQL', '380 USD', '+1,0 %', 'Rightsizing GP_Gen5_4'],
              ['App Service', '290 USD', '−0,5 %', 'OK'],
              ['Bandwidth', '270 USD', '+4,2 %', 'Revisar peering'],
            ],
          },
        },
        {
          id: 'subscriptions',
          title: '2. Desglose por suscripción',
          table: {
            headers: ['Suscripción', 'Importe', 'Uso principal', 'Presupuesto'],
            rows: [
              ['prod-westeu', '2.480 USD', 'Integraciones legacy · API gateway', '88 %'],
              ['backup-dr', '680 USD', 'Geo-redundant storage', 'OK'],
              ['dev-test', '480 USD', 'Entornos efímeros', '72 %'],
            ],
          },
          paragraphs: [],
        },
        {
          id: 'forecast',
          title: '3. Previsión y presupuesto',
          paragraphs: ['Proyección junio 2026: 3.710 USD. Con reservas aplicadas: 3.170 USD (−13 %).'],
          highlight: 'Presupuesto Azure mensual: 4.000 USD · Consumo actual: 91,0 %',
        },
      ],
      recommendations: [
        'Comprar reserva de instancia para VMs D4s v5 de producción (36 meses).',
        'Mover backups > 90 días a Azure Blob Cool tier.',
        'Configurar alertas de coste en Cost Management con acción email + Teams.',
        'Etiquetar recursos sin cost-center en suscripción dev-test.',
      ],
      appendix: [
        `Datos extraídos de ${meta.billingSource}.`,
        `Regiones: ${meta.regionsLabel} · Moneda: USD.`,
        'Contacto: finops@cloudops.local',
      ],
    },
  }

  const profile = profiles[cloud]
  return finalizeDoc(cloud, {
    id: `rpt-cost-${cloud}`,
    title: profile.title,
    subtitle: profile.subtitle,
    type: 'cost',
    typeLabel: 'Costes',
    period: String(row['period'] ?? 'Mayo 2026'),
    status: String(row['status'] ?? 'success'),
    generatedAt: fmtDate(String(row['generatedAt'] ?? new Date().toISOString())),
    author: 'Equipo FinOps · cloudops-platform',
    classification: 'Interno — Finanzas y Operaciones',
    version: '1.2',
    logos: [meta.logo],
    executiveSummary: profile.executiveSummary,
    kpis: profile.kpis,
    sections: profile.sections,
    recommendations: profile.recommendations,
    appendix: profile.appendix,
  })
}

const securityReport = (cloud: ReportCloudProvider, row: Record<string, unknown>): ReportDocument => {
  const meta = cloudMeta(cloud)
  const criticalByCloud: Record<ReportCloudProvider, string[]> = {
    aws: [
      'SG sg-web-01: puerto 22 abierto a 0.0.0.0/0 en instancia checkout-api-prod.',
      'Bucket s3-logs-backup: política ACL public-read detectada en auditoría automática.',
      'Rol IAM deploy-bot: permisos AdministratorAccess en cuenta de staging.',
      'Security Hub: 2 controles CIS fallidos en región eu-west-1.',
    ],
    gcp: [
      'Cluster GKE analytics: endpoint público sin authorized networks restringidas.',
      'Service account deploy-bot: rol roles/owner en proyecto prod-gke-001.',
      'Bucket gcs-exports: IAM allUsers:objectViewer detectado.',
      'Firewall rule allow-all-ssh: 0.0.0.0/0 en VPC prod-vpc.',
    ],
    azure: [
      'NSG nsg-web: regla inbound SSH 22 desde Internet en VM checkout-prod.',
      'Storage account stbackup: acceso público habilitado en contenedor logs.',
      'Managed identity ci-runner: rol Contributor en suscripción prod-westeu.',
      'Defender for Cloud: 3 recomendaciones críticas sin remediar.',
    ],
  }
  return finalizeDoc(cloud, {
    id: `rpt-sec-${cloud}`,
    title: `Informe de postura de seguridad ${meta.shortLabel}`,
    subtitle: `${meta.label} · Evaluación trimestral Q2 2026`,
    type: 'security',
    typeLabel: 'Seguridad',
    period: String(row['period'] ?? 'Q2 2026'),
    status: String(row['status'] ?? 'success'),
    generatedAt: fmtDate(String(row['generatedAt'] ?? new Date().toISOString())),
    author: 'Centro de Seguridad · SecOps',
    classification: 'Confidencial — Solo personal autorizado',
    version: '2.0',
    logos: [meta.logo],
    executiveSummary:
      `La puntuación de postura en ${meta.label} es 72/100, en mejora de 4 puntos respecto a Q1 2026 (68/100). ` +
      'El análisis cubre 218 recursos activos distribuidos en 3 cuentas/proyectos de producción y staging. ' +
      'Se detectaron 18 hallazgos activos: 4 críticos (plazo 72 h), 6 altos, 8 medios. ' +
      'Los vectores principales son acceso de red expuesto a Internet (33 %), políticas IAM con permisos excesivos (28 %) ' +
      'y almacenamiento con configuración pública inadvertida (17 %). El 89 % de cuentas admin tiene MFA habilitado.',
    kpis: [
      { label: 'Score global', value: '72/100', delta: '+4 pts', tone: 'ok' },
      { label: 'Críticos', value: '4', tone: 'crit' },
      { label: 'Remediados (30d)', value: '12', tone: 'ok' },
      { label: 'Cumplimiento SOC2', value: '94 %', delta: 'Controles OK' },
    ],
    sections: [
      {
        id: 'findings',
        title: '1. Hallazgos por categoría',
        paragraphs: [`Evaluación en cuentas/proyectos ${meta.label}. Priorización según CVSS y exposición a Internet.`],
        table: {
          headers: ['Categoría', 'Hallazgos', 'Críticos', 'Estado'],
          rows: [
            ['Red / puertos', '6', '2', '2 pendientes'],
            ['IAM / acceso', '4', '1', 'En remediación'],
            ['Almacenamiento', '3', '1', '1 resuelto'],
            ['Secretos / credenciales', '3', '0', 'Rotación OK'],
            ['Acceso bastión', '2', '0', 'Política actualizada'],
          ],
        },
      },
      {
        id: 'critical',
        title: '2. Hallazgos críticos abiertos',
        paragraphs: ['Requieren remediación en un plazo máximo de 72 horas según política interna.'],
        bullets: criticalByCloud[cloud],
      },
      {
        id: 'compliance',
        title: '3. Cumplimiento normativo',
        paragraphs: [
          'El 94 % de los controles SOC2 Type II evaluados están en estado conforme. ' +
          'Los gaps restantes se concentran en logging centralizado de accesos privilegiados.',
        ],
        table: {
          headers: ['Marco', 'Conformes', 'Gaps', 'Próxima auditoría'],
          rows: [
            ['SOC2 Type II', '47/50', '3', 'Sep 2026'],
            ['ISO 27001', '38/42', '4', 'Nov 2026'],
            ['GDPR — datos EU', '12/12', '0', 'Continuo'],
          ],
        },
      },
    ],
    recommendations: [
      'Restringir acceso SSH/RDP a rangos VPN corporativos en todos los recursos de producción.',
      'Habilitar MFA obligatorio para usuarios admin restantes sin segundo factor.',
      `Ejecutar escaneo continuo con herramientas nativas de ${meta.label}.`,
      'Programar revisión de accesos IAM con owners de servicio antes del 15 de junio.',
    ],
    appendix: [`Fuente: Security Hub / Security Command Center / Defender for Cloud según ${meta.label}.`],
  })
}

const availabilityReport = (cloud: ReportCloudProvider, row: Record<string, unknown>): ReportDocument => {
  const meta = cloudMeta(cloud)
  const regionRows: Record<ReportCloudProvider, string[][]> = {
    aws: [
      ['eu-west-1', '99,97 %', '99,98 %', '12'],
      ['us-east-1', '99,95 %', '99,96 %', '18'],
      ['eu-central-1', '99,92 %', '99,93 %', '24'],
    ],
    gcp: [
      ['europe-west1', '99,96 %', '99,97 %', '10'],
      ['us-central1', '99,94 %', '99,95 %', '16'],
      ['europe-west4', '99,91 %', '99,92 %', '22'],
    ],
    azure: [
      ['West Europe', '99,95 %', '99,96 %', '14'],
      ['East US', '99,93 %', '99,94 %', '20'],
      ['North Europe', '99,90 %', '99,91 %', '28'],
    ],
  }
  return finalizeDoc(cloud, {
    id: `rpt-sla-${cloud}`,
    title: `Informe de disponibilidad ${meta.shortLabel}`,
    subtitle: `${meta.label} · SLOs de producción · 30 días`,
    type: 'availability',
    typeLabel: 'Disponibilidad',
    period: String(row['period'] ?? 'Últimos 30 días'),
    status: String(row['status'] ?? 'running'),
    generatedAt: fmtDate(String(row['generatedAt'] ?? new Date().toISOString())),
    author: 'SRE · Observabilidad',
    classification: 'Interno — Operaciones',
    version: '1.0',
    logos: [meta.logo],
    executiveSummary:
      `La disponibilidad agregada de servicios tier-1 en ${meta.label} fue del 99,94 % en ventana móvil de 30 días, ` +
      'superior al SLO objetivo del 99,9 %. Se registraron 2 incidentes con impacto en usuarios: INC-1042 (checkout-api, 38 min) ' +
      'e INC-1038 (jenkins-agent, 72 min, sin impacto cliente). MTTR medio: 42 min (−8 min vs Q1). ' +
      'La latencia p99 agregada es 620 ms, por encima del SLO de 500 ms en checkout-api durante horas punta (18:00–22:00 UTC).',
    kpis: [
      { label: 'Disponibilidad', value: '99,94 %', delta: 'SLO 99,9 %', tone: 'ok' },
      { label: 'Incidentes', value: '2', delta: '38 min impacto', tone: 'warn' },
      { label: 'MTTR', value: '42 min', delta: '−8 min vs Q1' },
      { label: 'p99 latencia', value: '620 ms', delta: 'SLO 500 ms', tone: 'warn' },
    ],
    sections: [
      {
        id: 'slo',
        title: '1. Cumplimiento de SLO por servicio',
        table: {
          headers: ['Servicio', 'SLO', 'Actual', 'Error budget', 'Estado'],
          rows: [
            ['checkout-api', '99,9 %', '99,91 %', '18 % restante', 'Atención'],
            ['payment-webhook', '99,5 %', '99,82 %', '42 % restante', 'OK'],
            ['nginx-edge', '99,95 %', '99,98 %', '65 % restante', 'OK'],
            ['auth-service', '99,9 %', '99,96 %', '58 % restante', 'OK'],
          ],
        },
        paragraphs: [],
      },
      {
        id: 'incidents',
        title: '2. Incidentes del periodo',
        paragraphs: ['Resumen de incidentes medidos por synthetic probes y métricas RED en ' + meta.label + '.'],
        table: {
          headers: ['ID', 'Servicio', 'Duración', 'Causa raíz', 'Estado'],
          rows: [
            ['INC-1042', 'checkout-api', '38 min', 'OOMKilled · memory limit', 'Resuelto'],
            ['INC-1038', 'jenkins-agent', '72 min', 'Disco lleno /var/lib/docker', 'Resuelto'],
          ],
        },
      },
      {
        id: 'uptime',
        title: '3. Uptime por región',
        paragraphs: [`Regiones ${meta.label}: ${meta.regionsLabel}. Probes cada 30 s.`],
        table: {
          headers: ['Región', 'Uptime', 'Probes OK', 'Fallos'],
          rows: regionRows[cloud],
        },
      },
    ],
    recommendations: [
      'Aumentar memory limits de checkout-api y habilitar HPA por memoria además de CPU.',
      'Implementar runbook automático para OOMKilled con scale-up preventivo.',
      'Revisar SLO de latencia p99: actual 620 ms supera umbral en horas punta.',
    ],
    appendix: [`Métricas desde CloudWatch / Cloud Monitoring / Azure Monitor según ${meta.label}.`],
  })
}

const activityReport = (cloud: ReportCloudProvider): ReportDocument => {
  const meta = cloudMeta(cloud)
  return finalizeDoc(cloud, {
    id: `rpt-act-${cloud}`,
    title: `Informe de actividad operativa ${meta.shortLabel}`,
    subtitle: `${meta.label} · Automatización e infraestructura`,
    type: 'activity',
    typeLabel: 'Actividad',
    period: 'Semana 23 · 2026',
    status: 'success',
    generatedAt: fmtDate(new Date().toISOString()),
    author: 'Plataforma CloudOps',
    classification: 'Interno',
    version: '1.0',
    logos: [meta.logo],
    executiveSummary:
      `Durante la semana 23 de 2026 se ejecutaron 842 pipelines CI/CD con destino ${meta.label}, de los cuales 794 finalizaron con éxito (94,2 %). ` +
      'Se realizaron 47 despliegues a producción sin rollbacks, 156 cambios de infraestructura vía Terraform (3 clasificados como críticos) ' +
      'y 8 ejecuciones de runbooks automatizados. Se aprobaron 12 pull requests y todos los cambios críticos cumplieron ventana de mantenimiento programada.',
    kpis: [
      { label: 'Pipelines', value: '842', delta: '94,2 % éxito' },
      { label: 'Despliegues prod', value: '47', delta: '0 rollbacks' },
      { label: 'Cambios IaC', value: '156', delta: '3 críticos' },
      { label: 'Runbooks', value: '8', delta: 'ejecuciones OK' },
    ],
    sections: [
      {
        id: 'cicd',
        title: '1. CI/CD y despliegues',
        table: {
          headers: ['Origen', 'Ejecuciones', 'Éxito', 'Duración media'],
          rows: [
            ['Jenkins', '412', '93 %', '4m 12s'],
            ['GitHub Actions', '318', '96 %', '3m 48s'],
            ['GitLab CI', '112', '95 %', '5m 02s'],
          ],
        },
        paragraphs: [`Despliegues target en ${meta.label}: staging automático tras merge; producción con aprobación manual.`],
      },
      {
        id: 'changes',
        title: '2. Cambios de infraestructura',
        bullets: [
          'terraform-modules: 23 plans · 8 applies (VPC outputs, IAM roles).',
          'k8s-demo-app: bump chart Helm 2.4.0 — pendiente aprobación.',
          '3 cambios críticos en ventana domingo 04:00–06:00 UTC.',
        ],
        paragraphs: [],
      },
    ],
    recommendations: [
      'Reducir flakiness en suite e2e-smoke (2 fallos intermitentes esta semana).',
      'Documentar post-mortem de INC-1042 en el catálogo de runbooks.',
    ],
  })
}

const infraReport = (cloud: ReportCloudProvider): ReportDocument => {
  const meta = cloudMeta(cloud)
  const inventoryRows: Record<ReportCloudProvider, string[][]> = {
    aws: [
      ['EC2', '18', 'AWS', '16 running'],
      ['EKS nodos', '24', 'AWS', '24 ready'],
      ['EBS volúmenes', '32', 'AWS', '4 huérfanos'],
      ['RDS instancias', '6', 'AWS', '6 available'],
    ],
    gcp: [
      ['Compute Engine', '12', 'GCP', '11 running'],
      ['GKE nodos', '18', 'GCP', '18 ready'],
      ['Persistent disks', '28', 'GCP', '2 huérfanos'],
      ['Cloud SQL', '4', 'GCP', '4 running'],
    ],
    azure: [
      ['Virtual Machines', '10', 'Azure', '9 running'],
      ['AKS nodos', '12', 'Azure', '12 ready'],
      ['Managed disks', '22', 'Azure', '3 huérfanos'],
      ['Azure SQL', '3', 'Azure', '3 online'],
    ],
  }
  return finalizeDoc(cloud, {
    id: `rpt-inf-${cloud}`,
    title: `Informe de inventario ${meta.shortLabel}`,
    subtitle: `${meta.label} · Snapshot consolidado`,
    type: 'infra',
    typeLabel: 'Infraestructura',
    period: 'Junio 2026',
    status: 'success',
    generatedAt: fmtDate(new Date().toISOString()),
    author: 'Inventario automático',
    classification: 'Interno',
    version: '3.1',
    logos: [meta.logo],
    executiveSummary:
      `El inventario en ${meta.label} registra 80 recursos compute, storage y managed services activos al cierre del periodo. ` +
      'El cumplimiento de etiquetado obligatorio es del 78 % (meta organizacional: 95 %). ' +
      'Se detectaron 4 recursos huérfanos sin owner, 7 sin cost-center y 6 sin etiqueta environment. ' +
      'Estos gaps impiden la asignación correcta de coste en el modelo FinOps y deben corregirse en un plazo máximo de 15 días.',
    kpis: [
      { label: 'Recursos compute', value: cloud === 'aws' ? '18' : cloud === 'gcp' ? '12' : '10', delta: meta.label },
      { label: 'Nodos K8s', value: cloud === 'aws' ? '24' : cloud === 'gcp' ? '18' : '12', delta: 'Managed' },
      { label: 'Volúmenes', value: cloud === 'aws' ? '32' : cloud === 'gcp' ? '28' : '22', delta: 'Multi-AZ' },
      { label: 'Tagging OK', value: '78 %', delta: 'Meta 95 %', tone: 'warn' },
    ],
    sections: [
      {
        id: 'inventory',
        title: '1. Recursos por tipo',
        table: {
          headers: ['Tipo', 'Cantidad', 'Proveedor', 'Estado'],
          rows: inventoryRows[cloud],
        },
        paragraphs: [],
      },
      {
        id: 'tagging',
        title: '2. Cumplimiento de etiquetado',
        paragraphs: [
          'Etiquetas obligatorias: environment, owner, cost-center, service. ' +
          'Los recursos sin owner impiden asignación de coste en FinOps.',
        ],
        highlight: '4 recursos sin owner · 7 sin cost-center · plazo de corrección: 15 días',
      },
    ],
    recommendations: [
      'Asignar owner a volúmenes huérfanos detectados en el último sync.',
      `Ejecutar sync diario de inventario ${meta.label} con webhook a Service Catalog.`,
    ],
    appendix: [`Inventario vía API ${meta.label} · Regiones: ${meta.regionsLabel}.`],
  })
}

export const buildReportDocument = (row?: Record<string, unknown>): ReportDocument => {
  const cloud = resolveReportCloud(row)
  const type = String(row?.['type'] ?? '').toLowerCase()
  const name = String(row?.['name'] ?? '').toLowerCase()
  const key = `${type} ${name}`

  if (type === 'security' || key.includes('seguridad') || key.includes('posture') || key.includes('cumplimiento')) {
    return securityReport(cloud, row ?? {})
  }
  if (type === 'availability' || key.includes('sla') || key.includes('disponibil')) {
    return availabilityReport(cloud, row ?? {})
  }
  if (type === 'activity' || key.includes('actividad') || key.includes('operativ')) {
    return activityReport(cloud)
  }
  if (type === 'infra' || key.includes('inventario') || key.includes('infraestructura')) {
    return infraReport(cloud)
  }
  return costReport(cloud, row ?? {})
}

export const reportDocumentText = (doc: ReportDocument): string => {
  const meta = cloudMeta(doc.cloud)
  const source =
    doc.type === 'cost'
      ? meta.billingSource
      : doc.type === 'security'
        ? `Security Hub / Security Command Center / Defender for Cloud · ${meta.shortLabel}`
        : `${meta.label} · CloudOps Platform`
  const lines = [
    `Proveedor cloud: ${doc.cloudLabel} (${meta.shortLabel})`,
    doc.title.toUpperCase(),
    doc.subtitle,
    '—'.repeat(60),
    `Periodo: ${doc.period}`,
    `Generado: ${doc.generatedAt}`,
    `Autor: ${doc.author}`,
    `Clasificación: ${doc.classification}`,
    `Fuente: ${source}`,
    '',
    'RESUMEN EJECUTIVO',
    doc.executiveSummary,
    '',
  ]
  doc.kpis.forEach((k) => lines.push(`${k.label}: ${k.value}${k.delta ? ` (${k.delta})` : ''}`))
  doc.sections.forEach((s) => {
    lines.push('', s.title)
    s.paragraphs.forEach((p) => lines.push(p))
    s.bullets?.forEach((b) => lines.push(`  — ${b}`))
    if (s.table) {
      lines.push(s.table.headers.join(' | '))
      s.table.rows.forEach((r) => lines.push('  ' + r.join(' | ')))
    }
    if (s.highlight) lines.push(`Nota: ${s.highlight}`)
  })
  lines.push('', 'RECOMENDACIONES')
  doc.recommendations.forEach((r, i) => lines.push(`  ${i + 1}. ${r}`))
  if (doc.appendix?.length) {
    lines.push('', 'ANEXO')
    doc.appendix.forEach((a) => lines.push(`  · ${a}`))
  }
  return lines.join('\n')
}
