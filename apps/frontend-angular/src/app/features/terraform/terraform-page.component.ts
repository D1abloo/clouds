import { Component, inject, OnInit, signal } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatTabsModule } from '@angular/material/tabs'
import { MatTableModule } from '@angular/material/table'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatDialog, MatDialogModule } from '@angular/material/dialog'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { DetailDialogComponent } from '../../shared/components/detail-dialog/detail-dialog.component'
import { InventoryService } from '../../core/services/inventory.service'
import { DemoActionsService } from '../../core/services/demo-actions.service'
import { createPageLoader } from '../../core/utils/page-load.util'
import { invNum } from '../../core/utils/inventory.util'

@Component({
  selector: 'app-terraform-launch-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>Launch instance with Terraform</h2>
    <mat-dialog-content class="launch-form">
      <mat-form-field appearance="outline"><mat-label>Provider</mat-label>
        <mat-select [formControl]="provider"><mat-option value="AWS">AWS</mat-option><mat-option value="GCP">GCP</mat-option><mat-option value="AZURE">Azure</mat-option></mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline"><mat-label>Region</mat-label><input matInput [formControl]="region" /></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>Instance type</mat-label><input matInput [formControl]="instanceType" /></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>Count</mat-label><input matInput type="number" [formControl]="count" /></mat-form-field>
      <p class="estimate">Estimated cost: <strong>{{ estimate() }}/mo</strong></p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Cancel</button>
      <button mat-stroked-button type="button" (click)="showPlan()">View plan</button>
      <button mat-flat-button color="primary" type="button" [mat-dialog-close]="formValue()">Confirm apply</button>
    </mat-dialog-actions>
  `,
  styles: `
    .launch-form { display: grid; gap: 0.5rem; min-width: 360px; }
    mat-form-field { width: 100%; }
    .estimate { margin: 0.5rem 0 0; font-size: 0.9rem; }
  `,
})
export class TerraformLaunchDialogComponent {
  private readonly dialog = inject(MatDialog)
  readonly provider = new FormControl('AWS', { nonNullable: true })
  readonly region = new FormControl('us-east-1', { nonNullable: true })
  readonly instanceType = new FormControl('t3.medium', { nonNullable: true })
  readonly count = new FormControl(1, { nonNullable: true })

  estimate = (): string => `$${(this.count.value * 42).toFixed(2)}`

  formValue = () => ({
    provider: this.provider.value,
    region: this.region.value,
    instanceType: this.instanceType.value,
    count: this.count.value,
  })

  showPlan = (): void => {
    this.dialog.open(DetailDialogComponent, {
      width: '520px',
      data: {
        title: 'Terraform plan',
        rows: [],
        extra: `Plan: 1 to add, 0 to change, 0 to destroy\n+ aws_instance.demo\n    instance_type = "${this.instanceType.value}"\n    ami           = "ami-demo"\n    tags = { Environment = "demo" }`,
      },
    })
  }
}

@Component({
  selector: 'app-terraform-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    SummaryCardComponent,
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
  ],
  template: `
    <div class="page-container">
      <app-page-header
        title="Terraform"
        description="Infrastructure as code — workspaces, plans, applies and templates"
        [actions]="[
          { label: 'New plan', icon: 'description', primary: true },
          { label: 'Launch instance', icon: 'rocket_launch' },
          { label: 'Destroy demo', icon: 'delete' },
        ]"
        (actionClick)="handleHeader($event)"
      />

      @if (page.loading()) {
        <app-loading-state />
      } @else if (page.error()) {
        <app-error-state [message]="page.error()!" (retry)="load()" />
      } @else {
        <div class="summary-grid">
          <app-summary-card title="Workspaces" [value]="n('workspaces')" icon="folder" />
          <app-summary-card title="Runs" [value]="n('runs')" icon="play_circle" />
          <app-summary-card title="Plans" [value]="n('plans')" icon="description" />
          <app-summary-card title="Applies" [value]="n('applies')" icon="check_circle" />
          <app-summary-card title="Errors" [value]="n('errors')" icon="error" iconColor="warn" />
          <app-summary-card title="Templates" [value]="templates().length" icon="code" />
        </div>

        <mat-tab-group>
          <mat-tab label="Runs">
            <div class="tab-panel">
              @if (runs().length === 0) {
                <app-empty-state title="No runs" description="Create a plan or launch an instance." />
              } @else {
                <table mat-table [dataSource]="runs()" class="full-table">
                  <ng-container matColumnDef="workspace">
                    <th mat-header-cell *matHeaderCellDef>Workspace</th>
                    <td mat-cell *matCellDef="let row">{{ row.workspaceName }}</td>
                  </ng-container>
                  <ng-container matColumnDef="provider">
                    <th mat-header-cell *matHeaderCellDef>Provider</th>
                    <td mat-cell *matCellDef="let row">{{ row.provider }}</td>
                  </ng-container>
                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>Status</th>
                    <td mat-cell *matCellDef="let row"><app-status-badge [value]="row.status" /></td>
                  </ng-container>
                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef></th>
                    <td mat-cell *matCellDef="let row">
                      <button mat-stroked-button type="button" (click)="viewRunLogs(row)">Logs</button>
                    </td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="runCols"></tr>
                  <tr mat-row *matRowDef="let row; columns: runCols"></tr>
                </table>
              }
            </div>
          </mat-tab>
          <mat-tab label="Workspaces"><div class="tab-panel"><p>{{ n('workspaces') }} workspaces configured.</p></div></mat-tab>
          <mat-tab label="Templates">
            <div class="tab-panel">
              <table mat-table [dataSource]="templates()" class="full-table">
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>Name</th>
                  <td mat-cell *matCellDef="let row">{{ row.name }}</td>
                </ng-container>
                <ng-container matColumnDef="provider">
                  <th mat-header-cell *matHeaderCellDef>Provider</th>
                  <td mat-cell *matCellDef="let row">{{ row.provider }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="tplCols"></tr>
                <tr mat-row *matRowDef="let row; columns: tplCols"></tr>
              </table>
            </div>
          </mat-tab>
          <mat-tab label="State"><div class="tab-panel"><pre class="mono state-box">{{ statePreview() }}</pre></div></mat-tab>
          <mat-tab label="Logs"><div class="tab-panel"><pre class="mono state-box">{{ runLogPreview() }}</pre></div></mat-tab>
        </mat-tab-group>
      }
    </div>
  `,
  styles: `
    .full-table { width: 100%; }
    .state-box { background: var(--app-surface); padding: 1rem; border-radius: 8px; font-size: 0.75rem; max-height: 320px; overflow: auto; }
  `,
})
export class TerraformPageComponent implements OnInit {
  private readonly inventory = inject(InventoryService)
  private readonly demoActions = inject(DemoActionsService)
  private readonly dialog = inject(MatDialog)

  readonly page = createPageLoader(true)
  readonly data = signal<Record<string, unknown> | null>(null)
  readonly runCols = ['workspace', 'provider', 'status', 'actions']
  readonly tplCols = ['name', 'provider']

  runs = (): Record<string, unknown>[] => (this.data()?.['items'] as Record<string, unknown>[]) ?? []
  templates = (): Record<string, unknown>[] => (this.data()?.['templates'] as Record<string, unknown>[]) ?? []

  ngOnInit(): void {
    this.load()
  }

  n = (key: string): number => invNum(this.data(), key)

  load = (): void => {
    this.page.run(this.inventory.terraform(), {
      onSuccess: (d) => this.data.set(d),
      errorMessage: 'Failed to load Terraform inventory',
    })
  }

  handleHeader = (label: string): void => {
    if (label === 'Launch instance') {
      this.openLaunch()
      return
    }
    if (label === 'New plan') {
      this.demoActions.simulate('Terraform plan', 1500, 'Plan ready — 1 resource to add').subscribe()
      return
    }
    if (label === 'Destroy demo') {
      this.demoActions.simulate('Terraform destroy', 2000, 'Destroy completed (demo)').subscribe(() => this.load())
    }
  }

  openLaunch = (): void => {
    this.dialog
      .open(TerraformLaunchDialogComponent, { width: '420px' })
      .afterClosed()
      .subscribe((v) => {
        if (!v) return
        this.demoActions.simulate('Terraform apply', 2500, `Applied ${v.count} instance(s) in ${v.region}`).subscribe(() => this.load())
      })
  }

  viewRunLogs = (row: Record<string, unknown>): void => {
    this.dialog.open(DetailDialogComponent, {
      width: '560px',
      data: { title: `Run logs — ${row['workspaceName']}`, rows: [], extra: this.runLogPreview() },
    })
  }

  statePreview = (): string =>
    `{\n  "version": 4,\n  "terraform_version": "1.7.0",\n  "resources": [\n    { "type": "aws_instance", "name": "web", "instances": [{ "attributes": { "id": "i-demo" } }] }\n  ]\n}`

  runLogPreview = (): string =>
    `Terraform v1.7.0\nInitializing plugins...\nPlan: 1 to add\naws_instance.demo: Creating...\naws_instance.demo: Creation complete\nApply complete! Resources: 1 added.`
}
