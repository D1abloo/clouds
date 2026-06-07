import { DatePipe } from '@angular/common'
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { debounceTime, startWith } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import {
  AUDIT_ACCENT,
  AUDIT_ACCENT_BORDER,
  AUDIT_ACCENT_LIGHT,
  auditActionLabel,
  auditModuleIcon,
  auditRelativeTime,
  auditRiskLabel,
  auditUserInitials,
} from './audit.config'
import type { AuditActivityEntry } from './audit.demo'

interface ActivityDateGroup {
  label: string
  entries: AuditActivityEntry[]
}

@Component({
  selector: 'app-audit-activity-log',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    StatusBadgeComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
  ],
  template: `
    <section class="actlog">
      <header class="actlog__hero">
        <div class="actlog__hero-main">
          <h3>Registro de actividad</h3>
          <p>Trail inmutable de operaciones en la plataforma. Cada evento incluye actor, recurso, entorno, correlación y metadatos forenses.</p>
        </div>
        <div class="actlog__hero-stats">
          @for (stat of heroStats(); track stat.label) {
            <article class="actlog__stat">
              <span>{{ stat.label }}</span>
              <strong>{{ stat.value }}</strong>
            </article>
          }
        </div>
      </header>

      <div class="actlog__toolbar">
        <label class="actlog__search">
          <mat-icon>search</mat-icon>
          <input type="search" [formControl]="searchControl" placeholder="Buscar acción, recurso, usuario…" aria-label="Buscar en registro" />
        </label>
        <select class="actlog__select" [formControl]="moduleControl" aria-label="Filtrar módulo">
          <option value="">Todos los módulos</option>
          @for (m of moduleOptions(); track m) { <option [value]="m">{{ m }}</option> }
        </select>
        <select class="actlog__select" [formControl]="statusControl" aria-label="Filtrar estado">
          <option value="">Todos los estados</option>
          <option value="success">Éxito</option>
          <option value="running">En curso</option>
          <option value="warning">Advertencia</option>
          <option value="failed">Fallido</option>
        </select>
        <select class="actlog__select" [formControl]="envControl" aria-label="Filtrar entorno">
          <option value="">Todos los entornos</option>
          @for (e of envOptions(); track e) { <option [value]="e">{{ e }}</option> }
        </select>
        <span class="actlog__result-count">{{ filtered().length }} eventos</span>
      </div>

      @if (loading()) {
        <app-loading-state />
      } @else if (error()) {
        <app-error-state [message]="error()!" (retry)="refresh.emit()" />
      } @else if (filtered().length === 0) {
        <app-empty-state title="Sin registros" description="Ajusta los filtros o amplía el rango temporal." />
      } @else {
        <div class="actlog__table-wrap">
          <table class="actlog__table" aria-label="Registro de actividad">
            <thead>
              <tr>
                <th scope="col">Evento</th>
                <th scope="col">Actor</th>
                <th scope="col">Recurso</th>
                <th scope="col">Entorno</th>
                <th scope="col">Estado</th>
                <th scope="col">Riesgo</th>
                <th scope="col">Tiempo</th>
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody>
              @for (group of grouped(); track group.label) {
                <tr class="actlog__date-row"><td colspan="8">{{ group.label }}</td></tr>
                @for (row of group.entries; track row.id) {
                  <tr class="actlog__row" tabindex="0" (click)="detail.emit(row)" (keydown.enter)="detail.emit(row)">
                    <td class="actlog__event">
                      <span class="actlog__icon" [attr.data-module]="row.module">
                        <mat-icon>{{ moduleIcon(row.module) }}</mat-icon>
                      </span>
                      <div>
                        <strong>{{ actionLabel(row.action) }}</strong>
                        <span class="actlog__module">{{ row.module }} · {{ row.category }}</span>
                        <p>{{ row.description }}</p>
                        @if (row.tags?.length) {
                          <div class="actlog__tags">
                            @for (tag of row.tags!.slice(0, 3); track tag) { <span>{{ tag }}</span> }
                          </div>
                        }
                      </div>
                    </td>
                    <td class="actlog__actor">
                      <span class="actlog__avatar" [attr.aria-label]="row.userId ?? 'Usuario'">{{ userInitials(row.userId) }}</span>
                      <div>
                        <span>{{ row.userId ?? '—' }}</span>
                        @if (row.ipAddress) { <span class="mono">{{ row.ipAddress }}</span> }
                      </div>
                    </td>
                    <td class="actlog__resource">
                      <span class="mono">{{ row.resource }}</span>
                      @if (row.correlationId) {
                        <button type="button" class="actlog__corr mono" (click)="handleCopyCorrelation($event, row.correlationId!)">
                          <mat-icon>link</mat-icon>{{ row.correlationId }}
                        </button>
                      }
                      @if (row.outcome) { <span class="actlog__outcome">{{ row.outcome }}</span> }
                    </td>
                    <td>
                      <span class="actlog__env" [attr.data-env]="row.environment">{{ row.environment ?? '—' }}</span>
                    </td>
                    <td><app-status-badge [value]="row.status" /></td>
                    <td>
                      @if (row.riskLevel) {
                        <span class="actlog__risk" [attr.data-risk]="row.riskLevel">{{ riskLabel(row.riskLevel) }}</span>
                      } @else { <span class="actlog__muted">—</span> }
                    </td>
                    <td class="actlog__time">
                      <span class="actlog__rel" [title]="row.createdAt">{{ relativeTime(row.createdAt) }}</span>
                      <time>{{ row.createdAt | date: 'HH:mm:ss' }}</time>
                      @if (row.duration && row.duration !== '—') {
                        <span class="actlog__dur"><mat-icon>timer</mat-icon>{{ row.duration }}</span>
                      }
                    </td>
                    <td class="actlog__actions">
                      <button type="button" class="actlog__view" (click)="handleView($event, row)" aria-label="Ver detalle">
                        <mat-icon>open_in_new</mat-icon>
                      </button>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <footer class="actlog__footer">
          <span><mat-icon>info</mat-icon> Retención: 395 días · Inmutable · Hash SHA-256 por evento</span>
          <span>{{ filtered().length }} de {{ activities().length }} visibles</span>
        </footer>
      }
    </section>
  `,
  styles: `
    .actlog { display: flex; flex-direction: column; gap: 0; }
    .actlog__hero {
      display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.75rem;
      padding: 0.85rem 1rem; border-bottom: 1px solid #e2e8f0;
      background: linear-gradient(135deg, ${AUDIT_ACCENT_LIGHT} 0%, #fff 60%);
    }
    .actlog__hero h3 { margin: 0; font-size: 0.92rem; font-weight: 700; color: #0f172a; }
    .actlog__hero p { margin: 0.25rem 0 0; max-width: 36rem; font-size: 0.68rem; color: #64748b; line-height: 1.5; }
    .actlog__hero-stats { display: flex; flex-wrap: wrap; gap: 0.45rem; }
    .actlog__stat {
      min-width: 5.5rem; padding: 0.4rem 0.6rem; border-radius: 9px;
      background: #fff; border: 1px solid ${AUDIT_ACCENT_BORDER}; text-align: center;
    }
    .actlog__stat span { display: block; font-size: 0.52rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; }
    .actlog__stat strong { font-size: 0.95rem; font-weight: 700; color: ${AUDIT_ACCENT}; }
    .actlog__toolbar {
      display: flex; flex-wrap: wrap; align-items: center; gap: 0.45rem;
      padding: 0.55rem 1rem; border-bottom: 1px solid #f1f5f9; background: #fafbfc;
    }
    .actlog__search {
      display: flex; align-items: center; gap: 0.35rem; flex: 1; min-width: 12rem; max-width: 18rem;
      padding: 0.38rem 0.6rem; border-radius: 9px; border: 1px solid ${AUDIT_ACCENT_BORDER}; background: #fff;
    }
    .actlog__search input { flex: 1; border: none; background: transparent; font: inherit; font-size: 0.72rem; outline: none; }
    .actlog__search mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; color: #94a3b8; }
    .actlog__select { padding: 0.38rem 0.55rem; border-radius: 9px; border: 1px solid ${AUDIT_ACCENT_BORDER}; font: inherit; font-size: 0.68rem; background: #fff; }
    .actlog__result-count { margin-left: auto; font-size: 0.64rem; font-weight: 600; color: #64748b; }
    .actlog__table-wrap { overflow-x: auto; }
    .actlog__table { width: 100%; border-collapse: collapse; font-size: 0.72rem; }
    .actlog__table th {
      text-align: left; padding: 0.55rem 0.75rem; font-size: 0.56rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.03em; color: #94a3b8;
      background: #f8fafc; border-bottom: 1px solid #e2e8f0; white-space: nowrap;
    }
    .actlog__date-row td {
      padding: 0.4rem 0.75rem; font-size: 0.58rem; font-weight: 700; text-transform: uppercase;
      color: ${AUDIT_ACCENT}; background: ${AUDIT_ACCENT_LIGHT}; border-bottom: 1px solid ${AUDIT_ACCENT_BORDER};
    }
    .actlog__row { cursor: pointer; transition: background 0.12s; }
    .actlog__row:hover td, .actlog__row:focus-visible td { background: #f0fdfa; }
    .actlog__row td { padding: 0.65rem 0.75rem; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    .actlog__event { display: flex; gap: 0.6rem; min-width: 14rem; }
    .actlog__icon {
      width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: ${AUDIT_ACCENT_LIGHT}; border: 1px solid ${AUDIT_ACCENT_BORDER};
    }
    .actlog__icon mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: ${AUDIT_ACCENT}; }
    .actlog__event strong { display: block; font-size: 0.78rem; color: #0f172a; }
    .actlog__module { font-size: 0.6rem; color: #94a3b8; }
    .actlog__event p { margin: 0.2rem 0 0; font-size: 0.66rem; color: #64748b; line-height: 1.4; max-width: 22rem; }
    .actlog__tags { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.3rem; }
    .actlog__tags span { padding: 0.06rem 0.35rem; border-radius: 999px; font-size: 0.55rem; font-weight: 600; background: #fff; border: 1px solid #e2e8f0; color: #64748b; }
    .actlog__actor { display: flex; gap: 0.45rem; align-items: flex-start; min-width: 9rem; }
    .actlog__avatar {
      width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.58rem; font-weight: 700; color: #fff; background: ${AUDIT_ACCENT};
    }
    .actlog__actor span { display: block; font-size: 0.68rem; }
    .actlog__actor .mono { font-size: 0.6rem; color: #94a3b8; margin-top: 0.1rem; }
    .actlog__resource { min-width: 10rem; max-width: 14rem; }
    .actlog__resource .mono { display: block; font-size: 0.68rem; word-break: break-all; }
    .actlog__corr {
      display: inline-flex; align-items: center; gap: 0.15rem; margin-top: 0.2rem;
      padding: 0.1rem 0.35rem; border-radius: 6px; border: none; background: ${AUDIT_ACCENT_LIGHT};
      font: inherit; font-size: 0.58rem; color: ${AUDIT_ACCENT}; cursor: pointer;
    }
    .actlog__corr mat-icon { font-size: 0.7rem; width: 0.7rem; height: 0.7rem; }
    .actlog__outcome { display: block; margin-top: 0.2rem; font-size: 0.6rem; color: #64748b; }
    .actlog__env {
      display: inline-block; padding: 0.12rem 0.45rem; border-radius: 999px; font-size: 0.6rem; font-weight: 700; text-transform: uppercase;
      &[data-env='prod'] { background: #fee2e2; color: #b91c1c; }
      &[data-env='staging'] { background: #fef3c7; color: #b45309; }
      &[data-env='global'] { background: #e0e7ff; color: #4338ca; }
    }
    .actlog__risk {
      font-size: 0.58rem; font-weight: 700; padding: 0.12rem 0.4rem; border-radius: 999px;
      &[data-risk='low'] { background: #dcfce7; color: #15803d; }
      &[data-risk='medium'] { background: #fef3c7; color: #b45309; }
      &[data-risk='high'] { background: #fee2e2; color: #b91c1c; }
    }
    .actlog__muted { color: #cbd5e1; }
    .actlog__time { white-space: nowrap; min-width: 5.5rem; }
    .actlog__rel { display: block; font-size: 0.68rem; font-weight: 600; color: #0f172a; }
    .actlog__time time { display: block; font-size: 0.6rem; color: #94a3b8; }
    .actlog__dur { display: inline-flex; align-items: center; gap: 0.15rem; margin-top: 0.15rem; font-size: 0.58rem; color: #64748b; }
    .actlog__dur mat-icon { font-size: 0.7rem; width: 0.7rem; height: 0.7rem; }
    .actlog__actions { width: 2rem; }
    .actlog__view {
      border: none; background: transparent; cursor: pointer; color: #94a3b8; padding: 0.2rem;
      border-radius: 6px; transition: color 0.12s, background 0.12s;
    }
    .actlog__view:hover { color: ${AUDIT_ACCENT}; background: ${AUDIT_ACCENT_LIGHT}; }
    .actlog__footer {
      display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.5rem;
      padding: 0.55rem 1rem; border-top: 1px solid #e2e8f0; background: #f8fafc;
      font-size: 0.62rem; color: #94a3b8;
    }
    .actlog__footer span { display: inline-flex; align-items: center; gap: 0.25rem; }
    .actlog__footer mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; }
    .mono { font-family: ui-monospace, monospace; }
    @media (max-width: 1100px) {
      .actlog__table th:nth-child(6), .actlog__table td:nth-child(6) { display: none; }
    }
  `,
})
export class AuditActivityLogComponent {
  readonly activities = input.required<AuditActivityEntry[]>()
  readonly loading = input(false)
  readonly error = input<string | null>(null)

