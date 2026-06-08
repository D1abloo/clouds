import { PrismaClient, AlertSeverity } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import {
  PLATFORM_SETTINGS_PRO,
  RBAC_PERMISSIONS,
  RBAC_ROLE_PERMISSIONS,
  RBAC_ROLES,
  rbacPermissionCode,
} from '../src/common/rbac/rbac.catalog'

const prisma = new PrismaClient()

const isProductionSeed = (): boolean => {
  const seedMode = process.env.SEED_MODE?.toLowerCase()
  if (seedMode === 'production') return true
  if (seedMode === 'demo') return false
  return process.env.DEMO_MODE === 'false'
}

async function seedPermissions() {
  for (const perm of RBAC_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { action_resource: { action: perm.action, resource: perm.resource } },
      create: {
        action: perm.action,
        resource: perm.resource,
        description: perm.description,
      },
      update: { description: perm.description },
    })
  }
}

async function seedRoles() {
  for (const role of RBAC_ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      create: role,
      update: { description: role.description },
    })
  }
}

async function seedRolePermissions() {
  const permRows = await prisma.permission.findMany()
  const permByCode = new Map(
    permRows.map((p) => [rbacPermissionCode(p.resource, p.action), p.id]),
  )

  for (const [roleName, codes] of Object.entries(RBAC_ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUnique({ where: { name: roleName } })
    if (!role) continue

    for (const code of codes) {
      const permissionId = permByCode.get(code)
      if (!permissionId) continue
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        create: { roleId: role.id, permissionId },
        update: {},
      })
    }
  }
}

async function seedPlatformSettings() {
  for (const [key, value] of Object.entries(PLATFORM_SETTINGS_PRO)) {
    await prisma.platformSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    })
  }
}

async function main() {
  const productionSeed = isProductionSeed()
  console.log(
    productionSeed
      ? 'Seeding Spendlyx PRO (roles, permisos, admin, proyecto)...'
      : 'Seeding CloudOps Control Center...',
  )

  await seedPermissions()
  await seedRoles()
  await seedRolePermissions()
  await seedPlatformSettings()

  const superAdminRole = await prisma.role.findUnique({ where: { name: 'superadministrador' } })
  const soloLecturaRole = await prisma.role.findUnique({ where: { name: 'solo_lectura' } })

  const project = await prisma.project.upsert({
    where: { slug: 'default' },
    create: { name: 'Spendlyx', slug: 'default', description: 'Proyecto principal' },
    update: { name: 'Spendlyx' },
  })

  const passwordHash = await bcrypt.hash('Admin123!', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@cloudops.local' },
    create: {
      email: 'admin@cloudops.local',
      passwordHash,
      name: 'Administrador Spendlyx',
      userRoles: superAdminRole
        ? { create: [{ roleId: superAdminRole.id, projectId: project.id }] }
        : undefined,
    },
    update: { name: 'Administrador Spendlyx' },
  })

  if (superAdminRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId_projectId: {
          userId: admin.id,
          roleId: superAdminRole.id,
          projectId: project.id,
        },
      },
      create: { userId: admin.id, roleId: superAdminRole.id, projectId: project.id },
      update: {},
    })
  }

  if (!productionSeed) {
    const demoPasswordHash = await bcrypt.hash('Demo123!', 12)

    const roleByName = async (name: string) => prisma.role.findUnique({ where: { name } })

    const DEMO_USERS = [
      { email: 'cloud.admin@demo.local', name: 'Demo Administrador', role: 'administrador' },
      { email: 'devops@demo.local', name: 'Demo Operador', role: 'operador' },
      { email: 'viewer@demo.local', name: 'Demo Solo lectura', role: 'solo_lectura' },
      { email: 'auditor@demo.local', name: 'Demo Auditor', role: 'auditor' },
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
        update: { name: demo.name },
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
  }

  console.log('Seed complete.')
  console.log('Admin: admin@cloudops.local / Admin123!')
  console.log('Roles: superadministrador, administrador, operador, auditor, solo_lectura')
  if (!productionSeed) {
    console.log('Demo users (password Demo123! for all)')
  }
  console.log(`Project ID: ${project.id}`)
  console.log(`Admin ID: ${admin.id}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
