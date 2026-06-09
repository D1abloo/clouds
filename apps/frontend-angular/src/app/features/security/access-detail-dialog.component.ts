import { DatePipe } from '@angular/common'
import { Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import type { AccessAssignment } from './access-control.data'

export interface AccessDetailData {
  assignment: AccessAssignment
}

@Component({
  selector: 'app-access-detail-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule, StatusBadgeComponent],
  template: `
    <article class="access-dialog">
      <header class="access-dialog__head">
        <div><span class="access-dialog__label">Asignación de acceso</span><h2>{{ data.assignment.user }}</h2></div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar"><mat-icon>close</mat-icon></button>
      </header>
      <mat-dialog-content>
        <dl class="access-dialog__grid">
          <div><dt>Rol</dt><dd>{{ data.assignment.role }}</dd></div>
          <div><dt>Ámbito</dt><dd>{{ data.assignment.scope }}</dd></div>
          <div><dt>Estado</dt><dd><app-status-badge [value]="data.assignment.status" /></dd></div>
          <div><dt>MFA</dt><dd>{{ data.assignment.mfa ? 'Activo' : 'No configurado' }}</dd></div>
          <div><dt>Concedido</dt><dd>{{ data.assignment.grantedAt | date: 'dd MMM yyyy' }}</dd></div>
          @if (data.assignment.expiresAt) {
            <div><dt>Expira</dt><dd>{{ data.assignment.expiresAt | date: 'dd MMM yyyy' }}</dd></div>
          }
        </dl>
      </mat-dialog-content>
      <mat-dialog-actions align="end"><button mat-stroked-button type="button" mat-dialog-close>Cerrar</button></mat-dialog-actions>
    </article>
  `,
  styles: `
    .access-dialog { color: #0f172a; }
    .access-dialog__head { display: flex; justify-content: space-between; padding-bottom: 0.6rem; border-bottom: 1px solid #e2e8f0; }
    .access-dialog__label { font-size: 0.58rem; font-weight: 750; text-transform: uppercase; color: #94a3b8; }
    .access-dialog__head h2 { margin: 0.2rem 0 0; font-size: 0.95rem; }
    .access-dialog__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem 1rem; dt { font-size: 0.58rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; } dd { margin: 0.1rem 0 0; font-size: 0.78rem; } }
  `,
})
export class AccessDetailDialogComponent {
  readonly data = inject<AccessDetailData>(MAT_DIALOG_DATA)
}