  readonly detail = output<AuditActivityEntry>()
  readonly refresh = output<void>()
  readonly copyCorrelation = output<string>()

  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly moduleControl = new FormControl('', { nonNullable: true })
  readonly statusControl = new FormControl('', { nonNullable: true })
  readonly envControl = new FormControl('', { nonNullable: true })

  readonly actionLabel = auditActionLabel
  readonly moduleIcon = auditModuleIcon
  readonly userInitials = auditUserInitials
  readonly relativeTime = auditRelativeTime
  readonly riskLabel = auditRiskLabel

  private readonly searchTerm = toSignal(this.searchControl.valueChanges.pipe(debounceTime(200), startWith('')), { initialValue: '' })
  private readonly moduleFilter = toSignal(this.moduleControl.valueChanges.pipe(startWith('')), { initialValue: '' })
  private readonly statusFilter = toSignal(this.statusControl.valueChanges.pipe(startWith('')), { initialValue: '' })
  private readonly envFilter = toSignal(this.envControl.valueChanges.pipe(startWith('')), { initialValue: '' })

  moduleOptions = computed(() => [...new Set(this.activities().map((a) => a.module))].sort())
  envOptions = computed(() => [...new Set(this.activities().map((a) => a.environment).filter(Boolean))] as string[])

