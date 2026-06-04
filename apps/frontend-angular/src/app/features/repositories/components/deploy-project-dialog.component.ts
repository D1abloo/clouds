import { Component, inject } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatSelectModule } from '@angular/material/select'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import type { DeployTargetType } from '../../../core/services/github.service'

const DEPLOY_TARGETS: { id: string; name: string; type: DeployTargetType }[] = [
  { id: 'aws-prod-app-1', name: 'aws-prod-app-1', type: 'instance' },
  { id: 'vps-prod-nginx-01', name: 'vps-prod-nginx-01', type: 'vps' },
  { id: 'docker-host-01', name: 'docker-host-01', type: 'docker' },
  { id: 'cluster-prod-01', name: 'cluster-prod-01', type: 'kubernetes' },
]

@Component({
  selector: 'app-deploy-project-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>Desplegar proyecto</h2>
    <mat-dialog-content>
      <p class="deploy-hint">{{ data.repoName }}</p>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Rama</mat-label>
        <input matInput [formControl]="branch" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Destino</mat-label>
        <mat-select [formControl]="targetId">
          @for (t of targets; track t.id) {
            <mat-option [value]="t.id">{{ t.name }} ({{ targetLabel(t.type) }})</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Cancelar</button>
      <button mat-flat-button color="primary" type="button" [mat-dialog-close]="result()">Desplegar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .full { width: 100%; }
    .deploy-hint { margin: 0 0 1rem; color: var(--app-text-muted); font-size: 0.85rem; }
  `,
})
export class DeployProjectDialogComponent {
  readonly data = inject<{ repoName: string; defaultBranch: string }>(MAT_DIALOG_DATA)
  readonly branch = new FormControl('', { nonNullable: true })
  readonly targetId = new FormControl(DEPLOY_TARGETS[0].id, { nonNullable: true })
  readonly targets = DEPLOY_TARGETS

  constructor() {
    this.branch.setValue(this.data.defaultBranch)
  }

  targetLabel = (t: DeployTargetType): string =>
    ({ instance: 'Instancia', vps: 'VPS', docker: 'Docker', kubernetes: 'Kubernetes' })[t]

  result = () => {
    const target = DEPLOY_TARGETS.find((t) => t.id === this.targetId.value)!
    return {
      branch: this.branch.value,
      targetType: target.type,
      targetId: target.id,
      targetName: target.name,
    }
  }
}
