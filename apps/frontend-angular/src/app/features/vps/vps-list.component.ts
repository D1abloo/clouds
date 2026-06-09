import { PlatformActionService } from '../../shared/platform/platform-action.service'
import { Component, inject, OnInit, signal, computed } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { MatTabsModule } from '@angular/material/tabs'
import { MatTableModule } from '@angular/material/table'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { MatDialog, MatDialogModule } from '@angular/material/dialog'
import { debounceTime, startWith } from 'rxjs'
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
    <h2 mat-dialog-title>Execute command</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full"><mat-label>Command</mat-label><input matInput [formControl]="cmd" /></mat-form-field>
      <pre class="output mono">{{ output }}</pre>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Close</button>
      <button mat-flat-button color="primary" type="button" (click)="run()">Run</button>
    </mat-dialog-actions>
  `,
  styles: `
    .full { width: 100%; }
    .output { background: var(--app-surface); padding: 0.75rem; border-radius: 8px; min-height: 80px; font-size: 0.75rem; }
  `,
})
export class VpsCommandDialogComponent {
  private readonly actions = inject(PlatformActionService)

  readonly cmd = new FormControl('uname -a', { nonNullable: true })
  output = '$ uname -a\nLinux demo-vps 6.1.0 #1 SMP x86_64 GNU/Linux'
  run = (): void => {
    this.output = `$ ${this.cmd.value}\nLinux demo-vps 6.1.0 #1 SMP x86_64 GNU/Linux\n(demo output)`
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
        description="SSH servers, Docker, Kubernetes and systemd services"
        [actions]="[
          { label: 'Add VPS', icon: 'add', primary: true },
          { label: 'Validate all', icon: 'verified' },
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
                <app-empty-state title="No VPS hosts" description="Add a VPS or load demo data." />
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
          <mat-tab label="SSH"><div class="tab-panel"><p>SSH key auth configured for {{ connected() }} hosts.</p></div></mat-tab>
          <mat-tab label="Services"><div class="tab-panel"><p>nginx, docker, kubelet, postgresql (demo systemd units)</p></div></mat-tab>
          <mat-tab label="Docker"><div class="tab-panel"><p>{{ withDocker() }} hosts running Docker Engine.</p></div></mat-tab>
          <mat-tab label="Kubernetes"><div class="tab-panel"><p>{{ withK8s() }} hosts with k3s/k8s agents.</p></div></mat-tab>
          <mat-tab label="Ports"><div class="tab-panel"><p>22, 80, 443, 3000, 6443 open (demo scan)</p></div></mat-tab>
          <mat-tab label="Metrics"><div class="tab-panel"><p>CPU/RAM/disk collected every 5m (demo).</p></div></mat-tab>
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
  private readonly actions = inject(PlatformActionService)

  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly page = createPageLoader(true)
  readonly hosts = signal<VpsRow[]>([])
  readonly cols = ['name', 'host', 'port', 'user', 'os', 'status', 'docker', 'cpu', 'actions']

  private readonly searchTerm = toSignal(this.searchControl.valueChanges.pipe(debounceTime(200), startWith('')), { initialValue: '' })

  filtered = computed(() => {
    const term = (this.searchTerm() ?? '').toLowerCase()
    return this.hosts().filter((h) => !term || h.name.toLowerCase().includes(term) || h.host.toLowerCase().includes(term))
  })

  connected = computed(() => this.hosts().filter((h) => (h.status ?? 'online') !== 'offline').length)
  disconnected = computed(() => this.hosts().length - this.connected())
  withDocker = computed(() => this.hosts().filter((h) => h.docker !== false).length)
  withK8s = computed(() => Math.min(2, this.hosts().length))

  ngOnInit(): void {
    this.load()
  }

  load = (): void => {
    this.page.run(this.service.list(), {
      onSuccess: (data) =>
        this.hosts.set(
          data.map((h, i) => ({
            ...h,
            user: 'ubuntu',
            os: 'Ubuntu 22.04 LTS',
            docker: i % 2 === 0,
            kubernetes: i < 2,
            cpu: 20 + (i * 7) % 60,
            ram: 40 + (i * 11) % 50,
            disk: 55 + (i * 5) % 30,
          })),
        ),
      errorMessage: 'Failed to load VPS hosts',
    })
  }

  handleHeader = (label: string): void => {
    if (label === 'Add VPS') {
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
          this.actions.simulate(`Add VPS ${payload.name}`, 900, 'VPS added (demo)').subscribe(() => this.load())
        })
      return
    }
    this.actions.simulate('Validate all VPS', 1500).subscribe()
  }

  handleValidate = (host: VpsHost): void => {
    this.service.validate(host.id).subscribe({
      next: () => this.toast.success(`Validated ${host.name}`),
      error: () => this.actions.simulate(`Validate ${host.name}`, 600).subscribe(),
    })
  }

  openCommand = (_row: VpsRow): void => {
    this.dialog.open(VpsCommandDialogComponent, { width: '480px' })
  }

  detectDocker = (row: VpsRow): void => {
    this.actions.simulate(`Detect Docker on ${row.name}`, 900, 'Docker 24.0 detected').subscribe()
  }

  detectK8s = (row: VpsRow): void => {
    this.actions.simulate(`Detect K8s on ${row.name}`, 900, 'k3s v1.28 detected').subscribe()
  }

  viewMetrics = (row: VpsRow): void => {
    this.actions.simulate(`Metrics ${row.name}`, 500).subscribe()
  }
}
