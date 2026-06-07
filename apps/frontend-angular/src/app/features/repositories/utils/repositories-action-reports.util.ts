import type { GlobalBranchRow, GlobalCommitRow } from './repositories-global-demo.util'
import { buildBranchDemoCommits } from './repositories-global-demo.util'

export type RepoOpStatus = 'ok' | 'warn' | 'fail'

export interface RepoOpKpi {
  label: string
  value: string
  tone?: 'ok' | 'warn' | 'crit'
  icon?: string
}

export interface RepoOpStep {
  label: string
  status: RepoOpStatus
  detail: string
  durationMs?: number
}

export interface RepoOpSection {
  title: string
  icon?: string
  items?: string[]
  table?: { headers: string[]; rows: string[][] }
  code?: string
  steps?: RepoOpStep[]
}

export interface RepoActionReport {
  sectionId: string
  actionId: string
  title: string
  subtitle: string
  summary?: string
  provider?: 'github' | 'gitlab' | 'multi'
  resourceName?: string
  generatedAt: string
  durationSec: number
  status: RepoOpStatus
  alerts?: { severity: RepoOpStatus; message: string }[]
  impact?: string
  kpis: RepoOpKpi[]
  sections: RepoOpSection[]
  recommendations: string[]
  exportBase: string
}

const slug = (v: string): string =>
  v.toLowerCase().replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)

const base = (
  sectionId: string,
  actionId: string,
  title: string,
  subtitle: string,
  resourceName?: string,
  provider?: RepoActionReport['provider'],
): RepoActionReport => ({
  sectionId,
  actionId,
  title,
  subtitle,
  resourceName,
  provider,
  generatedAt: new Date().toLocaleString('es-ES'),
  durationSec: 1 + Math.floor(Math.random() * 6),
  status: 'ok',
  kpis: [],
  sections: [],
  recommendations: [],
  exportBase: slug(`${sectionId}-${actionId}-${resourceName ?? 'global'}`),
})

export const buildWebhookCreateReport = (): RepoActionReport => {
  const r = base('webhooks', 'create', 'Webhook creado', 'Entrega configurada · firma HMAC activa', undefined, 'multi')
  r.kpis = [
    { label: 'Evento', value: 'push', icon: 'send' },
    { label: 'URL', value: 'hooks.cloudops.local', icon: 'link' },
    { label: 'Secreto', value: 'whsec_••••', icon: 'vpn_key' },
    { label: 'SSL', value: 'TLS 1.3', icon: 'lock' },
  ]
  r.sections = [
    {
      title: 'Configuración',
      icon: 'settings',
      table: {
        headers: ['Campo', 'Valor'],
        rows: [
          ['Content-Type', 'application/json'],
          ['Reintentos', '3 · backoff exponencial'],
          ['Timeout', '30 s'],
          ['Firma', 'X-Hub-Signature-256'],
        ],
      },
    },
    {
      title: 'Eventos suscritos',
      icon: 'webhook',
      items: ['push', 'pull_request', 'workflow_run', 'deployment_status'],
    },
  ]
  r.recommendations = ['Probar el webhook con un payload de ejemplo antes de activar en producción.']
  return r
}

export const buildWebhookTestReport = (): RepoActionReport => {
  const r = base('webhooks', 'test', 'Prueba de webhook', 'POST 200 OK · latencia 142 ms', undefined, 'multi')
  r.sections = [
    {
      title: 'Resultado',
      icon: 'play_arrow',
      steps: [
        { label: 'Generar payload demo', status: 'ok', detail: 'push · main', durationMs: 45 },
        { label: 'Firmar HMAC', status: 'ok', detail: 'sha256=abc…', durationMs: 12 },
        { label: 'POST destino', status: 'ok', detail: 'HTTP 200', durationMs: 142 },
        { label: 'Validar respuesta', status: 'ok', detail: '{"ok":true}', durationMs: 8 },
      ],
    },
  ]
  return r
}

export const buildWebhookPayloadReport = (row: Record<string, unknown>): RepoActionReport => {
  const event = String(row['event'] ?? 'push')
  const provider = String(row['provider'] ?? 'github')
  const r = base('webhooks', 'payload', `Payload · ${event}`, String(row['repoFullName'] ?? row['projectPath'] ?? 'webhook'), event, provider === 'gitlab' ? 'gitlab' : 'github')
  r.sections = [
    {
      title: 'Payload JSON',
      icon: 'data_object',
      code: JSON.stringify(
        {
          event,
          provider,
          repository: row['repoFullName'] ?? row['projectPath'],
          ref: 'refs/heads/main',
          commits: [{ id: 'a1b2c3d', message: 'feat: demo payload', author: 'cloudops-demo' }],
          delivery: { id: 'del-' + Date.now(), status: row['status'] ?? 'delivered' },
        },
        null,
        2,
      ),
    },
    {
      title: 'Metadatos entrega',
      icon: 'info',
      table: {
        headers: ['Campo', 'Valor'],
        rows: [
          ['Tamaño', String(row['size'] ?? '2.4 KB')],
          ['Recibido', String(row['receivedAt'] ?? new Date().toLocaleString('es-ES'))],
          ['Estado', String(row['status'] ?? 'delivered')],
        ],
      },
    },
  ]
  return r
}