  filtered = computed(() => {
    const term = (this.searchTerm() ?? '').toLowerCase()
    const mod = this.moduleFilter()
    const status = this.statusFilter()
    const env = this.envFilter()
    return this.activities().filter((a) => {
      const haystack = `${a.action} ${a.resource} ${a.module} ${a.description} ${a.userId ?? ''} ${a.correlationId ?? ''}`.toLowerCase()
      if (term && !haystack.includes(term)) return false
      if (mod && a.module !== mod) return false
      if (status && a.status !== status) return false
      if (env && a.environment !== env) return false
      return true
    })
  })

  heroStats = computed(() => {
    const rows = this.filtered()
    const success = rows.filter((r) => r.status === 'success').length
    const warn = rows.filter((r) => r.status === 'warning' || r.status === 'running').length
    const modules = new Set(rows.map((r) => r.module)).size
    return [
      { label: 'Eventos', value: rows.length },
      { label: 'Éxito', value: success },
      { label: 'Alertas', value: warn },
      { label: 'Módulos', value: modules },
    ]
  })

  grouped = computed((): ActivityDateGroup[] => {
    const map = new Map<string, AuditActivityEntry[]>()
    for (const entry of this.filtered()) {
      const d = new Date(entry.createdAt)
      const today = new Date()
      const label = d.toDateString() === today.toDateString()
        ? 'Hoy'
        : d.toDateString() === new Date(today.getTime() - 86_400_000).toDateString()
          ? 'Ayer'
          : d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })
      const list = map.get(label) ?? []
      list.push(entry)
      map.set(label, list)
    }
    return [...map.entries()].map(([label, entries]) => ({ label, entries }))
  })

  handleView = (ev: Event, row: AuditActivityEntry): void => {
    ev.stopPropagation()
    this.detail.emit(row)
  }

  handleCopyCorrelation = (ev: Event, id: string): void => {
    ev.stopPropagation()
    this.copyCorrelation.emit(id)
  }
}
