import { Component, inject, OnInit, signal } from '@angular/core'
import { MatTableModule } from '@angular/material/table'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTabsModule } from '@angular/material/tabs'
import { TerraformService } from '../../core/services/terraform.service'
import { TerraformTemplate } from '../../core/models/api.models'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { ToastService } from '../../core/services/toast.service'
import { createPageLoader } from '../../core/utils/page-load.util'

@Component({
  selector: 'app-terraform-page',
  standalone: true,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
  ],
  template: `
    <div class="page-container">
      <header class="page-header">
        <h1>Terraform</h1>
        <p>Infrastructure as code runs and templates</p>
      </header>

      <mat-tab-group>
        <mat-tab label="Templates">
          @if (page.loading()) {
            <app-loading-state />
          } @else if (page.error()) {
            <app-error-state [message]="page.error()!" (retry)="load()" />
          } @else if (templates().length === 0) {
            <app-empty-state
              title="No templates"
              description="Save Terraform templates via the API."
            />
          } @else {
            <table mat-table [dataSource]="templates()" class="tab-table">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Name</th>
                <td mat-cell *matCellDef="let row">{{ row.name }}</td>
              </ng-container>
              <ng-container matColumnDef="provider">
                <th mat-header-cell *matHeaderCellDef>Provider</th>
                <td mat-cell *matCellDef="let row">{{ row.provider }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="cols"></tr>
              <tr mat-row *matRowDef="let row; columns: cols"></tr>
            </table>
          }
        </mat-tab>
        <mat-tab label="Runs">
          <div class="runs-panel">
            <p>Trigger plan/apply/destroy via POST /terraform/runs</p>
            <button mat-flat-button color="primary" type="button" disabled>
              <mat-icon>add</mat-icon>
              New run
            </button>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: `
    .tab-table { width: 100%; margin-top: 1rem; }
    .runs-panel { padding: 1.5rem 0; color: var(--app-text-muted); }
  `,
})
export class TerraformPageComponent implements OnInit {
  private readonly service = inject(TerraformService)
  private readonly toast = inject(ToastService)

  readonly page = createPageLoader(true)
  readonly templates = signal<TerraformTemplate[]>([])
  readonly cols = ['name', 'provider']

  ngOnInit = (): void => this.load()

  load = (): void => {
    this.page.run(this.service.listTemplates(), {
      onSuccess: (data) => this.templates.set(data),
      errorMessage: 'Failed to load Terraform templates',
    })
  }
}
