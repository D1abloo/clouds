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
} from './security-center.demo'
import { SecurityCenterService } from './security-center.service'
import { SecurityFindingDetailDialogComponent } from './security-finding-detail-dialog.component'
import { SecurityScanDialogComponent } from './security-scan-dialog.component'
import { SecurityExportDialogComponent } from './security-export-dialog.component'
import { SecurityBulkRemediateDialogComponent } from './security-bulk-remediate-dialog.component'
import { SecurityRemediateConfirmDialogComponent } from './security-remediate-confirm-dialog.component'
import { SecurityEvidenceDialogComponent } from './security-evidence-dialog.component'
import { SecurityResourceInspectDialogComponent } from './security-resource-inspect-dialog.component'

type SecTab = 'risks' | 'ports' | 'services' | 'firewalls' | 'ssh' | 'secrets' | 'recommendations'
type SortDir = 'asc' | 'desc'
type RiskSortKey = 'finding' | 'resource' | 'provider' | 'severity' | 'status' | 'detectedAt'

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }
const PAGE_SIZE = 6

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
  ],
  template: `
    <div class="page-container sec-page animate-fade-in">
      <section class="sec-intro">
        <div class="sec-intro__main">
          <span class="sec-intro__eyebrow">Seguridad · Postura</span>
          <h2 class="sec-intro__title">Centro de seguridad</h2>
          <p class="sec-intro__desc">
            Visión unificada de riesgos, exposición de red, firewalls, claves SSH y secretos filtrados.
            @if (svc.lastScanAt(); as scan) {
              <em>Último escaneo: {{ scan | date: 'dd MMM yyyy, HH:mm' }}</em>
            }
          </p>
        </div>
        <div class="sec-intro__actions">
          <button type="button" class="sec-btn sec-btn--primary" [disabled]="svc.scanning()" (click)="handleScan()">
            <mat-icon>radar</mat-icon>
            {{ svc.scanning() ? 'Escaneando…' : 'Ejecutar escaneo' }}
          </button>
          <button type="button" class="sec-btn" (click)="handleExport()">
            <mat-icon>download</mat-icon>
            Exportar informe
          </button>
          <button type="button" class="sec-btn" (click)="handleRemediateAll()">
            <mat-icon>healing</mat-icon>
            Remediar
          </button>
        </div>
      </section>

      <section class="sec-kpis">
        @for (kpi of svc.kpis(); track kpi.label) {
          <article class="sec-kpi" [attr.data-tone]="kpi.tone">
            <mat-icon>{{ kpi.icon }}</mat-icon>
            <div>
              <span>{{ kpi.label }}</span>
              <strong>{{ kpi.value }}</strong>
              @if (kpi.subtitle) { <small class="sec-kpi__sub">{{ kpi.subtitle }}</small> }
              @if (kpi.hint) { <small>{{ kpi.hint }}</small> }
            </div>
          </article>
        }
      </section>

      <div class="sec-bar">
        <nav class="sec-tabs" role="tablist" aria-label="Vistas del centro de seguridad">
          @for (tab of tabs; track tab.id) {
            <button
              type="button"
              role="tab"
              class="sec-tabs__tab"
              [class.sec-tabs__tab--on]="view() === tab.id"
              [attr.aria-selected]="view() === tab.id"
              (click)="handleTabChange(tab.id)"
            >
              <mat-icon>{{ tab.icon }}</mat-icon>
              {{ tab.label }}
            </button>
          }
        </nav>
      </div>

      <div class="sec-filters">
        <label class="sec-search">
          <mat-icon>search</mat-icon>
          <input type="search" [formControl]="searchControl" [placeholder]="searchPlaceholder()" aria-label="Buscar" />
        </label>
        @if (view() === 'risks') {
          <select class="sec-filter" [formControl]="severityControl" aria-label="Severidad">
            <option value="">Todas las severidades</option>
            @for (s of severityOptions; track s) {
              <option [value]="s">{{ severityLabel(s) }}</option>
            }
          </select>
          <select class="sec-filter" [formControl]="providerControl" aria-label="Proveedor">
            <option value="">Todos los proveedores</option>
            @for (p of providers; track p) { <option [value]="p">{{ p }}</option> }
          </select>
          <select class="sec-filter" [formControl]="statusControl" aria-label="Estado">
            <option value="">Todos los estados</option>
            @for (st of statusOptions; track st.value) {
              <option [value]="st.value">{{ st.label }}</option>
            }
          </select>
          <select class="sec-filter" [formControl]="categoryControl" aria-label="Categoría">
            <option value="">Todas las categorías</option>
            @for (c of categoryOptions(); track c) { <option [value]="c">{{ c }}</option> }
          </select>
        }
      </div>

      <div class="sec-table-wrap">
        @switch (view()) {
          @case ('risks') {
            @if (filteredRisks().length === 0) {
              <div class="sec-empty-state"><mat-icon>verified_user</mat-icon><p>Sin hallazgos con los filtros actuales.</p></div>
            } @else {
              <table class="sec-table" aria-label="Riesgos">
                <thead>
                  <tr>
                    @for (col of riskColumns; track col.key) {
                      <th [class.sec-table__sortable]="col.sortable" (click)="col.sortable && handleSort(col.key)">
                        {{ col.label }}
                        @if (sortKey() === col.key) {
                          <mat-icon class="sec-table__sort-icon">{{ sortDir() === 'asc' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
                        }
                      </th>
                    }
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of pagedRisks(); track row.id) {
                    <tr (click)="openRiskDetail(row)" tabindex="0" (keydown.enter)="openRiskDetail(row)">
                      <td><span class="sec-table__finding">{{ row.finding }}</span></td>
                      <td class="mono">{{ row.resource }}</td>
                      <td><span class="sec-provider">{{ row.provider }}</span></td>
                      <td><span class="sec-sev" [attr.data-sev]="row.severity">{{ severityLabel(row.severity) }}</span></td>
                      <td><span class="sec-status-badge" [attr.data-st]="row.status">{{ statusLabel(row.status) }}</span></td>
                      <td>{{ row.detectedAt | date: 'dd MMM HH:mm' }}</td>
                      <td class="sec-table__actions" (click)="$event.stopPropagation()">
                        <button type="button" class="sec-icon-btn" [matMenuTriggerFor]="riskMenu" (click)="selectedRisk.set(row)" aria-label="Acciones">
                          <mat-icon>more_vert</mat-icon>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
              @if (filteredRisks().length > PAGE_SIZE) {
                <footer class="sec-pagination">
                  <button type="button" class="sec-btn sec-btn--sm" [disabled]="page() <= 1" (click)="page.set(page() - 1)">Anterior</button>
                  <span>Página {{ page() }} de {{ totalPages() }} · {{ filteredRisks().length }} hallazgos</span>
                  <button type="button" class="sec-btn sec-btn--sm" [disabled]="page() >= totalPages()" (click)="page.set(page() + 1)">Siguiente</button>
                </footer>
              }
            }
          }
          @case ('ports') {
            <table class="sec-table" aria-label="Puertos abiertos">
              <thead><tr><th>Host</th><th>Puerto</th><th>Servicio</th><th>Protocolo</th><th>Proveedor</th><th>Exposición</th><th>Riesgo</th><th></th></tr></thead>
              <tbody>
                @for (row of filteredPorts(); track row.id) {
                  <tr>
                    <td class="mono">{{ row.host }}</td><td>{{ row.port }}</td><td>{{ row.service }}</td>
                    <td>{{ row.protocol }}</td><td>{{ row.provider }}</td><td>{{ row.exposure }}</td>
                    <td><span class="sec-sev" [attr.data-sev]="row.risk">{{ severityLabel(row.risk) }}</span></td>
                    <td class="sec-table__actions">
                      <button type="button" class="sec-btn sec-btn--sm" (click)="handleRemediatePort(row)">Cerrar puerto</button>
                    </td>
                  </tr>
                } @empty { <tr><td colspan="8" class="sec-empty">Sin puertos.</td></tr> }
              </tbody>
            </table>
          }
          @case ('services') {
            <table class="sec-table" aria-label="Servicios expuestos">
              <thead><tr><th>Servicio</th><th>Endpoint</th><th>Proveedor</th><th>Autenticación</th><th>Exposición</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                @for (row of filteredServices(); track row.id) {
                  <tr>
                    <td>{{ row.name }}</td><td class="mono">{{ row.endpoint }}</td><td>{{ row.provider }}</td>
                    <td>{{ row.auth }}</td><td>{{ row.exposure }}</td>
                    <td><app-status-badge [value]="row.status" /></td>
                    <td class="sec-table__actions">
                      <button type="button" class="sec-btn sec-btn--sm" (click)="handleReviewService(row)">Revisar</button>
                    </td>
                  </tr>
                } @empty { <tr><td colspan="7" class="sec-empty">Sin servicios.</td></tr> }
              </tbody>
            </table>
          }
          @case ('firewalls') {
            <table class="sec-table" aria-label="Firewalls">
              <thead><tr><th>Nombre</th><th>Proveedor</th><th>Recurso</th><th>Reglas</th><th>Puertos abiertos</th><th>Egress</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                @for (row of filteredFirewalls(); track row.id) {
                  <tr>
                    <td class="mono">{{ row.name }}</td><td>{{ row.provider }}</td><td>{{ row.resource }}</td>
                    <td>{{ row.rules }}</td><td>{{ row.openPorts }}</td>
                    <td>{{ row.egressRestricted ? 'Restringido' : 'Permisivo' }}</td>
                    <td><app-status-badge [value]="row.status" /></td>
                    <td class="sec-table__actions">
                      <button type="button" class="sec-btn sec-btn--sm" (click)="handleAuditFirewall(row)">Auditar</button>
                    </td>
                  </tr>
                } @empty { <tr><td colspan="8" class="sec-empty">Sin firewalls.</td></tr> }
              </tbody>
            </table>
          }
          @case ('ssh') {
            <table class="sec-table" aria-label="Claves SSH">
              <thead><tr><th>Nombre</th><th>Huella</th><th>Host</th><th>Propietario</th><th>Antigüedad</th><th>Último uso</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                @for (row of filteredSshKeys(); track row.id) {
                  <tr>
                    <td>{{ row.name }}</td><td class="mono">{{ row.fingerprint }}</td><td>{{ row.host }}</td>
                    <td>{{ row.owner }}</td><td>{{ row.ageDays }} días</td>
                    <td>{{ row.lastUsed | date: 'dd MMM HH:mm' }}</td>
                    <td><app-status-badge [value]="row.status" /></td>
                    <td class="sec-table__actions">
                      <button type="button" class="sec-btn sec-btn--sm" (click)="handleRotateSsh(row)">Rotar</button>
                    </td>
                  </tr>
                } @empty { <tr><td colspan="8" class="sec-empty">Sin claves.</td></tr> }
              </tbody>
            </table>
          }
          @case ('secrets') {
            <table class="sec-table" aria-label="Exposición de secretos">
              <thead><tr><th>Secreto</th><th>Valor</th><th>Ubicación</th><th>Servicio</th><th>Origen</th><th>Severidad</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                @for (row of filteredExposures(); track row.id) {
                  <tr>
                    <td class="mono">{{ row.secret }}</td><td class="mono sec-masked">{{ row.maskedValue }}</td>
                    <td>{{ row.location }}</td><td>{{ row.service }}</td><td>{{ row.origin }}</td>
                    <td><span class="sec-sev" [attr.data-sev]="row.severity">{{ severityLabel(row.severity) }}</span></td>
                    <td><app-status-badge [value]="row.status" /></td>
                    <td class="sec-table__actions">
                      <button type="button" class="sec-btn sec-btn--sm" (click)="handleRevokeExposure(row)">Revocar</button>
                    </td>
                  </tr>
                } @empty { <tr><td colspan="8" class="sec-empty">Sin exposiciones.</td></tr> }
              </tbody>
            </table>
          }
          @case ('recommendations') {
            <div class="sec-rec-grid">
              @for (row of filteredRecommendations(); track row.id) {
                <article class="sec-rec-card">
                  <header>
                    <mat-icon>lightbulb</mat-icon>
                    <div>
                      <h3>{{ row.title }}</h3>
                      <span>{{ row.category }} · Impacto {{ row.impact }} · Esfuerzo {{ row.effort }}</span>
                    </div>
                    <app-status-badge [value]="row.status" />
                  </header>
                  <p>{{ row.description }}</p>
                  <button type="button" class="sec-btn sec-btn--sm sec-btn--primary" (click)="handleApplyRecommendation(row)">Aplicar</button>
                </article>
              } @empty { <p class="sec-empty">Sin recomendaciones.</p> }
            </div>
          }
        }
      </div>

      <mat-menu #riskMenu="matMenu">
        <button mat-menu-item type="button" (click)="openRiskDetail(selectedRisk()!)">
          <mat-icon>visibility</mat-icon> Ver detalle
        </button>
        <button mat-menu-item type="button" (click)="openResourceInspect(selectedRisk()!)">
          <mat-icon>dns</mat-icon> Inspeccionar recurso
        </button>
        <button mat-menu-item type="button" (click)="openEvidence(selectedRisk()!)">
          <mat-icon>fact_check</mat-icon> Ver evidencia
        </button>
        <button mat-menu-item type="button" [disabled]="!selectedRisk()?.remediable" (click)="openRemediateConfirm(selectedRisk()!)">
          <mat-icon>healing</mat-icon> Remediar
        </button>
        <button mat-menu-item type="button" (click)="handleAcceptRisk(selectedRisk()!)">
          <mat-icon>verified</mat-icon> Marcar como riesgo aceptado
        </button>
        <button mat-menu-item type="button" (click)="handleCreateTicket(selectedRisk()!)">
          <mat-icon>confirmation_number</mat-icon> Crear ticket
        </button>
        <button mat-menu-item type="button" (click)="handleExportFinding(selectedRisk()!)">
          <mat-icon>download</mat-icon> Exportar hallazgo
        </button>
        <button mat-menu-item type="button" (click)="handleSnooze(selectedRisk()!)">
          <mat-icon>snooze</mat-icon> Ignorar temporalmente
        </button>
      </mat-menu>
    </div>
  `,
  styles: `
    :host { display: block; flex: 1; min-height: 0; }
    .sec-page { display: flex; flex-direction: column; gap: 0.65rem; flex: 1; min-height: 0; overflow-y: auto; scrollbar-width: thin; color: #0f172a; font-size: 0.8125rem; }
    .sec-intro { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 0.75rem; }
    .sec-intro__eyebrow { display: block; font-size: 0.58rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #db2777; margin-bottom: 0.2rem; }
    .sec-intro__title { margin: 0 0 0.35rem; font-size: 1.05rem; font-weight: 700; }
    .sec-intro__desc { margin: 0; max-width: 42rem; font-size: 0.72rem; color: #64748b; line-height: 1.55; }
    .sec-intro__desc em { display: block; margin-top: 0.25rem; font-style: normal; color: #db2777; font-size: 0.65rem; }
    .sec-intro__actions { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .sec-btn {
      display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.38rem 0.7rem; border-radius: 9px;
      border: 1px solid #e2e8f0; background: #fff; font: inherit; font-size: 0.7rem; font-weight: 600; color: #475569; cursor: pointer;
      transition: background 0.15s, border-color 0.15s, transform 0.1s;
      &:hover:not(:disabled) { background: #fdf2f8; border-color: #fbcfe8; }
      &:disabled { opacity: 0.55; cursor: not-allowed; }
    }
    .sec-btn mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; }
    .sec-btn--primary { background: #ec4899; border-color: #db2777; color: #fff; &:hover:not(:disabled) { background: #db2777; } }
    .sec-btn--sm { padding: 0.25rem 0.5rem; font-size: 0.64rem; }
    .sec-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.5rem; }
    .sec-kpi {
      display: flex; align-items: flex-start; gap: 0.45rem; padding: 0.6rem 0.7rem; border-radius: 11px;
      background: linear-gradient(135deg, #fdf2f8 0%, #fff 100%); border: 1px solid #fbcfe8;
      transition: box-shadow 0.15s, transform 0.1s;
      &:hover { box-shadow: 0 4px 12px rgb(236 72 153 / 0.12); transform: translateY(-1px); }
    }
    .sec-kpi mat-icon { font-size: 1.15rem; width: 1.15rem; height: 1.15rem; color: #db2777; margin-top: 0.08rem; }
    .sec-kpi[data-tone='warn'] mat-icon { color: #d97706; }
    .sec-kpi[data-tone='success'] mat-icon { color: #059669; }
    .sec-kpi span { display: block; font-size: 0.55rem; font-weight: 650; text-transform: uppercase; letter-spacing: 0.04em; color: #94a3b8; }
    .sec-kpi strong { display: block; font-size: 1.05rem; font-weight: 700; margin-top: 0.05rem; }
    .sec-kpi small { display: block; margin-top: 0.06rem; font-size: 0.58rem; color: #64748b; }
    .sec-kpi__sub { color: #94a3b8 !important; }
    .sec-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
    .sec-tabs { display: flex; flex-wrap: wrap; gap: 0.2rem; padding: 0.2rem; border-radius: 10px; background: #fdf2f8; }
    .sec-tabs__tab {
      display: inline-flex; align-items: center; gap: 0.28rem; padding: 0.35rem 0.6rem; border: none; border-radius: 8px;
      background: transparent; font: inherit; font-size: 0.68rem; font-weight: 600; color: #9d174d; cursor: pointer;
    }
    .sec-tabs__tab mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; }
    .sec-tabs__tab--on { color: #831843; background: #fff; box-shadow: 0 1px 2px rgb(190 24 93 / 0.08); }
    .sec-filters { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; }
    .sec-search {
      display: flex; align-items: center; gap: 0.35rem; flex: 1; min-width: 12rem; max-width: 18rem;
      padding: 0.38rem 0.55rem; border-radius: 9px; background: #fff; border: 1px solid #fbcfe8;
    }
    .sec-search mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; color: #f472b6; }
    .sec-search input { flex: 1; border: none; background: transparent; font: inherit; font-size: 0.72rem; outline: none; }
    .sec-filter { padding: 0.38rem 0.5rem; border-radius: 9px; border: 1px solid #fbcfe8; font: inherit; font-size: 0.68rem; background: #fff; }
    .sec-table-wrap { border-radius: 11px; border: 1px solid #e2e8f0; background: #fff; overflow: hidden; }
    .sec-table { width: 100%; border-collapse: collapse; font-size: 0.72rem; }
    .sec-table th {
      text-align: left; padding: 0.55rem 0.65rem; font-size: 0.58rem; font-weight: 700; text-transform: uppercase;
      color: #64748b; background: #f8fafc; border-bottom: 1px solid #e2e8f0; white-space: nowrap;
    }
    .sec-table__sortable { cursor: pointer; user-select: none; &:hover { color: #db2777; } }
    .sec-table__sort-icon { font-size: 0.75rem; width: 0.75rem; height: 0.75rem; vertical-align: middle; }
    .sec-table td { padding: 0.55rem 0.65rem; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .sec-table tbody tr { transition: background 0.12s; }
    .sec-table tbody tr:hover td { background: #fdf2f8; cursor: pointer; }
    .sec-table__finding { font-weight: 600; color: #1e293b; }
    .sec-table__actions { cursor: default; width: 2.5rem; }
    .sec-table tbody tr:has(.sec-table__actions:hover) td { background: inherit; }
    .sec-icon-btn { border: none; background: transparent; cursor: pointer; color: #64748b; padding: 0.15rem; border-radius: 6px; &:hover { background: #f1f5f9; color: #db2777; } }
    .sec-sev {
      display: inline-block; padding: 0.14rem 0.42rem; border-radius: 999px; font-size: 0.6rem; font-weight: 700;
      &[data-sev='critical'] { background: #fee2e2; color: #b91c1c; }
      &[data-sev='high'] { background: #ffedd5; color: #c2410c; }
      &[data-sev='medium'] { background: #fef3c7; color: #b45309; }
      &[data-sev='low'] { background: #ecfccb; color: #4d7c0f; }
      &[data-sev='info'] { background: #e0f2fe; color: #0369a1; }
    }
    .sec-status-badge {
      display: inline-block; padding: 0.12rem 0.4rem; border-radius: 999px; font-size: 0.58rem; font-weight: 600;
      &[data-st='failed'] { background: #fee2e2; color: #b91c1c; }
      &[data-st='warning'] { background: #fef3c7; color: #b45309; }
      &[data-st='pending'] { background: #f1f5f9; color: #475569; }
      &[data-st='running'] { background: #dbeafe; color: #1d4ed8; }
      &[data-st='completed'] { background: #dcfce7; color: #15803d; }
      &[data-st='accepted_risk'] { background: #f3e8ff; color: #7e22ce; }
      &[data-st='snoozed'] { background: #f1f5f9; color: #94a3b8; }
    }
    .sec-provider { padding: 0.1rem 0.35rem; border-radius: 4px; background: #f1f5f9; font-size: 0.62rem; font-weight: 600; }
    .sec-masked { color: #94a3b8; letter-spacing: 0.05em; }
    .sec-pagination {
      display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
      padding: 0.55rem 0.65rem; border-top: 1px solid #e2e8f0; font-size: 0.68rem; color: #64748b;
    }
    .sec-empty { text-align: center; color: #94a3b8; padding: 1.5rem !important; }
    .sec-empty-state { display: flex; flex-direction: column; align-items: center; gap: 0.35rem; padding: 2rem; color: #94a3b8; }
    .sec-empty-state mat-icon { font-size: 2rem; width: 2rem; height: 2rem; color: #fbcfe8; }
    .sec-rec-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0.5rem; padding: 0.65rem; }
    .sec-rec-card {
      padding: 0.65rem; border-radius: 10px; border: 1px solid #e2e8f0; background: #fafafa;
      header { display: flex; gap: 0.4rem; align-items: flex-start; margin-bottom: 0.4rem; }
      header mat-icon { color: #ec4899; font-size: 1.1rem; }
      h3 { margin: 0; font-size: 0.78rem; font-weight: 700; }
      header span { display: block; font-size: 0.6rem; color: #94a3b8; margin-top: 0.1rem; }
      p { margin: 0 0 0.5rem; font-size: 0.68rem; color: #64748b; line-height: 1.45; }
    }
    .mono { font-family: ui-monospace, monospace; font-size: 0.68rem; }
    @media (max-width: 900px) { .sec-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  `,
})
export class SecurityCenterPageComponent {
  readonly svc = inject(SecurityCenterService)
  private readonly toast = inject(ToastService)
  private readonly dialog = inject(MatDialog)

