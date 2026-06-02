import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { AuditService } from '../audit/audit.service'

@Injectable()
export class SshService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async createSession(vpsServerId: string, userId: string) {
    const session = await this.prisma.sshSession.create({
      data: { vpsServerId, userId },
    })

    await this.audit.create({
      userId,
      action: 'ssh.session.start',
      resource: 'ssh_session',
      resourceId: session.id,
    })

    return session
  }

  async endSession(sessionId: string, userId: string) {
    const session = await this.prisma.sshSession.update({
      where: { id: sessionId },
      data: { endedAt: new Date() },
    })

    await this.audit.create({
      userId,
      action: 'ssh.session.end',
      resource: 'ssh_session',
      resourceId: sessionId,
    })

    return session
  }

  async listSessions(vpsServerId: string) {
    return this.prisma.sshSession.findMany({
      where: { vpsServerId },
      orderBy: { startedAt: 'desc' },
      take: 20,
    })
  }
}
