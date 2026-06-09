import { DatePipe } from '@angular/common'
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { debounceTime, startWith } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { MatDialog } from '@angular/material/dialog'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { ToastService } from '../../core/services/toast.service'
import {
  SECURITY_PROVIDERS,
  SECURITY_SEVERITY_OPTIONS,
  SECURITY_ACTION_BTN,
  SECURITY_ACTION_BTN_ICON,
  SECURITY_ACTION_BTN_PRIMARY,
  SECURITY_ACTION_BTN_SM,
  securitySeverityLabel,
  securityStatusLabel,
  downloadBlob,
} from './security.config'
import type {
  ExposedService,
  FirewallRule,
  OpenPort,
  SecretExposure,
  SecurityRecommendation,
  SecurityRisk,
  SshKeyRecord,
} from './security-center.data'
import type { SecurityScanReport } from './security-scan-report.util'
import { SecurityCenterService } from './security-center.service'
import { SecurityFindingDetailDialogComponent } from './security-finding-detail-dialog.component'
import { SecurityScanDialogComponent } from './security-scan-dialog.component'
import { SecurityScanReportDialogComponent } from './security-scan-report-dialog.component'
import { SecurityExportDialogComponent } from './security-export-dialog.component'
import { SecurityBulkRemediateDialogComponent } from './security-bulk-remediate-dialog.component'
import { SecurityRemediateConfirmDialogComponent } from './security-remediate-confirm-dialog.component'
import { SecurityEvidenceDialogComponent } from './security-evidence-dialog.component'
import { SecurityResourceInspectDialogComponent } from './security-resource-inspect-dialog.component'
import { ProConfigGateComponent } from '../../shared/components/pro-config-gate/pro-config-gate.component'

type SecTab = 'risks' | 'ports' | 'services' | 'firewalls' | 'ssh' | 'secrets' | 'recommendations'
type SortDir = 'asc' | 'desc'
type RiskSortKey = 'finding' | 'resource' | 'provider' | 'severity' | 'status' | 'detectedAt'

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }
const PAGE_SIZE = 8