export const buildWebhookToggleReport = (row: Record<string, unknown>): RepoActionReport => {
  const active = row['active'] === false
  const r = base('webhooks', 'toggle', active ? 'Webhook activado' : 'Webhook desactivado', String(row['url'] ?? ''), String(row['repoFullName'] ?? row['projectPath'] ?? ''))
  r.status = active ? 'ok' : 'warn'
  r.summary = active ? 'El webhook volverá a recibir eventos.' : 'Los eventos se encolarán pero no se entregarán hasta reactivar.'
  return r
}

export const buildWebhookRetryReport = (row: Record<string, unknown>): RepoActionReport => {
  const r = base('webhooks', 'retry', 'Reintento programado', `Webhook ${row['webhookId']} · intento ${row['attempt']}`, String(row['webhookId']))
  r.sections = [
    {
      title: 'Cola de reintentos',
      icon: 'replay',
      steps: [
        { label: 'Motivo anterior', status: 'warn', detail: String(row['reason'] ?? 'timeout'), durationMs: 0 },
        { label: 'Backoff', status: 'ok', detail: '30 s → 60 s → 120 s', durationMs: 0 },
        { label: 'Próximo intento', status: 'ok', detail: String(row['nextAt'] ?? 'en 30 s'), durationMs: 0 },
      ],
    },
  ]
  return r
}

export const buildBranchSyncReport = (): RepoActionReport => {
  const r = base('branches', 'sync', 'Ramas sincronizadas', 'GitHub + GitLab · inventario actualizado', undefined, 'multi')
  r.kpis = [
    { label: 'GitHub', value: '12 ramas', icon: 'code' },
    { label: 'GitLab', value: '10 ramas', icon: 'code' },
    { label: 'Protegidas', value: '8', icon: 'shield' },
    { label: 'Nuevas', value: '2', icon: 'fiber_new' },
  ]
  return r
}

export const buildBranchCompareReport = (a?: GlobalBranchRow, b?: GlobalBranchRow): RepoActionReport => {
  const r = base('branches', 'compare', 'Comparación de ramas', `${a?.name ?? 'main'} vs ${b?.name ?? 'develop'}`, a?.repoOrProject)
  r.kpis = [
    { label: 'Commits ahead', value: '14', icon: 'north' },
    { label: 'Commits behind', value: '3', icon: 'south' },
    { label: 'Archivos', value: '28', icon: 'description' },
    { label: 'Conflictos', value: '0', icon: 'merge', tone: 'ok' },
  ]
  r.sections = [
    {
      title: 'Diff resumido',
      icon: 'compare_arrows',
      table: {
        headers: ['Archivo', 'Cambio'],
        rows: [
          ['src/api/github.service.ts', '+42 / −8'],
          ['src/features/repositories/…', '+128 / −12'],
          ['package.json', '+2 / −1'],
        ],
      },
    },
  ]
  return r
}

export const buildBranchCommitsReport = (row: GlobalBranchRow): RepoActionReport => {
  const commits = buildBranchDemoCommits(row)
  const r = base('branches', 'commits', `Commits · ${row.name}`, row.repoOrProject, row.name, row.provider)
  r.summary = `${commits.length} commits · ${new Set(commits.map((c) => c.author)).size} autores · ahead +${row.commitsAhead ?? 0} / behind −${row.commitsBehind ?? 0}`
  r.kpis = [
    { label: 'Commits', value: String(commits.length), icon: 'history' },
    { label: 'Autores', value: String(new Set(commits.map((c) => c.author)).size), icon: 'group' },
    { label: 'CI', value: row.ciStatus, icon: 'rule', tone: row.ciStatus === 'failed' ? 'warn' : 'ok' },
    { label: 'Deploy', value: row.deployStatus, icon: 'rocket_launch' },
    { label: 'Ahead', value: `+${row.commitsAhead ?? 0}`, icon: 'north' },
    { label: 'Behind', value: `−${row.commitsBehind ?? 0}`, icon: 'south' },
  ]
  r.sections = [
    {
      title: 'Historial de commits',
      icon: 'history_edu',
      table: {
        headers: ['SHA', 'Autor', 'Fecha', 'Mensaje', 'CI', 'Archivos', '+/−', 'Review', 'Deploy'],
        rows: commits.slice(0, 12).map((c) => [
          c.sha.slice(0, 10),
          c.author,
          new Date(c.date).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }),
          c.message.length > 48 ? `${c.message.slice(0, 48)}…` : c.message,
          c.ciStatus,
          String(c.filesChanged),
          `+${c.additions}/−${c.deletions}`,
          c.relatedReview ?? '—',
          c.linkedDeploy ?? c.deployStatus,
        ]),
      },
    },
    {
      title: 'Pipeline de rama',
      icon: 'bolt',
      table: {
        headers: ['Campo', 'Valor'],
        rows: [
          ['Workflow', row.ciWorkflow ?? '—'],
          ['Pipeline ID', row.pipelineId ?? commits[0]?.pipelineId ?? '—'],
          ['Destino deploy', row.deployTarget ?? '—'],
          ['Último SHA', row.lastCommitSha?.slice(0, 12) ?? commits[0]?.sha.slice(0, 12) ?? '—'],
        ],
      },
    },
  ]
  if (row.ciStatus === 'failed') {
    r.status = 'warn'
    r.alerts = [{ severity: 'warn', message: 'El último pipeline de la rama falló — revisa CI antes de desplegar.' }]
  }
  return r
}

