import { Component, inject, OnInit, signal, computed } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
import { MatTabsModule } from '@angular/material/tabs'
import { MatTableModule } from '@angular/material/table'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog'
import { catchError, debounceTime, forkJoin, map, of, startWith } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { VpsService } from '../../core/services/vps.service'
import { ToastService } from '../../core/services/toast.service'
import { VpsHost } from '../../core/models/api.models'
import { createPageLoader } from '../../core/utils/page-load.util'
import { CloudAccountsService } from '../../core/services/cloud-accounts.service'

type VpsRow = VpsHost & {
  os?: string
  user?: string
  docker?: boolean
  kubernetes?: boolean
  cpu?: number
  ram?: number
  disk?: number
}

import { VpsAddDialogComponent, type VpsAddDialogResult } from '../infrastructure/vps-add.dialog'

@Component({
  selector: 'app-vps-command-dialog',
  standalone: true,
  imports: [MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title>Ejecutar comando</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full"><mat-label>Comando</mat-label><input matInput [formControl]="cmd" /></mat-form-field>
      <pre class="output mono">{{ output }}</pre>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Cerrar</button>
      <button mat-flat-button color="primary" type="button" [disabled]="busy || !cmd.value.trim()" (click)="run()">Ejecutar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .full { width: 100%; }
    .output { background: var(--app-surface); padding: 0.75rem; border-radius: 8px; min-height: 80px; font-size: 0.75rem; }
  `,
})
export class VpsCommandDialogComponent {
  private readonly service = inject(VpsService)
  private readonly toast = inject(ToastService)
  private readonly data = inject<{ row: VpsRow; command?: string }>(MAT_DIALOG_DATA)

  readonly cmd = new FormControl(this.data.command ?? 'uname -a', { nonNullable: true })
  output = ''
  busy = false

  run = (): void => {
    const command = this.cmd.value.trim()
    if (!command) return
    this.busy = true
    this.output = `$ ${command}\nEjecutando en ${this.data.row.name}...`
    this.service.execute(this.data.row.id, command).subscribe({
      next: (res) => {
        const payload = res as { output?: string; exitCode?: number }
        this.output = `$ ${command}\n${payload.output ?? ''}\nexit=${payload.exitCode ?? 0}`.trim()
        this.busy = false
      },
      error: (err) => {
        this.output = `$ ${command}\n${err?.error?.message ?? 'No se pudo ejecutar el comando SSH'}`
        this.toast.error(err?.error?.message ?? 'Error ejecutando comando SSH')
        this.busy = false
      },
    })
  }
}

@Component({
  selector: 'app-vps-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    MatTabsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
  ],
  template: `
    <div class="page-container">
      <app-page-header
        title="VPS / Bare Metal"
        description="Servidores SSH, Docker, Kubernetes y servicios systemd"
        [actions]="[
          { label: 'Añadir VPS', icon: 'add', primary: true },
          { label: 'Validar todos', icon: 'verified' },
        ]"
        (actionClick)="handleHeader($event)"
      />

      @if (page.loading()) {
        <app-loading-state />
      } @else if (page.error()) {
        <app-error-state [message]="page.error()!" (retry)="load()" />
      } @else {
        <div class="table-card">
        <mat-tab-group class="soft-tabs" animationDuration="280ms">
          <mat-tab label="Servers">
            <div class="tab-panel">
              <mat-form-field appearance="outline">
                <mat-label>Buscar servidores VPS</mat-label>
                <input matInput [formControl]="searchControl" placeholder="Nombre o IP…" aria-label="Filtrar hosts VPS" />
                <mat-hint>Filtra por nombre del host o dirección IP</mat-hint>
              </mat-form-field>
              @if (filtered().length === 0) {
                <app-empty-state
                  title="Sin servidores VPS conectados"
                  description="Añade un servidor VPS o Bare Metal para gestionar SSH y servicios."
                  actionLabel="Añadir servidor VPS"
                  (actionClick)="handleAddVps()"
                />
              } @else {
                <div class="data-table-wrap">
                <table mat-table [dataSource]="filtered()" class="premium-table table-row-hover">
                  <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Name</th><td mat-cell *matCellDef="let row">{{ row.name }}</td></ng-container>
                  <ng-container matColumnDef="host"><th mat-header-cell *matHeaderCellDef>IP</th><td mat-cell *matCellDef="let row" class="mono">{{ row.host }}</td></ng-container>
                  <ng-container matColumnDef="port"><th mat-header-cell *matHeaderCellDef>SSH</th><td mat-cell *matCellDef="let row">{{ row.port ?? 22 }}</td></ng-container>
                  <ng-container matColumnDef="user"><th mat-header-cell *matHeaderCellDef>User</th><td mat-cell *matCellDef="let row">{{ row.user ?? 'root' }}</td></ng-container>
                  <ng-container matColumnDef="os"><th mat-header-cell *matHeaderCellDef>OS</th><td mat-cell *matCellDef="let row">{{ row.os ?? 'Ubuntu 22.04' }}</td></ng-container>
                  <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>SSH</th><td mat-cell *matCellDef="let row"><app-status-badge [value]="row.status ?? 'online'" /></td></ng-container>
                  <ng-container matColumnDef="docker"><th mat-header-cell *matHeaderCellDef>Docker</th><td mat-cell *matCellDef="let row">{{ row.docker ? 'Yes' : 'No' }}</td></ng-container>
                  <ng-container matColumnDef="cpu"><th mat-header-cell *matHeaderCellDef>CPU</th><td mat-cell *matCellDef="let row">{{ row.cpu ?? 32 }}%</td></ng-container>
                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef></th>
                    <td mat-cell *matCellDef="let row">
                      <button mat-icon-button [matMenuTriggerFor]="vpsMenu" aria-label="Actions"><mat-icon>more_vert</mat-icon></button>
                      <mat-menu #vpsMenu="matMenu">
                        <a mat-menu-item [routerLink]="['/terminal', row.id]">Open terminal</a>
                        <button mat-menu-item (click)="openCommand(row)">Execute command</button>
                        <button mat-menu-item (click)="handleValidate(row)">Validate SSH</button>
                        <button mat-menu-item (click)="detectDocker(row)">Detect Docker</button>
                        <button mat-menu-item (click)="detectK8s(row)">Detect Kubernetes</button>
                        <button mat-menu-item (click)="viewMetrics(row)">View metrics</button>
                      </mat-menu>
                    </td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="cols"></tr>
                  <tr mat-row *matRowDef="let row; columns: cols" class="table-row-hover"></tr>
                </table>
                </div>
              }
            </div>
          </mat-tab>
          <mat-tab label="SSH"><div class="tab-panel"><p>{{ connected() }} servidores con credenciales SSH cifradas.</p></div></mat-tab>
          <mat-tab label="Services"><div class="tab-panel"><p>Servicios detectados desde SSH al ejecutar comandos de inventario.</p></div></mat-tab>
          <mat-tab label="Docker"><div class="tab-panel"><p>{{ withDocker() }} hosts running Docker Engine.</p></div></mat-tab>
          <mat-tab label="Kubernetes"><div class="tab-panel"><p>{{ withK8s() }} hosts with k3s/k8s agents.</p></div></mat-tab>
          <mat-tab label="Ports"><div class="tab-panel"><p>Puertos registrados desde auditorías reales de cada servidor.</p></div></mat-tab>
          <mat-tab label="Metrics"><div class="tab-panel"><p>Métricas preparadas para recolección real por agente o SSH.</p></div></mat-tab>
          <mat-tab label="Audit"><div class="tab-panel"><p>SSH sessions logged to <a routerLink="/audit">Audit</a>.</p></div></mat-tab>
        </mat-tab-group>
        </div>
      }
    </div>
  `,
  styles: `a { color: inherit; }`,
})
export class VpsListComponent implements OnInit {
  private readonly service = inject(VpsService)
  private readonly toast = inject(ToastService)
  private readonly dialog = inject(MatDialog)
  private readonly router = inject(Router)
  private readonly accounts = inject(CloudAccountsService)

  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly page = createPageLoader(true)
  readonly hosts = signal<VpsRow[]>([])
  readonly projectId = signal('')
  readonly cols = ['name', 'host', 'port', 'user', 'os', 'status', 'docker', 'cpu', 'actions']

  private readonly searchTerm = toSignal(this.searchControl.valueChanges.pipe(debounceTime(200), startWith('')), { initialValue: '' })

  filtered = computed(() => {
    const term = (this.searchTerm() ?? '').toLowerCase()
    return this.hosts().filter((h) => !term || h.name.toLowerCase().includes(term) || h.host.toLowerCase().includes(term))
  })

  connected = computed(() => this.hosts().filter((h) => (h.status ?? 'online') !== 'offline').length)
  disconnected = computed(() => this.hosts().length - this.connected())
  withDocker = computed(() => this.hosts().filter((h) => h.docker === true).length)
  withK8s = computed(() => this.hosts().filter((h) => h.kubernetes === true).length)

  ngOnInit(): void {
    this.accounts.defaultProject().subscribe({
      next: (project) => this.projectId.set(project.id),
      error: () => this.toast.error('No se pudo resolver el proyecto del workspace'),
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
            docker: Boolean(h.metadata?.['docker']),
            kubernetes: Boolean(h.metadata?.['kubernetes']),
            cpu: Number(h.metadata?.['cpu'] ?? 0),
            ram: Number(h.metadata?.['ram'] ?? 0),
            disk: Number(h.metadata?.['disk'] ?? 0),
          })),
        ),
      errorMessage: 'No se pudieron cargar los hosts VPS',
    })
  }

  handleAddVps = (): void => {
    void this.router.navigate(['/admin/infraestructura/vps/nuevo'])
  }

  handleHeader = (label: string): void => {
    if (label === 'Añadir VPS') {
      this.dialog
        .open(VpsAddDialogComponent, {
          width: '860px',
          maxWidth: '96vw',
          maxHeight: '92vh',
          data: { existingNames: this.hosts().map((h) => h.name) },
        })
        .afterClosed()
        .subscribe((payload: VpsAddDialogResult | undefined) => {
          if (!payload) return
          this.createVps(payload)
        })
      return
    }
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

  handleValidate = (host: VpsHost): void => {
    this.service.validate(host.id).subscribe({
      next: () => this.toast.success(`Validated ${host.name}`),
      error: (err) => this.toast.error(err?.error?.message ?? `No se pudo validar ${host.name}`),
    })
  }

  openCommand = (row: VpsRow, command?: string): void => {
    this.dialog.open(VpsCommandDialogComponent, {
      width: '560px',
      maxWidth: '96vw',
      data: { row, command },
    })
  }

  detectDocker = (row: VpsRow): void => {
    this.service.detectRuntime(row.id, { probeDocker: true, probeKubernetes: false }).subscribe({
      next: (res) => {
        this.hosts.update((hosts) => hosts.map((host) => (host.id === row.id ? { ...host, docker: res.docker } : host)))
        this.toast.success(res.message)
      },
      error: (err) => this.toast.error(err?.error?.message ?? `No se pudo detectar Docker en ${row.name}`),
    })
  }

  detectK8s = (row: VpsRow): void => {
    this.service.detectRuntime(row.id, { probeDocker: false, probeKubernetes: true }).subscribe({
      next: (res) => {
        this.hosts.update((hosts) => hosts.map((host) => (host.id === row.id ? { ...host, kubernetes: res.kubernetes } : host)))
        this.toast.success(res.message)
      },
      error: (err) => this.toast.error(err?.error?.message ?? `No se pudo detectar Kubernetes en ${row.name}`),
    })
  }

  viewMetrics = (row: VpsRow): void => {
    this.openCommand(row, 'uptime && free -m && df -h /')
  }

  private createVps = (payload: VpsAddDialogResult): void => {
    const projectId = this.projectId()
    if (!projectId) {
      this.toast.error('No se pudo resolver el proyecto del workspace')
      return
    }

    this.service
      .create({
        projectId,
        name: payload.name,
        hostname: payload.host,
        host: payload.host,
        port: 22,
        username: payload.user,
        password: payload.password,
        metadata: {
          provider: 'VPS',
          os: 'Linux',
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
}