@Component({
  selector: 'app-security-center-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    StatusBadgeComponent,
    ProConfigGateComponent,
  ],
  host: { class: 'sec-host' },
  template: `
    <app-pro-config-gate module="Centro de seguridad">
    <div class="page-container sec-shell animate-fade-in">
      <!-- Hero: puntuación + desglose + acciones -->
      <header class="sec-hero">
        <div class="sec-hero__score" [attr.data-tone]="scoreTone()">
          <div class="sec-hero__ring" aria-hidden="true">
            <svg viewBox="0 0 36 36">
              <path class="sec-hero__ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path class="sec-hero__ring-fill" [attr.stroke-dasharray]="scoreRing() + ', 100'" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <strong>{{ riskScore() }}</strong>
          </div>
          <div class="sec-hero__score-text">
            <span>Puntuación de riesgo</span>
            <em>{{ scoreLabel() }}</em>
            @if (svc.lastScanAt(); as scan) {
              <small>Último escaneo: {{ scan | date: 'dd MMM, HH:mm' }}</small>
              @if (svc.latestScanReport(); as report) {
                <button type="button" class="sec-hero__report-link" (click)="openSavedScanReport(report)">
                  Ver informe guardado
                </button>
              }
            } @else {
              <small>Sin escaneo reciente</small>
            }
          </div>
        </div>

        <div class="sec-hero__breakdown">
          @for (b of severityBreakdown(); track b.key) {
            <button
              type="button"
              class="sec-hero__chip"
              [class.sec-hero__chip--on]="severityControl.value === b.key"
              [attr.data-sev]="b.key"
              (click)="toggleSeverityChip(b.key)"
            >
              <strong>{{ b.count }}</strong>
              <span>{{ b.label }}</span>
            </button>
          }
        </div>

        <div class="sec-hero__actions">
          <button type="button" class="sec-act sec-act--primary" [disabled]="svc.scanning()" (click)="handleScan()">
            <mat-icon>radar</mat-icon>
            <span>{{ svc.scanning() ? 'Escaneando…' : 'Ejecutar escaneo' }}</span>
          </button>
          <button type="button" class="sec-act" (click)="handleExport()">
            <mat-icon>download</mat-icon>
            <span>Exportar informe</span>
          </button>
          <button type="button" class="sec-act" (click)="handleRemediateAll()">
            <mat-icon>healing</mat-icon>
            <span>Remediar</span>
          </button>
        </div>
      </header>

      <nav class="sec-tabs" role="tablist" aria-label="Áreas de postura">
        @for (tab of tabsWithCounts(); track tab.id) {
          <button
            type="button"
            role="tab"
            class="sec-tabs__item"
            [class.sec-tabs__item--on]="view() === tab.id"
            [attr.aria-selected]="view() === tab.id"
            (click)="handleTabChange(tab.id)"
          >
            <mat-icon>{{ tab.icon }}</mat-icon>
            <span>{{ tab.label }}</span>
            <em>{{ tab.count }}</em>
          </button>
        }
      </nav>

      <section class="sec-panel">
          <div class="sec-toolbar">
            <label class="sec-toolbar__search">
              <mat-icon>search</mat-icon>
              <input type="search" [formControl]="searchControl" [placeholder]="searchPlaceholder()" aria-label="Buscar" />
            </label>
            @if (view() === 'risks') {
              <div class="sec-toolbar__filters">
                <select class="sec-toolbar__select sec-toolbar__select--md" [formControl]="severityControl" aria-label="Severidad">
                  <option value="">Todas las severidades</option>
                  @for (s of severityOptions; track s) {
                    <option [value]="s">{{ severityLabel(s) }}</option>
                  }
                </select>
                <select class="sec-toolbar__select sec-toolbar__select--sm" [formControl]="providerControl" aria-label="Proveedor">
                  <option value="">Proveedor</option>
                  @for (p of providers; track p) { <option [value]="p">{{ p }}</option> }
                </select>
                <select class="sec-toolbar__select sec-toolbar__select--sm" [formControl]="statusControl" aria-label="Estado">
                  <option value="">Estado</option>
                  @for (st of statusOptions; track st.value) {
                    <option [value]="st.value">{{ st.label }}</option>
                  }
                </select>
                <select class="sec-toolbar__select sec-toolbar__select--sm" [formControl]="categoryControl" aria-label="Categoría">
                  <option value="">Categoría</option>
                  @for (c of categoryOptions(); track c) { <option [value]="c">{{ c }}</option> }
                </select>
              </div>
            }
            <span class="sec-toolbar__result">{{ resultLabel() }}</span>
          </div>

          <div class="sec-content">
            @switch (view()) {
              @case ('risks') {
                @if (filteredRisks().length === 0) {
                  <div class="sec-content__empty">
                    <mat-icon>verified_user</mat-icon>
                    <p>Sin hallazgos con los filtros actuales.</p>
                  </div>
                } @else {
                  <ul class="sec-findings" aria-label="Lista de hallazgos">
                    @for (row of pagedRisks(); track row.id) {
                      <li>
                        <button
                          type="button"
                          class="sec-finding"
                          [class.sec-finding--selected]="selectedId() === row.id"
                          (click)="openRiskDetail(row)"
                          (keydown.enter)="openRiskDetail(row)"
                        >
                          <span class="sec-finding__sev" [attr.data-sev]="row.severity" aria-hidden="true"></span>
                          <div class="sec-finding__main">
                            <strong>{{ row.finding }}</strong>
                            <span class="sec-finding__meta">
                              <span class="mono">{{ row.resource }}</span>
                              · {{ row.provider }} · {{ row.region }}
                            </span>
                            <span class="sec-finding__rec">{{ row.recommendation }}</span>
                          </div>
                          <div class="sec-finding__side">
                            <span class="sec-sev" [attr.data-sev]="row.severity">{{ severityLabel(row.severity) }}</span>
                            <span class="sec-st" [attr.data-st]="row.status">{{ statusLabel(row.status) }}</span>
                            <time>{{ row.detectedAt | date: 'dd MMM HH:mm' }}</time>
                          </div>
                          <span
                            class="sec-finding__menu"
                            (click)="$event.stopPropagation()"
                          >
                            <button
                              type="button"
                              class="sec-finding__menu-btn"
                              (click)="selectedRisk.set(row)"
                              [matMenuTriggerFor]="riskMenu"
                              aria-label="Acciones del hallazgo"
                            >
                              <mat-icon>more_vert</mat-icon>
                            </button>
                          </span>
                        </button>
                      </li>
                    }
                  </ul>
                  @if (filteredRisks().length > PAGE_SIZE) {
                    <footer class="sec-pager">
                      <button type="button" class="sec-act sec-act--compact" [disabled]="page() <= 1" (click)="page.set(page() - 1)">Anterior</button>
                      <span>{{ page() }} / {{ totalPages() }} · {{ filteredRisks().length }} hallazgos</span>
                      <button type="button" class="sec-act sec-act--compact" [disabled]="page() >= totalPages()" (click)="page.set(page() + 1)">Siguiente</button>
                    </footer>
                  }
                }
              }
              @case ('ports') {
                <div class="sec-table-scroll">
                  <table class="sec-table sec-table--ports" aria-label="Puertos abiertos">
                    <thead><tr><th>Host</th><th>Puerto</th><th>Riesgo</th><th></th></tr></thead>
                    <tbody>
                      @for (row of filteredPorts(); track row.id) {
                        <tr>
                          <td class="mono">{{ row.host }}</td>
                          <td>{{ row.port }}</td>
                          <td><span class="sec-sev" [attr.data-sev]="row.risk">{{ severityLabel(row.risk) }}</span></td>
                          <td><button type="button" class="sec-act sec-act--compact" (click)="handleRemediatePort(row)">Cerrar</button></td>
                        </tr>
                      } @empty { <tr><td colspan="4" class="sec-content__empty-cell">Sin puertos.</td></tr> }
                    </tbody>
                  </table>
                </div>
              }
              @case ('services') {
                <div class="sec-table-scroll">
                  <table class="sec-table sec-table--services" aria-label="Servicios expuestos">
                    <thead><tr><th>Servicio</th><th>Endpoint</th><th>Proveedor</th><th>Auth</th><th>Exposición</th><th>Estado</th><th></th></tr></thead>
                    <tbody>
                      @for (row of filteredServices(); track row.id) {
                        <tr>
                          <td>{{ row.name }}</td><td class="mono">{{ row.endpoint }}</td><td>{{ row.provider }}</td>
                          <td>{{ row.auth }}</td><td>{{ row.exposure }}</td>
                          <td><app-status-badge [value]="row.status" /></td>
                          <td><button type="button" class="sec-act sec-act--compact" (click)="handleReviewService(row)">Revisar</button></td>
                        </tr>
                      } @empty { <tr><td colspan="7" class="sec-content__empty-cell">Sin servicios.</td></tr> }
                    </tbody>
                  </table>
                </div>
              }
              @case ('firewalls') {
                <div class="sec-table-scroll">
                  <table class="sec-table" aria-label="Firewalls">
                    <thead><tr><th>Nombre</th><th>Proveedor</th><th>Recurso</th><th>Reglas</th><th>Puertos</th><th>Egress</th><th>Estado</th><th></th></tr></thead>
                    <tbody>
                      @for (row of filteredFirewalls(); track row.id) {
                        <tr>
                          <td class="mono">{{ row.name }}</td><td>{{ row.provider }}</td><td>{{ row.resource }}</td>
                          <td>{{ row.rules }}</td><td>{{ row.openPorts }}</td>
                          <td>{{ row.egressRestricted ? 'Restringido' : 'Permisivo' }}</td>
                          <td><app-status-badge [value]="row.status" /></td>
                          <td><button type="button" class="sec-act sec-act--compact" (click)="handleAuditFirewall(row)">Auditar</button></td>
                        </tr>
                      } @empty { <tr><td colspan="8" class="sec-content__empty-cell">Sin firewalls.</td></tr> }
                    </tbody>
                  </table>
                </div>
              }
              @case ('ssh') {
                <div class="sec-table-scroll">
                  <table class="sec-table" aria-label="Claves SSH">
                    <thead><tr><th>Clave</th><th>Huella</th><th>Host</th><th>Propietario</th><th>Antigüedad</th><th>Último uso</th><th>Estado</th><th></th></tr></thead>
                    <tbody>
                      @for (row of filteredSshKeys(); track row.id) {
                        <tr>
                          <td>{{ row.name }}</td><td class="mono">{{ row.fingerprint }}</td><td>{{ row.host }}</td>
                          <td>{{ row.owner }}</td><td>{{ row.ageDays }} d</td>
                          <td>{{ row.lastUsed | date: 'dd MMM HH:mm' }}</td>
                          <td><app-status-badge [value]="row.status" /></td>
                          <td><button type="button" class="sec-act sec-act--compact" (click)="handleRotateSsh(row)">Rotar</button></td>
                        </tr>
                      } @empty { <tr><td colspan="8" class="sec-content__empty-cell">Sin claves.</td></tr> }
                    </tbody>
                  </table>
                </div>
              }
              @case ('secrets') {
                <div class="sec-table-scroll">
                  <table class="sec-table sec-table--secrets" aria-label="Exposición secretos">
                    <thead><tr><th>Secreto</th><th>Valor</th><th>Ubicación</th><th>Servicio</th><th>Origen</th><th>Severidad</th><th>Estado</th><th></th></tr></thead>
                    <tbody>
                      @for (row of filteredExposures(); track row.id) {
                        <tr>
                          <td class="mono">{{ row.secret }}</td><td class="mono sec-masked">{{ row.maskedValue }}</td>
                          <td>{{ row.location }}</td><td>{{ row.service }}</td><td>{{ row.origin }}</td>
                          <td><span class="sec-sev" [attr.data-sev]="row.severity">{{ severityLabel(row.severity) }}</span></td>
                          <td><app-status-badge [value]="row.status" /></td>
                          <td><button type="button" class="sec-act sec-act--compact" (click)="handleRevokeExposure(row)">Revocar</button></td>
                        </tr>
                      } @empty { <tr><td colspan="8" class="sec-content__empty-cell">Sin exposiciones.</td></tr> }
                    </tbody>
                  </table>
                </div>
              }
              @case ('recommendations') {
                <div class="sec-rec-grid">
                  @for (row of filteredRecommendations(); track row.id) {
                    <article class="sec-rec-card">
                      <header>
                        <mat-icon>lightbulb</mat-icon>
                        <div>
                          <h3>{{ row.title }}</h3>
                          <span>{{ row.category }} · Impacto {{ row.impact }}</span>
                        </div>
                        <app-status-badge [value]="row.status" />
                      </header>
                      <p>{{ row.description }}</p>
                      <button type="button" class="sec-act sec-act--compact sec-act--primary" (click)="handleApplyRecommendation(row)">Aplicar</button>
                    </article>
                  } @empty { <p class="sec-content__empty-cell">Sin recomendaciones.</p> }
                </div>
              }
            }
          </div>
      </section>

      <mat-menu #riskMenu="matMenu" class="sec-row-menu">
        <button mat-menu-item type="button" (click)="openRiskDetail(selectedRisk()!)"><mat-icon>visibility</mat-icon> Ver detalle</button>
        <button mat-menu-item type="button" (click)="openResourceInspect(selectedRisk()!)"><mat-icon>dns</mat-icon> Inspeccionar recurso</button>
        <button mat-menu-item type="button" (click)="openEvidence(selectedRisk()!)"><mat-icon>fact_check</mat-icon> Ver evidencia</button>
        <button mat-menu-item type="button" [disabled]="!selectedRisk()?.remediable" (click)="openRemediateConfirm(selectedRisk()!)"><mat-icon>healing</mat-icon> Remediar</button>
        <button mat-menu-item type="button" (click)="handleAcceptRisk(selectedRisk()!)"><mat-icon>verified</mat-icon> Riesgo aceptado</button>
        <button mat-menu-item type="button" (click)="handleCreateTicket(selectedRisk()!)"><mat-icon>confirmation_number</mat-icon> Crear ticket</button>
        <button mat-menu-item type="button" (click)="handleExportFinding(selectedRisk()!)"><mat-icon>download</mat-icon> Exportar</button>
        <button mat-menu-item type="button" (click)="handleSnooze(selectedRisk()!)"><mat-icon>snooze</mat-icon> Ignorar 7 días</button>
      </mat-menu>
    </div>
    </app-pro-config-gate>
  `,
  styles: `
    :host.sec-host { display: flex; flex: 1; min-height: 0; overflow: hidden; }

    .sec-shell {
      display: flex; flex-direction: column; gap: 0.55rem; flex: 1; min-height: 0;
      overflow-y: auto; scrollbar-width: thin; color: #0f172a; font-size: 0.8125rem;
    }

    /* Hero — índigo */
    .sec-hero {
      flex-shrink: 0; display: grid;
      grid-template-columns: minmax(11rem, 14rem) 1fr minmax(10rem, auto) minmax(9.5rem, auto);
      gap: 0.65rem; align-items: stretch;
      padding: 0.7rem 0.85rem; border-radius: 12px;
      background: linear-gradient(135deg, #eef2ff 0%, #fff 55%, #f8fafc 100%);
      border: 1px solid #c7d2fe;
    }
    .sec-hero__ring-bg { fill: none; stroke: #e0e7ff; stroke-width: 3; }
    .sec-hero__ring-fill { fill: none; stroke: #4f46e5; stroke-width: 3; stroke-linecap: round; transition: stroke-dasharray 0.4s; }
    .sec-hero__score[data-tone='success'] .sec-hero__ring-fill { stroke: #059669; }
    .sec-hero__score[data-tone='warn'] .sec-hero__ring-fill { stroke: #d97706; }
    .sec-hero__score[data-tone='critical'] .sec-hero__ring-fill { stroke: #dc2626; }
    .sec-hero__ring strong { color: #312e81; }
    .sec-hero__score-text em { color: #4338ca; }
    .sec-hero__chip--on, .sec-hero__chip:hover { border-color: #6366f1; background: #eef2ff; }
    .sec-hero__score { display: flex; align-items: center; gap: 0.55rem; min-width: 0; }
    .sec-hero__ring { position: relative; width: 3.4rem; height: 3.4rem; flex-shrink: 0; }
    .sec-hero__ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
    .sec-hero__ring strong {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      font-size: 0.85rem; font-weight: 800;
    }
    .sec-hero__score-text span { display: block; font-size: 0.58rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #94a3b8; }
    .sec-hero__score-text em { display: block; font-size: 0.72rem; font-weight: 700; font-style: normal; margin-top: 0.1rem; }
    .sec-hero__score-text small { display: block; font-size: 0.58rem; color: #64748b; margin-top: 0.15rem; }
    .sec-hero__report-link {
      display: inline-flex; margin-top: 0.25rem; padding: 0; border: none; background: none;
      font: inherit; font-size: 0.58rem; font-weight: 600; color: #4f46e5; cursor: pointer; text-decoration: underline;
      &:hover { color: #4338ca; }
    }
    .sec-hero__breakdown { display: flex; flex-wrap: wrap; gap: 0.35rem; align-content: center; }
    .sec-hero__chip {
      display: flex; flex-direction: column; align-items: center; min-width: 4.2rem; padding: 0.35rem 0.5rem;
      border-radius: 9px; border: 1px solid #e2e8f0; background: #fff; cursor: pointer; font: inherit;
      strong { font-size: 0.95rem; font-weight: 800; }
      span { font-size: 0.55rem; font-weight: 600; color: #64748b; margin-top: 0.12rem; white-space: nowrap; }
      &[data-sev='critical'] strong { color: #b91c1c; }
      &[data-sev='high'] strong { color: #c2410c; }
      &[data-sev='medium'] strong { color: #b45309; }
      &[data-sev='low'] strong { color: #4d7c0f; }
      &[data-sev='info'] strong { color: #0369a1; }
    }
    .sec-hero__actions { display: flex; flex-direction: column; gap: 0.2rem; justify-content: center; min-width: 8rem; }

    .sec-act {
      ${SECURITY_ACTION_BTN}
      justify-content: center; align-self: flex-start; white-space: nowrap; color: #475569;
      mat-icon { ${SECURITY_ACTION_BTN_ICON} flex-shrink: 0; }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
      &:hover:not(:disabled) { background: #eef2ff; border-color: #c7d2fe; }
    }
    .sec-act--primary { ${SECURITY_ACTION_BTN_PRIMARY} &:hover:not(:disabled) { background: #4338ca; } }
    .sec-act--compact { ${SECURITY_ACTION_BTN_SM} }

    /* Tabs horizontales */
    .sec-tabs {
      flex-shrink: 0; display: flex; flex-wrap: nowrap; gap: 0.25rem; overflow-x: auto;
      padding: 0.25rem; border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0;
      scrollbar-width: thin;
    }
    .sec-tabs__item {
      display: inline-flex; align-items: center; gap: 0.35rem; flex-shrink: 0;
      min-width: max-content; padding: 0.42rem 0.75rem; border: none; border-radius: 8px;
      background: transparent; font: inherit; font-size: 0.7rem; font-weight: 600; color: #64748b; cursor: pointer;
      mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; color: #818cf8; }
      em { font-style: normal; font-size: 0.58rem; font-weight: 700; padding: 0.08rem 0.35rem; border-radius: 999px; background: #e2e8f0; color: #64748b; }
    }
    .sec-tabs__item--on {
      background: #fff; color: #312e81; box-shadow: 0 1px 3px rgb(79 70 229 / 0.1);
      em { background: #eef2ff; color: #4338ca; }
    }

    /* Panel principal lista */
    .sec-panel {
      flex: 1; min-height: 0; display: flex; flex-direction: column;
      border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; overflow: hidden;
    }
    .sec-toolbar {
      flex-shrink: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem;
      padding: 0.5rem 0.75rem; border-bottom: 1px solid #f1f5f9; background: #fcfcfd;
    }
    .sec-toolbar__search {
      display: flex; align-items: center; gap: 0.35rem; flex: 1 1 14rem; min-width: 11rem; max-width: 22rem;
      padding: 0.38rem 0.6rem; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff;
      mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; color: #818cf8; flex-shrink: 0; }
      input { flex: 1; min-width: 0; border: none; background: transparent; font: inherit; font-size: 0.72rem; outline: none; }
    }
    .sec-toolbar__filters { display: flex; flex-wrap: wrap; gap: 0.35rem; flex: 1 1 auto; }
    .sec-toolbar__select {
      padding: 0.38rem 0.5rem; border-radius: 8px; border: 1px solid #e2e8f0;
      font: inherit; font-size: 0.68rem; background: #fff; color: #334155;
    }
    .sec-toolbar__select--md { min-width: 10rem; max-width: 12rem; flex: 1 1 10rem; }
    .sec-toolbar__select--sm { min-width: 7rem; max-width: 9rem; flex: 0 1 8rem; }
    .sec-toolbar__result { margin-left: auto; font-size: 0.64rem; color: #94a3b8; white-space: nowrap; }

    .sec-content { flex: 1; min-height: 12rem; overflow-y: auto; scrollbar-width: thin; }

    .sec-findings { list-style: none; margin: 0; padding: 0.4rem; display: flex; flex-direction: column; gap: 0.3rem; }
    .sec-finding {
      display: grid; grid-template-columns: 4px minmax(0, 1fr) auto auto; align-items: stretch; gap: 0.55rem;
      width: 100%; padding: 0.55rem 0.5rem 0.55rem 0; border: 1px solid #e2e8f0; border-radius: 10px;
      background: #fff; text-align: left; cursor: pointer; font: inherit;
      &:hover { border-color: #c7d2fe; box-shadow: 0 2px 8px rgb(79 70 229 / 0.08); }
      &--selected { border-color: #6366f1; background: #fafbff; box-shadow: 0 0 0 1px #6366f1; }
    }
    .sec-finding__sev {
      width: 4px; border-radius: 4px 0 0 4px;
      &[data-sev='critical'] { background: #dc2626; }
      &[data-sev='high'] { background: #ea580c; }
      &[data-sev='medium'] { background: #d97706; }
      &[data-sev='low'] { background: #65a30d; }
      &[data-sev='info'] { background: #0284c7; }
    }
    .sec-finding__main { min-width: 0; display: flex; flex-direction: column; gap: 0.12rem; }
    .sec-finding__main strong { font-size: 0.74rem; font-weight: 700; color: #1e293b; line-height: 1.35; }
    .sec-finding__meta { font-size: 0.62rem; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sec-finding__rec { font-size: 0.6rem; color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sec-finding__side {
      display: flex; flex-direction: column; align-items: flex-end; gap: 0.2rem; flex-shrink: 0; min-width: 5.5rem;
      time { font-size: 0.58rem; color: #94a3b8; white-space: nowrap; }
    }
    .sec-finding__menu { display: flex; align-items: center; flex-shrink: 0; }
    .sec-finding__menu-btn {
      display: flex; align-items: center; justify-content: center; width: 1.75rem; height: 1.75rem;
      border: none; background: transparent; color: #94a3b8; border-radius: 6px; cursor: pointer;
      &:hover { background: #eef2ff; color: #4338ca; }
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
    }

    .sec-sev {
      display: inline-block; padding: 0.12rem 0.4rem; border-radius: 999px; font-size: 0.58rem; font-weight: 700; white-space: nowrap;
      &[data-sev='critical'] { background: #fee2e2; color: #b91c1c; }
      &[data-sev='high'] { background: #ffedd5; color: #c2410c; }
      &[data-sev='medium'] { background: #fef3c7; color: #b45309; }
      &[data-sev='low'] { background: #ecfccb; color: #4d7c0f; }
      &[data-sev='info'] { background: #e0f2fe; color: #0369a1; }
    }
    .sec-st {
      display: inline-block; padding: 0.1rem 0.38rem; border-radius: 999px; font-size: 0.55rem; font-weight: 600; white-space: nowrap;
      &[data-st='failed'] { background: #fee2e2; color: #b91c1c; }
      &[data-st='warning'] { background: #fef3c7; color: #b45309; }
      &[data-st='pending'] { background: #f1f5f9; color: #475569; }
      &[data-st='running'] { background: #dbeafe; color: #1d4ed8; }
      &[data-st='completed'] { background: #dcfce7; color: #15803d; }
      &[data-st='accepted_risk'] { background: #f3e8ff; color: #7e22ce; }
      &[data-st='snoozed'] { background: #f1f5f9; color: #94a3b8; }
    }

    .sec-table-scroll { overflow-x: auto; }
    .sec-table { width: 100%; border-collapse: collapse; font-size: 0.7rem; table-layout: fixed; min-width: 36rem; }
    .sec-table th {
      text-align: left; padding: 0.5rem 0.55rem; font-size: 0.56rem; font-weight: 700; text-transform: uppercase;
      color: #64748b; background: #f8fafc; border-bottom: 1px solid #e2e8f0;
    }
    .sec-table td { padding: 0.5rem 0.55rem; border-bottom: 1px solid #f1f5f9; vertical-align: middle; overflow: hidden; text-overflow: ellipsis; }
    .sec-table tbody tr:hover td { background: #fafbff; }
    .sec-table th:last-child, .sec-table td:last-child { width: 4.5rem; text-align: right; }
    .sec-masked { color: #94a3b8; letter-spacing: 0.04em; }

    .sec-pager {
      display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
      padding: 0.5rem 0.75rem; border-top: 1px solid #e2e8f0; font-size: 0.64rem; color: #64748b;
    }
    .sec-content__empty, .sec-content__empty-cell {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 2rem 1rem; color: #94a3b8; text-align: center; font-size: 0.72rem;
      mat-icon { font-size: 2rem; width: 2rem; height: 2rem; color: #c7d2fe; margin-bottom: 0.35rem; }
    }
    .sec-rec-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr)); gap: 0.5rem; padding: 0.55rem; }
    .sec-rec-card {
      padding: 0.6rem; border-radius: 10px; border: 1px solid #e2e8f0;
      header { display: flex; gap: 0.35rem; align-items: flex-start; margin-bottom: 0.35rem; }
      header mat-icon { color: #4f46e5; font-size: 1rem; flex-shrink: 0; }
      h3 { margin: 0; font-size: 0.74rem; font-weight: 700; line-height: 1.3; }
      header span { display: block; font-size: 0.58rem; color: #94a3b8; margin-top: 0.08rem; }
      p { margin: 0 0 0.45rem; font-size: 0.65rem; color: #64748b; line-height: 1.45; }
    }
    .mono { font-family: ui-monospace, monospace; font-size: 0.64rem; }

    @media (max-width: 1100px) {
      .sec-hero { grid-template-columns: 1fr 1fr; }
      .sec-hero__actions { grid-column: 1 / -1; flex-direction: row; flex-wrap: wrap; min-width: 0; }
      .sec-act { flex: 0 0 auto; align-self: flex-start; }
    }
    @media (max-width: 720px) {
      .sec-hero { grid-template-columns: 1fr; }
      .sec-finding { grid-template-columns: 4px minmax(0, 1fr) auto; }
      .sec-finding__side { display: none; }
    }
  `,
})
export class SecurityCenterPageComponent {
  readonly svc = inject(SecurityCenterService)
  private readonly toast = inject(ToastService)
  private readonly dialog = inject(MatDialog)