export const buildBranchDeployReport = (row: GlobalBranchRow): RepoActionReport => {
  const r = base('branches', 'deploy', `Despliegue · ${row.name}`, row.repoOrProject, row.name, row.provider)
  r.sections = [
    {
      title: 'Plan de despliegue',
      icon: 'rocket_launch',
      steps: [
        { label: 'Checkout', status: 'ok', detail: row.name, durationMs: 1200 },
        { label: 'Build', status: 'ok', detail: row.provider === 'github' ? 'GitHub Actions' : 'GitLab CI', durationMs: 89000 },
        { label: 'Deploy', status: 'ok', detail: 'staging', durationMs: 45000 },
      ],
    },
  ]
  r.recommendations = row.protected ? ['Rama protegida — requiere aprobación en pipeline de producción.'] : []
  return r
}

export const buildCommitDetailReport = (row: GlobalCommitRow): RepoActionReport => {
  const r = base('commits', 'detail', `Commit · ${row.sha.slice(0, 10)}`, row.message, row.repoOrProject, row.provider)
  r.summary = `Autor ${row.author} · rama ${row.branch} · ${row.filesChanged} archivos tocados`
  r.kpis = [
    { label: 'Autor', value: row.author, icon: 'person' },
    { label: 'Rama', value: row.branch, icon: 'account_tree' },
    { label: '+/−', value: `+${row.additions}/−${row.deletions}`, icon: 'difference' },
    { label: 'Archivos', value: String(row.filesChanged), icon: 'description' },
    { label: 'CI', value: row.ciStatus, icon: 'check_circle', tone: row.ciStatus === 'failed' ? 'warn' : 'ok' },
    { label: 'Deploy', value: row.deployStatus, icon: 'rocket_launch' },
  ]
  if (row.ciDuration) r.kpis.push({ label: 'Duración CI', value: row.ciDuration, icon: 'timer' })
  if (row.deployEnvironment) r.kpis.push({ label: 'Entorno', value: row.deployEnvironment, icon: 'layers' })
  r.sections = [
    {
      title: 'Metadatos',
      icon: 'info',
      table: {
        headers: ['Campo', 'Valor'],
        rows: [
          ['SHA completo', row.sha],
          ['Workflow CI', row.ciWorkflow ?? '—'],
          ['Jobs CI', row.ciJobsTotal ? `${row.ciJobsPassed ?? 0}/${row.ciJobsTotal}` : '—'],
          ['Verificado', row.verified ? 'Sí (GPG)' : 'No'],
          ['Firma', row.signature ?? '—'],
          ['Etiquetas', row.tags?.join(', ') ?? '—'],
          ['Review relacionada', row.relatedReview ?? '—'],
          ['Destino deploy', row.deployTarget ?? '—'],
          ['Versión', row.deployVersion ?? '—'],
        ],
      },
    },
    {
      title: 'Archivos modificados',
      icon: 'folder',
      table: {
        headers: ['Archivo', 'Cambio'],
        rows: [
          [`src/${row.repoOrProject.split('/').pop()}/index.ts`, `+${Math.floor(row.additions * 0.4)} / −${Math.floor(row.deletions * 0.3)}`],
          [`src/features/repositories/global-page.component.ts`, `+${Math.floor(row.additions * 0.35)} / −${Math.floor(row.deletions * 0.4)}`],
          ['README.md', '+4 / −0'],
          ['package.json', '+2 / −1'],
        ],
      },
    },
    {
      title: 'Mensaje completo',
      icon: 'subject',
      code: `${row.message}\n\nCo-authored-by: ${row.author} <demo@cloudops.local>\nSigned-off-by: ${row.author}`,
    },
  ]
  if (row.relatedReview) r.recommendations = [`Relacionado con ${row.relatedReview} — revisa checks antes de desplegar.`]
  if (row.ciStatus === 'failed') {
    r.status = 'warn'
    r.alerts = [{ severity: 'warn', message: 'CI fallido — consulta logs antes de promover a producción.' }]
  }
  return r
}

export const buildCommitDiffReport = (row: GlobalCommitRow): RepoActionReport => {
  const r = base('commits', 'diff', `Diff · ${row.sha.slice(0, 7)}`, row.message, row.repoOrProject, row.provider)
  r.kpis = [
    { label: 'Líneas +', value: String(row.additions), icon: 'add', tone: 'ok' },
    { label: 'Líneas −', value: String(row.deletions), icon: 'remove' },
    { label: 'Archivos', value: String(row.filesChanged), icon: 'description' },
  ]
  r.sections = [
    {
      title: 'Diff unificado (extracto)',
      icon: 'difference',
      code: `diff --git a/src/features/repositories/commits-section.component.ts b/src/features/repositories/commits-section.component.ts
index a1b2c3..d4e5f6 100644
--- a/src/features/repositories/commits-section.component.ts
+++ b/src/features/repositories/commits-section.component.ts
@@ -12,6 +12,18 @@ export class CommitsGlobalSectionComponent {
+  readonly viewDiff = output<GlobalCommitRow>()
+  readonly viewCi = output<GlobalCommitRow>()
+
   visibleRows = computed(() => {
     const fn = COMMIT_TAB_FILTERS[this.tabIndex()] ?? COMMIT_TAB_FILTERS[0]
     return this.commits.filter(fn)
   })
+
+// +${row.additions} líneas añadidas en ${row.filesChanged} archivos`,
    },
  ]
  return r
}

