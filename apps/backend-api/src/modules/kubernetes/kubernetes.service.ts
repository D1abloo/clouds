import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../common/prisma/prisma.service'

@Injectable()
export class KubernetesService {
  constructor(private readonly prisma: PrismaService) {}

  private async loadResources() {
    const clusters = await this.prisma.kubernetesCluster.findMany({ include: { resources: true } })
    const resources = clusters.flatMap((c) =>
      c.resources.map((r) => ({ ...r, clusterId: c.id, clusterName: c.name })),
    )
    return { clusters, resources }
  }

  async getOverview() {
    const { clusters, resources } = await this.loadResources()
    const pods = resources.filter((r) => r.kind === 'Pod')
    const errors = pods.filter((p) => p.status?.includes('Error') || p.status?.includes('Crash')).length
    return {
      clusters: clusters.length,
      namespaces: resources.filter((r) => r.kind === 'Namespace').length,
      pods: pods.length,
      deployments: resources.filter((r) => r.kind === 'Deployment').length,
      services: resources.filter((r) => r.kind === 'Service').length,
      nodes: resources.filter((r) => r.kind === 'Node').length || 2,
      podsWithError: errors,
      health: errors === 0 ? 'healthy' : 'warning',
    }
  }

  async getClusters() {
    const clusters = await this.prisma.kubernetesCluster.findMany({
      include: { resources: true },
      orderBy: { name: 'asc' },
    })
    return clusters.map((c) => ({
      id: c.id,
      name: c.name,
      endpoint: c.endpoint,
      resourceCount: c.resources.length,
      pods: c.resources.filter((r) => r.kind === 'Pod').length,
      createdAt: c.createdAt,
    }))
  }

  async getNodes() {
    const { resources } = await this.loadResources()
    const nodes = resources.filter((r) => r.kind === 'Node')
    if (nodes.length > 0) {
      return nodes.map((n) => ({
        id: n.id,
        name: n.name,
        clusterName: n.clusterName,
        status: n.status ?? 'Ready',
        cpu: Math.round(20 + Math.random() * 60),
        ram: Math.round(30 + Math.random() * 50),
      }))
    }
    return [
      { id: 'node-1', name: 'demo-node-01', clusterName: 'demo-cluster', status: 'Ready', cpu: 45, ram: 62 },
      { id: 'node-2', name: 'demo-node-02', clusterName: 'demo-cluster', status: 'Ready', cpu: 38, ram: 55 },
    ]
  }

  async getNamespaces() {
    const { resources } = await this.loadResources()
    const ns = resources.filter((r) => r.kind === 'Namespace')
    if (ns.length > 0) {
      return ns.map((n) => ({ id: n.id, name: n.name, clusterName: n.clusterName, status: n.status ?? 'Active' }))
    }
    return [
      { name: 'default', status: 'Active' },
      { name: 'kube-system', status: 'Active' },
      { name: 'production', status: 'Active' },
      { name: 'staging', status: 'Active' },
    ]
  }

  async getPods(namespace?: string) {
    const { resources } = await this.loadResources()
    let pods = resources.filter((r) => r.kind === 'Pod')
    if (namespace) pods = pods.filter((p) => p.namespace === namespace)
    return pods.map((p) => ({
      id: p.id,
      name: p.name,
      namespace: p.namespace ?? 'default',
      status: p.status ?? 'Unknown',
      clusterName: p.clusterName,
      node: 'demo-node-01',
      restarts: p.status === 'CrashLoopBackOff' ? 12 : 0,
      cpu: Math.round(5 + Math.random() * 60),
      ram: Math.round(10 + Math.random() * 70),
    }))
  }

  async getDeployments(namespace?: string) {
    const { resources } = await this.loadResources()
    let items = resources.filter((r) => r.kind === 'Deployment')
    if (namespace) items = items.filter((d) => d.namespace === namespace)
    if (items.length === 0) {
      return [
        { name: 'api-demo', namespace: namespace ?? 'production', replicas: 3, ready: 3, status: 'Available' },
        { name: 'worker', namespace: namespace ?? 'staging', replicas: 2, ready: 2, status: 'Available' },
      ]
    }
    return items.map((d) => ({
      id: d.id,
      name: d.name,
      namespace: d.namespace ?? 'default',
      status: d.status ?? 'Available',
      clusterName: d.clusterName,
      replicas: 3,
      ready: 3,
    }))
  }

  async getServices(namespace?: string) {
    const { resources } = await this.loadResources()
    let items = resources.filter((r) => r.kind === 'Service')
    if (namespace) items = items.filter((s) => s.namespace === namespace)
    if (items.length === 0) {
      return [
        { name: 'api-service', namespace: namespace ?? 'production', type: 'ClusterIP', clusterIp: '10.96.0.10' },
        { name: 'redis', namespace: namespace ?? 'production', type: 'ClusterIP', clusterIp: '10.96.0.20' },
      ]
    }
    return items.map((s) => ({
      id: s.id,
      name: s.name,
      namespace: s.namespace ?? 'default',
      type: 'ClusterIP',
      clusterName: s.clusterName,
      status: s.status ?? 'Active',
    }))
  }

  async getEvents() {
    return [
      { type: 'Normal', reason: 'Scheduled', object: 'pod/api-demo-7f8b9c', message: 'Successfully assigned', age: '2m' },
      { type: 'Normal', reason: 'Pulled', object: 'pod/api-demo-7f8b9c', message: 'Container image already present', age: '1m' },
      { type: 'Warning', reason: 'FailedScheduling', object: 'pod/legacy-app-0', message: '0/2 nodes available', age: '5m' },
    ]
  }

  async getMetrics() {
    const pods = await this.getPods()
    return {
      series: pods.slice(0, 10).map((p) => ({
        podId: p.id,
        name: p.name,
        namespace: p.namespace,
        cpu: p.cpu,
        ram: p.ram,
      })),
      clusterCpu: Math.round(40 + Math.random() * 30),
      clusterRam: Math.round(50 + Math.random() * 25),
    }
  }

  async scaleDeployment(name: string, namespace: string, replicas: number, _userId?: string) {
    const deployment = await this.prisma.kubernetesResource.findFirst({
      where: {
        kind: 'Deployment',
        name: { equals: name, mode: 'insensitive' },
        ...(namespace ? { namespace } : {}),
      },
      include: { cluster: true },
    })

    if (deployment) {
      await this.prisma.kubernetesResource.update({
        where: { id: deployment.id },
        data: { status: `Available · ${replicas}/${replicas} replicas` },
      })
    }

    return {
      name,
      namespace,
      replicas,
      clusterName: deployment?.cluster?.name ?? 'prod-cluster',
      ready: replicas,
      status: 'Available',
    }
  }
}
