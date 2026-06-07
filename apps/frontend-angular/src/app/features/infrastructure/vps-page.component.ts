import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { bindSectionTabs } from '../../core/routing/section-tab.util'
import { MatDialog, MatDialogModule } from '@angular/material/dialog'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { VpsService } from '../../core/services/vps.service'
import { DemoActionsService } from '../../core/services/demo-actions.service'
import { ToastService } from '../../core/services/toast.service'
import { InfrastructureActionService } from './infrastructure-action.service'
import { createPageLoader } from '../../core/utils/page-load.util'
import {
  VPS_DEMO_AUDIT,
  VPS_DEMO_PORTS,
  VPS_DEMO_SERVICES,
  VPS_DEMO_SSH_KEYS,
} from './infrastructure.demo'
import { InfrastructureWorkspaceComponent } from './infrastructure-workspace.component'
import { buildVpsWorkspace, type VpsHostRow } from './infrastructure-workspace.builders'
import type { NavLogoKey } from '../../shared/theme/nav-logo.types'
import {
  VpsAddDialogComponent,
  type VpsAddDialogResult,
} from './vps-add.dialog'
import { updateDemoSshKeyAfterRotation, type SshRotationApplyResult } from './infrastructure-vps-ssh-rotation.util'
import { VpsAddDiscoveryService } from './vps-add-discovery.service'

type DemoRow = Record<string, unknown>

@Component({
  selector: 'app-vps-page',
  standalone: true,
  imports: [InfrastructureWorkspaceComponent, ErrorStateComponent, MatDialogModule],
  template: `
    @if (page.error()) {
      <app-error-state [message]="page.error()!" (retry)="load()" />
    } @else {
      <app-infrastructure-workspace
        [config]="workspace()"
        [loading]="page.loading()"
        [tabIndex]="tabIndex()"
        (actionClick)="handleHeader($event)"
      />
    }
  `,
})
export class VpsPageComponent implements OnInit {
  private readonly service = inject(VpsService)
  private readonly demoActions = inject(DemoActionsService)
  private readonly toast = inject(ToastService)
  private readonly infraActions = inject(InfrastructureActionService)
  private readonly discovery = inject(VpsAddDiscoveryService)
  private readonly dialog = inject(MatDialog)
  private readonly route = inject(ActivatedRoute)
  private readonly destroyRef = inject(DestroyRef)

  readonly page = createPageLoader(true)
  readonly tabIndex = signal(0)
  readonly hosts = signal<VpsHostRow[]>([])
  readonly portCatalog = signal<DemoRow[]>([...VPS_DEMO_PORTS])
  readonly serviceCatalog = signal<DemoRow[]>([...VPS_DEMO_SERVICES])
  readonly auditLog = signal<DemoRow[]>([...VPS_DEMO_AUDIT])
  readonly sshKeys = signal([...VPS_DEMO_SSH_KEYS])

  readonly workspace = computed(() =>
    buildVpsWorkspace(
      this.hosts(),
      this.sshKeys(),
      this.serviceCatalog(),
      this.portCatalog(),
      this.auditLog(),
    ),
  )

  ngOnInit(): void {
    bindSectionTabs(this.route, this.destroyRef, this.tabIndex, 'vps', (section) => {
      const map: Record<string, number> = {
        overview: 0,
        servers: 0,
        ssh: 1,
        services: 2,
        docker: 3,
        kubernetes: 4,
        ports: 5,
        metrics: 6,
        audit: 7,
      }
      return map[section] ?? 0
    })
    this.load()
  }

  load = (): void => {
    const providers = ['Hetzner', 'OVH', 'DigitalOcean', 'Bare metal']
    const locations = ['fra1', 'ams3', 'nyc1', 'mad1', 'lon1']
    this.page.run(this.service.list(), {
      onSuccess: (data) =>
        this.hosts.set(
          data.map((h, i) => ({
            ...h,
            user: 'ubuntu',
            os: i % 3 === 0 ? 'Ubuntu 22.04 LTS' : i % 3 === 1 ? 'Debian 12' : 'Rocky Linux 9',
            provider: providers[i % providers.length],
            location: locations[i % locations.length],
            docker: i % 2 === 0,
            kubernetes: i < 3,
            cpu: 20 + (i * 7) % 60,
            ram: 40 + (i * 11) % 50,
            disk: 55 + (i * 5) % 30,
          })),
        ),
      errorMessage: 'Error al cargar servidores VPS',
    })
  }

