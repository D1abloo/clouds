import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { catchError, forkJoin, map, of } from 'rxjs'
import { bindSectionTabs } from '../../core/routing/section-tab.util'
import { MatDialog, MatDialogModule } from '@angular/material/dialog'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { VpsService } from '../../core/services/vps.service'
import { CloudAccountsService } from '../../core/services/cloud-accounts.service'
import { ToastService } from '../../core/services/toast.service'
import { InfrastructureActionService } from './infrastructure-action.service'
import { createPageLoader } from '../../core/utils/page-load.util'
import { InfrastructureWorkspaceComponent } from './infrastructure-workspace.component'
import { buildVpsWorkspace, type VpsHostRow } from './infrastructure-workspace.builders'
import type { NavLogoKey } from '../../shared/theme/nav-logo.types'
import {
  VpsAddDialogComponent,
  type VpsAddDialogResult,
} from './vps-add.dialog'
import {
  updateDemoSshKeyAfterRotation,
  type SshRotationApplyResult,
  type VpsDemoSshKey,
} from './infrastructure-vps-ssh-rotation.util'

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
  private readonly accounts = inject(CloudAccountsService)
  private readonly toast = inject(ToastService)
  private readonly infraActions = inject(InfrastructureActionService)
  private readonly dialog = inject(MatDialog)
  private readonly route = inject(ActivatedRoute)
  private readonly destroyRef = inject(DestroyRef)

  readonly page = createPageLoader(true)
  readonly tabIndex = signal(0)
  readonly hosts = signal<VpsHostRow[]>([])
  readonly projectId = signal('')
  readonly portCatalog = signal<DemoRow[]>([])
  readonly serviceCatalog = signal<DemoRow[]>([])
  readonly auditLog = signal<DemoRow[]>([])
  readonly sshKeys = signal<VpsDemoSshKey[]>([])

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
    this.accounts.defaultProject().subscribe({
      next: (project) => this.projectId.set(project.id),
      error: () => this.toast.error('No se pudo resolver el proyecto del workspace'),
    })
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
    this.page.run(this.service.list(), {
      onSuccess: (data) =>
        this.hosts.set(
          data.map((h) => ({
            ...h,
            host: h.host ?? h.hostname ?? '',
            user: h.user ?? h.username ?? 'root',
            os: h.os ?? String(h.metadata?.['os'] ?? 'Pendiente'),
            provider: String(h.metadata?.['provider'] ?? 'VPS'),
            location: String(h.metadata?.['region'] ?? h.metadata?.['location'] ?? ''),
            docker: Boolean(h.metadata?.['docker']),
            kubernetes: Boolean(h.metadata?.['kubernetes']),
            cpu: Number(h.metadata?.['cpu'] ?? 0),
            ram: Number(h.metadata?.['ram'] ?? 0),
            disk: Number(h.metadata?.['disk'] ?? 0),
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
      this.validateAllVps()
      return
    }
    if (label === 'Sincronizar') {
      this.load()
      return
    }
    this.infraActions.confirmAndRunAction(label, { moduleId: ctx.moduleId, logos: [...ctx.logos] }, () => this.load()).subscribe()
  }

  private registerVps = (payload: VpsAddDialogResult): void => {
    const projectId = this.projectId()
    if (!projectId) {
      this.toast.error('No se pudo resolver el proyecto del workspace')
      return
    }

    this.service
      .create({
        projectId,
        name: payload.name,
        host: payload.host,
        hostname: payload.host,
        port: 22,
        username: payload.user,
        password: payload.password,
        metadata: {
          provider: payload.provider,
          os: payload.os,
          environment: payload.environment,
          authMethod: 'password',
          connectionMethod: 'ssh',
        },
      })
      .subscribe({
        next: () => {
          this.toast.success(`${payload.name} añadido por SSH`)
          this.load()
        },
        error: (err) => this.toast.error(err?.error?.message ?? 'No se pudo añadir el servidor VPS'),
      })
  }

  private validateAllVps = (): void => {
    const hosts = this.hosts()
    if (!hosts.length) {
      this.toast.info('No hay servidores VPS para validar')
      return
    }
    forkJoin(
      hosts.map((host) =>
        this.service.validate(host.id).pipe(
          map(() => true),
          catchError(() => of(false)),
        ),
      ),
    ).subscribe((results) => {
      const ok = results.filter(Boolean).length
      if (ok === hosts.length) {
        this.toast.success(`SSH validado en ${ok} servidor(es)`)
      } else {
        this.toast.error(`SSH validado en ${ok}/${hosts.length} servidor(es)`)
      }
      this.load()
    })
  }

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