export const buildCommitCiReport = (row: GlobalCommitRow): RepoActionReport => {
  const failed = row.ciStatus === 'failed'
  const running = row.ciStatus === 'running'
  const r = base('commits', 'ci', `CI · ${row.ciWorkflow ?? 'pipeline'}`, row.message, row.sha.slice(0, 10), row.provider)
  r.status = failed ? 'fail' : running ? 'warn' : 'ok'
  r.kpis = [
    { label: 'Workflow', value: row.ciWorkflow ?? 'default', icon: 'bolt' },
    { label: 'Estado', value: row.ciStatus, icon: 'rule', tone: failed ? 'warn' : 'ok' },
    { label: 'Duración', value: failed ? '3m 42s' : '2m 18s', icon: 'timer' },
  ]
  r.sections = [
    {
      title: 'Jobs',
      icon: 'playlist_play',
      steps: [
        { label: 'checkout', status: 'ok', detail: row.sha.slice(0, 7), durationMs: 4200 },
        { label: 'install', status: 'ok', detail: 'npm ci', durationMs: 45000 },
        { label: 'lint', status: failed ? 'fail' : 'ok', detail: failed ? '3 errores ESLint' : '0 warnings', durationMs: 22000 },
        { label: 'test', status: failed ? 'fail' : 'ok', detail: failed ? '2 specs failed' : '142 passed', durationMs: 98000 },
        { label: 'build', status: running ? 'warn' : failed ? 'warn' : 'ok', detail: row.provider === 'github' ? 'GitHub Actions' : 'GitLab CI', durationMs: running ? undefined : 120000 },
      ],
    },
    {
      title: 'Log (extracto)',
      icon: 'terminal',
      code: failed
        ? `[ERROR] lint: src/app/features/repositories/commits-section.component.ts\n  42:5  error  Missing return type\n\nTests: 2 failed, 140 passed\nJob failed after 3m 42s`
        : `[INFO] All checks passed\n[INFO] Artifact uploaded · deploy-ready\nJob succeeded in 2m 18s`,
    },
  ]
  return r
}

export const buildCommitRefreshReport = (): RepoActionReport => {
  const r = base('commits', 'refresh', 'Timeline actualizada', 'Commits sincronizados desde GitHub y GitLab', undefined, 'multi')
  r.kpis = [
    { label: 'GitHub', value: '12 commits', icon: 'code' },
    { label: 'GitLab', value: '8 commits', icon: 'code' },
    { label: 'Nuevos', value: '3', icon: 'new_releases' },
  ]
  r.sections = [
    {
      title: 'Últimos recibidos',
      icon: 'history',
      items: [
        'cloudops-org/cloudops-api · feat: módulo GitHub',
        'cloudops-platform/gitlab-payment-service · fix: stage deploy',
        'cloudops-org/cloudops-frontend · ui: drawer repositorios',
      ],
    },
  ]
  return r
}

export const buildCommitDeployReport = (row: GlobalCommitRow): RepoActionReport => {
  const r = base('commits', 'deploy', `Desplegar ${row.sha.slice(0, 7)}`, row.repoOrProject, row.sha, row.provider)
  r.status = row.ciStatus === 'failed' ? 'warn' : 'ok'
  r.summary = `${row.message} · rama ${row.branch}`
  r.kpis = [
    { label: 'Rama', value: row.branch, icon: 'account_tree' },
    { label: 'CI', value: row.ciStatus, icon: 'rule', tone: row.ciStatus === 'failed' ? 'warn' : 'ok' },
    { label: 'Archivos', value: String(row.filesChanged), icon: 'description' },
    { label: 'Versión actual', value: row.deployVersion ?? 'sin tag', icon: 'label' },
  ]
  if (row.ciStatus === 'failed') {
    r.alerts = [{ severity: 'warn', message: 'CI fallido en este commit. Despliegue bajo tu responsabilidad.' }]
  }
  r.sections = [
    {
      title: 'Resumen del commit',
      icon: 'commit',
      table: {
        headers: ['Campo', 'Valor'],
        rows: [
          ['SHA', row.sha.slice(0, 12)],
          ['Autor', row.author],
          ['Workflow', row.ciWorkflow ?? '—'],
          ['Duración CI', row.ciDuration ?? '—'],
          ['Review', row.relatedReview ?? '—'],
        ],
      },
    },
    {
      title: 'Destinos disponibles',
      icon: 'rocket_launch',
      table: {
        headers: ['Entorno', 'Target', 'Estrategia', 'Estado'],
        rows: [
          ['staging', row.deployTarget ?? 'cluster-staging', 'rolling', 'OK'],
          ['production', 'cluster-prod-01', 'canary', row.ciStatus === 'failed' ? 'Bloqueado' : 'OK'],
        ],
      },
    },
    {
      title: 'Pasos del despliegue',
      icon: 'timeline',
      steps: [
        { label: 'Validar CI', status: row.ciStatus === 'failed' ? 'fail' : 'ok', detail: row.ciWorkflow ?? 'pipeline', durationMs: 120000 },
        { label: 'Build artefacto', status: 'ok', detail: `+${row.additions} líneas`, durationMs: 95000 },
        { label: 'Promover entorno', status: 'warn', detail: row.deployEnvironment ?? 'seleccionar', durationMs: 0 },
        { label: 'Healthcheck', status: 'warn', detail: 'post-deploy probe', durationMs: 0 },
      ],
    },
  ]
  r.recommendations = row.ciStatus === 'failed'
    ? ['Corrige el pipeline CI antes de promover a producción.']
    : ['Staging recomendado antes de producción para commits con cambios amplios.']
  return r
}

