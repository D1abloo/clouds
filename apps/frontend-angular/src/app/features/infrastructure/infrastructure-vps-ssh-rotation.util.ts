import type { VpsHostRow } from './infrastructure-workspace.builders'
import { hashSeed } from './infrastructure-vps-operations.util'
import {
  csvEscape,
  downloadJsonFile,
  downloadTextFile,
  slugifyFilename,
  triggerBlobDownload,
} from './infrastructure-report-export.util'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export type VpsDemoSshKey = {
  name: string
  fingerprint: string
  users: number
  lastUsed: string
  status: string
}

type DemoSshKey = VpsDemoSshKey

export interface SshRotationApplyResult {
  keyName: string
  newFingerprint: string
  newPublicKeyDeployed: boolean
  replacementName: string | null
}

const SSH_PUBLIC_KEY_RE = /^(ssh-ed25519|ssh-rsa)\s+[A-Za-z0-9+/]+={0,3}(\s+.*)?$/

export const isValidSshPublicKey = (text: string): boolean =>
  SSH_PUBLIC_KEY_RE.test(text.trim())

export const previewSshKeyFingerprint = (publicKey: string): string => {
  const seed = hashSeed(publicKey.trim())
  const hex = seed.toString(16).padStart(8, '0')
  return `SHA256:${hex.slice(0, 2)}${hex.slice(2, 4)}…${hex.slice(-2)}`
}

export const inferPublicKeyAlgorithm = (publicKey: string): { algorithm: string, keyBits: number | null } => {
  const type = publicKey.trim().split(/\s+/)[0] ?? ''
  if (type === 'ssh-ed25519') return { algorithm: 'ED25519', keyBits: null }
  if (type === 'ssh-rsa') return { algorithm: 'RSA', keyBits: 4096 }
  return { algorithm: 'RSA', keyBits: 4096 }
}

export const updateDemoSshKeyAfterRotation = (
  keys: VpsDemoSshKey[],
  keyName: string,
  newFingerprint: string,
): VpsDemoSshKey[] =>
  keys.map((k) =>
    k.name === keyName
      ? {
          ...k,
          fingerprint: newFingerprint,
          status: 'running',
          lastUsed: new Date().toLocaleString('es-ES'),
        }
      : k,
  )

export const applySshKeyRotation = (
  report: SshKeyRotationReport,
  keyName: string,
  options: {
    newFingerprint?: string
    newPublicKeyDeployed: boolean
    newAlgorithm?: string
    newKeyBits?: number | null
  },
): SshKeyRotationReport => {
  const now = new Date().toLocaleString('es-ES')
  const keys = report.keys.map((k) => {
    if (k.name !== keyName) return k

    return {
      ...k,
      fingerprint: options.newPublicKeyDeployed && options.newFingerprint ? options.newFingerprint : k.fingerprint,
      algorithm: options.newPublicKeyDeployed && options.newAlgorithm ? options.newAlgorithm : k.algorithm,
      keyBits: options.newPublicKeyDeployed ? (options.newKeyBits ?? k.keyBits) : k.keyBits,
      status: 'ok' as SshKeyStatus,
      rotationPriority: 'none' as SshRotationPriority,
      rotateRequired: false,
      replacementName: null,
      ageDays: 0,
      notes: options.newPublicKeyDeployed
        ? 'Rotación completada · nueva clave desplegada en authorized_keys'
        : 'Rotación registrada · desplegar nueva clave pública para restaurar acceso',
    }
  })

  const keysToRotate = keys.filter((k) => k.rotateRequired).length
  const legacyKeys = keys.filter((k) => k.status === 'legacy').length
  const warnKeys = keys.filter((k) => k.status === 'warn' || k.rotationPriority === 'high').length
  const rotatedKey = keys.find((k) => k.name === keyName)

  const planSteps = report.plan.steps.map((s) => {
    if (s.action === 'Deploy authorized_keys' && options.newPublicKeyDeployed) {
      return { ...s, status: 'ready' as const }
    }
    if (s.action === 'Revocar huellas legacy' && rotatedKey?.status === 'ok') {
      return { ...s, status: 'ready' as const }
    }
    if (s.action === 'Validar acceso SSH' && options.newPublicKeyDeployed) {
      return { ...s, status: 'ready' as const }
    }
    return s
  })

  const timeline: SshRotationTimelineEvent[] = [
    {
      at: now,
      label: options.newPublicKeyDeployed
        ? `Rotación completada · ${keyName} · authorized_keys actualizado`
        : `Rotación iniciada · ${keyName} · pendiente despliegue de clave pública`,
      actor: 'cloudops-ui',
    },
    ...report.timeline,
  ]

  const riskLevel: SshKeyRotationReport['riskLevel'] =
    legacyKeys > 0 ? 'critical' : warnKeys > 0 ? 'high' : keysToRotate > 0 ? 'medium' : 'low'

  return {
    ...report,
    keys,
    keysToRotate,
    legacyKeys,
    warnKeys,
    riskLevel,
    plan: {
      ...report.plan,
      targetKeys: keys.filter((k) => k.rotateRequired).map((k) => k.name),
      steps: planSteps,
    },
    timeline,
    executiveSummary: options.newPublicKeyDeployed
      ? `Rotación de ${keyName} completada con despliegue en authorized_keys. ${keysToRotate} clave(s) pendientes en inventario.`
      : `Rotación de ${keyName} registrada sin nueva clave pública — riesgo de pérdida de acceso hasta despliegue manual.`,
  }
}