  readonly PAGE_SIZE = PAGE_SIZE
  readonly view = signal<SecTab>('risks')
  readonly selectedRisk = signal<SecurityRisk | null>(null)
  readonly page = signal(1)
  readonly sortKey = signal<RiskSortKey>('detectedAt')
  readonly sortDir = signal<SortDir>('desc')

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

  readonly riskColumns: { key: RiskSortKey; label: string; sortable: boolean }[] = [
    { key: 'finding', label: 'Hallazgo', sortable: true },
    { key: 'resource', label: 'Recurso', sortable: true },
    { key: 'provider', label: 'Proveedor', sortable: true },
    { key: 'severity', label: 'Severidad', sortable: true },
    { key: 'status', label: 'Estado', sortable: true },
    { key: 'detectedAt', label: 'Detectado', sortable: true },
  ]

  readonly tabs = [
    { id: 'risks' as const, label: 'Riesgos', icon: 'gpp_maybe' },
    { id: 'ports' as const, label: 'Puertos abiertos', icon: 'settings_ethernet' },
    { id: 'services' as const, label: 'Servicios expuestos', icon: 'public_off' },
    { id: 'firewalls' as const, label: 'Firewalls', icon: 'security' },
    { id: 'ssh' as const, label: 'Claves SSH', icon: 'vpn_key' },
    { id: 'secrets' as const, label: 'Exposición secretos', icon: 'key_off' },
    { id: 'recommendations' as const, label: 'Recomendaciones', icon: 'lightbulb' },
  ]

