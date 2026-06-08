#!/usr/bin/env ts-node
/**
 * Limpia datos demo/mock/fake de PostgreSQL en producción.
 *
 * Uso:
 *   npm run cleanup:demo:dry-run
 *   npm run cleanup:demo:production
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

type CleanupPlan = {
  demoUsers: { id: string; email: string; name: string | null }[]
  demoOrgs: { id: string; slug: string; name: string }[]
  operational: string[]
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

  const operational = [
    'Instancias/VPS/cloud accounts con prefijo demo- (via clearDemoData)',
    'GitHub/Jenkins/Terraform/Docker/K8s demo catalog',
    'Alertas, notificaciones y audit logs demo',
  ]

  return { demoUsers, demoOrgs, operational }
}

const runCleanup = async (dryRun: boolean): Promise<void> => {
  const mode = dryRun ? 'DRY-RUN' : 'PRODUCTION'
  console.log(`\n=== Spendlyx cleanup demo data [${mode}] ===\n`)

  const plan = await buildPlan()

  console.log(`Usuarios demo a eliminar: ${plan.demoUsers.length}`)
  for (const u of plan.demoUsers) {
    console.log(`  - ${u.email} (${u.name ?? '—'})`)
  }

  console.log(`\nOrganizaciones demo a eliminar: ${plan.demoOrgs.length}`)
  for (const o of plan.demoOrgs) {
    console.log(`  - ${o.slug} (${o.name})`)
  }

  console.log('\nDatos operativos demo:')
  for (const line of plan.operational) {
    console.log(`  - ${line}`)
  }

  if (dryRun) {
    console.log('\n[DRY-RUN] Sin cambios en la base de datos.')
    return
  }

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
        deletedUsers: plan.demoUsers.map((u) => u.email),
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

  await runCleanup(dryRun)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