export type SshKeyStatus = 'ok' | 'warn' | 'legacy' | 'rotate'
export type SshRotationPriority = 'critical' | 'high' | 'medium' | 'low' | 'none'

export interface SshKeyAffectedHost {
  hostId: string
  hostName: string
  hostIp: string
  unixUser: string
  environment: string
  authorizedKeysLine: number
}

export interface SshKeyRecord {
  name: string
  fingerprint: string
  algorithm: string
  keyBits: number | null
  userCount: number
  unixUsers: string[]
  lastUsed: string
  ageDays: number
  status: SshKeyStatus
  rotationPriority: SshRotationPriority
  rotateRequired: boolean
  replacementName: string | null
  affectedHosts: SshKeyAffectedHost[]
  notes: string
}

export interface SshRotationPlanStep {
  order: number
  phase: string
  action: string
  detail: string
  durationMin: number
  automated: boolean
  status: 'pending' | 'ready' | 'blocked'
}

export interface SshRotationTimelineEvent {
  at: string
  label: string
  actor: string
}

export interface SshKeyRotationPlan {
  planId: string
  generatedAt: string
  targetKeys: string[]
  steps: SshRotationPlanStep[]
  estimatedDurationMin: number
  maintenanceWindow: string
  rollbackSteps: string[]
}

export interface SshKeyRotationReport {
  reportId: string
  generatedAt: string
  durationSec: number
  method: string
  policyVersion: string
  scope: string
  hostCount: number
  keysTotal: number
  keysToRotate: number
  legacyKeys: number
  warnKeys: number
  affectedHosts: number
  affectedUsers: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  executiveSummary: string
  keys: SshKeyRecord[]
  plan: SshKeyRotationPlan
  timeline: SshRotationTimelineEvent[]
  recommendations: string[]
  complianceNotes: string[]
  riskAssessment: string[]
}

const DEMO_UNIX_USERS = ['ubuntu', 'deploy', 'ops', 'ci-bot', 'admin', 'root']

const hostEnvironment = (host: VpsHostRow, index: number): string => {
  if (host.name.includes('prod')) return 'Producción'
  if (host.name.includes('staging')) return 'Staging'
  if (host.name.includes('dev')) return 'Desarrollo'
  if (host.name.includes('bastion')) return 'Bastion'
  if (host.name.includes('ci')) return 'CI/CD'
  return index % 3 === 0 ? 'Producción' : index % 3 === 1 ? 'Staging' : 'Desarrollo'
}