  readonly PAGE_SIZE = PAGE_SIZE
  readonly view = signal<SecTab>('risks')
  readonly selectedId = signal<string | null>(null)
  readonly selectedRisk = signal<SecurityRisk | null>(null)
  readonly page = signal(1)

  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly severityControl = new FormControl('', { nonNullable: true })
  readonly providerControl = new FormControl('', { nonNullable: true })
  readonly statusControl = new FormControl('', { nonNullable: true })
  readonly categoryControl = new FormControl('', { nonNullable: true })

  private readonly searchTerm = toSignal(this.searchControl.valueChanges.pipe(debounceTime(200), startWith('')), { initialValue: '' })
  private readonly severityFilter = toSignal(this.severityControl.valueChanges.pipe(startWith('')), { initialValue: '' })
  private readonly providerFilter = toSignal(this.providerControl.valueChanges.pipe(startWith('')), { initialValue: '' })
  private readonly statusFilter = toSignal(this.statusControl.valueChanges.pipe(startWith('')), { initialValue: '' })
  private readonly categoryFilter = toSignal(this.categoryControl.valueChanges.pipe(startWith('')), { initialValue: '' })

  readonly severityOptions = SECURITY_SEVERITY_OPTIONS
  readonly providers = SECURITY_PROVIDERS
  readonly severityLabel = securitySeverityLabel
  readonly statusLabel = securityStatusLabel

