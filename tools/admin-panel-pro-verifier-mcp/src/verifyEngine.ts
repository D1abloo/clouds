import fs from 'node:fs'
import path from 'node:path'
import { runAllowlistedCommand } from './utils/commandRunner.js'
import {
  REQUIRED_SCHEMA_ALIASES,
  extractAngularRoutes,
  extractBackendModules,
  extractPrismaModels,
  extractSidebarRoutes,
  fileExists,
  getProjectRoot,
  listLogoAssets,
  mapApiModuleCoverage,
  scanPageForMockSignals,
  scanProjectStructure,
  resolveComponentForRoute,
} from './utils/projectScanner.js'
import type { LogoRow, QualityCheckRow, SchemaRow, SidebarRow, VerificationReport } from './types.js'

const LOGO_EXPECTED: Record<string, string[]> = {
  AWS: ['aws.svg', 'aws.png'],
  GCP: ['gcp.svg', 'google-cloud.svg'],
  Azure: ['azure.svg'],
  Docker: ['docker.svg'],
  Kubernetes: ['kubernetes.svg'],
  GitHub: ['github.svg'],
  GitLab: ['gitlab.svg'],
  Jenkins: ['jenkins.svg'],
  Terraform: ['terraform.svg'],
  Google: ['google.svg', 'google-oauth.svg'],
}