const inferAlgorithm = (name: string): { algorithm: string, keyBits: number | null } => {
  const lower = name.toLowerCase()
  if (lower.includes('ed25519')) return { algorithm: 'ED25519', keyBits: null }
  if (lower.includes('rsa')) return { algorithm: 'RSA', keyBits: lower.includes('legacy') ? 2048 : 4096 }
  if (lower.includes('ecdsa')) return { algorithm: 'ECDSA', keyBits: 256 }
  return { algorithm: 'RSA', keyBits: 4096 }
}

const mapKeyStatus = (status: string, name: string): SshKeyStatus => {
  if (name.includes('legacy') || status.includes('warn')) return 'legacy'
  if (status.includes('warn')) return 'warn'
  if (name.includes('rsa') && !name.includes('ed25519')) return 'rotate'
  return 'ok'
}

const rotationPriority = (keyStatus: SshKeyStatus, name: string, ageDays: number): SshRotationPriority => {
  if (keyStatus === 'legacy') return 'critical'
  if (name.includes('legacy')) return 'critical'
  if (keyStatus === 'warn' || ageDays > 180) return 'high'
  if (name.includes('rsa')) return 'medium'
  if (ageDays > 90) return 'low'
  return 'none'
}

const buildAffectedHosts = (
  key: DemoSshKey,
  hosts: VpsHostRow[],
  keyIndex: number,
): SshKeyAffectedHost[] => {
  if (!hosts.length) return []
  const count = Math.min(key.users, hosts.length)
  const picked: SshKeyAffectedHost[] = []

  for (let i = 0; i < count; i++) {
    const host = hosts[(keyIndex + i + hashSeed(key.name)) % hosts.length]
    const env = hostEnvironment(host, keyIndex + i)
    picked.push({
      hostId: host.id,
      hostName: host.name,
      hostIp: host.host,
      unixUser: DEMO_UNIX_USERS[(keyIndex + i) % DEMO_UNIX_USERS.length],
      environment: env,
      authorizedKeysLine: 1 + ((hashSeed(`${key.name}:${host.name}`) % 3)),
    })
  }

  return picked
}

const buildPlanSteps = (keys: SshKeyRecord[], hosts: VpsHostRow[]): SshRotationPlanStep[] => {
  const rotateKeys = keys.filter((k) => k.rotateRequired)
  const steps: SshRotationPlanStep[] = [
    {
      order: 1,
      phase: 'Preparación',
      action: 'Snapshot authorized_keys',
      detail: 'Backup remoto en s3://cloudops-ssh-audit/ antes de cualquier cambio',
      durationMin: 2,
      automated: true,
      status: 'ready',
    },
    {
      order: 2,
      phase: 'Generación',
      action: 'Generar par ED25519 v2',
      detail: 'ssh-keygen -t ed25519 -a 100 -C "cloudops-rotated" en HSM interno',
      durationMin: 1,
      automated: true,
      status: 'ready',
    },
    {
      order: 3,
      phase: 'Despliegue',
      action: 'Deploy authorized_keys',
      detail: `Distribuir nueva clave en ${rotateKeys.length} identidad(es) · ${rotateKeys.reduce((a, k) => a + k.affectedHosts.length, 0)} hosts`,
      durationMin: 4 + rotateKeys.length,
      automated: true,
      status: rotateKeys.length ? 'pending' : 'ready',
    },
    {
      order: 4,
      phase: 'Revocación',
      action: 'Revocar huellas legacy',
      detail: rotateKeys.map((k) => k.name).join(', ') || 'Sin claves legacy pendientes',
      durationMin: 2,
      automated: true,
      status: rotateKeys.some((k) => k.status === 'legacy') ? 'pending' : 'ready',
    },
    {
      order: 5,
      phase: 'Validación',
      action: 'Validar acceso SSH',
      detail: 'Batch handshake + prueba sudo NOPASSWD en muestra representativa',
      durationMin: 3,
      automated: true,
      status: 'pending',
    },
    {
      order: 6,
      phase: 'Cierre',
      action: 'Actualizar inventario y auditoría',
      detail: 'Registrar rotación en CloudOps · notificar owners · programar próxima ventana',
      durationMin: 1,
      automated: true,
      status: 'pending',
    },
  ]

  if (
    hosts.some((h) => h.name.includes('bastion')) ||
    keys.some((k) => k.affectedHosts.some((h) => h.environment === 'Bastion' || h.hostName.includes('bastion')))
  ) {
    steps.splice(2, 0, {
      order: 3,
      phase: 'Bastion',
      action: 'Ventana MFA bastion',
      detail: 'Coordinar con Security · MFA obligatorio durante rotación en jump hosts',
      durationMin: 5,
      automated: false,
      status: 'blocked',
    })
  }

  return steps.map((s, i) => ({ ...s, order: i + 1 }))
}

