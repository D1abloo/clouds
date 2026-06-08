import { DatePipe } from '@angular/common'
import { Component, computed, inject, signal } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { debounceTime } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { MatDialog, MatDialogModule } from '@angular/material/dialog'
import { ToastService } from '../../core/services/toast.service'
import { ChangeRequestDetailDialogComponent } from './change-request-detail-dialog.component'
import { ChangeCreateDialogComponent, type ChangeCreateDialogResult } from './change-create-dialog.component'
import {
  ChangeMaintenanceWindowDialogComponent,
  type MaintenanceWindowDialogResult,
} from './change-maintenance-window-dialog.component'
import { ChangeMaintenanceWindowDetailDialogComponent } from './change-maintenance-window-detail-dialog.component'
import { ChangeTemplateDetailDialogComponent } from './change-template-detail-dialog.component'
import { ChangeManagementService } from './change-management.service'
import {
  CHANGE_RISK_LABELS,
  CHANGE_STATUS_LABELS,
  CHANGE_TYPE_LABELS,
  HISTORY_CHANGE_STATUSES,
  OPEN_CHANGE_STATUSES,
} from './change-management.config'
import {
  computeChangeDuration,
  defaultChangeTemplatesSnapshot,
  getActiveLinkedChangesForWindow,
  getLinkedChangesForWindow,
  type ChangeRequest,
  type ChangeRisk,
  type ChangeTemplate,
  type ChangeType,
  type MaintenanceWindow,
} from './change-management.demo'
import { primaryChangeLogo, templateLogo } from './change-management-logo.util'
import { ProConfigGateComponent } from '../../shared/components/pro-config-gate/pro-config-gate.component'
import { NavIconComponent } from '../../shared/components/nav-icon/nav-icon.component'

type ChangesView = 'changes' | 'calendar' | 'templates' | 'history'

