import { Component, inject } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatSelectModule } from '@angular/material/select'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'

const TARGETS = [
  { id: 'k8s-prod-payments', name: 'k8s-prod-payments', type: 'kubernetes' },
  { id: 'vps-staging-02', name: 'vps-staging-02', type: 'vps' },
  { id: 'gl-runner-deploy', name: 'shared-runner-01', type: 'runner' },
]

@Component({
  selector: 'app-gitlab-deploy-dialog',
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
    <h2 mat-dialog-title>Desplegar proyecto GitLab</h2>
    <mat-dialog-content>
      <p class="hint">{{ data.projectPath }}</p>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Rama</mat-label>
        <input matInput [formControl]="branch" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Environment</mat-label>
        <mat-select [formControl]="environment">
          <mat-option value="production">production</mat-option>
          <mat-option value="staging">staging</mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Destino</mat-label>
        <mat-select [formControl]="targetId">
          @for (t of targets; track t.id) {
            <mat-option [value]="t.id">{{ t.name }} ({{ t.type }})</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button class="gl-btn" type="button" (click)="submit()">Desplegar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .full { width: 100%; }
    .hint { font-size: 0.85rem; color: var(--app-text-muted); }
    .gl-btn { background: #fc6d26 !important; color: #fff !important; }
  `,
})
export class GitlabDeployDialogComponent {
  readonly data = inject<{ projectPath: string; defaultBranch: string }>(MAT_DIALOG_DATA)
  readonly ref = inject(MatDialogRef<GitlabDeployDialogComponent>)

  readonly branch = new FormControl(this.data.defaultBranch, { nonNullable: true })
  readonly environment = new FormControl('staging', { nonNullable: true })
  readonly targetId = new FormControl(TARGETS[0].id, { nonNullable: true })
  readonly targets = TARGETS

  submit = (): void => {
    const t = TARGETS.find((x) => x.id === this.targetId.value)
    this.ref.close({
      branch: this.branch.value,
      environment: this.environment.value,
      targetId: this.targetId.value,
      targetType: t?.type ?? 'kubernetes',
    })
  }
}
