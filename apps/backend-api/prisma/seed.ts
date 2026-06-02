import { PrismaClient, AlertSeverity } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

const ROLES = [
  { name: 'super_admin', description: 'Full system access' },
  { name: 'cloud_admin', description: 'Manage cloud accounts and instances' },
  { name: 'devops', description: 'DevOps operations' },
  { name: 'viewer', description: 'Read-only access' },
  { name: 'auditor', description: 'Audit log access' },
  { name: 'billing_viewer', description: 'Billing read access' },
  { name: 'jenkins_operator', description: 'Jenkins job operations' },
  { name: 'terraform_operator', description: 'Terraform operations' },
]

const PERMISSIONS = [
  { action: 'read', resource: 'instances' },
  { action: 'write', resource: 'instances' },
  { action: 'read', resource: 'cloud_accounts' },
  { action: 'write', resource: 'cloud_accounts' },
  { action: 'read', resource: 'vps' },
  { action: 'write', resource: 'vps' },
  { action: 'execute', resource: 'ssh' },
  { action: 'read', resource: 'audit' },
  { action: 'read', resource: 'billing' },
  { action: 'write', resource: 'terraform' },
  { action: 'write', resource: 'jenkins' },
  { action: 'read', resource: 'metrics' },
  { action: 'read', resource: 'alerts' },
]

async function main() {
  console.log('Seeding CloudOps Control Center...')

  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { action_resource: { action: perm.action, resource: perm.resource } },
      create: perm,
      update: {},
    })
  }

  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      create: role,
      update: { description: role.description },
    })
  }

  const superAdminRole = await prisma.role.findUnique({ where: { name: 'super_admin' } })
  const viewerRole = await prisma.role.findUnique({ where: { name: 'viewer' } })
  const allPerms = await prisma.permission.findMany()

  if (superAdminRole) {
    for (const perm of allPerms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: perm.id } },
        create: { roleId: superAdminRole.id, permissionId: perm.id },
        update: {},
      })
    }
  }

  const project = await prisma.project.upsert({
    where: { slug: 'default' },
    create: { name: 'Default Project', slug: 'default', description: 'Default tenant project' },
    update: {},
  })

  const passwordHash = await bcrypt.hash('Admin123!', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cloudops.local' },
    create: {
      email: 'admin@cloudops.local',
      passwordHash,
      name: 'CloudOps Admin',
      userRoles: superAdminRole
        ? { create: [{ roleId: superAdminRole.id, projectId: project.id }] }
        : undefined,
    },
    update: {},
  })

  await prisma.alertRule.createMany({
    data: [
      { name: 'High CPU', condition: 'cpu_high', severity: AlertSeverity.WARNING },
      { name: 'High RAM', condition: 'ram_high', severity: AlertSeverity.WARNING },
      { name: 'Disk Full', condition: 'disk_full', severity: AlertSeverity.CRITICAL },
      { name: 'High Cost', condition: 'cost_high', severity: AlertSeverity.WARNING },
    ],
    skipDuplicates: true,
  })

  console.log(`Seed complete. Admin: admin@cloudops.local / Admin123!`)
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
