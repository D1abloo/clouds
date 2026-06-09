import { Component, inject, signal } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { ToastService } from '../../core/services/toast.service'
import { SecurityCenterService } from './security-center.service'
import { securitySeverityLabel } from './security.config'
import type { SecurityRisk } from './security-center.data'

export interface SecurityRemediateConfirmData {
  finding: SecurityRisk
}

@Component({
  selector: 'app-security-remediate-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  template: `
    <article class="sec-rem">
      <header class="sec-rem__head">
        <mat-icon>healing</mat-icon>
        <h2>Confirmar remediación</h2>
      </header>
      <mat-dialog-content class="sec-rem__body">
        @if (phase() === 'confirm') {
          <dl class="sec-rem__grid">
            <div><dt>Hallazgo</dt><dd>{{ data.finding.finding }}</dd></div>
            <div><dt>Recurso</dt><dd class="mono">{{ data.finding.resource }}</dd></div>
            <div><dt>Acción</dt><dd>{{ data.finding.remediationAction ?? data.finding.recommendation }}</dd></div>
            <div><dt>Impacto</dt><dd>{{ data.finding.impact }}</dd></div>
            <div><dt>Severidad</dt><dd><span class="sec-sev" [attr.data-sev]="data.finding.severity">{{ severityLabel(data.finding.severity) }}</span></dd></div>
            <div><dt>Riesgo operativo</dt><dd>Bajo — acción reversible en modo demo</dd></div>
          </dl>
        } @else if (phase() === 'running') {
          <p class="sec-rem__status">Remediando…</p>
          <mat-progress-bar mode="indeterminate" />
        } @else if (phase() === 'success') {
          <p class="sec-rem__status sec-rem__status--ok"><mat-icon>check_circle</mat-icon> Remediado correctamente</p>
        } @else {
          <p class="sec-rem__status sec-rem__status--err"><mat-icon>error</mat-icon> Error al remediar — reintente más tarde</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        @if (phase() === 'confirm') {
          <button mat-stroked-button type="button" mat-dialog-close>Cancelar</button>
          <button mat-flat-button color="primary" type="button" (click)="handleConfirm()">Remediar</button>
        } @else if (phase() === 'success' || phase() === 'error') {
          <button mat-flat-button color="primary" type="button" (click)="dialogRef.close({ ok: phase() === 'success', id: data.finding.id })">Cerrar</button>
        }
      </mat-dialog-actions>
    </article>
  `,
  styles: `
    .sec-rem { min-width: min(480px, 92vw); color: #0f172a; }
    .sec-rem__head { display: flex; align-items: center; gap: 0.4rem; padding-bottom: 0.55rem; border-bottom: 1px solid #e2e8f0; }
    .sec-rem__head mat-icon { color: #ec4899; }
    .sec-rem__head h2 { margin: 0; font-size: 0.95rem; font-weight: 700; }
    .sec-rem__grid { display: grid; grid-template-columns: 1fr; gap: 0.45rem; margin: 0; }
    .sec-rem__grid dt { font-size: 0.58rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; }
    .sec-rem__grid dd { margin: 0.08rem 0 0; font-size: 0.75rem; }
    .sec-rem__status { display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; font-weight: 600; }
    .sec-rem__status--ok { color: #059669; }
    .sec-rem__status--err { color: #dc2626; }
    .sec-sev {
      display: inline-block; padding: 0.12rem 0.4rem; border-radius: 999px; font-size: 0.62rem; font-weight: 700;
      &[data-sev='critical'] { background: #fee2e2; color: #b91c1c; }
      &[data-sev='high'] { background: #ffedd5; color: #c2410c; }
      &[data-sev='medium'] { background: #fef3c7; color: #b45309; }
      &[data-sev='low'] { background: #ecfccb; color: #4d7c0f; }
      &[data-sev='info'] { background: #e0f2fe; color: #0369a1; }
    }
    .mono { font-family: ui-monospace, monospace; font-size: 0.68rem; }
  `,
})
export class SecurityRemediateConfirmDialogComponent {
  readonly data = inject<SecurityRemediateConfirmData>(MAT_DIALOG_DATA)
  readonly dialogRef = inject(MatDialogRef<SecurityRemediateConfirmDialogComponent>)
  private readonly svc = inject(SecurityCenterService)
  private readonly toast = inject(ToastService)

  readonly phase = signal<'confirm' | 'running' | 'success' | 'error'>('confirm')
  readonly severityLabel = securitySeverityLabel

  handleConfirm = (): void => {
    this.phase.set('running')
    this.svc.updateRisk(this.data.finding.id, { status: 'running' })
    setTimeout(() => {
      const fail = this.data.finding.id === 'risk-demo-fail'
      if (fail) {
        this.phase.set('error')
        this.svc.updateRisk(this.data.finding.id, { status: 'failed' })
        this.toast.error('Error al remediar el hallazgo')
        return
      }
      this.phase.set('success')
      this.svc.updateRisk(this.data.finding.id, { status: 'completed' })
      this.svc.appendHistory(this.data.finding.id, 'Remediado', 'admin@cloudops', 'Remediación automática completada')
      this.svc.refreshKpis()
      this.toast.success(`Remediado: ${this.data.finding.resource}`)
    }, 1800)
  }
}