const buildTimeline = (generatedAt: Date): SshRotationTimelineEvent[] => {
  const fmt = (offsetMin: number) =>
    new Date(generatedAt.getTime() - offsetMin * 60_000).toLocaleString('es-ES')

  return [
    { at: fmt(12), label: 'Inventario authorized_keys recopilado vía SSH batch', actor: 'agent-cloudops' },
    { at: fmt(9), label: 'Huellas cruzadas con vault de claves y política POL-SSH-90', actor: 'policy-engine' },
    { at: fmt(6), label: 'legacy-root marcada como crítica · 86400 min sin uso', actor: 'risk-scanner' },
    { at: fmt(3), label: 'Plan de rotación generado · ventana sugerida sáb 02:00–04:00 UTC', actor: 'scheduler' },
    { at: generatedAt.toLocaleString('es-ES'), label: 'Informe ejecutivo listo para revisión', actor: 'cloudops-ui' },
  ]
}

const buildRollbackSteps = (keys: SshKeyRecord[]): string[] => [
  'Restaurar authorized_keys desde snapshot s3://cloudops-ssh-audit/ (versión T-1)',
  'Reactivar claves anteriores en vault · marcar rotación como revertida',
  'Ejecutar validación SSH batch en todos los hosts afectados',
  'Notificar a owners y Security · abrir incidente si acceso bloqueado > 5 min',
  ...(keys.some((k) => k.status === 'legacy')
    ? ['Mantener legacy-root revocada salvo break-glass aprobado por Security']
    : []),
]

