import { DatePipe } from '@angular/common'
import { Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { ToastService } from '../../core/services/toast.service'
import { SECRET_TYPE_LABELS, type SecretRecord } from './secrets-manager.demo'

export interface SecretDetailData {
  secret: SecretRecord
}

@Component({
  selector: 'app-secret-detail-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule, StatusBadgeComponent],
  template: `
    <article class="secret-dialog">
      <header class="secret-dialog__head">
        <div>
          <span class="secret-dialog__label">Detalle del secreto</span>
          <h2>{{ data.secret.name }}</h2>
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar"><mat-icon>close</mat-icon></button>
      </header>
      <mat-dialog-content>
        <dl class="secret-dialog__grid">
          <div><dt>Tipo</dt><dd>{{ typeLabel(data.secret.type) }}</dd></div>
          <div><dt>Referencia</dt><dd class="mono">{{ data.secret.reference }}</dd></div>
          <div><dt>Propietario</dt><dd>{{ data.secret.owner }}</dd></div>
          <div><dt>Expira</dt><dd>{{ data.secret.expires }}</dd></div>
          <div><dt>Estado</dt><dd><app-status-badge [value]="data.secret.status" /></dd></div>
          <div><dt>Última rotación</dt><dd>{{ data.secret.lastRotated | date: 'dd MMM yyyy, HH:mm' }}</dd></div>
          <div class="secret-dialog__full"><dt>Entornos</dt><dd>{{ data.secret.environments.join(', ') }}</dd></div>
        </dl>
      </mat-dialog-content>
      <mat-dialog-actions align="start">
        <button mat-flat-button color="primary" type="button" (click)="handleRotate()">
          <mat-icon>sync</mat-icon> Rotar ahora
        </button>
        <button mat-stroked-button type="button" mat-dialog-close>Cerrar</button>
      </mat-dialog-actions>
    </article>
  `,
  styles: `
    .secret-dialog { color: #0f172a; }
    .secret-dialog__head { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 0.6rem; border-bottom: 1px solid #e2e8f0; }
    .secret-dialog__label { font-size: 0.58rem; font-weight: 750; text-transform: uppercase; color: #94a3b8; }
    .secret-dialog__head h2 { margin: 0.2rem 0 0; font-size: 0.95rem; }
    .secret-dialog__grid {
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem 1rem;
      dt { font-size: 0.58rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; }
      dd { margin: 0.1rem 0 0; font-size: 0.78rem; }
    }
    .secret-dialog__full { grid-column: 1 / -1; }
    .mono { font-family: ui-monospace, monospace; font-size: 0.72rem; }
  `,
})
export class SecretDetailDialogComponent {
  readonly data = inject<SecretDetailData>(MAT_DIALOG_DATA)
  private readonly dialogRef = inject(MatDialogRef<SecretDetailDialogComponent>)
  private readonly toast = inject(ToastService)

  typeLabel = (t: string): string => SECRET_TYPE_LABELS[t as keyof typeof SECRET_TYPE_LABELS] ?? t

  handleRotate = (): void => {
    this.toast.success(`Rotación iniciada: ${this.data.secret.name}`)
    this.dialogRef.close({ rotated: true, id: this.data.secret.id })
  }
}
