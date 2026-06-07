import { Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { ToastService } from '../../core/services/toast.service'
import { ChangeManagementDetailPanelComponent } from './change-management-detail-panel.component'
import { ChangeManagementService } from './change-management.service'
import {
  canApproveChange,
  canCancelChange,
  canExecuteChange,
} from './change-management.config'
import type { ChangeRequest } from './change-management.demo'

export interface ChangeRequestDetailDialogData {
  change: ChangeRequest
}

@Component({
  selector: 'app-change-request-detail-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    ChangeManagementDetailPanelComponent,
  ],
  template: `
    <article class="chg-rfc-dialog">
      <header class="chg-rfc-dialog__head">
        <span class="chg-rfc-dialog__label">Detalle RFC</span>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar detalle">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <mat-dialog-content class="chg-rfc-dialog__body">
        <app-change-management-detail-panel
          [change]="currentChange()"
          [hideActions]="true"
        />
      </mat-dialog-content>

      @if (currentChange(); as chg) {
        @if (canApprove(chg) || canExecute(chg) || canCancel(chg)) {
          <mat-dialog-actions class="chg-rfc-dialog__actions" align="start">
            @if (canApprove(chg)) {
              <button type="button" class="chg-rfc-dialog__btn chg-rfc-dialog__btn--primary" (click)="handleApprove(chg)">
                <mat-icon>check</mat-icon>
                Aprobar
              </button>
              <button type="button" class="chg-rfc-dialog__btn" (click)="handleReject(chg)">
                <mat-icon>close</mat-icon>
                Rechazar
              </button>
            }
            @if (canExecute(chg)) {
              <button type="button" class="chg-rfc-dialog__btn chg-rfc-dialog__btn--primary" (click)="handleExecute(chg)">
                <mat-icon>play_arrow</mat-icon>
                Ejecutar
              </button>
            }
            @if (canCancel(chg)) {
              <button type="button" class="chg-rfc-dialog__btn chg-rfc-dialog__btn--danger" (click)="handleCancelChange(chg)">
                <mat-icon>block</mat-icon>
                Cancelar RFC
              </button>
            }
          </mat-dialog-actions>
        }
      }
    </article>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
    }
    :host ::ng-deep .mat-mdc-dialog-title::before { display: none; }

    .chg-rfc-dialog {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
      overflow: hidden;
      width: 100%;
      background: #fff;
      color: #0f172a;
    }
    .chg-rfc-dialog__head {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.65rem 0 0.55rem;
      border-bottom: 1px solid #e2e8f0;
    }
    .chg-rfc-dialog__label {
      font-size: 0.62rem;
      font-weight: 750;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
    }
    .chg-rfc-dialog__body {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      scrollbar-width: thin;
      padding: 0 !important;
      margin: 0;
    }
    .chg-rfc-dialog__actions {
      flex-shrink: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin: 0;
      padding: 0.65rem 0 0;
      min-height: 0;
      border-top: 1px solid #e2e8f0;
      background: #fff;
    }
    .chg-rfc-dialog__btn {
      display: inline-flex;
      align-items: center;
      gap: 0.28rem;
      padding: 0.38rem 0.65rem;
      border: none;
      border-radius: 8px;
      background: #f1f5f9;
      font: inherit;
      font-size: 0.68rem;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
    }
    .chg-rfc-dialog__btn mat-icon {
      font-size: 0.9rem;
      width: 0.9rem;
      height: 0.9rem;
    }
    .chg-rfc-dialog__btn--primary {
      background: #1e293b;
      color: #fff;
    }
    .chg-rfc-dialog__btn--danger {
      background: #fef2f2;
      color: #b91c1c;
    }
  `,
})
export class ChangeRequestDetailDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ChangeRequestDetailDialogComponent>)
  private readonly svc = inject(ChangeManagementService)
  private readonly toast = inject(ToastService)
  readonly data = inject<ChangeRequestDetailDialogData>(MAT_DIALOG_DATA)

  readonly canApprove = canApproveChange
  readonly canExecute = canExecuteChange
  readonly canCancel = canCancelChange

  currentChange = (): ChangeRequest | null => {
    return this.svc.changes().find((c) => c.id === this.data.change.id) ?? this.data.change
  }

  handleApprove = (chg: ChangeRequest): void => {
    const updated = this.svc.approve(chg.id)
    if (!updated) {
      this.toast.warning('Este RFC no se puede aprobar en su estado actual')
      return
    }
    this.toast.success(`Cambio ${chg.id} aprobado`)
  }

  handleReject = (chg: ChangeRequest): void => {
    const updated = this.svc.reject(chg.id)
    if (!updated) {
      this.toast.warning('Este RFC no se puede rechazar en su estado actual')
      return
    }
    this.toast.warning(`Cambio ${chg.id} rechazado`)
  }

  handleExecute = (chg: ChangeRequest): void => {
    const updated = this.svc.execute(chg.id)
    if (!updated) {
      this.toast.warning('Este RFC no se puede ejecutar en su estado actual')
      return
    }
    this.toast.success(`Ejecución iniciada — ${chg.id}`)
  }

  handleCancelChange = (chg: ChangeRequest): void => {
    const updated = this.svc.cancel(chg.id)
    if (!updated) {
      this.toast.warning('Este RFC ya está cerrado y no se puede cancelar')
      return
    }
    this.toast.info(`Cambio ${chg.id} cancelado`)
    this.dialogRef.close()
  }
}