export const buildSshRotationReport = (
  hosts: VpsHostRow[],
  sshKeys: DemoSshKey[],
): SshKeyRotationReport => {
  const generatedAt = new Date()

  const keys: SshKeyRecord[] = sshKeys.map((key, index) => {
    const { algorithm, keyBits } = inferAlgorithm(key.name)
    const ageDays = key.name.includes('legacy') ? 412 : key.name.includes('rsa') ? 128 : 45 + (hashSeed(key.name) % 30)
    const status = mapKeyStatus(key.status, key.name)
    const priority = rotationPriority(status, key.name, ageDays)
    const rotateRequired = priority === 'critical' || priority === 'high' || (priority === 'medium' && key.name.includes('rsa'))
    const affectedHosts = buildAffectedHosts(key, hosts, index)
    const unixUsers = affectedHosts.map((h) => h.unixUser)

    let notes = 'Cumple política de algoritmo y antigüedad'
    if (status === 'legacy') notes = 'Clave obsoleta · acceso root · sin MFA · revocación prioritaria'
    else if (priority === 'medium') notes = 'RSA aceptable pero migración a ED25519 recomendada'
    else if (priority === 'low') notes = 'Próxima rotación programada según calendario 90 días'

    return {
      name: key.name,
      fingerprint: key.fingerprint,
      algorithm,
      keyBits,
      userCount: key.users,
      unixUsers: [...new Set(unixUsers)],
      lastUsed: key.lastUsed,
      ageDays,
      status,
      rotationPriority: priority,
      rotateRequired,
      replacementName: rotateRequired ? `${key.name.replace(/-v\d+$/, '')}-v2-ed25519` : null,
      affectedHosts,
      notes,
    }
  })

  const keysToRotate = keys.filter((k) => k.rotateRequired).length
  const legacyKeys = keys.filter((k) => k.status === 'legacy').length
  const warnKeys = keys.filter((k) => k.status === 'warn' || k.rotationPriority === 'high').length
  const affectedHostSet = new Set(keys.flatMap((k) => k.affectedHosts.map((h) => h.hostId)))
  const affectedUsers = new Set(keys.flatMap((k) => k.unixUsers)).size

  const riskLevel: SshKeyRotationReport['riskLevel'] =
    legacyKeys > 0 ? 'critical' : warnKeys > 0 ? 'high' : keysToRotate > 0 ? 'medium' : 'low'

  const planSteps = buildPlanSteps(keys, hosts)
  const estimatedDurationMin = planSteps.reduce((acc, s) => acc + s.durationMin, 0)

  const plan: SshKeyRotationPlan = {
    planId: `PLAN-SSH-${generatedAt.toISOString().slice(0, 10).replace(/-/g, '')}`,
    generatedAt: generatedAt.toLocaleString('es-ES'),
    targetKeys: keys.filter((k) => k.rotateRequired).map((k) => k.name),
    steps: planSteps,
    estimatedDurationMin,
    maintenanceWindow: 'Sáb 02:00–04:00 UTC · notificación owners T-24h',
    rollbackSteps: buildRollbackSteps(keys),
  }

  const recommendations: string[] = []
  if (legacyKeys) {
    recommendations.push('Revocar legacy-root de inmediato · acceso root directo prohibido por POL-SSH-02.')
  }
  if (keys.some((k) => k.algorithm === 'RSA')) {
    recommendations.push('Migrar claves RSA restantes a ED25519 en la misma ventana de mantenimiento.')
  }
  if (hosts.some((h) => h.name.includes('bastion'))) {
    recommendations.push('Habilitar MFA en bastion para sesiones administrativas durante y después de la rotación.')
  }
  recommendations.push('Programar rotación automática cada 90 días con alertas T-14 y T-7.')
  recommendations.push('Sincronizar huellas con vault corporativo y eliminar claves huérfanas en CI runners.')

  const riskAssessment: string[] = [
    legacyKeys
      ? `${legacyKeys} clave(s) legacy con acceso root · superficie de ataque elevada`
      : 'Sin claves legacy root detectadas en inventario',
    keysToRotate
      ? `${keysToRotate} identidad(es) requieren rotación en ventana planificada`
      : 'Parque de claves dentro de ventana de cumplimiento',
    `${affectedHostSet.size} host(s) impactados · validación batch post-rotación obligatoria`,
    plan.steps.some((s) => s.status === 'blocked')
      ? 'Coordinación Security requerida para bastion/MFA antes de ejecutar'
      : 'Plan ejecutable sin bloqueos de aprobación',
  ]

  const executiveSummary =
    legacyKeys > 0
      ? `Análisis sobre ${hosts.length} hosts y ${keys.length} claves: ${legacyKeys} legacy crítica(s), ${keysToRotate} rotación(es) planificada(s). Riesgo ${riskLevel.toUpperCase()} — acción inmediata en legacy-root.`
      : keysToRotate > 0
        ? `Inventario SSH en ${hosts.length} hosts: ${keysToRotate} clave(s) pendientes de rotación programada. Riesgo ${riskLevel}. Ventana sugerida ${plan.maintenanceWindow}.`
        : `Parque SSH conforme: ${keys.length} claves auditadas en ${hosts.length} hosts sin rotación urgente.`

  return {
    reportId: `SSH-ROT-${generatedAt.toISOString().slice(0, 10).replace(/-/g, '')}-${String(hosts.length).padStart(2, '0')}`,
    generatedAt: generatedAt.toLocaleString('es-ES'),
    durationSec: 540 + hosts.length * 42,
    method: 'SSH batch · parse authorized_keys · vault fingerprint cross-check · policy POL-SSH-90',
    policyVersion: 'POL-SSH-90 v3.1 · CIS 5.4 · NIST IA-5 · SOC2 CC6.1',
    scope: `Inventario VPS completo · ${hosts.length} hosts · ${sshKeys.length} claves registradas`,
    hostCount: hosts.length,
    keysTotal: keys.length,
    keysToRotate,
    legacyKeys,
    warnKeys,
    affectedHosts: affectedHostSet.size,
    affectedUsers,
    riskLevel,
    executiveSummary,
    keys: keys.sort((a, b) => {
      const order: Record<SshRotationPriority, number> = { critical: 0, high: 1, medium: 2, low: 3, none: 4 }
      return order[a.rotationPriority] - order[b.rotationPriority]
    }),
    plan,
    timeline: buildTimeline(generatedAt),
    recommendations,
    complianceNotes: [
      'Política interna POL-SSH-90: rotación máxima cada 90 días · ED25519 preferido',
      'CIS Benchmark 5.4: deshabilitar autenticación root por contraseña y claves débiles',
      'MFA obligatorio en bastion para accesos administrativos (Security baseline 2024)',
      'Retención de informes de rotación: 24 meses · bucket audit-cloudops/ssh-rotation',
      'Break-glass: ticket SEC-URG + aprobación dual para restaurar claves legacy',
    ],
    riskAssessment,
  }
}

