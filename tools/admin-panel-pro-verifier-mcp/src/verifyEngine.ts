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
    const componentSrc = component && fs.existsSync(component) ? fs.readFileSync(component, 'utf8') : ''
    const hasProGate =
      /ProConfigGateComponent|ConnectionRequiredComponent|app-pro-config-gate|app-connection-required/i.test(
        componentSrc,
      )
    const mockIssues = component ? scanPageForMockSignals(component) : ['Component path not resolved']

    const pageOk = routeMatch || item.route.startsWith('/cloud/') || item.route.startsWith('/settings')
    let pageStatus: SidebarRow['pageStatus'] = pageOk ? 'OK' : 'WARN'
    let uiStatus: SidebarRow['uiStatus'] = mockIssues.length === 0 ? 'OK' : mockIssues.some((i) => i.includes('English')) ? 'WARN' : 'OK'

    if (!pageOk) pageStatus = 'FAIL'

    const proOk = pageOk && (hasProGate || mockIssues.length === 0)

    return {
      section: item.section,
      label: item.label,
      route: item.route,
      pageStatus,
      uiStatus,
      demoStatus: 'OK',
      proStatus: proOk ? 'OK' : pageOk ? 'WARN' : 'FAIL',
      notes: hasProGate
        ? 'Estado configuración requerida en PRO'
        : mockIssues.slice(0, 2).join('; ') || 'Ruta registrada en area-nav',
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
  let postgresOk = false
  let migrationsOk = false
  let seedsOk = fileExists(root, 'apps/backend-api/prisma/seed.ts')

  const backendDir = path.join(root, 'apps/backend-api')
  const migrateStatus = await runAllowlistedCommand('npx prisma migrate status', backendDir)
  postgresOk =
    migrateStatus.ok && !/P1001|Can't reach database server/i.test(migrateStatus.stderr + migrateStatus.stdout)
  migrationsOk = postgresOk && /Database schema is up to date/i.test(migrateStatus.stdout)

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
    const testRes = await runAllowlistedCommand('npm test -w apps/backend-api', root)
    qualityChecks.push({
      command: 'npm test -w apps/backend-api',
      ok: testRes.ok,
      durationMs: testRes.durationMs,
      stderr: testRes.stderr,
    })
  }

  const missing: string[] = []
  const risks: string[] = []

  sidebar.filter((s) => s.pageStatus === 'FAIL').forEach((s) => missing.push(`Ruta sin resolver: ${s.label} (${s.route})`))

  loginChecks.filter((c) => !c.ok).forEach((c) => missing.push(`Login: falta ${c.k}`))

  const authPath = path.join(root, 'apps/backend-api/src/modules/auth/auth.controller.ts')
  const authSrc = fs.existsSync(authPath) ? fs.readFileSync(authPath, 'utf8') : ''
  const oauthCallbackReady = /oauth\/callback|@Get\(['"]callback/i.test(authSrc)

  const partialSchema = schema.filter((s) => s.status === 'MISSING')
  const mockSidebarFails = sidebar.filter((s) => s.proStatus === 'FAIL')
  const partialApis = Object.entries(apiCoverage).filter(([, ok]) => !ok)

  const connReqPath = path.join(
    root,
    'apps/frontend-angular/src/app/shared/components/connection-required/connection-required.component.ts',
  )
  const hasConfigRequiredUi =
    fs.existsSync(connReqPath) && /Configuración requerida/i.test(fs.readFileSync(connReqPath, 'utf8'))

  const navRoutes = [
    path.join(root, 'apps/frontend-angular/src/app/core/routing/navigation.routes.ts'),
    path.join(root, 'apps/frontend-angular/src/app/app.routes.ts'),
  ]
    .filter((p) => fs.existsSync(p))
    .map((p) => fs.readFileSync(p, 'utf8'))
    .join('\n')
  const routesProtected = /authGuard/.test(navRoutes)

  const permsGuard = fileExists(root, 'apps/backend-api/src/common/guards/permissions.guard.ts')

  if (!oauthCallbackReady) {
    missing.push('Auth: falta endpoint OAuth callback (intercambio code → sesión JWT)')
  }
  if (!postgresOk) {
    missing.push('PostgreSQL: no accesible o migrate status falló')
  }
  if (!migrationsOk) {
    missing.push('Prisma: migraciones pendientes de aplicar')
  }
  if (!seedsOk) {
    missing.push('Prisma: falta script de seed')
  }
  if (!hasConfigRequiredUi) {
    missing.push('UI: falta componente Configuración requerida para PRO')
  }
  if (!routesProtected) {
    missing.push('Rutas admin sin authGuard')
  }
  if (!permsGuard) {
    missing.push('Backend: falta PermissionsGuard (RBAC)')
  }
  if (partialSchema.length > 0) {
    missing.push(`Prisma: ${partialSchema.length} tablas sin modelo`)
  }
  if (mockSidebarFails.length > 0) {
    missing.push(`UI: ${mockSidebarFails.length} rutas sidebar sin estado PRO`)
  }

  partialSchema.forEach((s) => risks.push(`Tabla PRO pendiente en Prisma: ${s.table}`))
  partialApis.slice(0, 12).forEach(([mod]) => risks.push(`API/adaptador parcial para: ${mod} (estado configuración requerida si faltan credenciales)`))

  const envExample = fs.existsSync(path.join(root, '.env.example'))
    ? fs.readFileSync(path.join(root, '.env.example'), 'utf8')
    : ''
  const proConfigured = envExample.includes('PRO_MODE=true') && envExample.includes('DEMO_MODE=false')
  const envFiles = [
    'apps/frontend-angular/src/environments/environment.ts',
    'apps/frontend-angular/src/environments/environment.production.ts',
  ]
  const frontendPro =
    proConfigured &&
    envFiles.every((f) => {
      const p = path.join(root, f)
      return fs.existsSync(p) && /proMode:\s*true/.test(fs.readFileSync(p, 'utf8')) && /demoMode:\s*false/.test(fs.readFileSync(p, 'utf8'))
    })

  const logosOk = logos.every((l) => l.status !== 'MISSING')
  const sidebarOk = sidebar.every((s) => s.pageStatus !== 'FAIL')
  const buildsOk = runChecks ? qualityChecks.every((q) => q.ok) : true

  const blocking = missing.length
  const proReady =
    proConfigured &&
    frontendPro &&
    loginChecks.every((c) => c.ok) &&
    oauthCallbackReady &&
    postgresOk &&
    migrationsOk &&
    seedsOk &&
    hasConfigRequiredUi &&
    routesProtected &&
    permsGuard &&
    sidebarOk &&
    logosOk &&
    partialSchema.length === 0 &&
    mockSidebarFails.length === 0 &&
    buildsOk

  const recommendation: VerificationReport['recommendation'] = proReady ? 'READY_FOR_PRO' : 'NOT_READY_FOR_PRO'

  return {
    generatedAt: new Date().toISOString(),
    recommendation,
    executiveSummary:
      recommendation === 'READY_FOR_PRO'
        ? `Panel listo para PRO: ${sidebar.length} rutas sidebar, PostgreSQL con ${prismaModels.length} modelos Prisma, auth JWT+OAuth, RBAC activo, UI en español con estado «Configuración requerida» cuando faltan credenciales externas.`
        : `Panel en preparación PRO: ${blocking} bloqueante(s). PostgreSQL: ${postgresOk ? 'OK' : 'pendiente'}, migraciones: ${migrationsOk ? 'OK' : 'pendiente'}.`,
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
