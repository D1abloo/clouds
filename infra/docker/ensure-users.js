/**
 * Ensures default login users exist with known passwords (Docker entrypoint).
 */
const bcrypt = require('bcrypt')
const { PrismaClient } = require('@prisma/client')

const USERS = [
  { email: 'admin@cloudops.local', password: 'Admin123!', name: 'CloudOps Admin', role: 'super_admin' },
  { email: 'demo@cloudops.local', password: 'Demo1234!', name: 'Demo Super Admin', role: 'super_admin' },
]

const run = async () => {
  const prisma = new PrismaClient()
  try {
    const organization = await prisma.organization.upsert({
      where: { slug: 'spendlyx' },
      create: { name: 'Spendlyx', slug: 'spendlyx' },
      update: { name: 'Spendlyx' },
    })

    let project = await prisma.project.findUnique({ where: { slug: 'default' } })
    if (!project) {
      project = await prisma.project.create({
        data: {
          name: 'Spendlyx',
          slug: 'default',
          description: 'Espacio de trabajo principal',
          organizationId: organization.id,
        },
      })
    } else if (!project.organizationId) {
      project = await prisma.project.update({
        where: { id: project.id },
        data: { organizationId: organization.id, name: 'Spendlyx' },
      })
    }

    for (const u of USERS) {
      let role = await prisma.role.findUnique({ where: { name: u.role } })
      if (!role) {
        role = await prisma.role.create({
          data: { name: u.role, description: 'Super administrator' },
        })
      }
      const passwordHash = await bcrypt.hash(u.password, 12)
      const user = await prisma.user.upsert({
        where: { email: u.email },
        create: {
          email: u.email,
          passwordHash,
          name: u.name,
          isActive: true,
        },
        update: { passwordHash, name: u.name, isActive: true },
      })
      if (role) {
        await prisma.userRole.upsert({
          where: { userId_roleId_projectId: { userId: user.id, roleId: role.id, projectId: project.id } },
          create: { userId: user.id, roleId: role.id, projectId: project.id },
          update: {},
        })
      }
      if (u.email === 'admin@cloudops.local') {
        await prisma.membership.upsert({
          where: {
            userId_organizationId: { userId: user.id, organizationId: organization.id },
          },
          create: { userId: user.id, organizationId: organization.id, role: 'OWNER' },
          update: { role: 'OWNER' },
        })
      }
      console.log(`==> User ready: ${u.email}`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

run().catch((e) => {
  console.error('ensure-users failed:', e)
  process.exit(1)
})