export const buildSshRotationFilename = (report: SshKeyRotationReport, ext: string): string =>
  `${slugifyFilename(report.reportId)}.${ext}`

export const exportSshRotationCsv = (report: SshKeyRotationReport): string => {
  const header = [
    'key_name',
    'fingerprint',
    'algorithm',
    'bits',
    'users',
    'last_used',
    'age_days',
    'status',
    'priority',
    'rotate_required',
    'replacement',
    'host',
    'host_ip',
    'unix_user',
    'environment',
  ]
  const rows = report.keys.flatMap((key) =>
    key.affectedHosts.length
      ? key.affectedHosts.map((h) =>
          [
            key.name,
            key.fingerprint,
            key.algorithm,
            key.keyBits ?? '',
            key.userCount,
            key.lastUsed,
            key.ageDays,
            key.status,
            key.rotationPriority,
            key.rotateRequired ? 'yes' : 'no',
            key.replacementName ?? '',
            h.hostName,
            h.hostIp,
            h.unixUser,
            h.environment,
          ]
            .map(csvEscape)
            .join(','),
        )
      : [
          [
            key.name,
            key.fingerprint,
            key.algorithm,
            key.keyBits ?? '',
            key.userCount,
            key.lastUsed,
            key.ageDays,
            key.status,
            key.rotationPriority,
            key.rotateRequired ? 'yes' : 'no',
            key.replacementName ?? '',
            '',
            '',
            '',
            '',
          ]
            .map(csvEscape)
            .join(','),
        ],
  )
  const filename = buildSshRotationFilename(report, 'csv')
  downloadTextFile([header.join(','), ...rows].join('\n'), filename, 'text/csv;charset=utf-8')
  return filename
}

export const exportSshRotationJson = (report: SshKeyRotationReport): string => {
  const filename = buildSshRotationFilename(report, 'json')
  downloadJsonFile(report, filename)
  return filename
}