@Component({
  selector: 'app-change-management-page',
  standalone: true,
  imports: [
    ProConfigGateComponent,
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule,
    NavIconComponent,
  ],
  template: `
    <app-pro-config-gate module="Gestión de cambios">
    <div class="page-container chg-page animate-fade-in">
      <section class="chg-intro">
        <div class="chg-intro__main">
          <span class="chg-intro__eyebrow">Gobierno operativo</span>
          <h2 class="chg-intro__title">Gestor de cambios</h2>
          <p class="chg-intro__desc">
            Control centralizado de RFCs: ventanas de mantenimiento, aprobaciones CAB, planes de
            implementación y rollback. Integrado con Terraform, Kubernetes, runbooks y aprobaciones.
          </p>
        </div>
        <div class="chg-intro__actions">
          <button type="button" class="chg-btn chg-btn--primary" (click)="openCreateDialog()">
            <mat-icon>add</mat-icon>
            Nuevo cambio
          </button>
          <button type="button" class="chg-btn" (click)="openMaintenanceDialog()">
            <mat-icon>event</mat-icon>
            Ventana de mantenimiento
          </button>
          <button type="button" class="chg-btn" (click)="handleExport()">
            <mat-icon>download</mat-icon>
            Exportar
          </button>
        </div>
      </section>

      <div class="chg-bar">
        <nav class="chg-tabs" role="tablist" aria-label="Vistas del gestor de cambios">
          @for (tab of tabs; track tab.id) {
            <button
              type="button"
              role="tab"
              class="chg-tabs__tab"
              [class.chg-tabs__tab--on]="view() === tab.id"
              [attr.aria-selected]="view() === tab.id"
              (click)="handleViewChange(tab.id)"
            >
              <mat-icon>{{ tab.icon }}</mat-icon>
              {{ tab.label }}
              @if (tab.id === 'changes' && openCount() > 0) {
                <span class="chg-tabs__badge">{{ openCount() }}</span>
              }
            </button>
          }
        </nav>

        @if (view() === 'changes' || view() === 'history') {
          <label class="chg-search">
            <mat-icon>search</mat-icon>
            <input
              type="search"
              [formControl]="searchControl"
              placeholder="Buscar ID, título, servicio, solicitante…"
              aria-label="Buscar cambios"
            />
          </label>
        }
      </div>

      @if (view() === 'changes') {
        <div class="chg-filters" aria-label="Filtros de cambios">
          <label class="chg-filter">
            <span>Tipo</span>
            <select [formControl]="typeFilterControl" aria-label="Filtrar por tipo">
              <option value="">Todos</option>
              @for (t of typeFilterOptions; track t.id) {
                <option [value]="t.id">{{ t.label }}</option>
              }
            </select>
          </label>
          <label class="chg-filter">
            <span>Riesgo</span>
            <select [formControl]="riskFilterControl" aria-label="Filtrar por riesgo">
              <option value="">Todos</option>
              @for (r of riskFilterOptions; track r.id) {
                <option [value]="r.id">{{ r.label }}</option>
              }
            </select>
          </label>
        </div>
      }

      @if (view() === 'history') {
        <div class="chg-filters" aria-label="Filtros de historial">
          <label class="chg-filter">
            <span>Resultado</span>
            <select [formControl]="resultFilterControl" aria-label="Filtrar por resultado">
              <option value="">Todos</option>
              @for (s of historyResultOptions; track s.id) {
                <option [value]="s.id">{{ s.label }}</option>
              }
            </select>
          </label>
        </div>
      }

      @if (view() === 'changes' || view() === 'history') {
        <div class="chg-workspace">
          <div class="chg-table-wrap">
            <table class="chg-table" [attr.aria-label]="view() === 'history' ? 'Historial de cambios' : 'Lista de cambios'">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Título</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  @if (view() === 'changes') {
                    <th>Ventana MW</th>
                  }
                  <th>Ventana</th>
                  <th>Servicio</th>
                  <th>Solicitante</th>
                  <th>Riesgo</th>
                  @if (view() === 'history') {
                    <th>Resultado</th>
                    <th>Duración</th>
                  }
                  <th aria-label="Acciones"></th>
                </tr>
              </thead>
              <tbody>
                @for (row of tableRows(); track row.id) {
                  <tr
                    [class.chg-table__row--on]="selectedId() === row.id"
                    [attr.data-risk]="row.risk"
                    (click)="openChangeDetail(row)"
                    (keydown.enter)="openChangeDetail(row)"
                    tabindex="0"
                    role="button"
                    [attr.aria-label]="'Ver detalle de ' + row.title"
                  >
                    <td class="mono">{{ row.id }}</td>
                    <td class="chg-table__title">
                      <span class="chg-table__title-inner">
                        @if (changeLogo(row); as logo) {
                          <app-nav-icon [logo]="logo" size="sm" />
                        }
                        <span>{{ row.title }}</span>
                      </span>
                    </td>
                    <td>{{ typeLabel(row.type) }}</td>
                    <td><span class="chg-pill" [attr.data-status]="row.status">{{ statusLabel(row.status) }}</span></td>
                    @if (view() === 'changes') {
                      <td class="chg-table__mw">{{ windowTitle(row.maintenanceWindowId) }}</td>
                    }
                    <td class="chg-table__window">
                      {{ row.windowStart | date: 'dd MMM HH:mm' }}
                    </td>
                    <td>{{ row.service }}</td>
                    <td>{{ row.requester }}</td>
                    <td><span class="chg-risk" [attr.data-risk]="row.risk">{{ riskLabel(row.risk) }}</span></td>
                    @if (view() === 'history') {
                      <td><span class="chg-pill" [attr.data-status]="row.status">{{ statusLabel(row.status) }}</span></td>
                      <td class="chg-table__duration">{{ changeDuration(row) }}</td>
                    }
                    <td class="chg-table__actions" (click)="$event.stopPropagation()" (keydown)="$event.stopPropagation()">
                      <button
                        type="button"
                        class="chg-icon-btn"
                        [matMenuTriggerFor]="rowMenu"
                        aria-label="Acciones del cambio"
                      >
                        <mat-icon>more_vert</mat-icon>
                      </button>
                      <mat-menu #rowMenu="matMenu">
                        <button mat-menu-item (click)="openChangeDetail(row)">
                          <mat-icon>visibility</mat-icon>
                          Ver detalle
                        </button>
                        @if (canApproveRow(row)) {
                          <button mat-menu-item (click)="handleApprove(row)">
                            <mat-icon>check</mat-icon>
                            Aprobar
                          </button>
                          <button mat-menu-item (click)="handleReject(row)">
                            <mat-icon>close</mat-icon>
                            Rechazar
                          </button>
                        }
                        @if (canExecuteRow(row)) {
                          <button mat-menu-item (click)="handleExecute(row)">
                            <mat-icon>play_arrow</mat-icon>
                            Ejecutar
                          </button>
                        }
                        @if (canCancelRow(row)) {
                          <button mat-menu-item (click)="handleCancel(row)">
                            <mat-icon>block</mat-icon>
                            Cancelar
                          </button>
                        }
                      </mat-menu>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td [attr.colspan]="view() === 'history' ? 11 : 10" class="chg-table__empty">
                      No hay cambios que coincidan con los filtros.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      @if (view() === 'calendar') {
        <div class="chg-calendar">
          <header class="chg-calendar__head">
            <div>
              <h3>Calendario semanal</h3>
              <span class="chg-calendar__range">{{ calendarWeekLabel() }}</span>
            </div>
          </header>

          <div class="chg-calendar__grid" role="grid" aria-label="Calendario de ventanas y cambios">
            @for (day of calendarWeekDays(); track day.key) {
              <div class="chg-cal-col" role="gridcell">
                <header class="chg-cal-col__head" [class.chg-cal-col__head--today]="day.isToday">
                  <span class="chg-cal-col__dow">{{ day.dow }}</span>
                  <strong>{{ day.dayNum }}</strong>
                </header>
                <div class="chg-cal-col__body">
                  @for (mw of day.windows; track mw.id) {
                    <button
                      type="button"
                      class="chg-mw-card"
                      [attr.data-status]="mw.status"
                      (click)="openMaintenanceWindowDetail(mw)"
                      [attr.aria-label]="'Ver ventana ' + mw.title"
                    >
                      <span class="chg-mw-card__time">
                        {{ mw.start | date: 'HH:mm' }}–{{ mw.end | date: 'HH:mm' }}
                      </span>
                      <strong>{{ mw.title }}</strong>
                    </button>
                  }
                  @for (chg of day.changes; track chg.id) {
                    <button
                      type="button"
                      class="chg-cal-item"
                      [attr.data-risk]="chg.risk"
                      (click)="selectFromCalendar(chg)"
                    >
                      <span class="chg-cal-item__head">
                        @if (changeLogo(chg); as logo) {
                          <app-nav-icon [logo]="logo" size="sm" />
                        }
                        <span class="mono">{{ chg.id }}</span>
                      </span>
                      <strong>{{ chg.title }}</strong>
                    </button>
                  }
                  @if (!day.windows.length && !day.changes.length) {
                    <p class="chg-cal-empty">—</p>
                  }
                </div>
              </div>
            }
          </div>

          <section class="chg-calendar__strip" aria-label="Ventanas de mantenimiento">
            <h4>Ventanas de mantenimiento</h4>
            <div class="chg-calendar__strip-row">
              @for (mw of maintenanceWindows(); track mw.id) {
                <button
                  type="button"
                  class="chg-mw-chip"
                  [attr.data-status]="mw.status"
                  (click)="openMaintenanceWindowDetail(mw)"
                >
                  <span class="chg-mw-chip__time">
                    {{ mw.start | date: 'dd MMM HH:mm' }} – {{ mw.end | date: 'HH:mm' }}
                  </span>
                  <strong>{{ mw.title }}</strong>
                  <span>{{ mw.environment }} · {{ linkedCountForWindow(mw.id) }} RFC</span>
                </button>
              }
            </div>
          </section>
        </div>
      }

      @if (view() === 'templates') {
        <div class="chg-templates">
          @for (tpl of templates(); track tpl.id) {
            <article class="chg-tpl">
              <header>
                <span class="chg-tpl__cat">
                  @if (templateLogoKey(tpl); as logo) {
                    <app-nav-icon [logo]="logo" size="sm" />
                  }
                  {{ tpl.category }}
                </span>
                <span class="chg-pill" [attr.data-status]="'draft'">{{ typeLabel(tpl.type) }}</span>
              </header>
              <h3>{{ tpl.name }}</h3>
              <p>{{ tpl.description }}</p>
              <dl>
                <div><dt>Duración</dt><dd>{{ tpl.estimatedDuration }}</dd></div>
                <div><dt>Riesgo</dt><dd>{{ riskLabel(tpl.defaultRisk) }}</dd></div>
                <div><dt>Servicios</dt><dd>{{ tpl.services.join(', ') }}</dd></div>
              </dl>
              <ol class="chg-tpl__steps">
                @for (step of tpl.steps; track step) {
                  <li>{{ step }}</li>
                }
              </ol>
              <div class="chg-tpl__actions">
                <button type="button" class="chg-btn chg-btn--sm" (click)="openTemplateDetail(tpl)">
                  <mat-icon>visibility</mat-icon>
                  Ver plantilla
                </button>
                <button type="button" class="chg-btn chg-btn--sm chg-btn--primary" (click)="createFromTemplate(tpl)">
                  <mat-icon>add</mat-icon>
                  Usar plantilla
                </button>
              </div>
            </article>
          }
        </div>
      }
    </div>
    </app-pro-config-gate>
  `,
  styles: `
    :host { display: block; flex: 1; min-height: 0; }
    .chg-page {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      flex: 1;
      min-height: 0;
      overflow: hidden;
      color: #0f172a;
      font-size: 0.8125rem;
      line-height: 1.45;
    }
    .chg-intro {
      flex-shrink: 0;
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.15rem 0.1rem 0.35rem;
    }
    .chg-intro__eyebrow {
      display: block;
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #94a3b8;
      margin-bottom: 0.2rem;
    }
    .chg-intro__title {
      margin: 0 0 0.35rem;
      font-size: 1.05rem;
      font-weight: 700;
    }
    .chg-intro__desc {
      margin: 0;
      max-width: 42rem;
      font-size: 0.72rem;
      color: #64748b;
      line-height: 1.55;
    }
    .chg-intro__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      align-items: flex-start;
      height: fit-content;
      padding: 0;
    }
    .chg-bar {
      flex-shrink: 0;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.55rem;
    }
    .chg-tabs {
      display: flex;
      gap: 0.2rem;
      padding: 0.2rem;
      border-radius: 10px;
      background: #f8fafc;
    }
    .chg-tabs__tab {
      display: inline-flex;
      align-items: center;
      gap: 0.32rem;
      padding: 0.38rem 0.65rem;
      border: none;
      border-radius: 8px;
      background: transparent;
      font: inherit;
      font-size: 0.72rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
    }
    .chg-tabs__tab mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; }
    .chg-tabs__tab--on { color: #0f172a; background: #fff; }
    .chg-tabs__badge {
      padding: 0.05rem 0.35rem;
      border-radius: 999px;
      background: #fef3c7;
      color: #b45309;
      font-size: 0.58rem;
      font-weight: 700;
    }
    .chg-search {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      flex: 1;
      min-width: 12rem;
      max-width: 22rem;
      padding: 0.35rem 0.55rem;
      border-radius: 9px;
      background: #f8fafc;
      margin-left: auto;
    }
    .chg-search mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; color: #94a3b8; }
    .chg-search input {
      flex: 1;
      border: none;
      background: transparent;
      font: inherit;
      font-size: 0.72rem;
      outline: none;
    }
    .chg-filters {
      flex-shrink: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
    }
    .chg-filter {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.68rem;
      color: #64748b;
    }
    .chg-filter span {
      font-weight: 650;
      text-transform: uppercase;
      font-size: 0.55rem;
      letter-spacing: 0.04em;
    }
    .chg-filter select {
      padding: 0.3rem 0.45rem;
      border: 1px solid #e2e8f0;
      border-radius: 7px;
      background: #fff;
      font: inherit;
      font-size: 0.68rem;
      color: #334155;
    }
    .chg-btn {
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
      color: #475569;
      cursor: pointer;
    }
    .chg-btn mat-icon { display: block; margin: 0; font-size: 0.85rem; width: 0.85rem; height: 0.85rem; }
    .chg-btn--primary { background: #1e293b; border-color: #0f172a; color: #fff; }
    .chg-btn--sm { padding: 0.32rem 0.45rem; font-size: 0.72rem; }
    .chg-workspace {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .chg-table-wrap {
      min-height: 0;
      overflow: auto;
      scrollbar-width: thin;
      border-radius: 11px;
      background: #fff;
      border: 1px solid #e2e8f0;
    }
    .chg-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.68rem;
    }
    .chg-table th {
      position: sticky;
      top: 0;
      z-index: 1;
      padding: 0.45rem 0.55rem;
      text-align: left;
      font-size: 0.55rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #94a3b8;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }
    .chg-table td {
      padding: 0.45rem 0.55rem;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    .chg-table tbody tr {
      cursor: pointer;
      transition: background 0.12s;
    }
    .chg-table tbody tr:hover { background: #f8fafc; }
    .chg-table__row--on { background: #f1f5f9 !important; }
    .chg-table__title {
      max-width: 14rem;
      font-weight: 600;
    }
    .chg-table__title-inner {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      max-width: 100%;
    }
    .chg-table__title-inner > span {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .chg-table__window,
    .chg-table__mw,
    .chg-table__duration { white-space: nowrap; color: #64748b; }
    .chg-table__mw { max-width: 9rem; overflow: hidden; text-overflow: ellipsis; }
    .chg-table__actions { width: 2rem; text-align: center; }
    .chg-table__empty {
      padding: 2rem;
      text-align: center;
      color: #94a3b8;
    }
    .chg-icon-btn {
      display: inline-flex;
      padding: 0.2rem;
      border: none;
      border-radius: 6px;
      background: transparent;
      cursor: pointer;
      color: #64748b;
    }
    .chg-icon-btn mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
    .chg-pill {
      display: inline-block;
      padding: 0.1rem 0.35rem;
      border-radius: 999px;
      font-size: 0.52rem;
      font-weight: 700;
      text-transform: uppercase;
      background: #f1f5f9;
      color: #64748b;
    }
    .chg-pill[data-status='pending_approval'] { background: #fef3c7; color: #b45309; }
    .chg-pill[data-status='approved'],
    .chg-pill[data-status='completed'] { background: #ecfdf5; color: #059669; }
    .chg-pill[data-status='in_progress'],
    .chg-pill[data-status='scheduled'] { background: #eff6ff; color: #2563eb; }
    .chg-pill[data-status='rejected'],
    .chg-pill[data-status='failed'] { background: #fef2f2; color: #dc2626; }
    .chg-pill[data-status='cancelled'] { background: #f1f5f9; color: #64748b; }
    .chg-risk { font-weight: 700; font-size: 0.62rem; }
    .chg-risk[data-risk='critical'] { color: #dc2626; }
    .chg-risk[data-risk='high'] { color: #ea580c; }
    .chg-risk[data-risk='medium'] { color: #d97706; }
    .chg-risk[data-risk='low'] { color: #059669; }
    .chg-calendar {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
    }
    .chg-calendar__head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .chg-calendar__head h3 {
      margin: 0;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
    }
    .chg-calendar__range {
      display: block;
      margin-top: 0.15rem;
      font-size: 0.65rem;
      color: #94a3b8;
    }
    .chg-calendar__grid {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 0.3rem;
    }
    .chg-cal-col {
      display: flex;
      flex-direction: column;
      max-height: 9.5rem;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #fff;
      overflow: hidden;
    }
    .chg-cal-col__head {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
      padding: 0.28rem 0.2rem;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }
    .chg-cal-col__head--today {
      background: #eff6ff;
      border-bottom-color: #bfdbfe;
    }
    .chg-cal-col__head--today strong { color: #2563eb; }
    .chg-cal-col__dow {
      font-size: 0.5rem;
      font-weight: 700;
      text-transform: uppercase;
      color: #94a3b8;
    }
    .chg-cal-col__head strong { font-size: 0.72rem; }
    .chg-cal-col__body {
      flex: 1;
      min-height: 0;
      padding: 0.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      overflow-y: auto;
      scrollbar-width: thin;
    }
    .chg-mw-card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.05rem;
      width: 100%;
      padding: 0.28rem 0.32rem;
      border: 1px solid #e2e8f0;
      border-radius: 5px;
      background: #f8fafc;
      text-align: left;
      font: inherit;
      cursor: pointer;
    }
    .chg-mw-card:hover { background: #f1f5f9; }
    .chg-mw-card[data-status='active'] { border-left: 2px solid #2563eb; }
    .chg-mw-card__time { font-size: 0.5rem; color: #94a3b8; }
    .chg-mw-card strong {
      font-size: 0.58rem;
      line-height: 1.25;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .chg-cal-item {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.04rem;
      width: 100%;
      padding: 0.28rem 0.32rem;
      border: 1px solid #f1f5f9;
      border-radius: 5px;
      background: #fff;
      text-align: left;
      font: inherit;
      cursor: pointer;
    }
    .chg-cal-item:hover { background: #f8fafc; }
    .chg-cal-item .mono { font-size: 0.5rem; color: #94a3b8; }
    .chg-cal-item__head {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
    }
    .chg-cal-item strong {
      font-size: 0.58rem;
      line-height: 1.25;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .chg-cal-empty {
      font-size: 0.55rem;
      color: #cbd5e1;
      margin: auto;
      text-align: center;
    }
    .chg-calendar__strip h4 {
      margin: 0 0 0.35rem;
      font-size: 0.62rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #94a3b8;
    }
    .chg-calendar__strip-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }
    .chg-mw-chip {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.06rem;
      min-width: 10rem;
      max-width: 14rem;
      padding: 0.4rem 0.55rem;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #f8fafc;
      text-align: left;
      font: inherit;
      cursor: pointer;
    }
    .chg-mw-chip:hover { background: #f1f5f9; border-color: #cbd5e1; }
    .chg-mw-chip[data-status='active'] { border-left: 3px solid #2563eb; }
    .chg-mw-chip__time { font-size: 0.52rem; color: #94a3b8; }
    .chg-mw-chip strong {
      font-size: 0.65rem;
      line-height: 1.25;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    .chg-mw-chip span:last-child { font-size: 0.52rem; color: #64748b; }
    .chg-templates {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      scrollbar-width: thin;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 0.65rem;
      align-content: start;
    }
    .chg-tpl {
      padding: 0.75rem 0.85rem;
      border-radius: 12px;
      background: #fff;
      border: 1px solid #e2e8f0;
    }
    .chg-tpl header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.35rem;
      font-size: 0.58rem;
      font-weight: 650;
      text-transform: uppercase;
      color: #94a3b8;
    }
    .chg-tpl__cat {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
    }
    .chg-tpl h3 { margin: 0 0 0.3rem; font-size: 0.82rem; font-weight: 700; }
    .chg-tpl p { margin: 0 0 0.5rem; font-size: 0.68rem; color: #64748b; line-height: 1.45; }
    .chg-tpl dl {
      display: grid;
      gap: 0.25rem;
      margin: 0 0 0.5rem;
    }
    .chg-tpl dt { font-size: 0.52rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; }
    .chg-tpl dd { margin: 0; font-size: 0.65rem; color: #334155; }
    .chg-tpl__steps {
      margin: 0 0 0.55rem;
      padding-left: 1.1rem;
      font-size: 0.62rem;
      color: #475569;
    }
    .chg-tpl__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }
    .mono { font-family: var(--app-font-mono, ui-monospace, monospace); }
    @media (max-width: 1100px) {
      .chg-calendar__grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    }
    @media (max-width: 640px) {
      .chg-calendar__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .chg-mw-chip { min-width: calc(50% - 0.2rem); max-width: none; flex: 1 1 calc(50% - 0.2rem); }
    }
  `,
})
export class ChangeManagementPageComponent {
  private readonly toast = inject(ToastService)
  private readonly dialog = inject(MatDialog)
  private readonly svc = inject(ChangeManagementService)

