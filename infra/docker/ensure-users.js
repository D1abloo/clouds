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
    let project = await prisma.project.findUnique({ where: { slug: 'default' } })
    if (!project) {
      project = await prisma.project.create({
        data: { name: 'Default Project', slug: 'default', description: 'Default tenant project' },
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
