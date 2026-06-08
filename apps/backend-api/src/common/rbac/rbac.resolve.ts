import { PrismaService } from '../prisma/prisma.service'
import { formatPermissionCode } from './rbac.util'

export async function resolveUserPermissions(
  prisma: PrismaService,
  userId: string,
): Promise<string[]> {
  const assignments = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  })

  const codes = new Set<string>()
  for (const assignment of assignments) {
    for (const rp of assignment.role.permissions) {
      codes.add(formatPermissionCode(rp.permission.resource, rp.permission.action))
    }
  }
  return [...codes]
}
