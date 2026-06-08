import fs from 'node:fs'
import path from 'node:path'
import type { VerificationReport } from '../types.js'

export const writeVerificationReport = (root: string, report: VerificationReport): string => {
  const outPath = path.join(root, 'ADMIN_PANEL_VERIFICATION.md')
  const lines: string[] = [
    '# Informe de verificación — Panel Admin CloudOps',
    '',
    `> Generado: ${report.generatedAt}`,
    `> Recomendación final: **${report.recommendation}**`,
    '',
    '## Resumen ejecutivo',
    '',
    report.executiveSummary,
    '',
    '## Criterios PRO',
    '',
    '| Criterio | Estado |',
    '|----------|--------|',
    `| DEMO_MODE=false / PRO_MODE=true | ${report.recommendation === 'READY_FOR_PRO' ? '✅' : '⚠️'} |`,
    `| PostgreSQL + migraciones | ${report.missing.some((m) => m.includes('PostgreSQL') || m.includes('migraciones')) ? '❌' : '✅'} |`,
    `| Auth JWT + OAuth callback | ${report.missing.some((m) => m.includes('OAuth')) ? '❌' : '✅'} |`,
    `| Rutas protegidas (authGuard) | ${report.missing.some((m) => m.includes('authGuard')) ? '❌' : '✅'} |`,
    `| RBAC (PermissionsGuard) | ${report.missing.some((m) => m.includes('RBAC')) ? '❌' : '✅'} |`,
    `| UI Configuración requerida | ${report.missing.some((m) => m.includes('Configuración requerida')) ? '❌' : '✅'} |`,
    `| Builds + tests (si --with-build) | ${report.qualityChecks.length && report.qualityChecks.every((q) => q.ok) ? '✅' : report.qualityChecks.length ? '❌' : '—'} |`,
    '',
    '## Sidebar — rutas',
    '',
    '| Sección | Ítem | Ruta | Página | UI | Demo | PRO | Notas |',
    '|---------|------|------|--------|----|----|-----|-------|',
  ]

  for (const row of report.sidebar) {
    lines.push(
      `| ${row.section} | ${row.label} | \`${row.route}\` | ${row.pageStatus} | ${row.uiStatus} | ${row.demoStatus} | ${row.proStatus} | ${row.notes} |`,
    )
  }

  lines.push('', '## API y backend', '', '| Módulo | Cubierto |', '|--------|----------|')
  for (const [mod, ok] of Object.entries(report.apiCoverage)) {
    lines.push(`| ${mod} | ${ok ? '✅' : '⚠️'} |`)
  }

  lines.push('', '## PostgreSQL / Prisma', '', '| Tabla esperada | Modelo Prisma | Estado |', '|------------------|---------------|--------|')
  for (const row of report.schema) {
    lines.push(`| ${row.table} | ${row.prismaModel ?? '—'} | ${row.status} |`)
  }

  lines.push('', '## Login y OAuth', '', report.loginSummary, '', '## Logos oficiales', '')
  for (const logo of report.logos) {
    lines.push(`- **${logo.brand}**: ${logo.status} — ${logo.notes}`)
  }

  lines.push('', '## Calidad (checks)', '')
  for (const check of report.qualityChecks) {
    lines.push(`- \`${check.command}\`: ${check.ok ? '✅ OK' : '❌ FAIL'} (${check.durationMs}ms)`)
    if (!check.ok && check.stderr) lines.push(`  - ${check.stderr.split('\n')[0]}`)
  }

  lines.push('', '## Elementos faltantes', '')
  if (report.missing.length === 0) lines.push('- Ninguno crítico detectado automáticamente.')
  else report.missing.forEach((m) => lines.push(`- ${m}`))

  lines.push('', '## Riesgos restantes', '')
  if (report.risks.length === 0) lines.push('- Revisar manualmente flujos OAuth en PRO con credenciales reales.')
  else report.risks.forEach((r) => lines.push(`- ${r}`))

  lines.push('', '## Cómo pasar a PRO', '', '```bash', 'DEMO_MODE=false', 'PRO_MODE=true', 'INTEGRATIONS_LIVE=true', '# + credenciales OAuth, cloud y PostgreSQL', '```', '')

  fs.writeFileSync(outPath, lines.join('\n'), 'utf8')
  return outPath
}
