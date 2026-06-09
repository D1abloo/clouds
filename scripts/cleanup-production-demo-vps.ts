#!/usr/bin/env ts-node
/**
 * Limpia servidores VPS demo/mock de PostgreSQL en producción.
 *
 * Uso:
 *   npm run cleanup:vps-demo:dry-run
 *   CONFIRM_DELETE_DEMO_VPS=true npm run cleanup:vps-demo:production
 *
 * Requiere DATABASE_URL en el entorno (o .env en apps/backend-api).
 */
import { PrismaClient } from '@prisma/client'
import { clearDemoVpsData, findDemoVpsServerIds } from './lib/clear-demo-vps-data'

const prisma = new PrismaClient()

type TablePlan = {
  table: string
  count: number
  samples: string[]
}

type CleanupPlan = {
  tables: TablePlan[]
  demoVpsIds: string[]
}

const buildPlan = async (): Promise<CleanupPlan> => {
  const demoVpsIds = await findDemoVpsServerIds(prisma)

  const demoVpsSamples = demoVpsIds.slice(0, 5)
  const demoCommands = await prisma.commandExecution.count({
    where: { output: { contains: '[Demo]' } },
  })

  const sshSessions =
    demoVpsIds.length > 0
      ? await prisma.sshSession.count({ where: { vpsServerId: { in: demoVpsIds } } })
      : 0

  const tables: TablePlan[] = [
    {
      table: 'vps_servers (demo-vps*, demo/mock/fake)',
      count: demoVpsIds.length,
      samples: demoVpsSamples.length ? demoVpsSamples : ['—'],
    },
    {
      table: 'ssh_sessions (VPS demo)',
      count: sshSessions,
      samples: demoVpsIds.length ? [`vps_server_id in (${demoVpsIds.length} ids)`] : ['—'],
    },
    {
      table: 'command_executions ([Demo])',
      count: demoCommands,
      samples: ['output~[Demo]'],
    },
  ]

  return { tables, demoVpsIds }
}

const printGroupedPlan = async (plan: CleanupPlan, dryRun: boolean): Promise<void> => {
  const mode = dryRun ? 'DRY-RUN' : 'PRODUCTION'
  console.log(`\n=== Spendlyx cleanup VPS demo [${mode}] ===\n`)

  console.log('Por tabla:')
  for (const row of plan.tables) {
    console.log(`  [${row.table}] ${row.count} registro(s)`)
    for (const sample of row.samples) {
      console.log(`    · ${sample}`)
    }
  }

  const realCount = await prisma.vpsServer.count({
    where: {
      deletedAt: null,
      id: { not: { startsWith: 'demo-vps' } },
    },
  })
  console.log(`\nServidores VPS reales preservados (estimado): ${Math.max(0, realCount - plan.demoVpsIds.length)}+`)

  if (dryRun) {
    console.log('\n[DRY-RUN] Sin cambios en la base de datos.')
  }
}

const runCleanup = async (dryRun: boolean): Promise<void> => {
  const plan = await buildPlan()
  await printGroupedPlan(plan, dryRun)

  if (dryRun) return

  console.log('\nEjecutando limpieza VPS demo...')

  const deleted = await clearDemoVpsData(prisma)

  await prisma.auditLog.create({
    data: {
      action: 'production.demo_vps_cleanup',
      resource: 'vps_servers',
      ipAddress: '127.0.0.1',
      metadata: {
        deletedVpsIds: plan.demoVpsIds,
        deletedCounts: deleted,
      },
    },
  })

  console.log('\nLimpieza VPS demo completada.')
  console.log(`  vps_servers: ${deleted.vpsServers}`)
  console.log(`  ssh_sessions: ${deleted.sshSessions}`)
  console.log(`  command_executions: ${deleted.commandExecutions}`)
}

const main = async (): Promise<void> => {
  const args = process.argv.slice(2)
  const dryRun = !args.includes('--production')

  if (process.env.APP_ENV !== 'production' && !dryRun) {
    console.error('Abortado: modo producción requiere APP_ENV=production')
    process.exit(1)
  }

  if (process.env.DEMO_MODE === 'true') {
    console.error('Abortado: DEMO_MODE=true. Ejecuta solo con DEMO_MODE=false en producción.')
    process.exit(1)
  }

  if (process.env.PRO_MODE !== 'true' && !dryRun) {
    console.error('Abortado: modo producción requiere PRO_MODE=true')
    process.exit(1)
  }

  if (!dryRun && process.env.CONFIRM_DELETE_DEMO_VPS !== 'true') {
    console.error('Abortado: modo producción requiere CONFIRM_DELETE_DEMO_VPS=true')
    process.exit(1)
  }

  await runCleanup(dryRun)
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : 'Error en limpieza VPS demo')
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