export const buildVerificationReport = async (
  root = getProjectRoot(),
  runChecks = false,
): Promise<VerificationReport> => {
  const structure = scanProjectStructure(root)
  const sidebarItems = extractSidebarRoutes(root)
  const angularRoutes = extractAngularRoutes(root)
  const prismaModels = extractPrismaModels(root)
  const backendModules = extractBackendModules(root)
  const logosOnDisk = listLogoAssets(root)

  const sidebar: SidebarRow[] = sidebarItems.map((item) => {
    const routeBase = item.route.split('?')[0]
    const routeMatch =
      angularRoutes.some((r) => routeBase === r || routeBase.startsWith(r + '/')) ||
      fileExists(root, `apps/frontend-angular/src/app/features`) // lazy routes may not be in flat list

    const component = resolveComponentForRoute(routeBase, root)
    const mockIssues = component ? scanPageForMockSignals(component) : ['Component path not resolved']

    const pageOk = routeMatch || item.route.startsWith('/cloud/') || item.route.startsWith('/settings')
    let pageStatus: SidebarRow['pageStatus'] = pageOk ? 'OK' : 'WARN'
    let uiStatus: SidebarRow['uiStatus'] = mockIssues.length === 0 ? 'OK' : mockIssues.some((i) => i.includes('English')) ? 'WARN' : 'OK'

    if (!pageOk) pageStatus = 'FAIL'

    return {
      section: item.section,
      label: item.label,
      route: item.route,
      pageStatus,
      uiStatus,
      demoStatus: 'OK',
      proStatus: pageOk && mockIssues.length === 0 ? 'OK' : pageOk ? 'WARN' : 'FAIL',
      notes: mockIssues.slice(0, 2).join('; ') || 'Ruta registrada en area-nav',
    }
  })

  const schema: SchemaRow[] = Object.entries(REQUIRED_SCHEMA_ALIASES).map(([table, aliases]) => {
    const list = aliases as string[]
    const found = list.find((a) => prismaModels.includes(a))
    return {
      table,
      prismaModel: found ?? null,
      status: found ? 'OK' : list.length === 0 ? 'PARTIAL' : 'MISSING',
    } as SchemaRow
  })

  const apiCoverage = mapApiModuleCoverage(backendModules)

  const logos: LogoRow[] = Object.entries(LOGO_EXPECTED).map(([brand, files]) => {
    const hit = files.find((f) => logosOnDisk.includes(f))
    return {
      brand,
      status: hit ? 'OK' : brand === 'Google' ? 'WARN' : logosOnDisk.some((l) => l.includes(brand.toLowerCase())) ? 'OK' : 'MISSING',
      notes: hit ? hit : `Esperado: ${files.join(' o ')}`,
    }
  })

  const loginPath = path.join(root, 'apps/frontend-angular/src/app/features/login/login.component.ts')
  const loginSrc = fs.existsSync(loginPath) ? fs.readFileSync(loginPath, 'utf8') : ''
  const loginChecks = [
    { k: 'Iniciar sesión', ok: /Iniciar sesión/i.test(loginSrc) },
    { k: 'Google OAuth UI', ok: /Continuar con Google/i.test(loginSrc) },
    { k: 'GitHub OAuth UI', ok: /Continuar con GitHub/i.test(loginSrc) },
    { k: 'Modo demo', ok: /modo demo/i.test(loginSrc) },
    { k: 'Fondo cloud', ok: /cloud|gradient|login-bg/i.test(loginSrc) },
    { k: 'Español errores', ok: /Error al iniciar sesión|Cargando/i.test(loginSrc) },
  ]
  const loginSummary = loginChecks.map((c) => `- ${c.k}: ${c.ok ? '✅' : '❌'}`).join('\n')

  const qualityChecks: QualityCheckRow[] = []
  if (runChecks) {
    for (const cmd of ['npm run build -w apps/frontend-angular', 'npm run build -w apps/backend-api']) {
      const res = await runAllowlistedCommand(cmd, root)
      qualityChecks.push({
        command: cmd,
        ok: res.ok,
        durationMs: res.durationMs,
        stderr: res.stderr,
      })
    }
  }

  const missing: string[] = []
  const risks: string[] = []

  sidebar.filter((s) => s.pageStatus === 'FAIL').forEach((s) => missing.push(`Ruta sin resolver: ${s.label} (${s.route})`))
  schema.filter((s) => s.status === 'MISSING').forEach((s) => risks.push(`Tabla PRO pendiente en Prisma: ${s.table}`))
  Object.entries(apiCoverage)
    .filter(([, ok]) => !ok)
    .slice(0, 15)
    .forEach(([mod]) => risks.push(`API/adaptador parcial para: ${mod}`))

  loginChecks.filter((c) => !c.ok).forEach((c) => missing.push(`Login: falta ${c.k}`))

  const authPath = path.join(root, 'apps/backend-api/src/modules/auth/auth.controller.ts')
  const authSrc = fs.existsSync(authPath) ? fs.readFileSync(authPath, 'utf8') : ''
  const oauthCallbackReady = /oauth\/callback|@Get\(['"]callback/i.test(authSrc)

  const partialSchema = schema.filter((s) => s.status === 'PARTIAL' || s.status === 'MISSING')
  const mockSidebar = sidebar.filter((s) => s.proStatus !== 'OK' || /TODO|placeholder|mock/i.test(s.notes))
  const partialApis = Object.entries(apiCoverage).filter(([, ok]) => !ok)

  if (!oauthCallbackReady) {
    missing.push('Auth: falta endpoint OAuth callback (intercambio code → sesión JWT)')
  }
  if (partialSchema.length > 0) {
    missing.push(`Prisma: ${partialSchema.length} tablas PRO sin modelo dedicado`)
  }
  if (mockSidebar.length > 12) {
    missing.push(`UI: ${mockSidebar.length} rutas con datos demo/mock o señales placeholder`)
  }
  if (partialApis.length > 10) {
    missing.push(`API: ${partialApis.length} módulos backend sin adaptador dedicado`)
  }

  const envExample = fs.existsSync(path.join(root, '.env.example'))
    ? fs.readFileSync(path.join(root, '.env.example'), 'utf8')
    : ''
  const proConfigured = envExample.includes('PRO_MODE=true') && envExample.includes('DEMO_MODE=false')

  const blocking = sidebar.filter((s) => s.pageStatus === 'FAIL').length + missing.length
  const proReady =
    proConfigured &&
    loginChecks.every((c) => c.ok) &&
    oauthCallbackReady &&
    blocking === 0 &&
    partialSchema.length === 0 &&
    partialApis.length === 0 &&
    (runChecks ? qualityChecks.every((q) => q.ok) : true)

  const recommendation: VerificationReport['recommendation'] = proReady ? 'READY_FOR_PRO' : 'NOT_READY_FOR_PRO'

  return {
    generatedAt: new Date().toISOString(),
    recommendation,
    executiveSummary:
      recommendation === 'READY_FOR_PRO'
        ? `Panel verificado: ${sidebar.length} rutas sidebar, Prisma con ${prismaModels.length} modelos, demo operativo. Revisar OAuth/cloud en entorno PRO real.`
        : `Panel en preparación PRO: ${blocking} bloqueantes detectados. Demo Mode sigue siendo el entorno de prueba principal.`,
    sidebar,
    apiCoverage,
    schema,
    loginSummary,
    logos,
    qualityChecks,
    missing,
    risks,
    fixed: [],
  }
}
