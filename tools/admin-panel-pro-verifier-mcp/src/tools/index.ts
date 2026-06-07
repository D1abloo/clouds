import { buildVerificationReport } from '../verifyEngine.js'
import { writeVerificationReport } from '../utils/reportWriter.js'
import { jsonResult } from '../types.js'
import { scanProjectStructure, extractSidebarRoutes, getProjectRoot } from '../utils/projectScanner.js'
import { runAllowlistedCommand } from '../utils/commandRunner.js'

export const toolHandlers = {
  scan_project_structure: async () => jsonResult(scanProjectStructure()),

  scan_sidebar_routes: async () => {
    const items = extractSidebarRoutes()
    const report = await buildVerificationReport(getProjectRoot(), false)
    return jsonResult({ items, verification: report.sidebar })
  },

  verify_page_functionality: async () => {
    const report = await buildVerificationReport(getProjectRoot(), false)
    return jsonResult({
      pages: report.sidebar,
      summary: {
        ok: report.sidebar.filter((s) => s.pageStatus === 'OK').length,
        warn: report.sidebar.filter((s) => s.pageStatus === 'WARN').length,
        fail: report.sidebar.filter((s) => s.pageStatus === 'FAIL').length,
      },
    })
  },

  verify_design_quality: async () =>
    jsonResult({
      checklist: [
        'Sidebar width/collapsed — revisar sidebar.component.ts',
        'Card spacing — visual-system.scss / global-flat-ui.scss',
        'Responsive — @media en componentes principales',
        'Tipografía — design-tokens.scss',
      ],
      recommendation: 'Ejecutar revisión visual manual + e2e responsive',
    }),

  verify_official_logos: async () => {
    const report = await buildVerificationReport(getProjectRoot(), false)
    return jsonResult({ logos: report.logos })
  },

  verify_demo_mode: async () =>
    jsonResult({
      envFlags: ['DEMO_MODE=true', 'PRO_MODE=false'],
      backendEndpoint: '/api/v1/demo/status',
      frontendService: 'apps/frontend-angular/src/app/core/services/demo.service.ts',
      seedScript: 'npm run prisma:seed:demo',
      status: 'Demo Mode con fallback offline y seed Prisma',
    }),

  verify_pro_mode_readiness: async () => {
    const root = getProjectRoot()
    const report = await buildVerificationReport(root, false)
    return jsonResult({
      recommendation: report.recommendation,
      envExample: '.env.example',
      integrationsDoc: 'docs/integrations-pro.md',
      risks: report.risks,
      schemaGaps: report.schema.filter((s) => s.status !== 'OK'),
    })
  },

  verify_api_coverage: async () => {
    const report = await buildVerificationReport(getProjectRoot(), false)
    return jsonResult(report.apiCoverage)
  },

  verify_postgresql_schema: async () => {
    const report = await buildVerificationReport(getProjectRoot(), false)
    return jsonResult({ models: report.schema })
  },

  run_database_migrations: async () => {
    const root = getProjectRoot()
    const res = await runAllowlistedCommand('npx prisma migrate deploy', `${root}/apps/backend-api`)
    return jsonResult(res)
  },

  seed_demo_data: async () => {
    const root = getProjectRoot()
    const res = await runAllowlistedCommand('npm run prisma:seed:demo', root)
    return jsonResult(res)
  },

  verify_login: async () => {
    const report = await buildVerificationReport(getProjectRoot(), false)
    return jsonResult({ summary: report.loginSummary, file: 'apps/frontend-angular/src/app/features/login/login.component.ts' })
  },

  run_quality_checks: async () => {
    const root = getProjectRoot()
    const commands = ['npm run build']
    const results = []
    for (const cmd of commands) {
      results.push(await runAllowlistedCommand(cmd, root))
    }
    return jsonResult({ results })
  },

  run_e2e_sidebar_tests: async () => {
    const root = getProjectRoot()
    const hasPlaywright = scanProjectStructure(root).hasPlaywright
    if (!hasPlaywright) {
      return jsonResult({
        status: 'skipped',
        message: 'Playwright no configurado. Ver e2e/admin-sidebar.spec.ts tras npm install -D @playwright/test',
      })
    }
    const res = await runAllowlistedCommand('npx playwright test', root)
    return jsonResult(res)
  },

  generate_admin_panel_verification_report: async () => {
    const root = getProjectRoot()
    const report = await buildVerificationReport(root, false)
    const out = writeVerificationReport(root, report)
    return jsonResult({ path: out, recommendation: report.recommendation, missing: report.missing.length })
  },
} as const

export type ToolName = keyof typeof toolHandlers

export const TOOL_NAMES = Object.keys(toolHandlers) as ToolName[]
