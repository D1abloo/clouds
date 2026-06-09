import { DatePipe, KeyValuePipe } from '@angular/common'
import { Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { ToastService } from '../../core/services/toast.service'
import {
  AUDIT_ACCENT,
  AUDIT_ACCENT_BORDER,
  AUDIT_ACCENT_LIGHT,
  auditActionLabel,
  auditModuleIcon,
  auditRiskLabel,
  auditUserInitials,
} from './audit.config'
import type { AuditActivityEntry } from './audit.data'

export interface AuditActivityDetailData {
  entry: AuditActivityEntry
}

@Component({
  selector: 'app-audit-activity-detail-dialog',
  standalone: true,
  imports: [DatePipe, KeyValuePipe, MatDialogModule, MatButtonModule, MatIconModule, StatusBadgeComponent],
  template: `
    <article class="adet">
      <header class="adet__head">
        <div class="adet__head-icon">
          <mat-icon>{{ moduleIcon(data.entry.module) }}</mat-icon>
        </div>
        <div class="adet__head-text">
          <span class="adet__label">Registro de actividad · {{ data.entry.id }}</span>
          <h2>{{ actionLabel(data.entry.action) }}</h2>
          <p>{{ data.entry.description }}</p>
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar"><mat-icon>close</mat-icon></button>
      </header>
      <mat-dialog-content class="adet__body">
        <div class="adet__badges">
          <span class="adet__chip">{{ data.entry.category }}</span>
          <span class="adet__chip">{{ data.entry.module }}</span>
          @if (data.entry.environment) {
            <span class="adet__env" [attr.data-env]="data.entry.environment">{{ data.entry.environment }}</span>
          }
          @if (data.entry.riskLevel) {
            <span class="adet__risk" [attr.data-risk]="data.entry.riskLevel">{{ riskLabel(data.entry.riskLevel) }}</span>
          }
          <app-status-badge [value]="data.entry.status" />
        </div>

        <div class="adet__summary">
          <article>
            <mat-icon>person</mat-icon>
            <div>
              <span>Actor</span>
              <strong>{{ data.entry.userId ?? '—' }}</strong>
              <small class="mono">{{ data.entry.ipAddress ?? '—' }}</small>
            </div>
          </article>
          <article>
            <mat-icon>schedule</mat-icon>
            <div>
              <span>Timestamp</span>
              <strong>{{ data.entry.createdAt | date: 'dd MMM yyyy, HH:mm:ss' }}</strong>
              @if (data.entry.duration && data.entry.duration !== '—') {
                <small>Duración: {{ data.entry.duration }}</small>
              }
            </div>
          </article>
          <article>
            <mat-icon>check_circle</mat-icon>
            <div>
              <span>Resultado</span>
              <strong>{{ data.entry.outcome ?? '—' }}</strong>
              @if (data.entry.requestMethod) { <small>{{ data.entry.requestMethod }}</small> }
            </div>
          </article>
        </div>

        <dl class="adet__grid">
          <div><dt>Recurso</dt><dd class="mono">{{ data.entry.resource }}</dd></div>
          @if (data.entry.correlationId) {
            <div class="adet__copy-row">
              <dt>Correlación</dt>
              <dd class="mono">{{ data.entry.correlationId }}
                <button type="button" class="adet__copy" (click)="handleCopy(data.entry.correlationId!)"><mat-icon>content_copy</mat-icon></button>
              </dd>
            </div>
          }
          @if (data.entry.sessionId) {
            <div><dt>Sesión</dt><dd class="mono">{{ data.entry.sessionId }}</dd></div>
          }
          @if (data.entry.userAgent) {
            <div class="adet__full"><dt>User-Agent</dt><dd class="mono">{{ data.entry.userAgent }}</dd></div>
          }
          @if (data.entry.relatedEvents) {
            <div><dt>Eventos relacionados</dt><dd>{{ data.entry.relatedEvents }}</dd></div>
          }
        </dl>

        @if (data.entry.tags?.length) {
          <section class="adet__block">
            <h3><mat-icon>label</mat-icon> Etiquetas</h3>
            <div class="adet__tags">
              @for (tag of data.entry.tags; track tag) { <span>{{ tag }}</span> }
            </div>
          </section>
        }

        @if (data.entry.metadata && (data.entry.metadata | keyvalue).length) {
          <section class="adet__block">
            <h3><mat-icon>data_object</mat-icon> Metadatos</h3>
            <dl class="adet__meta">
              @for (kv of data.entry.metadata | keyvalue; track kv.key) {
                <div><dt>{{ kv.key }}</dt><dd class="mono">{{ kv.value }}</dd></div>
              }
            </dl>
          </section>
        }

        @if (data.entry.changes?.length) {
          <section class="adet__block adet__block--changes">
            <h3><mat-icon>compare_arrows</mat-icon> Cambios detectados ({{ data.entry.changes!.length }})</h3>
            <table class="adet__changes">
              <thead><tr><th>Campo</th><th>Antes</th><th>Después</th></tr></thead>
              <tbody>
                @for (c of data.entry.changes; track c.field) {
                  <tr>
                    <td class="mono">{{ c.field }}</td>
                    <td class="adet__before">{{ c.before }}</td>
                    <td class="adet__after">{{ c.after }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </section>
        }

        <section class="adet__block adet__block--forensic">
          <h3><mat-icon>fingerprint</mat-icon> Integridad forense</h3>
          <p>Evento registrado de forma append-only. Hash SHA-256 calculado al ingest. No modificable post-escritura.</p>
        </section>
      </mat-dialog-content>
      <mat-dialog-actions align="start">
        @if (data.entry.correlationId) {
          <button mat-stroked-button type="button" (click)="handleCopy(data.entry.correlationId!)">
            <mat-icon>content_copy</mat-icon> Copiar correlación
          </button>
        }
        <button mat-stroked-button type="button" mat-dialog-close>Cerrar</button>
      </mat-dialog-actions>
    </article>
  `,
  styles: `
    .adet { width: 100%; color: #0f172a; display: flex; flex-direction: column; min-height: 0; }
    .adet__head { display: flex; gap: 0.75rem; align-items: flex-start; padding-bottom: 0.75rem; border-bottom: 1px solid #e2e8f0; }
    .adet__head-icon {
      width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: ${AUDIT_ACCENT}; color: #fff;
    }
    .adet__head-icon mat-icon { font-size: 1.2rem; width: 1.2rem; height: 1.2rem; }
    .adet__head-text { flex: 1; min-width: 0; }
    .adet__label { font-size: 0.58rem; font-weight: 750; text-transform: uppercase; color: #94a3b8; }
    .adet__head h2 { margin: 0.2rem 0 0; font-size: 1.05rem; font-weight: 700; }
    .adet__head p { margin: 0.25rem 0 0; font-size: 0.72rem; color: #64748b; line-height: 1.5; }
    .adet__body { padding-top: 0.75rem !important; display: flex; flex-direction: column; gap: 0.75rem; }
    .adet__badges { display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center; }
    .adet__chip { padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.62rem; font-weight: 700; background: ${AUDIT_ACCENT_LIGHT}; color: ${AUDIT_ACCENT}; border: 1px solid ${AUDIT_ACCENT_BORDER}; }
    .adet__env { padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.62rem; font-weight: 700; text-transform: uppercase;
      &[data-env='prod'] { background: #fee2e2; color: #b91c1c; }
      &[data-env='staging'] { background: #fef3c7; color: #b45309; }
      &[data-env='global'] { background: #e0e7ff; color: #4338ca; }
    }
    .adet__risk { padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.62rem; font-weight: 700;
      &[data-risk='low'] { background: #dcfce7; color: #15803d; }
      &[data-risk='medium'] { background: #fef3c7; color: #b45309; }
      &[data-risk='high'] { background: #fee2e2; color: #b91c1c; }
    }
    .adet__summary {
      display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.5rem;
    }
    .adet__summary article {
      display: flex; gap: 0.45rem; padding: 0.55rem 0.65rem; border-radius: 10px;
      border: 1px solid ${AUDIT_ACCENT_BORDER}; background: ${AUDIT_ACCENT_LIGHT};
    }
    .adet__summary mat-icon { color: ${AUDIT_ACCENT}; font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
    .adet__summary span { display: block; font-size: 0.55rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; }
    .adet__summary strong { display: block; font-size: 0.75rem; margin-top: 0.1rem; }
    .adet__summary small { display: block; font-size: 0.62rem; color: #64748b; margin-top: 0.1rem; }
    .adet__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem 1rem;
      dt { font-size: 0.58rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; }
      dd { margin: 0.1rem 0 0; font-size: 0.78rem; }
    }
    .adet__full { grid-column: 1 / -1; }
    .adet__copy { border: none; background: transparent; cursor: pointer; color: ${AUDIT_ACCENT}; vertical-align: middle; padding: 0; }
    .adet__copy mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; }
    .adet__block { padding: 0.65rem 0.75rem; border-radius: 10px; border: 1px solid ${AUDIT_ACCENT_BORDER}; background: ${AUDIT_ACCENT_LIGHT}; }
    .adet__block h3 { display: flex; align-items: center; gap: 0.35rem; margin: 0 0 0.4rem; font-size: 0.75rem; font-weight: 700; color: ${AUDIT_ACCENT}; }
    .adet__block h3 mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    .adet__tags { display: flex; flex-wrap: wrap; gap: 0.3rem; }
    .adet__tags span { padding: 0.12rem 0.45rem; border-radius: 999px; font-size: 0.62rem; font-weight: 600; background: #fff; border: 1px solid #e2e8f0; }
    .adet__meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.35rem 1rem; margin: 0; font-size: 0.72rem;
      dt { color: #94a3b8; } dd { margin: 0; font-weight: 600; }
    }
    .adet__changes { width: 100%; border-collapse: collapse; font-size: 0.72rem; }
    .adet__changes th { text-align: left; padding: 0.35rem 0.5rem; font-size: 0.58rem; text-transform: uppercase; color: #94a3b8; border-bottom: 1px solid ${AUDIT_ACCENT_BORDER}; }
    .adet__changes td { padding: 0.35rem 0.5rem; border-bottom: 1px solid #e2e8f0; }
    .adet__before { color: #b91c1c; text-decoration: line-through; opacity: 0.85; }
    .adet__after { color: #15803d; font-weight: 600; }
    .adet__block--forensic { border-color: #cbd5e1; background: #f8fafc; }
    .adet__block--forensic h3 { color: #475569; }
    .adet__block--forensic p { margin: 0; font-size: 0.68rem; color: #64748b; line-height: 1.5; }
    .mono { font-family: ui-monospace, monospace; font-size: 0.68rem; }
    @media (max-width: 700px) { .adet__summary { grid-template-columns: 1fr; } }
  `,
})
export class AuditActivityDetailDialogComponent {
  readonly data = inject<AuditActivityDetailData>(MAT_DIALOG_DATA)
  private readonly toast = inject(ToastService)

  actionLabel = auditActionLabel
  moduleIcon = auditModuleIcon
  riskLabel = auditRiskLabel
  userInitials = auditUserInitials

  handleCopy = (text: string): void => {
    navigator.clipboard?.writeText(text).then(() => this.toast.success('ID de correlación copiado'))
  }
}
