import { DatePipe } from '@angular/common'
import { Component, input, output } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { NavIconComponent } from '../../shared/components/nav-icon/nav-icon.component'
import {
  CHANGE_RISK_LABELS,
  CHANGE_STATUS_LABELS,
  CHANGE_TYPE_LABELS,
  canApproveChange,
  canCancelChange,
  canExecuteChange,
  isChangeProcessable,
} from './change-management.config'
import type { ChangeRequest, ChangeStatus } from './change-management.demo'
import { changeLogos } from './change-management-logo.util'

@Component({
  selector: 'app-change-management-detail-panel',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatIconModule, NavIconComponent],
  template: `
    @if (change(); as chg) {
      <article class="chg-doc" [attr.data-status]="chg.status" [attr.data-risk]="chg.risk">
        <header class="chg-doc__head">
          <div class="chg-doc__head-main">
            @if (logosFor(chg).length) {
              <div class="chg-doc__logos" aria-label="Plataformas afectadas">
                @for (logo of logosFor(chg); track logo) {
                  <app-nav-icon [logo]="logo" size="md" />
                }
              </div>
            }
            <span class="chg-doc__eyebrow">
              RFC · {{ typeLabel(chg.type) }} · {{ statusLabel(chg.status) }}
            </span>
            <h3>{{ chg.title }}</h3>
            <p class="mono">{{ chg.id }} · {{ chg.service }} · {{ riskLabel(chg.risk) }}</p>
          </div>
          <dl class="chg-doc__meta">
            <div>
              <dt>Solicitante</dt>
              <dd>{{ chg.requester }}</dd>
            </div>
            <div>
              <dt>Equipo</dt>
              <dd>{{ chg.requesterTeam }}</dd>
            </div>
            <div>
              <dt>Ventana</dt>
              <dd>{{ chg.windowStart | date: 'dd MMM HH:mm' }} – {{ chg.windowEnd | date: 'HH:mm' }}</dd>
            </div>
            <div>
              <dt>Creado</dt>
              <dd>{{ chg.createdAt | date: 'dd MMM yyyy, HH:mm' }}</dd>
            </div>
          </dl>
        </header>

        @if (!isProcessable(chg)) {
          <div class="chg-doc__notice" [attr.data-status]="chg.status">
            <mat-icon>info</mat-icon>
            <div>
              <strong>{{ statusLabel(chg.status) }} — no procesable</strong>
              <p>Este RFC no admite aprobación, ejecución ni nuevas acciones operativas.</p>
            </div>
          </div>
        }

        <section class="chg-doc__section">
          <h4>Descripción</h4>
          <p>{{ chg.description }}</p>
        </section>

        <section class="chg-doc__section">
          <h4>Alcance</h4>
          <p>{{ chg.scope }}</p>
        </section>

        <section class="chg-doc__section">
          <h4>Plan de implementación</h4>
          <pre class="chg-doc__pre">{{ chg.implementationPlan }}</pre>
        </section>

        <section class="chg-doc__section">
          <h4>Plan de rollback</h4>
          <pre class="chg-doc__pre">{{ chg.rollbackPlan }}</pre>
        </section>

        <section class="chg-doc__section">
          <h4>Criterios de éxito</h4>
          <p>{{ chg.successCriteria }}</p>
        </section>

        <section class="chg-doc__section">
          <h4>Aprobaciones requeridas</h4>
          <ol class="chg-doc__approvals">
            @for (ap of chg.approvals; track ap.user) {
              <li [attr.data-status]="ap.status">
                <div>
                  <strong>{{ ap.role }}</strong>
                  <span class="mono">{{ ap.user }}</span>
                  <span class="chg-doc__ap-status">{{ approvalStatusLabel(ap.status) }}</span>
                  @if (ap.at) {
                    <time>{{ ap.at | date: 'dd MMM, HH:mm' }}</time>
                  }
                </div>
                <mat-icon>{{ approvalIcon(ap.status) }}</mat-icon>
              </li>
            }
          </ol>
        </section>

        @if (chg.affectedResources.length) {
          <section class="chg-doc__section">
            <h4>Recursos afectados</h4>
            <ul class="chg-doc__resources">
              @for (res of chg.affectedResources; track res.id) {
                <li>
                  <app-nav-icon [logo]="res.cloud" size="sm" />
                  <div>
                    <strong>{{ res.name }}</strong>
                    <span>{{ res.type }}</span>
                  </div>
                </li>
              }
            </ul>
          </section>
        }

        <section class="chg-doc__section">
          <h4>Timeline de estados</h4>
          <ol class="chg-doc__timeline">
            @for (entry of chg.timeline; track entry.at ?? entry.label) {
              <li>
                <span class="chg-doc__tl-dot"></span>
                <div>
                  <strong>{{ entry.label }}</strong>
                  @if (entry.user) {
                    <span>{{ entry.user }}</span>
                  }
                  @if (entry.at) {
                    <time>{{ entry.at | date: 'dd MMM yyyy, HH:mm' }}</time>
                  }
                  @if (entry.note) {
                    <p>{{ entry.note }}</p>
                  }
                </div>
              </li>
            }
          </ol>
        </section>

        @if (chg.tags.length) {
          <div class="chg-doc__tags">
            @for (tag of chg.tags; track tag) {
              <span>{{ tag }}</span>
            }
          </div>
        }

        @if (!hideActions()) {
          <footer class="chg-doc__actions">
            @if (canApprove(chg)) {
              <button type="button" class="chg-doc__btn chg-doc__btn--primary" (click)="approve.emit(chg)">
                <mat-icon>check</mat-icon>
                Aprobar
              </button>
              <button type="button" class="chg-doc__btn" (click)="reject.emit(chg)">
                <mat-icon>close</mat-icon>
                Rechazar
              </button>
            }
            @if (canExecute(chg)) {
              <button type="button" class="chg-doc__btn chg-doc__btn--primary" (click)="execute.emit(chg)">
                <mat-icon>play_arrow</mat-icon>
                Ejecutar
              </button>
            }
            @if (canCancel(chg)) {
              <button type="button" class="chg-doc__btn chg-doc__btn--danger" (click)="cancelChange.emit(chg)">
                <mat-icon>block</mat-icon>
                Cancelar RFC
              </button>
            }
          </footer>
        }
      </article>
    } @else {
      <div class="chg-doc__empty">
        <mat-icon>description</mat-icon>
        <p>Selecciona un cambio para ver el RFC completo.</p>
      </div>
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; min-height: 0; flex: 1; }
    :host-context(.chg-rfc-dialog__body) {
      min-height: 0;
      flex: 1 1 auto;
    }
    .chg-doc {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      scrollbar-width: thin;
      padding: 0.85rem 1rem 1rem;
      background: #fff;
      color: #0f172a;
      font-size: 0.75rem;
      line-height: 1.55;
    }
    :host-context(.chg-rfc-dialog__body) .chg-doc {
      padding: 0.75rem 0 0;
      overflow: visible;
      max-height: none;
    }
    .chg-doc__head-main {
      margin-bottom: 0.35rem;
    }
    .chg-doc__logos {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.35rem;
      margin-bottom: 0.45rem;
    }
    .chg-doc__head {
      padding-bottom: 0.75rem;
      margin-bottom: 0.75rem;
      border-bottom: 1px solid #e2e8f0;
    }
    .chg-doc__notice {
      display: flex;
      align-items: flex-start;
      gap: 0.45rem;
      padding: 0.55rem 0.65rem;
      margin-bottom: 0.75rem;
      border-radius: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }
    .chg-doc__notice mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: #64748b;
      margin-top: 0.1rem;
    }
    .chg-doc__notice strong {
      display: block;
      font-size: 0.68rem;
      font-weight: 700;
      color: #334155;
    }
    .chg-doc__notice p {
      margin: 0.15rem 0 0;
      font-size: 0.62rem;
      color: #64748b;
      line-height: 1.4;
    }
    .chg-doc__notice[data-status='cancelled'],
    .chg-doc__notice[data-status='rejected'] {
      background: #f8fafc;
      border-color: #cbd5e1;
    }
    .chg-doc__notice[data-status='failed'] {
      background: #fef2f2;
      border-color: #fecaca;
    }
    .chg-doc__notice[data-status='completed'] {
      background: #f0fdf4;
      border-color: #bbf7d0;
    }
    .chg-doc__eyebrow {
      display: block;
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
      margin-bottom: 0.25rem;
    }
    .chg-doc__head h3 {
      margin: 0 0 0.3rem;
      font-size: 0.95rem;
      font-weight: 700;
      line-height: 1.35;
    }
    .chg-doc__head .mono {
      margin: 0;
      font-size: 0.65rem;
      color: #64748b;
    }
    .chg-doc__meta {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.4rem 0.75rem;
      margin: 0.65rem 0 0;
    }
    .chg-doc__meta dt {
      font-size: 0.52rem;
      font-weight: 650;
      text-transform: uppercase;
      color: #94a3b8;
    }
    .chg-doc__meta dd {
      margin: 0.05rem 0 0;
      font-size: 0.68rem;
      color: #334155;
    }
    .chg-doc__section {
      margin-bottom: 0.85rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid #f1f5f9;
    }
    .chg-doc__section h4 {
      margin: 0 0 0.35rem;
      font-size: 0.62rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
    }
    .chg-doc__section p {
      margin: 0;
      color: #334155;
      white-space: pre-wrap;
    }
    .chg-doc__pre {
      margin: 0;
      padding: 0.55rem 0.65rem;
      border-radius: 6px;
      background: #f8fafc;
      font-family: var(--app-font-mono, ui-monospace, monospace);
      font-size: 0.65rem;
      color: #334155;
      white-space: pre-wrap;
    }
    .chg-doc__approvals {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .chg-doc__approvals li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.45rem 0.55rem;
      border-radius: 8px;
      background: #f8fafc;
    }
    .chg-doc__approvals strong { display: block; font-size: 0.7rem; }
    .chg-doc__approvals .mono { display: block; font-size: 0.62rem; color: #64748b; }
    .chg-doc__ap-status {
      display: block;
      font-size: 0.58rem;
      font-weight: 650;
      text-transform: uppercase;
      color: #64748b;
    }
    .chg-doc__approvals li[data-status='approved'] .chg-doc__ap-status { color: #059669; }
    .chg-doc__approvals li[data-status='rejected'] .chg-doc__ap-status { color: #dc2626; }
    .chg-doc__approvals mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: #94a3b8; }
    .chg-doc__approvals li[data-status='approved'] mat-icon { color: #059669; }
    .chg-doc__approvals li[data-status='rejected'] mat-icon { color: #dc2626; }
    .chg-doc__approvals time { display: block; font-size: 0.58rem; color: #94a3b8; }
    .chg-doc__resources {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .chg-doc__resources li {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.4rem 0.5rem;
      border-radius: 8px;
      background: #f8fafc;
    }
    .chg-doc__resources strong { display: block; font-size: 0.7rem; }
    .chg-doc__resources span { font-size: 0.62rem; color: #64748b; }
    .chg-doc__timeline {
      list-style: none;
      margin: 0;
      padding: 0 0 0 0.5rem;
      border-left: 2px solid #e2e8f0;
    }
    .chg-doc__timeline li {
      position: relative;
      padding: 0 0 0.65rem 0.85rem;
    }
    .chg-doc__tl-dot {
      position: absolute;
      left: -0.55rem;
      top: 0.25rem;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #64748b;
      border: 2px solid #fff;
    }
    .chg-doc__timeline strong { display: block; font-size: 0.7rem; }
    .chg-doc__timeline span,
    .chg-doc__timeline time { display: block; font-size: 0.62rem; color: #64748b; }
    .chg-doc__timeline p { margin: 0.2rem 0 0; font-size: 0.65rem; color: #475569; }
    .chg-doc__tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      margin-bottom: 0.65rem;
    }
    .chg-doc__tags span {
      padding: 0.12rem 0.4rem;
      border-radius: 999px;
      background: #f1f5f9;
      font-size: 0.58rem;
      font-weight: 600;
      color: #64748b;
    }
    .chg-doc__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      padding-top: 0.5rem;
      border-top: 1px solid #e2e8f0;
      position: sticky;
      bottom: 0;
      background: #fff;
    }
    .chg-doc__btn {
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
    .chg-doc__btn mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; }
    .chg-doc__btn--primary { background: #1e293b; color: #fff; }
    .chg-doc__btn--danger { background: #fef2f2; color: #b91c1c; }
    .chg-doc__empty {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      padding: 2rem;
      color: #94a3b8;
      text-align: center;
    }
    .chg-doc__empty mat-icon { font-size: 2rem; width: 2rem; height: 2rem; }
    .mono { font-family: var(--app-font-mono, ui-monospace, monospace); }
  `,
})
export class ChangeManagementDetailPanelComponent {
  readonly change = input<ChangeRequest | null>(null)
  readonly hideActions = input(false)
  readonly cancelChange = output<ChangeRequest>()
  readonly approve = output<ChangeRequest>()
  readonly reject = output<ChangeRequest>()
  readonly execute = output<ChangeRequest>()

  isProcessable = (chg: ChangeRequest): boolean => isChangeProcessable(chg.status)

  logosFor = (chg: ChangeRequest) => changeLogos(chg)

  typeLabel = (t: ChangeRequest['type']): string => CHANGE_TYPE_LABELS[t]
  statusLabel = (s: ChangeStatus): string => CHANGE_STATUS_LABELS[s]
  riskLabel = (r: ChangeRequest['risk']): string => CHANGE_RISK_LABELS[r]

  approvalStatusLabel = (s: ChangeRequest['approvals'][0]['status']): string => {
    const map = { pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado', skipped: 'Omitido' }
    return map[s]
  }

  approvalIcon = (s: ChangeRequest['approvals'][0]['status']): string => {
    const map = { pending: 'hourglass_empty', approved: 'check_circle', rejected: 'cancel', skipped: 'skip_next' }
    return map[s]
  }

  canApprove = canApproveChange
  canExecute = canExecuteChange
  canCancel = canCancelChange
}