  handleHeader = (label: string): void => {
    const ctx = { moduleId: 'vps', logos: ['docker', 'kubernetes'] as const satisfies readonly NavLogoKey[] }
    if (label === 'Rotar claves SSH') {
      this.infraActions.runSshKeyRotation(this.hosts(), this.sshKeys(), (result) => {
        this.handleSshKeyRotated(result)
      })
      return
    }
    if (label === 'Añadir VPS') {
      this.dialog
        .open(VpsAddDialogComponent, {
          width: '860px',
          maxWidth: '96vw',
          maxHeight: '92vh',
          data: { existingNames: this.hosts().map((h) => h.name) },
        })
        .afterClosed()
        .subscribe((payload) => {
          if (!payload) return
          this.registerVps(payload)
        })
      return
    }
    if (label === 'Auditar puertos') {
      this.infraActions.runPortAudit(this.hosts(), this.portCatalog())
      return
    }
    if (label === 'Validar todos') {
      this.infraActions.runBatchValidate(this.hosts())
      return
    }
    this.infraActions.confirmAndRunAction(label, { moduleId: ctx.moduleId, logos: [...ctx.logos] }, () => this.load()).subscribe()
  }

  private registerVps = (payload: VpsAddDialogResult): void => {
    const finishRegistration = (id: string): void => {
      const baseRow = this.toHostRow(id, payload)
      this.toast.info(`Discovery post-alta · ${payload.name}…`)
      this.discovery.runPostAddDiscovery(payload, baseRow).subscribe((result) => {
        this.hosts.update((list) => [...list, result.host])
        if (result.ports.length) {
          this.portCatalog.update((rows) => [...rows, ...result.ports])
        }
        if (result.services.length) {
          this.serviceCatalog.update((rows) => [...rows, ...result.services])
        }
        if (result.audit.length) {
          this.auditLog.update((rows) => [...rows, ...result.audit])
        }
        const taskCount = result.tasks.length
        this.toast.success(
          taskCount
            ? `${payload.name} registrado · ${taskCount} tareas de discovery completadas`
            : `${payload.name} registrado en inventario`,
        )
        if (taskCount) {
          this.infraActions.openDiscoverySummary(result, payload)
        }
      })
    }

    this.service
      .create({
        name: payload.name,
        host: payload.host,
        port: payload.port,
      })
      .subscribe({
        next: (created) => finishRegistration(created.id),
        error: () => {
          this.demoActions.simulate(`Añadir VPS ${payload.name}`, 900, `${payload.name} registrado (demo)`).subscribe(() => {
            finishRegistration(`vps-${Date.now()}`)
          })
        },
      })
  }

  private toHostRow = (id: string, payload: VpsAddDialogResult): VpsHostRow => ({
    id,
    name: payload.name,
    host: payload.host,
    port: payload.port,
    status: 'connected',
    user: payload.user,
    os: payload.os,
    provider: payload.provider,
    location: payload.location,
    docker: false,
    kubernetes: false,
    cpu: 0,
    ram: 0,
    disk: 0,
  })

  private handleSshKeyRotated = (result: SshRotationApplyResult): void => {
    if (result.newPublicKeyDeployed) {
      this.sshKeys.update((keys) =>
        updateDemoSshKeyAfterRotation(keys, result.keyName, result.newFingerprint),
      )
    }

    const action = result.newPublicKeyDeployed
      ? `Rotación SSH · ${result.keyName} · authorized_keys actualizado`
      : `Rotación SSH · ${result.keyName} · sin despliegue de clave`

    this.auditLog.update((rows) => [
      {
        user: 'ops@cloudops',
        host: 'inventario SSH',
        action,
        duration: result.newPublicKeyDeployed ? '2 min' : '—',
        at: new Date().toLocaleString('es-ES'),
        status: result.newPublicKeyDeployed ? 'success' : 'warning',
      },
      ...rows,
    ])
  }
}
