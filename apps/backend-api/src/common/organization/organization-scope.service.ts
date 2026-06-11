import { ForbiddenException, Injectable } from '@nestjs/common'
import { randomBytes } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'

export type UserOrganizationScope = {
  organizationIds: string[]
  projectIds: string[]
}

const randomSlug = (): string => randomBytes(6).toString('hex')

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

  async resolveProjectScopeOrThrow(
    userId: string,
    requestedProjectId?: string,
  ): Promise<{ projectId?: string; projectIds?: string[] }> {
    const scope = await this.resolveForUser(userId)
    const filtered = this.projectFilter(scope, requestedProjectId)
    if (filtered === null) {
      throw new ForbiddenException('Sin acceso a este espacio de trabajo')
    }
    return filtered
  }

  async assertProjectInScope(userId: string, projectId: string): Promise<void> {
    const scope = await this.resolveForUser(userId)
    if (!scope.projectIds.includes(projectId)) {
      throw new ForbiddenException('Sin acceso a este espacio de trabajo')
    }
  }

  /** Crea org + proyecto + membresía OWNER si el usuario no tiene espacio de trabajo propio. */
  async ensurePersonalWorkspace(
    userId: string,
    opts?: { displayName?: string; companyName?: string },
  ): Promise<UserOrganizationScope> {
    const existing = await this.prisma.membership.findFirst({ where: { userId } })
    if (existing) {
      return this.resolveForUser(userId)
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    const company =
      opts?.companyName?.trim() ||
      user?.company?.trim() ||
      opts?.displayName?.trim() ||
      user?.name?.trim() ||
      user?.email?.split('@')[0] ||
      'Mi espacio'

    const organization = await this.prisma.organization.create({
      data: {
        name: company,
        slug: `org-${randomSlug()}`,
      },
    })

    const project = await this.prisma.project.create({
      data: {
        name: company,
        slug: `ws-${randomSlug()}`,
        organizationId: organization.id,
        description: 'Espacio de trabajo principal',
      },
    })

    await this.prisma.membership.create({
      data: {
        userId,
        organizationId: organization.id,
        role: 'OWNER',
      },
    })

    const adminRole = await this.prisma.role.findUnique({ where: { name: 'administrador' } })
    if (adminRole) {
      const hasRole = await this.prisma.userRole.findFirst({
        where: { userId, roleId: adminRole.id, projectId: project.id },
      })
      if (!hasRole) {
        await this.prisma.userRole.create({
          data: { userId, roleId: adminRole.id, projectId: project.id },
        })
      }
    }

    return this.resolveForUser(userId)
  }

  async getPrimaryProject(userId: string) {
    const scope = await this.resolveForUser(userId)
    if (!scope.projectIds.length) return null
    const project = await this.prisma.project.findFirst({
      where: { id: { in: scope.projectIds }, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    })
    return project
  }
}