  readonly statusOptions = [
    { value: 'failed', label: 'Failed' },
    { value: 'warning', label: 'Unstable' },
    { value: 'pending', label: 'Pending' },
    { value: 'running', label: 'Remediando' },
    { value: 'completed', label: 'Resolved' },
    { value: 'accepted_risk', label: 'Accepted risk' },
    { value: 'snoozed', label: 'Ignorado' },
  ]

  readonly tabs = [
    { id: 'risks' as const, label: 'Riesgos', icon: 'gpp_maybe' },
    { id: 'ports' as const, label: 'Puertos', icon: 'settings_ethernet' },
    { id: 'services' as const, label: 'Servicios', icon: 'public_off' },
    { id: 'firewalls' as const, label: 'Firewalls', icon: 'security' },
    { id: 'ssh' as const, label: 'Claves SSH', icon: 'vpn_key' },
    { id: 'secrets' as const, label: 'Secretos', icon: 'key_off' },
    { id: 'recommendations' as const, label: 'Recomendaciones', icon: 'lightbulb' },
  ]

  riskScore = computed(() => {
    const raw = this.svc.kpis().find((k) => k.label === 'Puntuación de riesgo')?.value
    const n = parseInt(String(raw).split('/')[0], 10)
    return Number.isFinite(n) ? n : 72
  })

