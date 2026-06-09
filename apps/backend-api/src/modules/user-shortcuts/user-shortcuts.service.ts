import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import type { CreateUserShortcutDto } from './dto/user-shortcut.dto'

@Injectable()
export class UserShortcutsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string) {
    return this.prisma.userShortcut.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        route: true,
        label: true,
        section: true,
        icon: true,
        position: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  async add(userId: string, dto: CreateUserShortcutDto) {
    const existing = await this.prisma.userShortcut.findFirst({
      where: { userId, route: dto.route, deletedAt: null },
    })
    if (existing) {
      throw new ConflictException('Esta ruta ya está en acceso rápido')
    }

    const count = await this.prisma.userShortcut.count({
      where: { userId, deletedAt: null },
    })

    return this.prisma.userShortcut.create({
      data: {
        userId,
        route: dto.route,
        label: dto.label,
        section: dto.section ?? null,
        icon: dto.icon ?? null,
        organizationId: dto.organizationId ?? null,
        position: dto.position ?? count,
      },
      select: {
        id: true,
        route: true,
        label: true,
        section: true,
        icon: true,
        position: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  async removeByRoute(userId: string, route: string) {
    const row = await this.prisma.userShortcut.findFirst({
      where: { userId, route, deletedAt: null },
    })
    if (!row) {
      throw new NotFoundException('Acceso rápido no encontrado')
    }

    await this.prisma.userShortcut.update({
      where: { id: row.id },
      data: { deletedAt: new Date() },
    })

    return { ok: true }
  }
}