  searchPlaceholder = computed(() => {
    const map: Record<SecTab, string> = {
      risks: 'Hallazgo, recurso, proveedor…',
      ports: 'Host o puerto…',
      services: 'Servicio o endpoint…',
      firewalls: 'Nombre o proveedor…',
      ssh: 'Clave o host…',
      secrets: 'Secreto o ubicación…',
      recommendations: 'Recomendación…',
    }
    return map[this.view()]
  })

  categoryOptions = computed(() => [...new Set(this.svc.risks().map((r) => r.category))])

  private matchTerm = (text: string): boolean => {
    const term = (this.searchTerm() ?? '').toLowerCase().trim()
    return !term || text.toLowerCase().includes(term)
  }

  filteredRisks = computed(() => {
    let rows = this.svc.risks().filter((r) => {
      const sev = this.severityFilter()
      const prov = this.providerFilter()
      const st = this.statusFilter()
      const cat = this.categoryFilter()
      if (sev && r.severity !== sev) return false
      if (prov && r.provider !== prov) return false
      if (st && r.status !== st) return false
      if (cat && r.category !== cat) return false
      return this.matchTerm(`${r.finding} ${r.resource} ${r.provider} ${r.severity} ${r.status} ${r.riskType} ${r.category}`)
    })
    const key = this.sortKey()
    const dir = this.sortDir()
    rows = [...rows].sort((a, b) => {
      let cmp = 0
      if (key === 'severity') cmp = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
      else if (key === 'detectedAt') cmp = a.detectedAt.localeCompare(b.detectedAt)
      else cmp = String(a[key]).localeCompare(String(b[key]))
      return dir === 'asc' ? cmp : -cmp
    })
    return rows
  })

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredRisks().length / PAGE_SIZE)))

  pagedRisks = computed(() => {
    const start = (this.page() - 1) * PAGE_SIZE
    return this.filteredRisks().slice(start, start + PAGE_SIZE)
  })

  filteredPorts = computed(() =>
    this.svc.ports().filter((p) => this.matchTerm(`${p.host} ${p.port} ${p.service} ${p.exposure} ${p.provider}`)),
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

  handleTabChange = (tab: SecTab): void => {
    this.view.set(tab)
    this.page.set(1)
    this.searchControl.setValue('')
  }

  handleSort = (key: RiskSortKey): void => {
    if (this.sortKey() === key) this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { this.sortKey.set(key); this.sortDir.set('asc') }
  }

  handleScan = (): void => {
    this.dialog.open(SecurityScanDialogComponent, { width: 'min(500px, 94vw)', disableClose: true })
  }

  handleExport = (): void => {
    this.dialog.open(SecurityExportDialogComponent, { width: 'min(440px, 92vw)' })
  }

  handleRemediateAll = (): void => {
    this.dialog.open(SecurityBulkRemediateDialogComponent, { width: 'min(540px, 94vw)' })
  }

  openRiskDetail = (row: SecurityRisk): void => {
    const latest = this.svc.risks().find((r) => r.id === row.id) ?? row
    this.dialog.open(SecurityFindingDetailDialogComponent, {
      width: 'min(620px, 96vw)',
      maxHeight: '92vh',
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
      width: 'min(580px, 94vw)',
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
    this.svc.appendHistory(row.id, 'Riesgo aceptado', 'admin@cloudops', 'Marcado como riesgo aceptado por el equipo')
    this.svc.refreshKpis()
    this.toast.info(`Riesgo aceptado: ${row.finding}`)
  }

  handleCreateTicket = (row: SecurityRisk): void => {
    const ticketId = `SEC-${Date.now().toString(36).toUpperCase()}`
    this.svc.appendHistory(row.id, 'Ticket creado', 'admin@cloudops', ticketId)
    this.toast.success(`Ticket ${ticketId} creado para: ${row.finding}`)
  }

  handleExportFinding = (row: SecurityRisk): void => {
    const payload = { exportedAt: new Date().toISOString(), finding: row }
    downloadBlob(JSON.stringify(payload, null, 2), `hallazgo-${row.id}.json`, 'application/json')
    this.toast.success('Hallazgo exportado (JSON)')
  }

  handleSnooze = (row: SecurityRisk): void => {
    this.svc.updateRisk(row.id, { status: 'snoozed' })
    this.svc.appendHistory(row.id, 'Ignorado temporalmente', 'admin@cloudops', 'Snooze 7 días')
    this.toast.info(`Hallazgo ignorado 7 días: ${row.finding}`)
  }

  handleRemediatePort = (row: OpenPort): void => {
    this.svc.ports.update((rows) => rows.filter((p) => p.id !== row.id))
    this.svc.refreshKpis()
    this.toast.success(`Puerto ${row.port} cerrado en ${row.host}`)
  }

  handleReviewService = (row: ExposedService): void => {
    this.toast.info(`Revisión de exposición: ${row.name} — autenticación ${row.auth}`)
  }

  handleAuditFirewall = (row: FirewallRule): void => {
    this.dialog.open(SecurityEvidenceDialogComponent, {
      width: 'min(580px, 94vw)',
      data: {
        finding: {
          ...this.svc.risks()[0],
          finding: `Auditoría firewall: ${row.name}`,
          evidence: `Firewall: ${row.name}\nProvider: ${row.provider}\nRules: ${row.rules}\nOpen ports: ${row.openPorts}\nEgress restricted: ${row.egressRestricted}`,
          evidenceType: 'Regla de firewall',
        },
      },
    })
  }

  handleRotateSsh = (row: SshKeyRecord): void => {
    this.svc.sshKeys.update((rows) => rows.map((k) => (k.id === row.id ? { ...k, status: 'running', ageDays: 0 } : k)))
    this.toast.success(`Rotación programada: ${row.name}`)
  }

  handleRevokeExposure = (row: SecretExposure): void => {
    this.svc.exposures.update((rows) => rows.filter((e) => e.id !== row.id))
    this.svc.refreshKpis()
    this.toast.success(`Secreto revocado en ${row.location}`)
  }

  handleApplyRecommendation = (row: SecurityRecommendation): void => {
    this.svc.recommendations.update((rows) => rows.map((r) => (r.id === row.id ? { ...r, status: 'running' } : r)))
    this.toast.success(`Aplicando: ${row.title}`)
  }
}
