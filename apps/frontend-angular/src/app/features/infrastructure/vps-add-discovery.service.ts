import { inject, Injectable } from '@angular/core'
import { concatMap, delay, from, last, map, Observable, of, tap } from 'rxjs'
import { ToastService } from '../../core/services/toast.service'
import type { VpsAddDialogResult } from './vps-add.dialog'
import { infraTs } from './infrastructure.demo'
import type { VpsHostRow } from './infrastructure-workspace.builders'
import { hashSeed } from './infrastructure-vps-operations.util'

type Row = Record<string, unknown>

export type VpsDiscoveryTaskStatus = 'ok' | 'skip' | 'warn' | 'fail'

export interface VpsDiscoveryTask {
  id: string
  label: string
  status: VpsDiscoveryTaskStatus
  detail: string
  durationMs: number
}

export interface VpsDiscoveryResult {
  host: VpsHostRow
  ports: Row[]
  services: Row[]
  audit: Row[]
  tasks: VpsDiscoveryTask[]
}

const detectDocker = (payload: VpsAddDialogResult): boolean => {
  const name = payload.name.toLowerCase()
  const tags = payload.tags.map((t) => t.toLowerCase())
  if (name.includes('docker') || tags.some((t) => t.includes('docker'))) return true
  return hashSeed(payload.name) % 4 !== 0
}

const detectKubernetes = (payload: VpsAddDialogResult): boolean => {
  const name = payload.name.toLowerCase()
  const tags = payload.tags.map((t) => t.toLowerCase())
  if (name.includes('k8s') || name.includes('kube') || name.includes('k3s')) return true
  if (tags.some((t) => t.includes('k8s') || t.includes('kube') || t.includes('k3s'))) return true
  return hashSeed(`${payload.name}:k8s`) % 3 === 0
}

const collectMetrics = (payload: VpsAddDialogResult): Pick<VpsHostRow, 'cpu' | 'ram' | 'disk'> => ({
  cpu: 12 + (hashSeed(payload.name) % 58),
  ram: 22 + (hashSeed(payload.host) % 48),
  disk: 38 + (hashSeed(`${payload.name}${payload.host}`) % 42),
})

const buildDiscoveryPorts = (payload: VpsAddDialogResult, docker: boolean, k8s: boolean): Row[] => {
  const sshExposure = payload.bastionHost ? `Bastion · ${payload.bastionHost}` : 'VPN 10.8.0.0/24'
  const ports: Row[] = [
    {
      host: payload.name,
      port: payload.port,
      service: 'ssh',
      exposure: sshExposure,
      status: payload.port === 22 ? 'running' : 'warning',
    },
    { host: payload.name, port: 80, service: 'http', exposure: 'Subred privada', status: 'running' },
    { host: payload.name, port: 443, service: 'https', exposure: 'Público (LB)', status: 'running' },
    { host: payload.name, port: 9100, service: 'node-exporter', exposure: 'Monitoring', status: 'running' },
  ]
  if (docker) {
    ports.push({ host: payload.name, port: 2375, service: 'docker-api', exposure: 'localhost', status: 'running' })
  }
  if (k8s) {
    ports.push(
      { host: payload.name, port: 6443, service: 'kubernetes-api', exposure: 'Oficina + VPN', status: 'running' },
      { host: payload.name, port: 10250, service: 'kubelet', exposure: 'Subred nodos', status: 'running' },
    )
  }
  if (hashSeed(payload.host) % 5 === 0) {
    ports.push({ host: payload.name, port: 5432, service: 'postgresql', exposure: 'Subred privada', status: 'running' })
  }
  return ports
}

const buildDiscoveryServices = (payload: VpsAddDialogResult, docker: boolean, k8s: boolean): Row[] => {
  const services: Row[] = [
    {
      host: payload.name,
      unit: 'ssh.service',
      state: 'active',
      since: 'ahora',
      port: String(payload.port),
      status: 'running',
    },
  ]
  if (docker) {
    services.push({
      host: payload.name,
      unit: 'docker.service',
      state: 'active',
      since: 'ahora',
      port: '—',
      status: 'running',
    })
  }
  if (k8s) {
    services.push({
      host: payload.name,
      unit: 'kubelet.service',
      state: 'active',
      since: 'ahora',
      port: '10250',
      status: 'running',
    })
  }
  return services
}

const buildAuditEntry = (payload: VpsAddDialogResult, action: string): Row => ({
  user: `${payload.user}@cloudops`,
  host: payload.name,
  action,
  duration: '< 1 min',
  at: infraTs(0),
  status: 'success',
})

interface DiscoveryStep {
  id: string
  label: string
  enabled: boolean
  durationMs: number
  run: () => Partial<VpsDiscoveryResult> & { task: VpsDiscoveryTask }
}

