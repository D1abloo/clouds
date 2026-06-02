import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'
import { RealtimeGateway } from '../realtime/realtime.gateway'

@Injectable()
export class KubernetesDiscoveryService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
  ) {}

  async discover(hostRef: string) {
    const result = {
      installed: true,
      kubelet: true,
      kubectl: true,
      kubeconfig: true,
      namespaces: ['default', 'kube-system', 'cloudops'],
      pods: [{ name: 'api-0', namespace: 'cloudops', status: 'Running' }],
      deployments: [{ name: 'backend-api', namespace: 'cloudops', replicas: 2 }],
      services: [{ name: 'backend-api', namespace: 'cloudops', type: 'ClusterIP' }],
    }

    const cluster = await this.prisma.kubernetesCluster.create({
      data: { name: hostRef, endpoint: `ssh://${hostRef}` },
    })

    for (const ns of result.namespaces) {
      await this.prisma.kubernetesResource.create({
        data: { clusterId: cluster.id, kind: 'Namespace', name: ns, status: 'Active' },
      })
    }

    this.realtime.emitDiscoveryUpdate(hostRef, { type: 'kubernetes', result })
    return result
  }
}

@Injectable()
export class SystemDiscoveryService {
  async discover(_hostRef: string) {
    return {
      os: 'Ubuntu 22.04 LTS',
      systemdServices: [
        { name: 'docker', status: 'active' },
        { name: 'nginx', status: 'active' },
      ],
      openPorts: [22, 80, 443, 3000],
      processes: [
        { pid: 1, name: 'systemd', cpu: 0.1, memory: 12 },
        { pid: 1234, name: 'node', cpu: 5.2, memory: 256 },
      ],
      metrics: { cpu: 23.5, ram: 62.1, disk: 45.0, networkRx: 1024, networkTx: 512 },
    }
  }
}
