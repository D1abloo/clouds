import { Component, Input } from '@angular/core'
import { RouterLink } from '@angular/router'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component'
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component'

export interface NotificationRow {
  id: string
  title: string
  message: string
  severity?: string
  type?: string
}

@Component({
  selector: 'app-notifications-panel',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, EmptyStateComponent, LoadingStateComponent],
  template: `
    <div class="notif-panel">
      <header class="notif-panel__head">
        <div>
          <h3><mat-icon>notifications</mat-icon> Notificaciones</h3>
          <p>Mensajes recientes del sistema y operaciones</p>
        </div>
        <a mat-stroked-button routerLink="/notifications" class="notif-panel__link">
          Todas las notificaciones
          <mat-icon>arrow_forward</mat-icon>
        </a>
      </header>

      @if (loading) {
        <app-loading-state message="Cargando notificaciones…" />
      } @else if (!items.length) {
        <app-empty-state icon="notifications_none" title="Bandeja vacía" message="No hay notificaciones nuevas" />
      } @else {
        <ul class="notif-list">
          @for (n of items; track n.id) {
            <li class="notif-list__item animate-fade-in" [style.animation-delay.ms]="$index * 35">
              <div class="notif-list__icon" [class]="notifTone(n)">
                <mat-icon>{{ notifIcon(n) }}</mat-icon>
              </div>
              <div class="notif-list__body">
                <div class="notif-list__title-row">
                  <strong>{{ n.title }}</strong>
                  @if (n.severity) {
                    <span class="notif-list__badge" [class]="severityClass(n.severity)">{{ n.severity }}</span>
                  }
                </div>
                <p>{{ n.message }}</p>
              </div>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    .notif-panel {
      padding: 1.15rem 1.25rem;
      border-radius: 12px;
      background: var(--app-card);
      border: 1px solid color-mix(in srgb, var(--app-text) 5%, transparent);
      box-shadow: var(--app-shadow-sm);
      height: 100%;
    }
    .notif-panel__head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 1rem;
      h3 {
        display: flex; align-items: center; gap: 0.4rem;
        margin: 0; font-size: 1rem; font-weight: 700;
        mat-icon { color: var(--app-info); font-size: 1.15rem; width: 1.15rem; height: 1.15rem; }
      }
      p { margin: 0.2rem 0 0; font-size: 0.78rem; color: var(--app-text-muted); }
    }
    .notif-panel__link {
      display: inline-flex; align-items: center; gap: 0.25rem;
      font-size: 0.78rem;
    }
    .notif-list {
      list-style: none;
      margin: 0;
      padding: 0;
      max-height: 340px;
      overflow: auto;
    }
    .notif-list__item {
      display: flex;
      gap: 0.85rem;
      padding: 0.85rem 0;
      transition: background 0.2s ease;
      border-radius: var(--app-radius-md);
      &:hover { background: color-mix(in srgb, var(--app-accent) 4%, transparent); }
      &:not(:last-child) { margin-bottom: 0.15rem; }
    }
    .notif-list__icon {
      width: 38px;
      height: 38px;
      border-radius: 11px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--app-info) 12%, transparent);
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--app-info); }
      &.tone-warn { background: color-mix(in srgb, var(--app-warning) 12%, transparent); mat-icon { color: var(--app-warning); } }
      &.tone-danger { background: color-mix(in srgb, var(--app-danger) 12%, transparent); mat-icon { color: var(--app-danger); } }
      &.tone-success { background: color-mix(in srgb, var(--app-success) 12%, transparent); mat-icon { color: var(--app-success); } }
    }
    .notif-list__title-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.45rem;
      strong { font-size: 0.875rem; font-weight: 600; }
    }
    .notif-list__body p {
      margin: 0.25rem 0 0;
      font-size: 0.78rem;
      color: var(--app-text-muted);
      line-height: 1.45;
    }
    .notif-list__badge {
      font-size: 0.62rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 0.12rem 0.45rem;
      border-radius: 999px;
      &.sev-critical { background: color-mix(in srgb, var(--app-danger) 14%, transparent); color: var(--app-danger); }
      &.sev-warning { background: color-mix(in srgb, var(--app-warning) 14%, transparent); color: var(--app-warning); }
      &.sev-info { background: color-mix(in srgb, var(--app-info) 14%, transparent); color: var(--app-info); }
    }
  `,
})
export class NotificationsPanelComponent {
  @Input() items: NotificationRow[] = []
  @Input() loading = false

  notifIcon = (n: NotificationRow): string => {
    const t = String(n.type ?? n.title ?? '').toLowerCase()
    if (t.includes('alert') || t.includes('critical')) return 'warning'
    if (t.includes('billing') || t.includes('cost')) return 'payments'
    if (t.includes('deploy') || t.includes('terraform')) return 'architecture'
    return 'info'
  }

  notifTone = (n: NotificationRow): string => {
    const s = String(n.severity ?? '').toLowerCase()
    if (s.includes('crit')) return 'tone-danger'
    if (s.includes('warn')) return 'tone-warn'
    if (s.includes('success') || s.includes('ok')) return 'tone-success'
    return ''
  }

  severityClass = (sev: string): string => {
    const s = sev.toLowerCase()
    if (s.includes('crit')) return 'sev-critical'
    if (s.includes('warn')) return 'sev-warning'
    return 'sev-info'
  }
}