  scoreRing = computed(() => this.riskScore())

  scoreTone = computed(() => {
    const s = this.riskScore()
    if (s >= 80) return 'success'
    if (s >= 60) return 'warn'
    return 'critical'
  })

  scoreLabel = computed(() => {
    const s = this.riskScore()
    if (s >= 80) return 'Postura buena'
    if (s >= 60) return 'Postura media'
    return 'Postura crítica'
  })

  severityBreakdown = computed(() =>
    SECURITY_SEVERITY_OPTIONS.map((key) => ({
      key,
      label: securitySeverityLabel(key),
      count: this.svc.risks().filter((r) => r.severity === key && r.status !== 'completed').length,
    })),
  )

  tabsWithCounts = computed(() =>
    this.tabs.map((tab) => ({
      ...tab,
      count: this.tabCount(tab.id),
    })),
  )

  selectedFinding = computed(() => {
    const id = this.selectedId()
    if (!id) return null
    return this.svc.risks().find((r) => r.id === id) ?? null
  })

  searchPlaceholder = computed(() => {
    const map: Record<SecTab, string> = {
      risks: 'Buscar hallazgo, recurso o proveedor…',
      ports: 'Host, puerto o servicio…',
      services: 'Servicio o endpoint…',
      firewalls: 'Firewall o proveedor…',
      ssh: 'Clave, host o propietario…',
      secrets: 'Secreto o ubicación…',
      recommendations: 'Recomendación o categoría…',
    }
    return map[this.view()]
  })

