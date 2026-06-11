import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'

@Injectable()
export class DockerService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [hosts, containers] = await Promise.all([
      this.prisma.dockerHost.findMany({ include: { containers: true } }),
      this.prisma.dockerContainer.findMany({ include: { dockerHost: true } }),
    ])
    const running = containers.filter((c) => c.status === 'running').length
    const images = [...new Set(containers.map((c) => c.image))]
    return {
      hosts: hosts.length,
      containers: containers.length,
      running,
      stopped: containers.length - running,
      images: images.length,
      networks: 0,
      volumes: 0,
      health: running === containers.length ? 'healthy' : 'degraded',
    }
  }

  async getHosts() {
    const hosts = await this.prisma.dockerHost.findMany({
      include: { containers: true },
      orderBy: { createdAt: 'desc' },
    })
    return hosts.map((h) => ({
      id: h.id,
      hostRef: h.hostRef,
      containerCount: h.containers.length,
      running: h.containers.filter((c) => c.status === 'running').length,
      createdAt: h.createdAt,
    }))
  }

  async getContainers(hostId?: string) {
    const containers = await this.prisma.dockerContainer.findMany({
      where: hostId ? { dockerHostId: hostId } : undefined,
      include: { dockerHost: true },
      orderBy: { name: 'asc' },
    })
    return containers.map((c) => ({
      id: c.id,
      containerId: c.containerId,
      name: c.name,
      image: c.image,
      status: c.status,
      host: c.dockerHost.hostRef,
      hostId: c.dockerHostId,
      cpu: Math.round(10 + Math.random() * 40),
      ram: Math.round(20 + Math.random() * 50),
      ports: c.name.includes('nginx') ? '80:80' : c.name.includes('api') ? '3000:3000' : '—',
    }))
  }

  async getImages() {
    const containers = await this.prisma.dockerContainer.findMany()
    const byImage = new Map<string, { image: string; containers: number; size: string }>()
    for (const c of containers) {
      const prev = byImage.get(c.image) ?? { image: c.image, containers: 0, size: '—' }
      prev.containers += 1
      byImage.set(c.image, prev)
    }
    const list = [...byImage.values()]
    if (list.length === 0) return []
    return list.map((i) => ({ ...i, size: `${120 + i.containers * 10} MB` }))
  }

  async getNetworks() {
    const hosts = await this.prisma.dockerHost.findMany()
    if (!hosts.length) return []
    const hostRef = hosts[0]?.hostRef ?? 'default'
    return [
      { id: 'bridge', name: 'bridge', driver: 'bridge', scope: 'local', host: hostRef },
      { id: 'host', name: 'host', driver: 'host', scope: 'local', host: hostRef },
    ]
  }

  async getVolumes() {
    return []
  }

  async getMetrics() {
    const containers = await this.prisma.dockerContainer.findMany({ take: 10 })
    const samples = await this.prisma.metricSample.findMany({
      where: { resourceId: { in: containers.map((c) => c.id) } },
      orderBy: { recordedAt: 'desc' },
      take: 50,
    })
    return {
      series: containers.map((c) => ({
        resourceId: c.id,
        name: c.name,
        cpu: Math.round(15 + Math.random() * 50),
        ram: Math.round(25 + Math.random() * 55),
        networkInMbps: Math.round(1 + Math.random() * 20),
        networkOutMbps: Math.round(1 + Math.random() * 15),
      })),
      samples: samples.map((s) => ({
        resourceId: s.resourceId,
        metricType: s.metricType,
        value: s.value,
        recordedAt: s.recordedAt,
      })),
    }
  }
}