export const buildCommitSourceReport = (row: GlobalCommitRow): RepoActionReport => {
  const host = row.provider === 'github' ? 'github.com' : 'gitlab.com'
  const path = row.repoOrProject.replace('/', row.provider === 'github' ? '/commit/' : '/-/commit/')
  const r = base('commits', 'source', 'Origen del commit', row.message, row.sha, row.provider)
  r.sections = [
    {
      title: 'URL',
      icon: 'open_in_new',
      code: `https://${host}/${path}${row.sha}`,
    },
  ]
  return r
}

export const buildPrDetailReport = (pr: Record<string, unknown>): RepoActionReport => {
  const num = pr['number']
  const r = base('pull-requests', 'detail', `PR #${num} · ${pr['title']}`, String(pr['repoFullName']), `#${num}`, 'github')
  r.summary = String(pr['description'] ?? 'Sin descripción ampliada.')
  r.kpis = [
    { label: 'Estado', value: String(pr['state']), icon: 'merge' },
    { label: 'Autor', value: String(pr['author']), icon: 'person' },
    { label: 'Rama', value: `${pr['head']} → ${pr['base']}`, icon: 'account_tree' },
    { label: 'Checks', value: String(pr['checks']), icon: 'rule', tone: pr['checks'] === 'failed' ? 'warn' : 'ok' },
    { label: '+/−', value: `+${pr['additions'] ?? 0}/−${pr['deletions'] ?? 0}`, icon: 'difference' },
    { label: 'Commits', value: String(pr['commits'] ?? '—'), icon: 'commit' },
  ]
  r.sections = [
    {
      title: 'Etiquetas',
      icon: 'label',
      items: ((pr['labels'] as string[]) ?? []).length ? (pr['labels'] as string[]) : ['Sin etiquetas'],
    },
    {
      title: 'Descripción',
      icon: 'description',
      items: [
        String(pr['description'] ?? '—'),
        pr['draft'] ? '⚠ Borrador — no listo para revisión formal.' : 'Listo para revisión.',
      ],
    },
    {
      title: 'Revisiones',
      icon: 'rate_review',
      table: {
        headers: ['Revisor', 'Estado', 'Comentarios'],
        rows: ((pr['reviewers'] as string[]) ?? []).length
          ? (pr['reviewers'] as string[]).map((rev) => [rev, 'Pendiente', '0'])
          : [['—', 'Sin revisores asignados', '—']],
      },
    },
  ]
  if (pr['conflicts']) {
    r.status = 'warn'
    r.alerts = [{ severity: 'warn', message: 'Conflictos de merge en values.yaml y package-lock.json.' }]
    r.recommendations = ['Ejecuta rebase sobre main antes de fusionar.']
  }
  return r
}

export const buildPrCommitsReport = (pr: Record<string, unknown>): RepoActionReport => {
  const r = base('pull-requests', 'commits', `Commits del PR #${pr['number']}`, String(pr['title']), `#${pr['number']}`, 'github')
  r.sections = [
    {
      title: 'Commits incluidos',
      icon: 'history',
      items: [
        'feat: drawer repositorios',
        'test: acciones globales',
        'docs: webhooks README',
        'fix: lint routing',
      ],
    },
  ]
  return r
}

export const buildPrChecksReport = (pr: Record<string, unknown>): RepoActionReport => {
  const failed = pr['checks'] === 'failed'
  const r = base('pull-requests', 'checks', `Checks · PR #${pr['number']}`, String(pr['repoFullName']), `#${pr['number']}`, 'github')
  r.status = failed ? 'fail' : 'ok'
  r.sections = [
    {
      title: 'GitHub Actions',
      icon: 'bolt',
      steps: [
        { label: 'lint', status: 'ok', detail: 'eslint + prettier', durationMs: 42000 },
        { label: 'unit-tests', status: failed ? 'fail' : 'ok', detail: failed ? '2 failed' : '142 passed', durationMs: 120000 },
        { label: 'build', status: failed ? 'warn' : 'ok', detail: 'angular production', durationMs: 180000 },
        { label: 'e2e-smoke', status: 'ok', detail: '3 specs', durationMs: 95000 },
      ],
    },
  ]
  return r
}

export const buildPrPreviewReport = (pr: Record<string, unknown>): RepoActionReport => {
  const r = base('pull-requests', 'preview', `Preview · PR #${pr['number']}`, 'Entorno efímero staging-preview', `#${pr['number']}`, 'github')
  r.kpis = [
    { label: 'URL', value: 'preview-128.cloudops.dev', icon: 'language' },
    { label: 'TTL', value: '72 h', icon: 'schedule' },
    { label: 'Commit', value: String(pr['head']), icon: 'commit' },
  ]
  r.sections = [
    {
      title: 'Despliegue preview',
      icon: 'rocket_launch',
      steps: [
        { label: 'Build imagen', status: 'ok', detail: 'docker/nginx:pr-128', durationMs: 92000 },
        { label: 'Push registry', status: 'ok', detail: 'ghcr.io/cloudops/…', durationMs: 34000 },
        { label: 'Deploy K8s', status: 'ok', detail: 'ns: preview-pr-128', durationMs: 28000 },
      ],
    },
  ]
  return r
}

