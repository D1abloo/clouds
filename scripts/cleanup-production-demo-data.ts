#!/usr/bin/env ts-node
/**
 * Limpia datos demo/mock/fake de PostgreSQL en producción.
 *
 * Uso:
 *   npm run cleanup:demo:dry-run
 *   CONFIRM_DELETE_DEMO_DATA=true npm run cleanup:demo:production
 *
 * Requiere DATABASE_URL en el entorno (o .env en apps/backend-api).
 */
import { PrismaClient } from '@prisma/client'
import { clearDemoData } from '../apps/backend-api/prisma/demo/clear-demo'

const prisma = new PrismaClient()

const PRESERVED_EMAILS = new Set([
  'admin@spendlyx.com',
  'admin@cloudops.local',
  'gestion@spendlyx.com',
  'operador@spendlyx.com',
  'auditor@spendlyx.com',
  'lectura@spendlyx.com',
])

const DEMO_EMAIL_PATTERNS = ['@demo.local', '@demo.', 'demo@']
const DEMO_NAME_PATTERN = /\b(demo|mock|fake|sample|ejemplo)\b/i

const isDemoEmail = (email: string): boolean => {
  const lower = email.toLowerCase()
  if (PRESERVED_EMAILS.has(lower)) return false
  return DEMO_EMAIL_PATTERNS.some((p) => lower.includes(p))
}

const isDemoName = (name: string | null | undefined): boolean =>
  !!name && DEMO_NAME_PATTERN.test(name)

const isDemoOrg = (slug: string, name: string): boolean => {
  if (slug === 'spendlyx') return false
  return DEMO_NAME_PATTERN.test(slug) || DEMO_NAME_PATTERN.test(name)
}

type TablePlan = {
  table: string
  count: number
  samples: string[]
}

type CleanupPlan = {
  tables: TablePlan[]
  demoUsers: { id: string; email: string; name: string | null }[]
  demoOrgs: { id: string; slug: string; name: string }[]
}

const maskEmail = (email: string): string => {
  const [local, domain] = email.split('@')
  if (!domain) return '***'
  return `${local.slice(0, 2)}***@${domain}`
}

const buildPlan = async (): Promise<CleanupPlan> => {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, email: true, name: true },
  })

  const demoUsers = users.filter(
    (u) => isDemoEmail(u.email) || isDemoName(u.name),
  )

  const orgs = await prisma.organization.findMany({
    where: { deletedAt: null },
    select: { id: true, slug: true, name: true },
  })

  const demoOrgs = orgs.filter((o) => isDemoOrg(o.slug, o.name))

  const countWhere = async (label: string, count: Promise<number>, samples: string[]): Promise<TablePlan> => ({
    table: label,
    count: await count,
    samples,
  })

  const tables: TablePlan[] = await Promise.all([
    countWhere(
      'users (demo)',
      Promise.resolve(demoUsers.length),
      demoUsers.slice(0, 5).map((u) => maskEmail(u.email)),
    ),
    countWhere(
      'organizations (demo)',
      Promise.resolve(demoOrgs.length),
      demoOrgs.slice(0, 5).map((o) => o.slug),
    ),
    countWhere(
      'instances (demo-*)',
      prisma.instance.count({ where: { id: { startsWith: 'demo-inst-' } } }),
      ['demo-inst-*'],
    ),
    countWhere(
      'vps_servers (demo-*)',
      prisma.vpsServer.count({ where: { id: { startsWith: 'demo-vps' } } }),
      ['demo-vps-*'],
    ),
    countWhere(
      'cloud_accounts (demo-*)',
      prisma.cloudAccount.count({ where: { id: { startsWith: 'demo-' } } }),
      ['demo-*'],
    ),
    countWhere(
      'github_accounts (demo)',
      prisma.githubAccount.count({ where: { id: { startsWith: 'demo-github' } } }),
      ['demo-github*'],
    ),
    countWhere(
      'jenkins_servers (demo)',
      prisma.jenkinsServer.count({ where: { id: { startsWith: 'demo-' } } }),
      ['demo-*'],
    ),
    countWhere(
      'alerts (demo)',
      prisma.alert.count({ where: { id: { startsWith: 'demo-alert' } } }),
      ['demo-alert*'],
    ),
    countWhere(
      'notifications (Demo)',
      prisma.notification.count({ where: { title: { contains: 'Demo' } } }),
      ['title~Demo'],
    ),
    countWhere(
      'audit_logs (demo)',
      prisma.auditLog.count({ where: { action: { contains: 'demo' } } }),
      ['action~demo'],
    ),
  ])

  return { tables, demoUsers, demoOrgs }
}

const printGroupedPlan = (plan: CleanupPlan, dryRun: boolean): void => {
  const mode = dryRun ? 'DRY-RUN' : 'PRODUCTION'
  console.log(`\n=== Spendlyx cleanup demo data [${mode}] ===\n`)

  console.log('Por tabla:')
  for (const row of plan.tables) {
    console.log(`  [${row.table}] ${row.count} registro(s)`)
    for (const sample of row.samples) {
      console.log(`    · ${sample}`)
    }
  }

  if (dryRun) {
    console.log('\n[DRY-RUN] Sin cambios en la base de datos.')
    return
  }
}

const runCleanup = async (dryRun: boolean): Promise<void> => {
  const plan = await buildPlan()
  printGroupedPlan(plan, dryRun)

  if (dryRun) return

  console.log('\nEjecutando limpieza...')

  await clearDemoData(prisma)

  for (const user of plan.demoUsers) {
    await prisma.membership.deleteMany({ where: { userId: user.id } })
    await prisma.userRole.deleteMany({ where: { userId: user.id } })
    await prisma.user.update({
      where: { id: user.id },
      data: { deletedAt: new Date(), isActive: false },
    })
  }

  for (const org of plan.demoOrgs) {
    await prisma.organization.update({
      where: { id: org.id },
      data: { deletedAt: new Date() },
    })
  }

  await prisma.auditLog.create({
    data: {
      action: 'production.demo_cleanup',
      resource: 'database',
      ipAddress: '127.0.0.1',
      metadata: {
        deletedUsers: plan.demoUsers.map((u) => maskEmail(u.email)),
        deletedOrgs: plan.demoOrgs.map((o) => o.slug),
        preservedEmails: [...PRESERVED_EMAILS],
      },
    },
  })

  console.log('\nLimpieza completada. admin@spendlyx.com preservado.')
}

const main = async (): Promise<void> => {
  const args = process.argv.slice(2)
  const dryRun = !args.includes('--production')

  if (process.env.DEMO_MODE === 'true') {
    console.error('Abortado: DEMO_MODE=true. Ejecuta solo con DEMO_MODE=false en producción.')
    process.exit(1)
  }

  if (!dryRun && process.env.CONFIRM_DELETE_DEMO_DATA !== 'true') {
    console.error(
      'Abortado: modo producción requiere CONFIRM_DELETE_DEMO_DATA=true',
    )
    process.exit(1)
  }

  await runCleanup(dryRun)
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : 'Error en limpieza')
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
