import { DatePipe } from '@angular/common'
import { Component, input, output, signal } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import {
  APPROVAL_ACTION_LABELS,
  APPROVAL_CLOUD_LABELS,
  APPROVAL_ENV_LABELS,
  APPROVAL_RISK_LABELS,
  APPROVAL_SOURCE_LABELS,
  APPROVAL_SOURCE_LOGO,
  APPROVAL_STATUS_LABELS,
} from './approvals.config'
import type { ApprovalRequest, ApprovalStatus } from './approvals.data'

type DetailTab = 'resumen' | 'cadena' | 'payload' | 'actividad'

@Component({
  selector: 'app-approvals-detail-panel',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatIconModule, BrandLogoComponent],
  template: `
    @if (request(); as req) {
      <div class="apr-panel" [attr.data-status]="req.status" [attr.data-risk]="req.risk" [attr.data-cloud]="req.cloud">
        <header class="apr-panel__head">
          <div class="apr-panel__head-main">
            <div class="apr-panel__logos">
              <app-brand-logo [logo]="req.cloud" size="md" />
              <span class="apr-panel__source">
                <app-brand-logo [logo]="sourceLogo(req.source)" size="sm" />
              </span>
            </div>
            <div>
              <span class="apr-panel__eyebrow">{{ statusLabel(req.status) }} · {{ riskLabel(req.risk) }}</span>
              <h3>{{ req.approvedSubject }}</h3>
              <p class="mono">{{ req.id }} · {{ sourceLabel(req.source) }} · {{ req.sourceEntityId }}</p>
            </div>
          </div>
          @if (req.status === 'pending') {
            <div class="apr-panel__sla" [class.apr-panel__sla--breach]="slaBreached(req)">
              <mat-icon>{{ slaBreached(req) ? 'timer_off' : 'schedule' }}</mat-icon>
              <div>
                <strong>{{ slaBreached(req) ? 'SLA vencido' : 'SLA restante' }}</strong>
                <span>{{ slaLabel(req) }}</span>
              </div>
            </div>
          }
        </header>

        <nav class="apr-panel__tabs" role="tablist" aria-label="Secciones de la solicitud">
          @for (tab of tabs; track tab.id) {
            <button
              type="button"
              role="tab"
              class="apr-panel__tab"
              [class.apr-panel__tab--on]="activeTab() === tab.id"
              [attr.aria-selected]="activeTab() === tab.id"
              (click)="activeTab.set(tab.id)"
            >
              <mat-icon>{{ tab.icon }}</mat-icon>
              {{ tab.label }}
              @if (tab.id === 'actividad' && req.comments.length) {
                <span class="apr-panel__tab-count">{{ req.comments.length }}</span>
              }
            </button>
          }
        </nav>

        <div class="apr-panel__body">
          @switch (activeTab()) {
            @case ('resumen') {
              <section class="apr-panel__subject">
                <span class="apr-panel__subject-label">Se aprueba</span>
                <p class="apr-panel__subject-text">{{ req.approvedSubject }}</p>
                <span class="apr-panel__subject-effect">
                  <mat-icon>play_circle</mat-icon>
                  Al aprobar: {{ req.onApproveEffect }}
                </span>
              </section>

              <section class="apr-panel__requester">
                <mat-icon>person</mat-icon>
                <div>
                  <span>Solicitado por</span>
                  <strong>{{ req.requester }}</strong>
                  <span>{{ req.requesterTeam }} · {{ req.requestedAt | date: 'dd MMM yyyy, HH:mm' }}</span>
                </div>
              </section>

              <dl class="apr-panel__grid">
                <div><dt>Origen</dt><dd>{{ sourceLabel(req.source) }}</dd></div>
                <div><dt>Tipo</dt><dd>{{ actionLabel(req.actionType) }}</dd></div>
                <div><dt>Recurso</dt><dd>{{ req.resource }}</dd></div>
                <div><dt>Cloud</dt><dd>{{ cloudLabel(req.cloud) }}</dd></div>
                <div><dt>Entorno</dt><dd>{{ envLabel(req.environment) }}</dd></div>
                <div><dt>Solicitante</dt><dd>{{ req.requester }}</dd></div>
                <div><dt>Equipo</dt><dd>{{ req.requesterTeam }}</dd></div>
                <div><dt>Ticket</dt><dd class="mono">{{ req.changeTicket || '—' }}</dd></div>
                <div><dt>Solicitado</dt><dd>{{ req.requestedAt | date: 'dd MMM yyyy, HH:mm' }}</dd></div>
                <div><dt>Aprobadores</dt><dd>{{ req.approversCompleted }}/{{ req.approversRequired }}</dd></div>
              </dl>

              <section class="apr-panel__block">
                <h4><mat-icon>description</mat-icon> Justificación</h4>
                <p>{{ req.justification }}</p>
              </section>

              <section class="apr-panel__block apr-panel__impact">
                <h4><mat-icon>bolt</mat-icon> Impacto estimado</h4>
                <div class="apr-panel__impact-grid">
                  @if (req.impact.costDelta) {
                    <div>
                      <span>Coste</span>
                      <strong>{{ req.impact.costDelta }}</strong>
                    </div>
                  }
                  @if (req.impact.downtime) {
                    <div>
                      <span>Downtime</span>
                      <strong>{{ req.impact.downtime }}</strong>
                    </div>
                  }
                  <div class="apr-panel__impact-wide">
                    <span>Blast radius</span>
                    <strong>{{ req.impact.blastRadius }}</strong>
                  </div>
                </div>
                @if (req.impact.affectedServices.length) {
                  <ul class="apr-panel__services">
                    @for (svc of req.impact.affectedServices; track svc) {
                      <li><mat-icon>hub</mat-icon>{{ svc }}</li>
                    }
                  </ul>
                }
              </section>

              @if (req.tags.length) {
                <div class="apr-panel__tags">
                  @for (tag of req.tags; track tag) {
                    <span>{{ tag }}</span>
                  }
                </div>
              }

              @if (req.decidedAt) {
                <section class="apr-panel__decision" [attr.data-status]="req.status">
                  <mat-icon>{{ req.status === 'approved' ? 'check_circle' : 'cancel' }}</mat-icon>
                  <div>
                    <strong>{{ statusLabel(req.status) }} por {{ req.decidedBy }}</strong>
                    <span>{{ req.decidedAt | date: 'dd MMM yyyy, HH:mm' }}</span>
                    @if (req.decisionNote) {
                      <p>{{ req.decisionNote }}</p>
                    }
                  </div>
                </section>
              }
            }

            @case ('cadena') {
              <ol class="apr-panel__chain">
                @for (step of req.approvalChain; track step.user; let i = $index) {
                  <li [attr.data-status]="step.status">
                    <span class="apr-panel__chain-num">{{ i + 1 }}</span>
                    <div class="apr-panel__chain-body">
                      <strong>{{ step.role }}</strong>
                      <span class="mono">{{ step.user }}</span>
                      <span class="apr-panel__chain-status">{{ chainStatusLabel(step.status) }}</span>
                      @if (step.at) {
                        <time>{{ step.at | date: 'dd MMM, HH:mm' }}</time>
                      }
                    </div>
                    <mat-icon>{{ chainIcon(step.status) }}</mat-icon>
                  </li>
                }
              </ol>
              <p class="apr-panel__chain-hint">
                Se requieren {{ req.approversRequired }} aprobación(es) · {{ req.approversCompleted }} completada(s)
              </p>
            }

            @case ('payload') {
              @if (req.payload) {
                <div class="apr-panel__terminal">
                  <div class="apr-panel__terminal-bar">
                    <span></span><span></span><span></span>
                    <span class="mono">request.payload</span>
                  </div>
                  <pre class="mono">{{ req.payload }}</pre>
                </div>
              } @else {
                <p class="apr-panel__empty-inline">Sin payload adjunto para esta solicitud.</p>
              }
            }

            @case ('actividad') {
              @if (req.comments.length) {
                <ul class="apr-panel__comments">
                  @for (c of req.comments; track c.at + c.author) {
                    <li>
                      <header>
                        <strong>{{ c.author }}</strong>
                        <time>{{ c.at | date: 'dd MMM, HH:mm' }}</time>
                      </header>
                      <p>{{ c.text }}</p>
                    </li>
                  }
                </ul>
              } @else {
                <p class="apr-panel__empty-inline">Sin comentarios en esta solicitud.</p>
              }
            }
          }
        </div>

        @if (req.status === 'pending') {
          <footer class="apr-panel__actions">
            <button type="button" class="apr-btn apr-btn--ghost" (click)="delegate.emit(req)">
              <mat-icon>forward</mat-icon>
              Delegar
            </button>
            <button type="button" class="apr-btn apr-btn--danger" (click)="reject.emit(req)">
              <mat-icon>close</mat-icon>
              Rechazar
            </button>
            <button type="button" class="apr-btn apr-btn--primary" (click)="approve.emit(req)">
              <mat-icon>check</mat-icon>
              Aprobar esta acción
            </button>
          </footer>
        }
      </div>
    } @else {
      <div class="apr-panel apr-panel--empty">
        <mat-icon>task_alt</mat-icon>
        <h3>Inspector de aprobaciones</h3>
        <p>Selecciona una solicitud para ver impacto, cadena de aprobación, payload y actividad.</p>
      </div>
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; min-height: 0; height: 100%; }
    .apr-panel {
      display: flex;
      flex-direction: column;
      min-height: 0;
      height: 100%;
      background: #f8fafc;
      border-radius: 12px;
      overflow: hidden;
    }
    .apr-panel[data-cloud='aws'] { --apr-accent: #ff9900; }
    .apr-panel[data-cloud='gcp'] { --apr-accent: #4285f4; }
    .apr-panel[data-cloud='azure'] { --apr-accent: #0078d4; }
    .apr-panel[data-risk='critical'] { --apr-risk: #dc2626; }
    .apr-panel[data-risk='high'] { --apr-risk: #ea580c; }
    .apr-panel[data-risk='medium'] { --apr-risk: #d97706; }
    .apr-panel[data-risk='low'] { --apr-risk: #059669; }

    .apr-panel__head {
      flex-shrink: 0;
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.65rem;
      padding: 0.75rem 0.85rem;
      background: #f1f5f9;
    }
    .apr-panel__head-main { display: flex; gap: 0.65rem; min-width: 0; }
    .apr-panel__logos {
      position: relative;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 3.25rem;
      height: 3.25rem;
      border-radius: 11px;
      background: #f8fafc;
    }
    .apr-panel__source {
      position: absolute;
      right: -0.25rem;
      bottom: -0.25rem;
      display: flex;
      padding: 0.15rem;
      border-radius: 6px;
      background: #fff;
    }
    .apr-panel__eyebrow {
      display: inline-block;
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--apr-risk, #64748b);
      margin-bottom: 0.15rem;
    }
    .apr-panel__head h3 {
      margin: 0 0 0.2rem;
      font-size: 0.88rem;
      font-weight: 700;
      line-height: 1.35;
    }
    .apr-panel__head p {
      margin: 0;
      font-size: 0.62rem;
      color: #94a3b8;
    }
    .apr-panel__sla {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.4rem 0.55rem;
      border-radius: 9px;
      background: #ecfdf5;
      color: #059669;
      font-size: 0.65rem;
    }
    .apr-panel__sla--breach { background: #fef2f2; color: #dc2626; }
    .apr-panel__sla mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    .apr-panel__sla strong { display: block; font-size: 0.68rem; }
    .apr-panel__sla span { color: inherit; opacity: 0.85; }

    .apr-panel__tabs {
      flex-shrink: 0;
      display: flex;
      gap: 0.15rem;
      padding: 0.35rem 0.65rem;
      background: #f8fafc;
      overflow-x: auto;
      scrollbar-width: thin;
    }
    .apr-panel__tab {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.32rem 0.5rem;
      border: none;
      border-radius: 7px;
      background: transparent;
      font: inherit;
      font-size: 0.65rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      white-space: nowrap;
    }
    .apr-panel__tab mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; }
    .apr-panel__tab--on { background: #e2e8f0; color: #0f172a; }
    .apr-panel__tab-count {
      padding: 0.05rem 0.3rem;
      border-radius: 999px;
      background: var(--apr-accent, #64748b);
      color: #fff;
      font-size: 0.55rem;
    }

    .apr-panel__body {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 0.65rem 0.85rem;
      scrollbar-width: thin;
    }
    .apr-panel__subject {
      margin-bottom: 0.6rem;
      padding: 0.55rem 0.6rem;
      border-radius: 10px;
      background: #eff6ff;
    }
    .apr-panel__subject-label {
      display: block;
      font-size: 0.55rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #3b82f6;
      margin-bottom: 0.2rem;
    }
    .apr-panel__subject-text {
      margin: 0 0 0.35rem;
      font-size: 0.78rem;
      font-weight: 700;
      line-height: 1.4;
      color: #0f172a;
    }
    .apr-panel__subject-effect {
      display: flex;
      align-items: flex-start;
      gap: 0.28rem;
      font-size: 0.65rem;
      color: #475569;
      line-height: 1.45;
    }
    .apr-panel__subject-effect mat-icon {
      flex-shrink: 0;
      font-size: 0.85rem;
      width: 0.85rem;
      height: 0.85rem;
      color: #059669;
      margin-top: 0.05rem;
    }
    .apr-panel__requester {
      display: flex;
      gap: 0.45rem;
      align-items: flex-start;
      margin-bottom: 0.6rem;
      padding: 0.45rem 0.5rem;
      border-radius: 9px;
      background: #f1f5f9;
      font-size: 0.65rem;
    }
    .apr-panel__requester mat-icon {
      font-size: 0.95rem;
      width: 0.95rem;
      height: 0.95rem;
      color: #64748b;
    }
    .apr-panel__requester span { display: block; color: #94a3b8; font-size: 0.55rem; text-transform: uppercase; }
    .apr-panel__requester strong { display: block; color: #334155; font-size: 0.72rem; }
    .apr-panel__grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.35rem 0.65rem;
      margin: 0 0 0.65rem;
    }
    .apr-panel__grid dt {
      margin: 0;
      font-size: 0.52rem;
      font-weight: 650;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: #94a3b8;
    }
    .apr-panel__grid dd {
      margin: 0.05rem 0 0;
      font-size: 0.68rem;
      font-weight: 600;
      color: #334155;
      word-break: break-word;
    }
    .apr-panel__block {
      margin-bottom: 0.6rem;
      padding: 0.5rem 0.55rem;
      border-radius: 9px;
      background: #f1f5f9;
    }
    .apr-panel__block h4 {
      display: flex;
      align-items: center;
      gap: 0.28rem;
      margin: 0 0 0.35rem;
      font-size: 0.62rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
    }
    .apr-panel__block h4 mat-icon {
      font-size: 0.85rem;
      width: 0.85rem;
      height: 0.85rem;
      color: var(--apr-accent, #64748b);
    }
    .apr-panel__block p {
      margin: 0;
      font-size: 0.68rem;
      color: #475569;
      line-height: 1.5;
    }
    .apr-panel__impact-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.35rem;
      margin-bottom: 0.35rem;
    }
    .apr-panel__impact-grid span {
      display: block;
      font-size: 0.52rem;
      font-weight: 650;
      text-transform: uppercase;
      color: #94a3b8;
    }
    .apr-panel__impact-grid strong {
      display: block;
      font-size: 0.72rem;
      color: #0f172a;
    }
    .apr-panel__impact-wide { grid-column: 1 / -1; }
    .apr-panel__services {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .apr-panel__services li {
      display: flex;
      align-items: center;
      gap: 0.28rem;
      padding: 0.15rem 0;
      font-size: 0.65rem;
      color: #475569;
    }
    .apr-panel__services mat-icon {
      font-size: 0.8rem;
      width: 0.8rem;
      height: 0.8rem;
      color: #64748b;
    }
    .apr-panel__tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      margin-bottom: 0.5rem;
    }
    .apr-panel__tags span {
      padding: 0.12rem 0.38rem;
      border-radius: 999px;
      background: #f1f5f9;
      font-size: 0.58rem;
      font-weight: 600;
      color: #64748b;
    }
    .apr-panel__decision {
      display: flex;
      gap: 0.45rem;
      padding: 0.5rem 0.55rem;
      border-radius: 9px;
      font-size: 0.68rem;
    }
    .apr-panel__decision[data-status='approved'] { background: #ecfdf5; color: #059669; }
    .apr-panel__decision[data-status='rejected'] { background: #fef2f2; color: #dc2626; }
    .apr-panel__decision[data-status='expired'] { background: #f8fafc; color: #64748b; }
    .apr-panel__decision mat-icon { flex-shrink: 0; }
    .apr-panel__decision strong { display: block; color: inherit; }
    .apr-panel__decision span { font-size: 0.62rem; opacity: 0.85; }
    .apr-panel__decision p { margin: 0.25rem 0 0; color: #475569; }

    .apr-panel__chain {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .apr-panel__chain li {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 0.45rem;
      align-items: center;
      padding: 0.45rem 0;
    }
    .apr-panel__chain-num {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.35rem;
      height: 1.35rem;
      border-radius: 999px;
      background: #f1f5f9;
      font-size: 0.62rem;
      font-weight: 700;
      color: #64748b;
    }
    .apr-panel__chain-body strong { display: block; font-size: 0.7rem; }
    .apr-panel__chain-body span { display: block; font-size: 0.62rem; color: #64748b; }
    .apr-panel__chain-status {
      font-weight: 650 !important;
      text-transform: uppercase;
      font-size: 0.55rem !important;
    }
    .apr-panel__chain li[data-status='approved'] .apr-panel__chain-status { color: #059669; }
    .apr-panel__chain li[data-status='rejected'] .apr-panel__chain-status { color: #dc2626; }
    .apr-panel__chain li mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: #94a3b8; }
    .apr-panel__chain li[data-status='approved'] mat-icon { color: #059669; }
    .apr-panel__chain li[data-status='rejected'] mat-icon { color: #dc2626; }
    .apr-panel__chain-hint {
      margin: 0.5rem 0 0;
      font-size: 0.62rem;
      color: #94a3b8;
    }

    .apr-panel__terminal {
      border-radius: 10px;
      overflow: hidden;
    }
    .apr-panel__terminal-bar {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.35rem 0.5rem;
      background: #1e293b;
    }
    .apr-panel__terminal-bar span:nth-child(1),
    .apr-panel__terminal-bar span:nth-child(2),
    .apr-panel__terminal-bar span:nth-child(3) {
      width: 0.45rem;
      height: 0.45rem;
      border-radius: 999px;
      background: #64748b;
    }
    .apr-panel__terminal-bar span:nth-child(1) { background: #ef4444; }
    .apr-panel__terminal-bar span:nth-child(2) { background: #eab308; }
    .apr-panel__terminal-bar span:nth-child(3) { background: #22c55e; }
    .apr-panel__terminal-bar span:last-child {
      margin-left: auto;
      font-size: 0.58rem;
      color: #94a3b8;
    }
    .apr-panel__terminal pre {
      margin: 0;
      padding: 0.55rem 0.65rem;
      background: #0f172a;
      color: #e2e8f0;
      font-size: 0.65rem;
      line-height: 1.5;
      white-space: pre-wrap;
    }

    .apr-panel__comments {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .apr-panel__comments li {
      padding: 0.45rem 0;
    }
    .apr-panel__comments header {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.2rem;
    }
    .apr-panel__comments strong { font-size: 0.68rem; }
    .apr-panel__comments time { font-size: 0.6rem; color: #94a3b8; }
    .apr-panel__comments p {
      margin: 0;
      font-size: 0.68rem;
      color: #475569;
      line-height: 1.45;
    }
    .apr-panel__empty-inline {
      margin: 0;
      font-size: 0.68rem;
      color: #94a3b8;
    }

    .apr-panel__actions {
      flex-shrink: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      justify-content: flex-end;
      padding: 0.65rem 0.85rem;
      background: #f1f5f9;
    }
    .apr-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      width: fit-content;
      height: fit-content;
      min-height: unset;
      margin: 0;
      padding: 0.42rem 0.55rem;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: #fff;
      font: inherit;
      font-size: 0.76rem;
      font-weight: 600;
      line-height: 1.25;
      box-sizing: border-box;
      cursor: pointer;
    }
    .apr-btn mat-icon { display: block; margin: 0; font-size: 0.85rem; width: 0.85rem; height: 0.85rem; }
    .apr-btn--ghost { background: #f8fafc; color: #475569; border-color: #e2e8f0; }
    .apr-btn--ghost:hover { background: #f1f5f9; }
    .apr-btn--danger { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
    .apr-btn--danger:hover { background: #fee2e2; }
    .apr-btn--primary { background: #1e293b; border-color: #0f172a; color: #fff; }
    .apr-btn--primary:hover { background: #0f172a; }

    .apr-panel--empty {
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 2rem 1.25rem;
      color: #64748b;
    }
    .apr-panel--empty mat-icon {
      font-size: 2rem;
      width: 2rem;
      height: 2rem;
      color: #cbd5e1;
      margin-bottom: 0.5rem;
    }
    .apr-panel--empty h3 {
      margin: 0 0 0.35rem;
      font-size: 0.85rem;
      color: #334155;
    }
    .apr-panel--empty p {
      margin: 0;
      font-size: 0.68rem;
      max-width: 16rem;
      line-height: 1.5;
    }
    .mono { font-family: var(--app-font-mono, ui-monospace, monospace); }
  `,
})
export class ApprovalsDetailPanelComponent {
  readonly request = input<ApprovalRequest | null>(null)
  readonly approve = output<ApprovalRequest>()
  readonly reject = output<ApprovalRequest>()
  readonly delegate = output<ApprovalRequest>()