export const buildPrOpenGithubReport = (pr: Record<string, unknown>): RepoActionReport => {
  const r = base('pull-requests', 'open', 'Abrir en GitHub', String(pr['title']), `#${pr['number']}`, 'github')
  r.sections = [
    {
      title: 'Enlace',
      icon: 'open_in_new',
      code: `https://github.com/${pr['repoFullName']}/pull/${pr['number']}`,
    },
    {
      title: 'Acciones disponibles en GitHub',
      icon: 'touch_app',
      items: ['Revisar diff', 'Añadir comentarios', 'Aprobar / solicitar cambios', 'Merge squash o rebase'],
    },
  ]
  return r
}

export const buildPrReviewReport = (pr: Record<string, unknown>): RepoActionReport => {
  const r = base('pull-requests', 'review', 'Solicitar revisión', `PR #${pr['number']}`, String(pr['repoFullName']), 'github')
  r.sections = [
    {
      title: 'Revisores sugeridos',
      icon: 'group',
      table: {
        headers: ['Usuario', 'Equipo', 'Carga'],
        rows: [
          ['ana.dev', 'frontend', '3 PRs abiertos'],
          ['carlos.ops', 'platform', '1 PR abierto'],
          ['sre-lead', 'sre', '2 PRs abiertos'],
        ],
      },
    },
    {
      title: 'Notificación',
      icon: 'notifications',
      items: ['Email + Slack #code-reviews', 'Recordatorio en 24h si no hay respuesta'],
    },
  ]
  r.recommendations = ['Asigna al menos un revisor del área afectada y uno de plataforma para cambios de infra.']
  return r
}

export const buildPrMergeReport = (pr: Record<string, unknown>): RepoActionReport => {
  const blocked = pr['conflicts'] || pr['checks'] === 'failed' || pr['draft']
  const r = base('pull-requests', 'merge', `Fusionar PR #${pr['number']}`, String(pr['title']), `#${pr['number']}`, 'github')
  r.status = blocked ? 'warn' : 'ok'
  if (blocked) {
    r.alerts = [{
      severity: 'warn',
      message: pr['conflicts'] ? 'Conflictos sin resolver.' : pr['draft'] ? 'PR en borrador.' : 'Checks de CI fallidos.',
    }]
  }
  r.sections = [
    {
      title: 'Estrategia de merge',
      icon: 'merge',
      table: {
        headers: ['Opción', 'Recomendación'],
        rows: [
          ['Squash and merge', pr['commits'] && Number(pr['commits']) > 5 ? 'Recomendado' : 'Opcional'],
          ['Rebase and merge', 'Historial lineal'],
          ['Create merge commit', 'Preserva commits individuales'],
        ],
      },
    },
  ]
  r.impact = blocked ? 'Merge bloqueado hasta resolver impedimentos.' : 'Disparará workflow de deploy a staging tras merge.'
  return r
}

export const buildDeployTargetReport = (d: Record<string, unknown>): RepoActionReport => {
  const r = base('deployments', 'target', `Destino · ${d['targetName']}`, String(d['targetType']), String(d['repoFullName'] ?? d['projectPath']))
  r.sections = [
    {
      title: 'Infraestructura destino',
      icon: 'dns',
      table: {
        headers: ['Campo', 'Valor'],
        rows: [
          ['Nombre', String(d['targetName'])],
          ['Tipo', String(d['targetType'])],
          ['Región', 'eu-west-1'],
          ['Estado', String(d['status'])],
          ['Rama', String(d['branch'])],
        ],
      },
    },
  ]
  return r
}

export const buildDeployCommitReport = (d: Record<string, unknown>): RepoActionReport => {
  const sha = String(d['commitSha'] ?? 'a1b2c3d')
  const r = base('deployments', 'commit', `Commit · ${sha.slice(0, 10)}`, String(d['repoFullName'] ?? d['projectPath']), sha)
  r.summary = String(d['commitMessage'] ?? `feat: release ${d['branch']}`)
  r.kpis = [
    { label: 'Rama', value: String(d['branch']), icon: 'account_tree' },
    { label: 'Versión', value: String(d['version'] ?? '—'), icon: 'label' },
    { label: 'Entorno', value: String(d['environment'] ?? '—'), icon: 'layers' },
    { label: 'Estado deploy', value: String(d['status']), icon: 'rocket_launch', tone: d['status'] === 'failed' ? 'warn' : 'ok' },
  ]
  r.sections = [
    {
      title: 'Commit desplegado',
      icon: 'commit',
      table: {
        headers: ['Campo', 'Valor'],
        rows: [
          ['SHA', sha],
          ['Mensaje', String(d['commitMessage'] ?? '—')],
          ['Autor pipeline', String(d['triggeredBy'] ?? '—')],
          ['Pipeline', String(d['pipelineId'] ?? '—')],
          ['Versión anterior', String(d['previousVersion'] ?? '—')],
        ],
      },
    },
  ]
  return r
}