export const exportSshRotationMarkdown = (report: SshKeyRotationReport): string => {
  const lines = [
    `# Rotación de claves SSH · ${report.reportId}`,
    '',
    `- **Generado:** ${report.generatedAt}`,
    `- **Alcance:** ${report.scope}`,
    `- **Política:** ${report.policyVersion}`,
    `- **Resumen:** ${report.executiveSummary}`,
    '',
    '## KPIs',
    '',
    '| Claves | Rotar | Legacy | Hosts | Usuarios | Riesgo |',
    '| --- | --- | --- | --- | --- | --- |',
    `| ${report.keysTotal} | ${report.keysToRotate} | ${report.legacyKeys} | ${report.affectedHosts} | ${report.affectedUsers} | ${report.riskLevel} |`,
    '',
    '## Claves',
    '',
  ]

  for (const key of report.keys) {
    lines.push(`### ${key.name} · ${key.algorithm}${key.keyBits ? `-${key.keyBits}` : ''}`)
    lines.push(`- Huella: \`${key.fingerprint}\``)
    lines.push(`- Prioridad: **${key.rotationPriority}** · Estado: ${key.status} · Rotar: ${key.rotateRequired ? 'sí' : 'no'}`)
    lines.push(`- Último uso: ${key.lastUsed} · Antigüedad: ${key.ageDays} días`)
    if (key.affectedHosts.length) {
      lines.push('- Hosts afectados:')
      for (const h of key.affectedHosts) {
        lines.push(`  - ${h.hostName} (${h.hostIp}) · ${h.unixUser}@${h.environment}`)
      }
    }
    lines.push('')
  }

  lines.push('## Plan de rotación', '')
  for (const step of report.plan.steps) {
    lines.push(`${step.order}. **${step.phase}** — ${step.action}: ${step.detail} (~${step.durationMin} min)`)
  }

  lines.push('', '## Rollback', '')
  report.plan.rollbackSteps.forEach((s) => lines.push(`- ${s}`))

  lines.push('', '## Recomendaciones', '')
  report.recommendations.forEach((r) => lines.push(`- ${r}`))

  const content = lines.join('\n')
  const filename = buildSshRotationFilename(report, 'md')
  downloadTextFile(content, filename, 'text/markdown;charset=utf-8')
  return filename
}

export const exportSshRotationPdf = (report: SshKeyRotationReport): string => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const margin = 12
  let y = 14

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(30, 30, 30)
  doc.text('Informe de rotación de claves SSH', margin, y)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(report.reportId, margin, y + 6)
  doc.text(report.generatedAt, 280, y + 6, { align: 'right' })
  y += 14

  doc.setFontSize(10)
  doc.setTextColor(50, 50, 50)
  const summaryLines = doc.splitTextToSize(report.executiveSummary, 270)
  doc.text(summaryLines, margin, y)
  y += summaryLines.length * 4 + 6

  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [255, 153, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [['Claves', 'Rotar', 'Legacy', 'Warn', 'Hosts', 'Usuarios', 'Riesgo']],
    body: [[
      String(report.keysTotal),
      String(report.keysToRotate),
      String(report.legacyKeys),
      String(report.warnKeys),
      String(report.affectedHosts),
      String(report.affectedUsers),
      report.riskLevel.toUpperCase(),
    ]],
    margin: { left: margin, right: margin },
  })

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 20
  y += 8

  autoTable(doc, {
    startY: y,
    theme: 'striped',
    styles: { fontSize: 6, cellPadding: 1.5 },
    headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [['Clave', 'Algoritmo', 'Huella', 'Usuarios', 'Último uso', 'Prioridad', 'Rotar']],
    body: report.keys.map((k) => [
      k.name,
      `${k.algorithm}${k.keyBits ? `-${k.keyBits}` : ''}`,
      k.fingerprint,
      String(k.userCount),
      k.lastUsed,
      k.rotationPriority,
      k.rotateRequired ? 'Sí' : 'No',
    ]),
    margin: { left: margin, right: margin },
  })

  y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 30
  if (y > 165) {
    doc.addPage()
    y = 14
  }
  y += 8

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    styles: { fontSize: 5.5, cellPadding: 1.2 },
    headStyles: { fillColor: [194, 65, 12], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [['#', 'Fase', 'Acción', 'Detalle', 'Min']],
    body: report.plan.steps.map((s) => [
      String(s.order),
      s.phase,
      s.action,
      s.detail,
      String(s.durationMin),
    ]),
    margin: { left: margin, right: margin },
  })

  doc.setFontSize(7)
  doc.setTextColor(130, 130, 130)
  doc.text(
    `CloudOps · ${report.policyVersion} · Generado ${new Date().toLocaleString('es-ES')}`,
    margin,
    doc.internal.pageSize.getHeight() - 6,
  )

  const filename = buildSshRotationFilename(report, 'pdf')
  triggerBlobDownload(doc.output('blob'), filename)
  return filename
}
