import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'

export interface CreateAuditLogDto {
  userId?: string
  action: string
  resource: string
  resourceId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAuditLogDto) {
    return this.prisma.auditLog.create({
      data: {
        userId: dto.userId,
        action: dto.action,
        resource: dto.resource,
        resourceId: dto.resourceId,
        metadata: dto.metadata as object | undefined,
        ipAddress: dto.ipAddress,
      },
    })
  }

  async findAll(page = 1, pageSize = 20) {
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, email: true, name: true } } },
      }),
      this.prisma.auditLog.count(),
    ])
    return { data, total, page, pageSize }
  }
}