export const buildDeployPipelineReport = (d: Record<string, unknown>): RepoActionReport => {
  const provider = String(d['provider'] ?? 'github')
  const r = base('deployments', 'pipeline', `Pipeline · ${provider}`, String(d['repoFullName'] ?? d['projectPath']), String(d['id']))
  r.summary = String(d['pipelineId'] ?? d['id'])
  r.kpis = [
    { label: 'Duración', value: String(d['duration'] ?? '—'), icon: 'timer' },
    { label: 'Estrategia', value: String(d['strategy'] ?? 'rolling'), icon: 'swap_horiz' },
    { label: 'Entorno', value: String(d['environment'] ?? '—'), icon: 'layers' },
    { label: 'Health', value: String(d['healthCheck'] ?? '—'), icon: 'favorite', tone: d['status'] === 'failed' ? 'warn' : 'ok' },
  ]
  const stages = (d['stages'] as string[] | undefined) ?? ['checkout', 'build', 'test', 'deploy']
  const failed = d['status'] === 'failed'
  const running = d['status'] === 'running'
  r.sections = [
    {
      title: 'Stages',
      icon: 'timeline',
      steps: stages.map((label, i) => {
        const isLast = i === stages.length - 1
        let status: RepoOpStatus = 'ok'
        if (failed && isLast) status = 'fail'
        else if (running && isLast) status = 'warn'
        else if (running && i > stages.indexOf('deploy')) status = 'warn'
        return {
          label,
          status,
          detail: isLast ? String(d['targetName']) : provider === 'github' ? 'GitHub Actions' : 'GitLab CI',
          durationMs: 30000 + i * 25000,
        }
      }),
    },
    {
      title: 'Artefacto',
      icon: 'inventory_2',
      table: {
        headers: ['Campo', 'Valor'],
        rows: [
          ['Versión', String(d['version'] ?? '—')],
          ['Commit', String(d['commitSha'] ?? '').slice(0, 12)],
          ['Destino', String(d['targetName'])],
          ['Tipo', String(d['targetType'])],
        ],
      },
    },
  ]
  return r
}

export const buildDeployRetryReport = (d: Record<string, unknown>): RepoActionReport => {
  const r = base('deployments', 'retry', 'Reintento de despliegue', String(d['targetName']), String(d['id']))
  r.status = 'warn'
  r.summary = 'Se reutilizará el artefacto del último build exitoso.'
  return r
}

export const buildDeployRollbackReport = (d: Record<string, unknown>): RepoActionReport => {
  const r = base('deployments', 'rollback', 'Rollback demo', `Versión anterior en ${d['targetName']}`, String(d['id']))
  r.status = 'warn'
  r.alerts = [{ severity: 'warn', message: 'Rollback demo — no modifica infraestructura real.' }]
  r.impact = 'Restaurará la revisión n-1 del deployment en el cluster.'
  return r
}

export const buildDeployNewReport = (): RepoActionReport => {
  const r = base('deployments', 'new', 'Nuevo despliegue', 'Selecciona origen GitHub o GitLab en su sección', undefined, 'multi')
  r.sections = [
    {
      title: 'Orígenes disponibles',
      icon: 'source',
      items: [
        'GitHub → /repositories/github · botón Desplegar en cada repo',
        'GitLab → /repositories/gitlab · botón Desplegar proyecto',
        'Commits → acción Desplegar commit',
        'Ramas → acción Desplegar rama',
        'PR → acción Desplegar preview',
      ],
    },
  ]
  r.recommendations = ['Para despliegue a producción, usa ramas protegidas con CI verde.']
  return r
}

export const buildDeployHistoryReport = (): RepoActionReport => {
  const r = base('deployments', 'history', 'Historial de despliegues', 'Últimos 30 días', undefined, 'multi')
  r.kpis = [
    { label: 'Total', value: '48', icon: 'history' },
    { label: 'Éxito', value: '92%', icon: 'check_circle' },
    { label: 'Rollback', value: '2', icon: 'undo' },
    { label: 'MTTR', value: '18 min', icon: 'timer' },
  ]
  r.sections = [
    {
      title: 'Despliegues recientes',
      icon: 'rocket_launch',
      table: {
        headers: ['Origen', 'Destino', 'Estado', 'Duración'],
        rows: [
          ['cloudops-api → main', 'cluster-prod-01', 'success', '4m 12s'],
          ['cloudops-frontend → develop', 'vps-prod-nginx-01', 'running', '2m 08s'],
          ['k8s-demo-app → main', 'cluster-staging', 'failed', '3m 22s'],
          ['payment-service → main', 'k8s-prod-payments', 'success', '5m 18s'],
        ],
      },
    },
  ]
  return r
}

