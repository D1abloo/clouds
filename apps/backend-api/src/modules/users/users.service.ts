import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, email: true, name: true, isActive: true, createdAt: true },
    })
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, email: true, name: true, isActive: true, userRoles: { include: { role: true } } },
    })
    if (!user) throw new NotFoundException('User not found')
    return user
  }

  async assignRole(userId: string, roleName: string, projectId?: string | null) {
    const user = await this.prisma.user.findUnique({ where: { id: userId, deletedAt: null } })
    if (!user) throw new NotFoundException('Usuario no encontrado')

    const role = await this.prisma.role.findFirst({ where: { name: roleName } })
    if (!role) throw new NotFoundException('Rol no encontrado')

    await this.prisma.userRole.deleteMany({ where: { userId } })
    await this.prisma.userRole.create({
      data: {
        userId,
        roleId: role.id,
        projectId: projectId ?? null,
      },
    })

    return this.findOne(userId)
  }
}