  categoryOptions = computed(() => [...new Set(this.svc.risks().map((r) => r.category))])

  resultLabel = computed(() => {
    const v = this.view()
    if (v === 'risks') return `${this.filteredRisks().length} hallazgos`
    if (v === 'ports') return `${this.filteredPorts().length} puertos`
    if (v === 'services') return `${this.filteredServices().length} servicios`
    if (v === 'firewalls') return `${this.filteredFirewalls().length} firewalls`
    if (v === 'ssh') return `${this.filteredSshKeys().length} claves`
    if (v === 'secrets') return `${this.filteredExposures().length} exposiciones`
    return `${this.filteredRecommendations().length} recomendaciones`
  })

  private matchTerm = (text: string): boolean => {
    const term = (this.searchTerm() ?? '').toLowerCase().trim()
    return !term || text.toLowerCase().includes(term)
  }

  filteredRisks = computed(() =>
    this.svc.risks().filter((r) => {
      const sev = this.severityFilter()
      const prov = this.providerFilter()
      const st = this.statusFilter()
      const cat = this.categoryFilter()
      if (sev && r.severity !== sev) return false
      if (prov && r.provider !== prov) return false
      if (st && r.status !== st) return false
      if (cat && r.category !== cat) return false
      return this.matchTerm(`${r.finding} ${r.resource} ${r.provider} ${r.severity} ${r.status} ${r.riskType} ${r.category}`)
    }),
  )

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredRisks().length / PAGE_SIZE)))

  pagedRisks = computed(() => {
    const start = (this.page() - 1) * PAGE_SIZE
    return this.filteredRisks().slice(start, start + PAGE_SIZE)
  })

  filteredPorts = computed(() =>
    this.svc.ports().filter((p) => this.matchTerm(`${p.host} ${p.port}`)),
  )
  filteredServices = computed(() =>
    this.svc.services().filter((s) => this.matchTerm(`${s.name} ${s.endpoint} ${s.exposure} ${s.provider}`)),
  )
  filteredFirewalls = computed(() =>
    this.svc.firewalls().filter((f) => this.matchTerm(`${f.name} ${f.provider} ${f.resource}`)),
  )
  filteredSshKeys = computed(() =>
    this.svc.sshKeys().filter((k) => this.matchTerm(`${k.name} ${k.host} ${k.fingerprint} ${k.owner}`)),
  )
  filteredExposures = computed(() =>
    this.svc.exposures().filter((e) => this.matchTerm(`${e.secret} ${e.location} ${e.type} ${e.service}`)),
  )
  filteredRecommendations = computed(() =>
    this.svc.recommendations().filter((r) => this.matchTerm(`${r.title} ${r.category} ${r.description}`)),
  )

  tabCount = (tab: SecTab): number => {
    switch (tab) {
      case 'risks': return this.svc.risks().length
      case 'ports': return this.svc.ports().length
      case 'services': return this.svc.services().length
      case 'firewalls': return this.svc.firewalls().length
      case 'ssh': return this.svc.sshKeys().length
      case 'secrets': return this.svc.exposures().length
      case 'recommendations': return this.svc.recommendations().length
    }
  }

  toggleSeverityChip = (key: string): void => {
    const current = this.severityControl.value
    this.severityControl.setValue(current === key ? '' : key)
    this.page.set(1)
  }

  selectFinding = (row: SecurityRisk): void => {
    this.selectedId.set(row.id)
    this.selectedRisk.set(row)
  }

  clearSelection = (): void => {
    this.selectedId.set(null)
  }

  handleTabChange = (tab: SecTab): void => {
    this.view.set(tab)
    this.page.set(1)
    this.searchControl.setValue('')
    this.selectedId.set(null)
  }

  handleScan = (): void => {
    this.dialog.open(SecurityScanDialogComponent, {
      width: 'min(920px, 98vw)',
      maxWidth: '98vw',
      maxHeight: '92vh',
      panelClass: 'sec-scan-dialog-panel',
      disableClose: true,
    })
  }

  openSavedScanReport = (report: SecurityScanReport): void => {
    this.dialog.open(SecurityScanReportDialogComponent, {
      width: 'min(920px, 98vw)',
      maxWidth: '98vw',
      maxHeight: '92vh',
      panelClass: 'sec-scan-report-dialog-panel',
      data: { report },
    })
  }

  handleExport = (): void => {
    this.dialog.open(SecurityExportDialogComponent, {
      width: 'min(820px, 96vw)',
      maxWidth: '96vw',
      maxHeight: '92vh',
      panelClass: 'sec-export-dialog-panel',
    })
  }

  handleRemediateAll = (): void => {
    this.dialog.open(SecurityBulkRemediateDialogComponent, { width: 'min(540px, 94vw)' })
  }

  openRiskDetail = (row: SecurityRisk): void => {
    const latest = this.svc.risks().find((r) => r.id === row.id) ?? row
    this.selectedId.set(row.id)
    this.selectedRisk.set(latest)
    this.dialog.open(SecurityFindingDetailDialogComponent, {
      width: 'min(960px, 98vw)',
      maxWidth: '98vw',
      maxHeight: '94vh',
      panelClass: 'sec-finding-detail-dialog-panel',
      data: { finding: latest },
    })
  }

  openResourceInspect = (row: SecurityRisk): void => {
    const latest = this.svc.risks().find((r) => r.id === row.id) ?? row
    this.dialog.open(SecurityResourceInspectDialogComponent, {
      width: 'min(540px, 94vw)',
      data: { finding: latest },
    })
  }

  openEvidence = (row: SecurityRisk): void => {
    const latest = this.svc.risks().find((r) => r.id === row.id) ?? row
    this.dialog.open(SecurityEvidenceDialogComponent, {
      width: 'min(920px, 98vw)',
      maxWidth: '98vw',
      maxHeight: '92vh',
      panelClass: 'sec-evidence-dialog-panel',
      data: { finding: latest },
    })
  }

  openRemediateConfirm = (row: SecurityRisk): void => {
    if (!row.remediable) {
      this.toast.warning('Este hallazgo no admite remediación automática')
      return
    }
    const latest = this.svc.risks().find((r) => r.id === row.id) ?? row
    this.dialog.open(SecurityRemediateConfirmDialogComponent, {
      width: 'min(500px, 94vw)',
      data: { finding: latest },
    })
  }

  handleAcceptRisk = (row: SecurityRisk): void => {
    this.svc.updateRisk(row.id, { status: 'accepted_risk' })
    this.svc.appendHistory(row.id, 'Riesgo aceptado', 'admin@cloudops')
    this.svc.refreshKpis()
    this.toast.info(`Riesgo aceptado: ${row.finding}`)
  }

  handleCreateTicket = (row: SecurityRisk): void => {
    const ticketId = `SEC-${Date.now().toString(36).toUpperCase()}`
    this.svc.appendHistory(row.id, 'Ticket creado', 'admin@cloudops', ticketId)
    this.toast.success(`Ticket ${ticketId} creado`)
  }

  handleExportFinding = (row: SecurityRisk): void => {
    downloadBlob(JSON.stringify({ exportedAt: new Date().toISOString(), finding: row }, null, 2), `hallazgo-${row.id}.json`, 'application/json')
    this.toast.success('Hallazgo exportado')
  }

  handleSnooze = (row: SecurityRisk): void => {
    this.svc.updateRisk(row.id, { status: 'snoozed' })
    this.svc.appendHistory(row.id, 'Ignorado temporalmente', 'admin@cloudops', 'Snooze 7 días')
    this.toast.info(`Ignorado 7 días: ${row.finding}`)
  }

  handleRemediatePort = (row: OpenPort): void => {
    this.svc.ports.update((rows) => rows.filter((p) => p.id !== row.id))
    this.svc.refreshKpis()
    this.toast.success(`Puerto ${row.port} cerrado en ${row.host}`)
  }

  handleReviewService = (row: ExposedService): void => {
    this.toast.info(`Revisión: ${row.name} (${row.auth})`)
  }

  handleAuditFirewall = (row: FirewallRule): void => {
    this.dialog.open(SecurityEvidenceDialogComponent, {
      width: 'min(920px, 98vw)',
      maxWidth: '98vw',
      maxHeight: '92vh',
      panelClass: 'sec-evidence-dialog-panel',
      data: {
        finding: {
          ...this.svc.risks()[0],
          finding: `Auditoría: ${row.name}`,
          evidence: `Firewall: ${row.name}\nProvider: ${row.provider}\nRules: ${row.rules}\nOpen: ${row.openPorts}`,
          evidenceType: 'Regla de firewall',
        },
      },
    })
  }

  handleRotateSsh = (row: SshKeyRecord): void => {
    this.svc.sshKeys.update((rows) => rows.map((k) => (k.id === row.id ? { ...k, status: 'running', ageDays: 0 } : k)))
    this.toast.success(`Rotación: ${row.name}`)
  }

  handleRevokeExposure = (row: SecretExposure): void => {
    this.svc.exposures.update((rows) => rows.filter((e) => e.id !== row.id))
    this.svc.refreshKpis()
    this.toast.success(`Secreto revocado`)
  }

  handleApplyRecommendation = (row: SecurityRecommendation): void => {
    this.svc.recommendations.update((rows) => rows.map((r) => (r.id === row.id ? { ...r, status: 'running' } : r)))
    this.toast.success(`Aplicando: ${row.title}`)
  }
}
