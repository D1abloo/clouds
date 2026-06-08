import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

export type UserOrganizationScope = {
  organizationIds: string[]
  projectIds: string[]
}

@Injectable()
export class OrganizationScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveForUser(userId: string): Promise<UserOrganizationScope> {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      select: { organizationId: true },
    })
    const organizationIds = [...new Set(memberships.map((m) => m.organizationId))]
    if (!organizationIds.length) {
      return { organizationIds: [], projectIds: [] }
    }
    const projects = await this.prisma.project.findMany({
      where: { organizationId: { in: organizationIds }, deletedAt: null },
      select: { id: true },
    })
    return {
      organizationIds,
      projectIds: projects.map((p) => p.id),
    }
  }

  projectFilter = (
    scope: UserOrganizationScope,
    requestedProjectId?: string,
  ): { projectId?: string; projectIds?: string[] } | null => {
    if (!scope.projectIds.length) return { projectIds: [] }
    if (requestedProjectId) {
      return scope.projectIds.includes(requestedProjectId)
        ? { projectId: requestedProjectId }
        : null
    }
    return { projectIds: scope.projectIds }
  }
}
