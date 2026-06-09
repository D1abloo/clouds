import { DatePipe } from '@angular/common'
import { Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { ToastService } from '../../core/services/toast.service'
import { SECURITY_ACCENT, SECURITY_ACCENT_BORDER, SECURITY_ACCENT_LIGHT } from './security.config'
import type { RotationPolicy } from './secrets-manager.data'

export interface SecretPolicyDetailData {
  policy: RotationPolicy
}

@Component({
  selector: 'app-secret-policy-detail-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule, StatusBadgeComponent],
  template: `
    <article class="spol">
      <header class="spol__head">
        <div>
          <span class="spol__label">Política de rotación</span>
          <h2>{{ data.policy.name }}</h2>
          <p>{{ data.policy.description }}</p>
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar"><mat-icon>close</mat-icon></button>
      </header>
      <mat-dialog-content class="spol__body">
        <div class="spol__badges">
          <app-status-badge [value]="data.policy.status" />
          <span class="spol__chip">{{ data.policy.intervalDays }} días</span>
          <span class="spol__chip">{{ data.policy.secretsCount }} secretos</span>
        </div>
        <dl class="spol__grid">
          <div><dt>Ámbito</dt><dd>{{ data.policy.scope }}</dd></div>
          <div><dt>Última ejecución</dt><dd>{{ data.policy.lastRun | date: 'dd MMM yyyy, HH:mm' }}</dd></div>
          <div><dt>Próxima ejecución</dt><dd>{{ data.policy.nextRun | date: 'dd MMM yyyy' }}</dd></div>
          <div><dt>Secretos afectados</dt><dd>{{ data.policy.secretsCount }}</dd></div>
        </dl>
        <section class="spol__block">
          <h3><mat-icon>rule</mat-icon> Reglas de la política</h3>
          <ol>
            @for (rule of data.policy.rules; track rule) { <li>{{ rule }}</li> }
          </ol>
        </section>
        <section class="spol__block spol__block--compliance">
          <h3><mat-icon>verified</mat-icon> Notas de cumplimiento</h3>
          <p>{{ data.policy.complianceNotes }}</p>
        </section>
      </mat-dialog-content>
      <mat-dialog-actions align="start">
        <button mat-flat-button color="primary" type="button" (click)="handleRunNow()">
          <mat-icon>play_arrow</mat-icon> Ejecutar ahora
        </button>
        <button mat-stroked-button type="button" mat-dialog-close>Cerrar</button>
      </mat-dialog-actions>
    </article>
  `,
  styles: `
    .spol { width: 100%; color: #0f172a; display: flex; flex-direction: column; min-height: 0; }
    .spol__head { display: flex; justify-content: space-between; gap: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid #e2e8f0; }
    .spol__label { font-size: 0.58rem; font-weight: 750; text-transform: uppercase; color: #94a3b8; }
    .spol__head h2 { margin: 0.2rem 0 0; font-size: 1.05rem; font-weight: 700; }
    .spol__head p { margin: 0.25rem 0 0; font-size: 0.72rem; color: #64748b; line-height: 1.5; max-width: 36rem; }
    .spol__body { padding-top: 0.75rem !important; display: flex; flex-direction: column; gap: 0.75rem; }
    .spol__badges { display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center; }
    .spol__chip { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.62rem; font-weight: 700; background: ${SECURITY_ACCENT_LIGHT}; color: ${SECURITY_ACCENT}; border: 1px solid ${SECURITY_ACCENT_BORDER}; }
    .spol__grid {
      display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem 1rem;
      dt { font-size: 0.58rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; }
      dd { margin: 0.1rem 0 0; font-size: 0.78rem; }
    }
    .spol__block { padding: 0.65rem 0.75rem; border-radius: 10px; border: 1px solid ${SECURITY_ACCENT_BORDER}; background: ${SECURITY_ACCENT_LIGHT}; }
    .spol__block h3 { display: flex; align-items: center; gap: 0.35rem; margin: 0 0 0.4rem; font-size: 0.75rem; font-weight: 700; color: ${SECURITY_ACCENT}; }
    .spol__block h3 mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    .spol__block ol { margin: 0; padding-left: 1.1rem; font-size: 0.72rem; color: #475569; line-height: 1.55; }
    .spol__block p { margin: 0; font-size: 0.72rem; color: #475569; line-height: 1.55; }
    .spol__block--compliance { border-color: #bbf7d0; background: #f0fdf4; }
    .spol__block--compliance h3 { color: #15803d; }
  `,
})
export class SecretPolicyDetailDialogComponent {
  readonly data = inject<SecretPolicyDetailData>(MAT_DIALOG_DATA)
  private readonly dialogRef = inject(MatDialogRef<SecretPolicyDetailDialogComponent>)
  private readonly toast = inject(ToastService)

  handleRunNow = (): void => {
    this.toast.success(`Rotación iniciada: ${this.data.policy.name}`)
    this.dialogRef.close({ executed: true, id: this.data.policy.id })
  }
}
