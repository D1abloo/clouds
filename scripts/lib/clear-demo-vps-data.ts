import type { PrismaClient } from '@prisma/client'

const DEMO_NAME_PATTERN = /\b(demo|mock|fake|sample|ejemplo)\b/i

const metadataLooksDemo = (metadata: unknown): boolean => {
  if (!metadata || typeof metadata !== 'object') return false
  const text = JSON.stringify(metadata).toLowerCase()
  return /\b(demo|mock|fake|sample|ejemplo)\b/.test(text)
}

/** Identifica servidores VPS demo sin tocar hosts reales de producción. */
export const findDemoVpsServerIds = async (prisma: PrismaClient): Promise<string[]> => {
  const servers = await prisma.vpsServer.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, hostname: true, metadata: true },
  })

  return servers
    .filter((s) => {
      if (s.id.startsWith('demo-vps')) return true
      if (DEMO_NAME_PATTERN.test(s.name)) return true
      if (DEMO_NAME_PATTERN.test(s.hostname)) return true
      return metadataLooksDemo(s.metadata)
    })
    .map((s) => s.id)
}

/** Elimina VPS demo, sesiones SSH asociadas y ejecuciones demo. */
export const clearDemoVpsData = async (prisma: PrismaClient): Promise<{
  vpsServers: number
  sshSessions: number
  commandExecutions: number
}> => {
  const demoVpsIds = await findDemoVpsServerIds(prisma)

  const sshSessions =
    demoVpsIds.length > 0
      ? await prisma.sshSession.deleteMany({ where: { vpsServerId: { in: demoVpsIds } } })
      : { count: 0 }

  const vpsServers =
    demoVpsIds.length > 0
      ? await prisma.vpsServer.deleteMany({ where: { id: { in: demoVpsIds } } })
      : { count: 0 }

  const commandExecutions = await prisma.commandExecution.deleteMany({
    where: { output: { contains: '[Demo]' } },
  })

  return {
    vpsServers: vpsServers.count,
    sshSessions: sshSessions.count,
    commandExecutions: commandExecutions.count,
  }
}
