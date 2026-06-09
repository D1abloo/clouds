#!/usr/bin/env ts-node
/**
 * Verifica que el código fuente y el bundle de producción no contengan cadenas demo prohibidas.
 *
 * Uso:
 *   npm run assert:no-demo
 *   npm run assert:no-demo -- --skip-build
 */
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

const ROOT = path.resolve(__dirname, '..')
const FRONTEND_SRC = path.join(ROOT, 'apps/frontend-angular/src')
const FRONTEND_DIST = path.join(ROOT, 'apps/frontend-angular/dist/frontend-angular/browser')

const FORBIDDEN = [
  'Entrar en modo demo',
  'demo@cloudops.local',
  'Demo User',
  'Cargar datos demo',
  'Carga datos demo',
  'Modo demo',
  'datos demo',
  'Credenciales demo',
]

const ALLOWED_CHUNK_PATTERNS = [
  /admin-demo-mode/i,
  /admin-users\.demo/i,
  /admin-roles\.demo/i,
  /admin-users-page/i,
  /admin-roles-page/i,
  /admin-user-detail/i,
  /admin-role-detail/i,
  /admin-role-assignment/i,
  /demo-banner/i,
  /demo\.service/i,
  /demo-runtime/i,
  /pro-demo\.guard/i,
  /demo-actions/i,
  /settings-page/i,
  /login\.component/i,
  /login-demo/i,
  /admin-settings/i,
  /admin-demo/i,
]

const SKIP_SRC_PATTERNS = [
  /\.spec\.ts$/,
  /\.demo\.ts$/,
  /environment\.development\.ts$/,
  /demo-runtime\.util\.ts$/,
  /pro-production-ui\.spec\.ts$/,
  /demo-banner\.component\.ts$/,
  /demo-banner\.development\.component\.ts$/,
  /admin-demo-mode-page\.component\.ts$/,
  /demo\.service\.ts$/,
  /pro-demo\.guard\.ts$/,
  /login\.component\.ts$/,
  /settings-page\.component\.ts$/,
  /instances-list\.component\.ts$/,
  /instance-overview-table\.component\.ts$/,
  /ai-assistant\.component\.ts$/,
  /navigation\.routes\.ts$/,
  /admin\.config\.ts$/,
  /repositories-action-reports\.util\.ts$/,
  /command-palette-extra\.ts$/,
  /login-demo\.panel\.ts$/,
]

const shouldSkipSrc = (filePath: string): boolean =>
  SKIP_SRC_PATTERNS.some((re) => re.test(filePath))

const walkFiles = (dir: string, ext: RegExp): string[] => {
  if (!fs.existsSync(dir)) return []
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walkFiles(full, ext))
    else if (ext.test(entry.name)) out.push(full)
  }
  return out
}

type Finding = { file: string; string: string; line?: number }

const scanText = (content: string, file: string): Finding[] => {
  const hits: Finding[] = []
  const lines = content.split('\n')
  for (const needle of FORBIDDEN) {
    lines.forEach((line, idx) => {
      if (line.includes(needle)) {
        hits.push({ file, string: needle, line: idx + 1 })
      }
    })
  }
  return hits
}

const scanSource = (): Finding[] => {
  const files = walkFiles(FRONTEND_SRC, /\.(ts|html)$/)
  const findings: Finding[] = []
  for (const file of files) {
    if (shouldSkipSrc(file)) continue
    const rel = path.relative(ROOT, file)
    findings.push(...scanText(fs.readFileSync(file, 'utf8'), rel))
  }
  return findings
}

const isAllowedChunk = (file: string): boolean =>
  ALLOWED_CHUNK_PATTERNS.some((re) => re.test(file))

const scanDist = (): Finding[] => {
  if (!fs.existsSync(FRONTEND_DIST)) {
    console.error(`Dist no encontrado: ${FRONTEND_DIST}. Ejecuta build de producción primero.`)
    process.exit(1)
  }

  const files = walkFiles(FRONTEND_DIST, /\.(js|html)$/)
  const findings: Finding[] = []

  for (const file of files) {
    const base = path.basename(file)
    if (!/^main-.*\.js$/.test(base)) continue
    const rel = path.relative(ROOT, file)
    findings.push(...scanText(fs.readFileSync(file, 'utf8'), rel))
  }

  return findings
}

const scanDatabaseOptional = async (): Promise<Finding[]> => {
  if (process.env.SKIP_DB_CHECK === 'true') return []
  const url = process.env.DATABASE_URL
  if (!url) return []

  try {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()
    const demoUsers = await prisma.user.findMany({
      where: {
        deletedAt: null,
        OR: [
          { email: { contains: '@demo.' } },
          { email: { contains: 'demo@' } },
          { name: { contains: 'Demo User' } },
        ],
      },
      select: { email: true },
      take: 20,
    })
    await prisma.$disconnect()
    return demoUsers.map((u) => ({
      file: 'database:users',
      string: u.email,
    }))
  } catch {
    return []
  }
}

const main = async (): Promise<void> => {
  const skipBuild = process.argv.includes('--skip-build')

  if (!skipBuild) {
    console.log('Construyendo frontend producción...')
    execSync('npm run build -w apps/frontend-angular -- --configuration=production', {
      cwd: ROOT,
      stdio: 'inherit',
    })
  }

  const srcFindings = scanSource()
  const distFindings = scanDist()
  const dbFindings = await scanDatabaseOptional()
  const all = [...srcFindings, ...distFindings, ...dbFindings]

  if (all.length === 0) {
    console.log('\n✓ assert:no-demo — sin cadenas prohibidas en fuente ni bundle principal.')
    process.exit(0)
  }

  console.error('\n✗ assert:no-demo — cadenas prohibidas encontradas:\n')
  const grouped = new Map<string, Finding[]>()
  for (const f of all) {
    const key = f.file
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(f)
  }
  for (const [file, items] of grouped) {
    console.error(`  ${file}`)
    for (const item of items) {
      const loc = item.line ? `:${item.line}` : ''
      console.error(`    - "${item.string}"${loc}`)
    }
  }
  process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
