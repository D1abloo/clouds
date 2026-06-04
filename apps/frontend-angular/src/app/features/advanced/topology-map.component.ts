import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatDialog } from '@angular/material/dialog'
import { startWith, delay, of } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { DetailDialogComponent } from '../../shared/components/detail-dialog/detail-dialog.component'
import { DemoActionsService } from '../../core/services/demo-actions.service'
import {
  TOPOLOGY_NODES,
  TOPOLOGY_EDGES,
  type TopologyNode,
} from '../../shared/platform/advanced-modules.demo'

@Component({
  selector: 'app-topology-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    SummaryCardComponent,
    LoadingStateComponent,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <div class="page-container animate-fade-in">
      <app-page-header
        icon="account_tree"
        title="Topology Map"
        description="Visual infrastructure graph — clouds, accounts, regions, networks, instances, VPS, Docker, Kubernetes and services."
        [actions]="[
          { label: 'Refresh map', icon: 'refresh', primary: true },
          { label: 'Export PNG', icon: 'image' },
        ]"
        (actionClick)="handleHeader($event)"
      />

      @if (loading()) {
        <app-loading-state message="Building topology…" />
      } @else {
        <div class="summary-grid app-section-panel stagger-children">
          <app-summary-card title="Nodes" [value]="visibleNodes().length" icon="hub" variant="elevated" iconColor="purple" />
          <app-summary-card title="Connections" [value]="visibleEdges().length" icon="device_hub" variant="elevated" iconColor="cyan" />
          <app-summary-card title="Healthy" [value]="healthyCount()" icon="check_circle" variant="elevated" iconColor="success" />
          <app-summary-card title="Issues" [value]="issueCount()" icon="warning" variant="elevated" iconColor="warn" />
        </div>

        <div class="table-card topology-toolbar">
          <mat-form-field appearance="outline">
            <mat-label>Filter by provider</mat-label>
            <mat-select [formControl]="providerControl">
              <mat-option value="">All</mat-option>
              @for (p of providers; track p) {
                <mat-option [value]="p">{{ p }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Status</mat-label>
            <mat-select [formControl]="statusControl">
              <mat-option value="">All</mat-option>
              <mat-option value="healthy">Healthy</mat-option>
              <mat-option value="warning">Warning</mat-option>
              <mat-option value="critical">Critical</mat-option>
            </mat-select>
          </mat-form-field>
          <div class="topology-zoom">
            <button mat-stroked-button type="button" (click)="zoomOut()" aria-label="Zoom out"><mat-icon>remove</mat-icon></button>
            <span>{{ zoom() }}%</span>
            <button mat-stroked-button type="button" (click)="zoomIn()" aria-label="Zoom in"><mat-icon>add</mat-icon></button>
            <button mat-stroked-button type="button" (click)="resetZoom()">Reset</button>
          </div>
        </div>

        <div class="table-card topology-canvas-wrap">
          <svg
            class="topology-canvas"
            viewBox="0 0 860 280"
            [style.transform]="'scale(' + zoom() / 100 + ')'"
          >
            @for (edge of visibleEdges(); track edge.from + edge.to) {
              <line
                [attr.x1]="nodePos(edge.from).x + 40"
                [attr.y1]="nodePos(edge.from).y + 20"
                [attr.x2]="nodePos(edge.to).x + 40"
                [attr.y2]="nodePos(edge.to).y + 20"
                class="topology-edge"
              />
            }
            @for (node of visibleNodes(); track node.id) {
              <g
                class="topology-node"
                [class]="'topology-node--' + node.status"
                [attr.transform]="'translate(' + node.x + ',' + node.y + ')'"
                (click)="selectNode(node)"
                tabindex="0"
                role="button"
                [attr.aria-label]="node.label"
              >
                <rect width="80" height="40" rx="10" />
                <text x="40" y="16" text-anchor="middle" class="topology-node__kind">{{ node.kind }}</text>
                <text x="40" y="30" text-anchor="middle" class="topology-node__label">{{ node.label }}</text>
              </g>
            }
          </svg>
        </div>

        @if (selected()) {
          <div class="table-card topology-detail animate-fade-in">
            <div class="topology-detail__head">
              <strong>{{ selected()!.label }}</strong>
              <span [class]="'status-dot status-dot--' + selected()!.status">{{ selected()!.status }}</span>
              <button mat-icon-button type="button" (click)="selected.set(null)" aria-label="Close"><mat-icon>close</mat-icon></button>
            </div>
            <p>Provider: {{ selected()!.provider }} · Kind: {{ selected()!.kind }}</p>
            <div class="hub-quick-actions">
              <button type="button" class="hub-action-chip" (click)="nodeAction('View metrics')"><mat-icon>monitoring</mat-icon> Metrics</button>
              <button type="button" class="hub-action-chip" (click)="nodeAction('Open resource')"><mat-icon>open_in_new</mat-icon> Open</button>
              <button type="button" class="hub-action-chip" (click)="nodeAction('Run runbook')"><mat-icon>menu_book</mat-icon> Runbook</button>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: `
    .topology-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      margin-bottom: 1rem;
    }
    .topology-zoom {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-left: auto;
      span { font-size: 0.85rem; font-weight: 700; min-width: 40px; text-align: center; }
    }
    .topology-canvas-wrap {
      overflow: auto;
      padding: 1rem;
      min-height: 320px;
    }
    .topology-canvas {
      width: 100%;
      min-width: 860px;
      transform-origin: top left;
      transition: transform 0.2s ease;
    }
    .topology-edge {
      stroke: color-mix(in srgb, var(--app-accent) 40%, transparent);
      stroke-width: 2;
    }
    .topology-node {
      cursor: pointer;
      transition: transform 0.18s ease;
      rect {
        fill: color-mix(in srgb, #6366f1 18%, #151a28);
        stroke: transparent;
      }
      text { fill: var(--app-text); pointer-events: none; }
      &__kind { font-size: 7px; fill: var(--app-text-muted); }
      &__label { font-size: 9px; font-weight: 700; }
      &:hover { transform: translate(0, -2px); }
    }
    .topology-node--healthy rect { fill: color-mix(in srgb, #22c55e 22%, #151a28); }
    .topology-node--warning rect { fill: color-mix(in srgb, #f59e0b 25%, #151a28); }
    .topology-node--critical rect { fill: color-mix(in srgb, #ef4444 28%, #151a28); box-shadow: 0 0 12px #ef4444; }
    .topology-detail {
      margin-top: 1rem;
      padding: 1rem;
      &__head {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        strong { flex: 1; }
      }
    }
    .status-dot {
      font-size: 0.65rem;
      font-weight: 800;
      text-transform: uppercase;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
    }
    .status-dot--healthy { color: #22c55e; background: color-mix(in srgb, #22c55e 20%, transparent); }
    .status-dot--warning { color: #f59e0b; background: color-mix(in srgb, #f59e0b 20%, transparent); }
    .status-dot--critical { color: #ef4444; background: color-mix(in srgb, #ef4444 20%, transparent); }
  `,
})
export class TopologyMapComponent implements OnInit {
  private readonly demo = inject(DemoActionsService)
  private readonly dialog = inject(MatDialog)

  readonly nodes = TOPOLOGY_NODES
  readonly edges = TOPOLOGY_EDGES
  readonly providers = ['AWS', 'GCP', 'VPS', 'Docker', 'K8s']

  readonly providerControl = new FormControl('', { nonNullable: true })
  readonly statusControl = new FormControl('', { nonNullable: true })
  readonly loading = signal(true)
  readonly zoom = signal(100)
  readonly selected = signal<TopologyNode | null>(null)

  private readonly providerFilter = toSignal(this.providerControl.valueChanges.pipe(startWith('')), { initialValue: '' })
  private readonly statusFilter = toSignal(this.statusControl.valueChanges.pipe(startWith('')), { initialValue: '' })

  readonly visibleNodes = computed(() => {
    const p = this.providerFilter()
    const s = this.statusFilter()
    return this.nodes.filter((n) => {
      const matchP = !p || n.provider === p
      const matchS = !s || n.status === s
      return matchP && matchS
    })
  })

  readonly visibleEdges = computed(() => {
    const ids = new Set(this.visibleNodes().map((n) => n.id))
    return this.edges.filter((e) => ids.has(e.from) && ids.has(e.to))
  })

  healthyCount = (): number => this.visibleNodes().filter((n) => n.status === 'healthy').length
  issueCount = (): number => this.visibleNodes().filter((n) => n.status !== 'healthy').length

  ngOnInit(): void {
    of(true).pipe(delay(400)).subscribe(() => this.loading.set(false))
  }

  nodePos = (id: string): { x: number; y: number } => {
    const n = this.nodes.find((x) => x.id === id)
    return n ? { x: n.x, y: n.y } : { x: 0, y: 0 }
  }

  selectNode = (node: TopologyNode): void => {
    this.selected.set(node)
    this.dialog.open(DetailDialogComponent, {
      width: '440px',
      data: {
        title: node.label,
        rows: [
          { label: 'Kind', value: node.kind },
          { label: 'Provider', value: node.provider },
          { label: 'Status', value: node.status },
        ],
      },
    })
  }

  zoomIn = (): void => this.zoom.update((z) => Math.min(150, z + 10))
  zoomOut = (): void => this.zoom.update((z) => Math.max(60, z - 10))
  resetZoom = (): void => this.zoom.set(100)

  handleHeader = (label: string): void => {
    this.demo.simulate(`Topology: ${label}`, 600).subscribe()
  }

  nodeAction = (label: string): void => {
    this.demo.simulate(`${this.selected()?.label}: ${label}`, 500).subscribe()
  }
}