export const buildDeployLogsReport = (d: Record<string, unknown>): RepoActionReport => {
  const failed = d['status'] === 'failed'
  const running = d['status'] === 'running'
  const r = base('deployments', 'logs', `Logs · ${d['targetName']}`, String(d['repoFullName'] ?? d['projectPath']), String(d['id']))
  r.status = failed ? 'fail' : running ? 'warn' : 'ok'
  r.summary = String(d['commitMessage'] ?? `Deploy ${d['branch']}`)
  r.kpis = [
    { label: 'Rama', value: String(d['branch']), icon: 'account_tree' },
    { label: 'Duración', value: String(d['duration'] ?? '—'), icon: 'timer' },
    { label: 'Disparado por', value: String(d['triggeredBy'] ?? '—'), icon: 'person' },
    { label: 'Entorno', value: String(d['environment'] ?? '—'), icon: 'layers' },
    { label: 'Versión', value: String(d['version'] ?? '—'), icon: 'label' },
    { label: 'Health', value: String(d['healthCheck'] ?? '—'), icon: 'monitor_heart', tone: failed ? 'warn' : 'ok' },
  ]
  const msg = String(d['commitMessage'] ?? 'release')
  r.sections = [
    {
      title: 'Salida del pipeline',
      icon: 'terminal',
      code: failed
        ? `[Deploy] ${d['repoFullName'] ?? d['projectPath']} · ${d['pipelineId'] ?? 'pipeline'}
[${new Date().toISOString()}] INFO  checkout ${d['branch']} · ${String(d['commitSha']).slice(0, 7)} · "${msg}"
[${new Date().toISOString()}] INFO  build OK · artefacto ${d['version'] ?? 'v2.4.0'}
[${new Date().toISOString()}] INFO  strategy=${d['strategy'] ?? 'rolling'} · env=${d['environment'] ?? 'staging'}
[${new Date().toISOString()}] INFO  deploy → ${d['targetName']} (${d['targetType']})
[${new Date().toISOString()}] ERROR ${d['error'] ?? 'Deploy failed'}
[${new Date().toISOString()}] INFO  healthcheck=${d['healthCheck'] ?? 'failed'}
[${new Date().toISOString()}] INFO  status=failed · rollback automático omitido (demo)`
        : running
          ? `[Deploy] ${d['repoFullName'] ?? d['projectPath']} · ${d['pipelineId'] ?? 'pipeline'}
[${new Date().toISOString()}] INFO  checkout ${d['branch']} · ${String(d['commitSha']).slice(0, 7)}
[${new Date().toISOString()}] INFO  build OK · ${d['version'] ?? 'artefacto'}
[${new Date().toISOString()}] INFO  deploy → ${d['targetName']} en progreso…
[${new Date().toISOString()}] INFO  healthcheck pending · ${d['healthCheck'] ?? '—'}`
          : `[Deploy] ${d['repoFullName'] ?? d['projectPath']} · ${d['pipelineId'] ?? 'pipeline'}
[${new Date().toISOString()}] INFO  checkout ${d['branch']} · ${String(d['commitSha']).slice(0, 7)} · "${msg}"
[${new Date().toISOString()}] INFO  build OK · ${d['version'] ?? String(d['commitSha']).slice(0, 7)}
[${new Date().toISOString()}] INFO  strategy=${d['strategy'] ?? 'rolling'} · previous=${d['previousVersion'] ?? 'n/a'}
[${new Date().toISOString()}] INFO  healthcheck passed · ${d['healthCheck'] ?? 'OK'}
[${new Date().toISOString()}] INFO  deploy → ${d['targetName']} (${d['targetType']})
[${new Date().toISOString()}] INFO  status=${d['status']} · duration=${d['duration'] ?? '—'}`,
    },
  ]
  if (failed) r.recommendations = ['Revisa el error, corrige el commit y usa Reintentar despliegue.']
  return r
}

export const buildGithubActionsReport = (repoName?: string): RepoActionReport => {
  const r = base('github', 'actions', 'GitHub Actions', repoName ?? 'Todos los repos', repoName, 'github')
  r.sections = [
    {
      title: 'Workflows activos',
      icon: 'bolt',
      table: {
        headers: ['Workflow', 'Estado', 'Última ejecución'],
        rows: [
          ['CI — build-and-test', 'success', 'hace 12 min'],
          ['CD — deploy-staging', 'success', 'hace 1 h'],
          ['Security scan', 'success', 'hace 6 h'],
        ],
      },
    },
  ]
  return r
}

export const buildGithubWebhookReport = (repoName?: string): RepoActionReport => buildWebhookCreateReport()

export const buildGitlabMrsReport = (): RepoActionReport => {
  const r = base('gitlab', 'mrs', 'Merge Requests', 'Proyectos GitLab conectados', undefined, 'gitlab')
  r.kpis = [
    { label: 'Abiertos', value: '3', icon: 'call_merge' },
    { label: 'En revisión', value: '1', icon: 'rate_review' },
    { label: 'Aprobados', value: '2', icon: 'check' },
  ]
  return r
}

export const buildGitlabPipelinesReport = (): RepoActionReport => {
  const r = base('gitlab', 'pipelines', 'Pipelines GitLab', 'CI/CD multi-proyecto', undefined, 'gitlab')
  r.sections = [
    {
      title: 'Pipelines recientes',
      icon: 'timeline',
      table: {
        headers: ['Proyecto', 'Pipeline', 'Estado', 'Duración'],
        rows: [
          ['cloudops/platform', '#1842', 'success', '4m 12s'],
          ['cloudops/payment-service', '#891', 'running', '—'],
          ['cloudops/runner-config', '#102', 'failed', '2m 08s'],
        ],
      },
    },
  ]
  return r
}

export const buildOpenExternalReport = (provider: 'github' | 'gitlab', name: string, path: string): RepoActionReport => {
  const host = provider === 'github' ? 'github.com' : 'gitlab.com'
  const r = base(provider, 'external', `Abrir en ${provider === 'github' ? 'GitHub' : 'GitLab'}`, name, name, provider)
  r.sections = [{ title: 'URL', icon: 'open_in_new', code: `https://${host}/${path}` }]
  return r
}

export const exportRepoReportText = (report: RepoActionReport): string => {
  const lines = [report.title, report.subtitle, '', report.summary ?? '', '']
  report.kpis.forEach((k) => lines.push(`${k.label}: ${k.value}`))
  report.sections.forEach((s) => {
    lines.push('', `## ${s.title}`)
    s.items?.forEach((i) => lines.push(`- ${i}`))
    s.code && lines.push(s.code)
  })
  return lines.join('\n')
}
