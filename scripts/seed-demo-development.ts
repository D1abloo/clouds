#!/usr/bin/env ts-node
/**
 * Seed de usuarios y alertas demo — solo entornos con DEMO_MODE=true.
 *
 * Uso:
 *   DEMO_MODE=true TS_NODE_COMPILER_OPTIONS='{"module":"CommonJS"}' ts-node scripts/seed-demo-development.ts
 */
import { PrismaClient, AlertSeverity } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

const main = async (): Promise<void> => {
  if (process.env.DEMO_MODE !== 'true') {
    console.error('Abortado: DEMO_MODE debe ser true para seed demo de desarrollo.')
    process.exit(1)
  }

  const project = await prisma.project.findFirst({ where: { slug: 'default' } })
  if (!project) {
    console.error('Ejecuta primero el seed base (roles, admin, proyecto).')
    process.exit(1)
  }

  const demoPasswordHash = await bcrypt.hash('Demo123!', 12)
  const roleByName = async (name: string) => prisma.role.findUnique({ where: { name } })

  const DEMO_USERS = [
    { email: 'cloud.admin@demo.local', name: 'Demo Administrador', role: 'administrador' },
    { email: 'devops@demo.local', name: 'Demo Operador', role: 'operador' },
    { email: 'viewer@demo.local', name: 'Demo Solo lectura', role: 'solo_lectura' },
    { email: 'auditor@demo.local', name: 'Demo Auditor', role: 'auditor' },
    { email: 'demo@cloudops.local', name: 'Demo User', role: 'administrador' },
  ]

  for (const demo of DEMO_USERS) {
    const role = await roleByName(demo.role)
    await prisma.user.upsert({
      where: { email: demo.email },
      create: {
        email: demo.email,
        passwordHash: demoPasswordHash,
        name: demo.name,
        userRoles: role
          ? { create: [{ roleId: role.id, projectId: project.id }] }
          : undefined,
      },
      update: { name: demo.name, deletedAt: null, isActive: true },
    })
  }

  await prisma.alertRule.createMany({
    data: [
      { name: 'High CPU', condition: 'cpu_high', severity: AlertSeverity.WARNING },
      { name: 'High RAM', condition: 'ram_high', severity: AlertSeverity.WARNING },
      { name: 'Disk Full', condition: 'disk_full', severity: AlertSeverity.CRITICAL },
      { name: 'High Cost', condition: 'cost_high', severity: AlertSeverity.WARNING },
    ],
    skipDuplicates: true,
  })

  console.log('Seed demo desarrollo completado.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