  readonly view = signal<ChangesView>('changes')
  readonly changes = this.svc.changes
  readonly maintenanceWindows = this.svc.maintenanceWindows
  readonly templates = signal<ChangeTemplate[]>(defaultChangeTemplatesSnapshot())
  readonly selectedId = signal<string | null>(
    this.svc.changes().find((c) => OPEN_CHANGE_STATUSES.includes(c.status))?.id ?? null,
  )

  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly typeFilterControl = new FormControl('', { nonNullable: true })
  readonly riskFilterControl = new FormControl('', { nonNullable: true })
  readonly resultFilterControl = new FormControl('', { nonNullable: true })

  private readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(200)),
    { initialValue: '' },
  )
  private readonly typeFilter = toSignal(this.typeFilterControl.valueChanges, { initialValue: '' })
  private readonly riskFilter = toSignal(this.riskFilterControl.valueChanges, { initialValue: '' })
  private readonly resultFilter = toSignal(this.resultFilterControl.valueChanges, { initialValue: '' })

  readonly typeFilterOptions = (Object.entries(CHANGE_TYPE_LABELS) as [ChangeType, string][]).map(
    ([id, label]) => ({ id, label }),
  )
  readonly riskFilterOptions = (Object.entries(CHANGE_RISK_LABELS) as [ChangeRisk, string][]).map(
    ([id, label]) => ({ id, label }),
  )
  readonly historyResultOptions = HISTORY_CHANGE_STATUSES.map((id) => ({
    id,
    label: CHANGE_STATUS_LABELS[id],
  }))

  readonly tabs = [
    { id: 'changes' as const, label: 'Cambios', icon: 'list_alt' },
    { id: 'calendar' as const, label: 'Calendario', icon: 'calendar_month' },
    { id: 'templates' as const, label: 'Plantillas', icon: 'content_copy' },
    { id: 'history' as const, label: 'Historial', icon: 'history' },
  ]

  readonly openCount = this.svc.openCount

  readonly tableRows = computed(() => {
    const q = this.searchTerm().trim().toLowerCase()
    const statuses =
      this.view() === 'history' ? HISTORY_CHANGE_STATUSES : OPEN_CHANGE_STATUSES
    const typeF = this.typeFilter()
    const riskF = this.riskFilter()
    const resultF = this.resultFilter()

    return this.changes()
      .filter((c) => statuses.includes(c.status))
      .filter((c) => (this.view() === 'changes' && typeF ? c.type === typeF : true))
      .filter((c) => (this.view() === 'changes' && riskF ? c.risk === riskF : true))
      .filter((c) => (this.view() === 'history' && resultF ? c.status === resultF : true))
      .filter((c) => {
        if (!q) return true
        const haystack = [c.id, c.title, c.service, c.requester, ...c.tags].join(' ').toLowerCase()
        return haystack.includes(q)
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  })


  readonly calendarWeekDays = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(today)
    start.setDate(start.getDate() - start.getDay() + 1)

    const windows = this.maintenanceWindows()
    const scheduled = this.changes().filter((c) =>
      ['scheduled', 'approved', 'in_progress', 'pending_approval'].includes(c.status),
    )

    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start)
      day.setDate(start.getDate() + i)
      const key = day.toISOString().slice(0, 10)
      const dayEnd = new Date(day)
      dayEnd.setHours(23, 59, 59, 999)

      const dayWindows = windows.filter((mw) => {
        const mwStart = new Date(mw.start)
        const mwEnd = new Date(mw.end)
        return mwStart <= dayEnd && mwEnd >= day
      })

      const dayChanges = scheduled.filter((c) => c.windowStart.slice(0, 10) === key)

      return {
        key,
        dow: day.toLocaleDateString('es-ES', { weekday: 'short' }),
        dayNum: day.getDate(),
        isToday: key === today.toISOString().slice(0, 10),
        windows: dayWindows,
        changes: dayChanges.sort(
          (a, b) => new Date(a.windowStart).getTime() - new Date(b.windowStart).getTime(),
        ),
      }
    })
  })

  readonly calendarWeekLabel = computed(() => {
    const days = this.calendarWeekDays()
    if (!days.length) return ''
    const first = new Date(days[0].key + 'T12:00:00')
    const last = new Date(days[days.length - 1].key + 'T12:00:00')
    const fmt = (d: Date): string =>
      d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    return `${fmt(first)} – ${fmt(last)}`
  })

  typeLabel = (t: ChangeRequest['type']): string => CHANGE_TYPE_LABELS[t]
  statusLabel = (s: ChangeRequest['status']): string => CHANGE_STATUS_LABELS[s]
  riskLabel = (r: ChangeRisk): string => CHANGE_RISK_LABELS[r]

  mwStatusLabel = (s: 'scheduled' | 'active' | 'completed'): string => {
    const map = { scheduled: 'Programada', active: 'Activa', completed: 'Completada' }
    return map[s]
  }

  windowTitle = (windowId?: string): string => {
    if (!windowId) return '—'
    return this.maintenanceWindows().find((mw) => mw.id === windowId)?.title ?? windowId
  }

  linkedCountForWindow = (windowId: string): number =>
    getActiveLinkedChangesForWindow(windowId, this.changes()).length

  changeDuration = (change: ChangeRequest): string => computeChangeDuration(change) ?? '—'

  changeLogo = (change: ChangeRequest) => primaryChangeLogo(change)
  templateLogoKey = (template: ChangeTemplate) => templateLogo(template)

  handleViewChange = (next: ChangesView): void => {
    this.view.set(next)
    if (next === 'changes' || next === 'history') {
      const first = this.tableRows()[0]
      this.selectedId.set(first?.id ?? null)
    }
  }

  canApproveRow = (row: ChangeRequest): boolean =>
    row.status === 'pending_approval' || row.status === 'draft'

  canExecuteRow = (row: ChangeRequest): boolean =>
    row.status === 'approved' || row.status === 'scheduled'

  canCancelRow = (row: ChangeRequest): boolean =>
    !['completed', 'failed', 'cancelled', 'rejected'].includes(row.status)

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

  handleCancel = (chg: ChangeRequest): void => {
    const updated = this.svc.cancel(chg.id)
    if (!updated) {
      this.toast.warning('Este RFC ya está cerrado y no se puede cancelar')
      return
    }
    this.toast.info(`Cambio ${chg.id} cancelado`)
  }

  openChangeDetail = (chg: ChangeRequest): void => {
    this.selectedId.set(chg.id)
    this.dialog.open(ChangeRequestDetailDialogComponent, {
      width: 'min(860px, 96vw)',
      maxWidth: '96vw',
      maxHeight: '92vh',
      panelClass: 'chg-rfc-detail-dialog-panel',
      data: { change: chg },
    })
  }

  selectFromCalendar = (chg: ChangeRequest): void => {
    this.openChangeDetail(chg)
  }

  openCreateDialog = (): void => {
    const ref = this.dialog.open(ChangeCreateDialogComponent, {
      width: 'min(660px, 94vw)',
      maxWidth: '94vw',
      panelClass: 'chg-form-dialog-panel',
      data: { windows: this.maintenanceWindows() },
    })
    ref.afterClosed().subscribe((result: ChangeCreateDialogResult | undefined) => {
      if (!result) return
      const created = this.svc.create(result)
      this.selectedId.set(created.id)
      this.view.set('changes')
      this.toast.success(`RFC ${created.id} creado`)
    })
  }

  openMaintenanceDialog = (): void => {
    const ref = this.dialog.open(ChangeMaintenanceWindowDialogComponent, {
      width: 'min(660px, 94vw)',
      maxWidth: '94vw',
      panelClass: 'chg-form-dialog-panel',
    })
    ref.afterClosed().subscribe((result: MaintenanceWindowDialogResult | undefined) => {
      if (!result) return
      const mw = this.svc.addMaintenanceWindow(result)
      this.toast.success(`Ventana ${mw.id} programada`)
    })
  }

  openMaintenanceWindowDetail = (mw: MaintenanceWindow): void => {
    this.dialog.open(ChangeMaintenanceWindowDetailDialogComponent, {
      width: 'min(780px, 96vw)',
      maxWidth: '96vw',
      maxHeight: '92vh',
      panelClass: 'chg-detail-dialog-panel',
      data: {
        window: mw,
        linkedChanges: getLinkedChangesForWindow(mw.id, this.changes()),
      },
    })
  }

  openTemplateDetail = (tpl: ChangeTemplate): void => {
    this.dialog.open(ChangeTemplateDetailDialogComponent, {
      width: 'min(780px, 96vw)',
      maxWidth: '96vw',
      maxHeight: '92vh',
      panelClass: 'chg-detail-dialog-panel',
      data: { template: tpl },
    })
  }

  createFromTemplate = (tpl: ChangeTemplate): void => {
    const ref = this.dialog.open(ChangeCreateDialogComponent, {
      width: 'min(660px, 94vw)',
      maxWidth: '94vw',
      panelClass: 'chg-form-dialog-panel',
      data: {
        windows: this.maintenanceWindows(),
        template: tpl,
        templateId: tpl.id,
      },
    })
    ref.afterClosed().subscribe((result: ChangeCreateDialogResult | undefined) => {
      if (!result) return
      const created = this.svc.create({
        ...result,
        templateId: tpl.id,
      })
      this.selectedId.set(created.id)
      this.view.set('changes')
      this.toast.success(`RFC creado desde plantilla — ${created.id}`)
    })
  }

  handleExport = (): void => {
    const payload = {
      exportedAt: new Date().toISOString(),
      changes: this.changes(),
      maintenanceWindows: this.maintenanceWindows(),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cambios-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    this.toast.success('Exportación descargada')
  }
}
