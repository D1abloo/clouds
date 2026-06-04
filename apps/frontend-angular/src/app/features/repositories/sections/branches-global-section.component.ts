import { Component, Input, output, signal, computed } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTabsModule } from '@angular/material/tabs'
import { MatTableModule } from '@angular/material/table'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import type { GlobalBranchRow } from '../utils/repositories-global-demo.util'

const TAB_FILTERS = [
  (b: GlobalBranchRow) => true,
  (b: GlobalBranchRow) => b.provider === 'github',
  (b: GlobalBranchRow) => b.provider === 'gitlab',
  (b: GlobalBranchRow) => b.protected,
  (b: GlobalBranchRow) => b.stale,
  (b: GlobalBranchRow) => b.deployStatus !== 'none',
] as const

@Component({
  selector: 'app-branches-global-section',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTabsModule, MatTableModule, StatusBadgeComponent],
  template: `
    <div class="branches-page">
      <div class="branches-toolbar">
        <button mat-flat-button color="primary" type="button" (click)="sync.emit()">
          <mat-icon>sync</mat-icon> Sincronizar ramas
        </button>
        <button mat-stroked-button type="button" (click)="compare.emit()">
          <mat-icon>compare_arrows</mat-icon> Comparar ramas
        </button>
      </div>

      <mat-tab-group class="soft-tabs" animationDuration="200ms" (selectedIndexChange)="tabIndex.set($event)">
        <mat-tab label="Todas" />
        <mat-tab label="GitHub" />
        <mat-tab label="GitLab" />
        <mat-tab label="Protegidas" />
        <mat-tab label="Sin actividad" />
        <mat-tab label="Desplegables" />
      </mat-tab-group>

      <div class="tab-panel">
        <table mat-table [dataSource]="visibleRows()" class="premium-table">
          <ng-container matColumnDef="provider">
            <th mat-header-cell *matHeaderCellDef>Proveedor</th>
            <td mat-cell *matCellDef="let row">
              <span class="prov" [class]="'prov--' + row.provider">{{ row.provider === 'github' ? 'GitHub' : 'GitLab' }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="repo">
            <th mat-header-cell *matHeaderCellDef>Repo / Proyecto</th>
            <td mat-cell *matCellDef="let row" class="mono">{{ row.repoOrProject }}</td>
          </ng-container>
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Rama</th>
            <td mat-cell *matCellDef="let row">
              <strong>{{ row.name }}</strong>
              @if (row.default) { <span class="chip">default</span> }
            </td>
          </ng-container>
          <ng-container matColumnDef="protected">
            <th mat-header-cell *matHeaderCellDef>Protegida</th>
            <td mat-cell *matCellDef="let row">{{ row.protected ? 'Sí' : 'No' }}</td>
          </ng-container>
          <ng-container matColumnDef="commit">
            <th mat-header-cell *matHeaderCellDef>Último commit</th>
            <td mat-cell *matCellDef="let row">{{ row.lastCommitMessage }}</td>
          </ng-container>
          <ng-container matColumnDef="ci">
            <th mat-header-cell *matHeaderCellDef>CI</th>
            <td mat-cell *matCellDef="let row"><app-status-badge [value]="ciBadge(row.ciStatus)" /></td>
          </ng-container>
          <ng-container matColumnDef="deploy">
            <th mat-header-cell *matHeaderCellDef>Deploy</th>
            <td mat-cell *matCellDef="let row"><app-status-badge [value]="deployBadge(row.deployStatus)" /></td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Acciones</th>
            <td mat-cell *matCellDef="let row">
              <button mat-button type="button" (click)="viewCommits.emit(row)">Ver commits</button>
              <button mat-button type="button" (click)="deployBranch.emit(row)">Desplegar rama</button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols"></tr>
        </table>
      </div>
    </div>
  `,
  styles: `
    .branches-page { border-top: 3px solid #0ea5e9; }
    .branches-toolbar { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .tab-panel { padding: 0.5rem 0 1rem; }
    .prov { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; padding: 0.15rem 0.4rem; border-radius: 4px; }
    .prov--github { background: #24292f22; color: #24292f; }
    .prov--gitlab { background: #fc6d2622; color: #c2410c; }
    .chip { margin-left: 0.35rem; font-size: 0.65rem; color: var(--app-accent); }
    .mono { font-size: 0.78rem; }
  `,
})
export class BranchesGlobalSectionComponent {
  @Input() branches: GlobalBranchRow[] = []

  readonly tabIndex = signal(0)
  readonly cols = ['provider', 'repo', 'name', 'protected', 'commit', 'ci', 'deploy', 'actions']

  readonly sync = output<void>()
  readonly compare = output<void>()
  readonly viewCommits = output<GlobalBranchRow>()
  readonly deployBranch = output<GlobalBranchRow>()

  visibleRows = computed(() => {
    const fn = TAB_FILTERS[this.tabIndex()] ?? TAB_FILTERS[0]
    return this.branches.filter(fn)
  })

  ciBadge = (s: string): string => (s === 'success' ? 'SUCCESS' : s === 'running' ? 'RUNNING' : 'ERROR')
  deployBadge = (s: string): string => {
    if (s === 'success') return 'SUCCESS'
    if (s === 'pending' || s === 'running') return 'RUNNING'
    return 'STOPPED'
  }
}