@Injectable({ providedIn: 'root' })
export class VpsAddDiscoveryService {
  private readonly toast = inject(ToastService)

  runPostAddDiscovery(payload: VpsAddDialogResult, hostRow: VpsHostRow): Observable<VpsDiscoveryResult> {
    let dockerFound = false
    let k8sFound = false
    const accumulated: VpsDiscoveryResult = {
      host: { ...hostRow, docker: false, kubernetes: false },
      ports: [],
      services: [],
      audit: [],
      tasks: [],
    }

    const steps: DiscoveryStep[] = [
      {
        id: 'ssh',
        label: 'Validación SSH',
        enabled: payload.testConnectionFirst,
        durationMs: 650,
        run: () => ({
          task: {
            id: 'ssh',
            label: 'Validación SSH',
            status: 'ok',
            detail: `Handshake OK · ${payload.user}@${payload.host}:${payload.port}`,
            durationMs: 650,
          },
        }),
      },
      {
        id: 'metrics',
        label: 'Métricas CPU/RAM/disco',
        enabled: payload.collectMetrics,
        durationMs: 520,
        run: () => {
          const metrics = collectMetrics(payload)
          accumulated.host = { ...accumulated.host, ...metrics }
          return {
            task: {
              id: 'metrics',
              label: 'Recolección métricas',
              status: 'ok',
              detail: `CPU ${metrics.cpu}% · RAM ${metrics.ram}% · Disco ${metrics.disk}%`,
              durationMs: 520,
            },
          }
        },
      },
      {
        id: 'docker',
        label: 'Discovery Docker',
        enabled: payload.discoverDocker,
        durationMs: 780,
        run: () => {
          dockerFound = detectDocker(payload)
          accumulated.host = { ...accumulated.host, docker: dockerFound }
          return {
            task: {
              id: 'docker',
              label: 'Docker Engine',
              status: dockerFound ? 'ok' : 'warn',
              detail: dockerFound
                ? 'Docker 26.x detectado · socket /var/run/docker.sock'
                : 'Docker no detectado en el host',
              durationMs: 780,
            },
          }
        },
      },
      {
        id: 'kubernetes',
        label: 'Discovery Kubernetes',
        enabled: payload.discoverKubernetes,
        durationMs: 920,
        run: () => {
          k8sFound = detectKubernetes(payload)
          accumulated.host = { ...accumulated.host, kubernetes: k8sFound }
          return {
            task: {
              id: 'kubernetes',
              label: 'Kubernetes / k3s',
              status: k8sFound ? 'ok' : 'warn',
              detail: k8sFound
                ? 'kubelet activo · API 6443 accesible vía VPN'
                : 'kubelet/k3s no detectado',
              durationMs: 920,
            },
          }
        },
      },
      {
        id: 'ports',
        label: 'Escaneo de puertos',
        enabled: payload.runPortScan,
        durationMs: 840,
        run: () => {
          const ports = buildDiscoveryPorts(payload, dockerFound, k8sFound)
          accumulated.ports = ports
          return {
            ports,
            task: {
              id: 'ports',
              label: 'Escaneo puertos 1–1024',
              status: 'ok',
              detail: `${ports.length} puertos abiertos registrados`,
              durationMs: 840,
            },
          }
        },
      },
      {
        id: 'audit',
        label: 'Auditoría CloudOps',
        enabled: payload.enableAudit,
        durationMs: 380,
        run: () => {
          const entries = [
            buildAuditEntry(payload, 'Alta VPS · registro inventario'),
            buildAuditEntry(payload, 'SSH handshake post-alta'),
          ]
          accumulated.audit = entries
          return {
            audit: entries,
            task: {
              id: 'audit',
              label: 'Auditoría CloudOps',
              status: 'ok',
              detail: `${entries.length} eventos registrados`,
              durationMs: 380,
            },
          }
        },
      },
    ]

    const activeSteps = steps.filter((s) => s.enabled)
    if (!activeSteps.length) {
      accumulated.services = buildDiscoveryServices(payload, dockerFound, k8sFound)
      return of(accumulated)
    }

    return from(activeSteps).pipe(
      concatMap((step) =>
        of(null).pipe(
          delay(step.durationMs),
          tap(() => this.toast.info(`${step.label}…`)),
          map(() => {
            const partial = step.run()
            accumulated.tasks.push(partial.task)
            if (partial.ports) accumulated.ports = partial.ports
            if (partial.audit) accumulated.audit = partial.audit
            return partial
          }),
        ),
      ),
      last(),
      map(() => {
        accumulated.services = buildDiscoveryServices(payload, dockerFound, k8sFound)
        return accumulated
      }),
    )
  }
}
