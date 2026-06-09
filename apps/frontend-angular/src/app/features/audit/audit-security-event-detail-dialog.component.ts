import { DatePipe } from '@angular/common'
import { Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { AUDIT_ACCENT, AUDIT_ACCENT_BORDER, AUDIT_ACCENT_LIGHT, auditSeverityLabel } from './audit.config'
import type { SecurityEvent } from './audit.data'

export interface AuditSecurityEventDetailData {
  event: SecurityEvent
}

@Component({
  selector: 'app-audit-security-event-detail-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule, StatusBadgeComponent],
  template: `
    <article class="sev">
      <header class="sev__head">
        <div>
          <span class="sev__label">Evento de seguridad</span>
          <h2>{{ data.event.event }}</h2>
          <p>{{ data.event.description }}</p>
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar"><mat-icon>close</mat-icon></button>
      </header>
      <mat-dialog-content class="sev__body">
        <div class="sev__badges">
          <span class="sev__src">{{ data.event.source }}</span>
          <span class="sev__sev" [attr.data-sev]="data.event.severity">{{ severityLabel(data.event.severity) }}</span>
          <app-status-badge [value]="data.event.status" />
        </div>
        <dl class="sev__grid">
          <div><dt>Usuario</dt><dd>{{ data.event.user }}</dd></div>
          <div><dt>IP origen</dt><dd class="mono">{{ data.event.ip }}</dd></div>
          <div><dt>Detectado</dt><dd>{{ data.event.at | date: 'dd MMM yyyy, HH:mm:ss' }}</dd></div>
          <div><dt>Correlación</dt><dd class="mono">{{ data.event.correlationId }}</dd></div>
        </dl>
        <section class="sev__block">
          <h3><mat-icon>description</mat-icon> Detalle técnico</h3>
          <pre>{{ data.event.details }}</pre>
        </section>
        <section class="sev__block">
          <h3><mat-icon>dns</mat-icon> Recursos afectados</h3>
          <ul>
            @for (r of data.event.affectedResources; track r) { <li class="mono">{{ r }}</li> }
          </ul>
        </section>
        <section class="sev__block sev__block--rec">
          <h3><mat-icon>lightbulb</mat-icon> Recomendación</h3>
          <p>{{ data.event.recommendation }}</p>
        </section>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-stroked-button type="button" mat-dialog-close>Cerrar</button>
      </mat-dialog-actions>
    </article>
  `,
  styles: `
    .sev { width: 100%; color: #0f172a; display: flex; flex-direction: column; min-height: 0; }
    .sev__head { display: flex; justify-content: space-between; gap: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid #e2e8f0; }
    .sev__label { font-size: 0.58rem; font-weight: 750; text-transform: uppercase; color: #94a3b8; }
    .sev__head h2 { margin: 0.2rem 0 0; font-size: 1.05rem; font-weight: 700; }
    .sev__head p { margin: 0.25rem 0 0; font-size: 0.72rem; color: #64748b; line-height: 1.5; max-width: 36rem; }
    .sev__body { padding-top: 0.75rem !important; display: flex; flex-direction: column; gap: 0.75rem; }
    .sev__badges { display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center; }
    .sev__src { padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.62rem; font-weight: 700; background: ${AUDIT_ACCENT}; color: #fff; }
    .sev__sev { padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.62rem; font-weight: 700;
      &[data-sev='critical'] { background: #fee2e2; color: #b91c1c; }
      &[data-sev='warning'] { background: #fef3c7; color: #b45309; }
      &[data-sev='info'] { background: ${AUDIT_ACCENT_LIGHT}; color: ${AUDIT_ACCENT}; border: 1px solid ${AUDIT_ACCENT_BORDER}; }
    }
    .sev__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem 1rem;
      dt { font-size: 0.58rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; }
      dd { margin: 0.1rem 0 0; font-size: 0.78rem; }
    }
    .sev__block { padding: 0.65rem 0.75rem; border-radius: 10px; border: 1px solid ${AUDIT_ACCENT_BORDER}; background: ${AUDIT_ACCENT_LIGHT}; }
    .sev__block h3 { display: flex; align-items: center; gap: 0.35rem; margin: 0 0 0.4rem; font-size: 0.75rem; font-weight: 700; color: ${AUDIT_ACCENT}; }
    .sev__block h3 mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    .sev__block pre { margin: 0; font-size: 0.68rem; font-family: ui-monospace, monospace; white-space: pre-wrap; color: #475569; line-height: 1.5; }
    .sev__block ul { margin: 0; padding-left: 1rem; font-size: 0.72rem; color: #475569; }
    .sev__block p { margin: 0; font-size: 0.72rem; color: #475569; line-height: 1.55; }
    .sev__block--rec { border-color: #fde68a; background: #fffbeb; }
    .sev__block--rec h3 { color: #b45309; }
    .mono { font-family: ui-monospace, monospace; font-size: 0.68rem; }
  `,
})
export class AuditSecurityEventDetailDialogComponent {
  readonly data = inject<AuditSecurityEventDetailData>(MAT_DIALOG_DATA)
  severityLabel = auditSeverityLabel
}