  readonly activeTab = signal<DetailTab>('resumen')

  readonly tabs = [
    { id: 'resumen' as const, label: 'Resumen', icon: 'dashboard' },
    { id: 'cadena' as const, label: 'Cadena', icon: 'groups' },
    { id: 'payload' as const, label: 'Payload', icon: 'code' },
    { id: 'actividad' as const, label: 'Actividad', icon: 'forum' },
  ]

  sourceLabel = (s: ApprovalRequest['source']): string => APPROVAL_SOURCE_LABELS[s]
  sourceLogo = (s: ApprovalRequest['source']) => APPROVAL_SOURCE_LOGO[s]
  actionLabel = (a: ApprovalRequest['actionType']): string => APPROVAL_ACTION_LABELS[a]
  cloudLabel = (c: ApprovalRequest['cloud']): string => APPROVAL_CLOUD_LABELS[c]
  envLabel = (e: ApprovalRequest['environment']): string => APPROVAL_ENV_LABELS[e]
  riskLabel = (r: ApprovalRequest['risk']): string => APPROVAL_RISK_LABELS[r]
  statusLabel = (s: ApprovalStatus): string => APPROVAL_STATUS_LABELS[s]

  chainStatusLabel = (s: ApprovalRequest['approvalChain'][0]['status']): string => {
    const map = { pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado', skipped: 'Omitido' }
    return map[s]
  }

  chainIcon = (s: ApprovalRequest['approvalChain'][0]['status']): string => {
    const map = { pending: 'hourglass_empty', approved: 'check_circle', rejected: 'cancel', skipped: 'remove_circle_outline' }
    return map[s]
  }

  slaBreached = (req: ApprovalRequest): boolean => new Date(req.slaDeadline).getTime() < Date.now()

  slaLabel = (req: ApprovalRequest): string => {
    const diffMs = new Date(req.slaDeadline).getTime() - Date.now()
    if (diffMs <= 0) {
      const over = Math.abs(diffMs)
      const mins = Math.round(over / 60_000)
      return `Vencido hace ${mins} min`
    }
    const mins = Math.round(diffMs / 60_000)
    if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m restantes`
    return `${mins} min restantes`
  }
}
