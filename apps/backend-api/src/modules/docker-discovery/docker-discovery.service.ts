import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { RealtimeGateway } from '../realtime/realtime.gateway'

export interface DockerDiscoveryResult {
  installed: boolean
  running: boolean
  containers: Array<{ id: string; name: string; image: string; status: string }>
  images: string[]
  networks: string[]
  volumes: string[]
}

@Injectable()
export class DockerDiscoveryService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
  ) {}

  async discover(hostRef: string): Promise<DockerDiscoveryResult> {
    // TODO: Execute via SSH on target host
    const result: DockerDiscoveryResult = {
      installed: true,
      running: true,
      containers: [
        { id: 'abc123', name: 'nginx', image: 'nginx:latest', status: 'running' },
        { id: 'def456', name: 'redis', image: 'redis:7', status: 'running' },
      ],
      images: ['nginx:latest', 'redis:7', 'postgres:16'],
      networks: ['bridge', 'cloudops-net'],
      volumes: ['postgres_data', 'redis_data'],
    }

    const host = await this.prisma.dockerHost.create({ data: { hostRef } })

    for (const c of result.containers) {
      await this.prisma.dockerContainer.upsert({
        where: { id: `${host.id}-${c.id}` },
        create: {
          id: `${host.id}-${c.id}`,
          dockerHostId: host.id,
          containerId: c.id,
          name: c.name,
          image: c.image,
          status: c.status,
        },
        update: { status: c.status },
      })
    }

    this.realtime.emitDiscoveryUpdate(hostRef, { type: 'docker', result })
    return result
  }
}
