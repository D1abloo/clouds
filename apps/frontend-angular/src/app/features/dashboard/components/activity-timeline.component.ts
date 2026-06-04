import { Component, Input } from '@angular/core'
import { DatePipe } from '@angular/common'
import { RouterLink } from '@angular/router'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component'
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component'

@Component({
  selector: 'app-activity-timeline',
  standalone: true,
  imports: [DatePipe, RouterLink, MatButtonModule, MatIconModule, EmptyStateComponent, LoadingStateComponent],
  template: `
    <div class="activity-panel">
      <header class="activity-panel__head">
        <div>
          <h3><mat-icon>history</mat-icon> Actividad reciente</h3>
          <p>Últimas operaciones en tu infraestructura</p>
        </div>
        <a mat-stroked-button routerLink="/audit" class="activity-panel__link">
          Registro de auditoría
          <mat-icon>arrow_forward</mat-icon>
        </a>
      </header>

      @if (loading) {
        <app-loading-state message="Cargando actividad…" />
      } @else if (!events.length) {
        <app-empty-state icon="event_note" title="Sin actividad" message="Los eventos aparecerán aquí cuando se ejecuten acciones" />
      } @else {
        <ul class="timeline">
          @for (ev of events; track $index) {
            <li class="timeline__item animate-fade-in" [style.animation-delay.ms]="$index * 40">
              <div class="timeline__dot" [class]="eventTone(ev)">
                <mat-icon>{{ eventIcon(ev) }}</mat-icon>
              </div>
              <div class="timeline__content">
                <strong>{{ ev['action'] ?? ev['eventType'] ?? 'Event' }}</strong>
                <span>{{ ev['resource'] ?? ev['entityType'] ?? 'Resource' }}</span>
                <time>{{ $any(ev['createdAt']) | date: 'MMM d, HH:mm' }}</time>
              </div>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    .activity-panel {
      padding: 1.25rem 1.35rem;
      border-radius: var(--app-radius-lg);
      background: var(--app-card);
      box-shadow: var(--app-shadow-sm);
      height: 100%;
    }
    .activity-panel__head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 1rem;
      h3 {
        display: flex; align-items: center; gap: 0.4rem;
        margin: 0; font-size: 1rem; font-weight: 700;
        mat-icon { color: var(--app-accent); font-size: 1.15rem; width: 1.15rem; height: 1.15rem; }
      }
      p { margin: 0.2rem 0 0; font-size: 0.78rem; color: var(--app-text-muted); }
    }
    .activity-panel__link {
      display: inline-flex; align-items: center; gap: 0.25rem;
      font-size: 0.78rem;
    }
    .timeline {
      list-style: none;
      margin: 0;
      padding: 0;
      max-height: 340px;
      overflow: auto;
    }
    .timeline__item {
      display: flex;
      gap: 0.85rem;
      padding: 0.75rem 0;
      position: relative;
      &:not(:last-child)::after {
        content: '';
        position: absolute;
        left: 17px;
        top: 44px;
        bottom: 0;
        width: 2px;
        background: color-mix(in srgb, var(--app-text-muted) 15%, transparent);
      }
    }
    .timeline__dot {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--app-accent) 12%, transparent);
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--app-accent); }
      &.tone-success { background: color-mix(in srgb, var(--app-success) 12%, transparent); mat-icon { color: var(--app-success); } }
      &.tone-warn { background: color-mix(in srgb, var(--app-warning) 12%, transparent); mat-icon { color: var(--app-warning); } }
      &.tone-danger { background: color-mix(in srgb, var(--app-danger) 12%, transparent); mat-icon { color: var(--app-danger); } }
    }
    .timeline__content {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      padding-top: 0.15rem;
      strong { font-size: 0.875rem; font-weight: 600; }
      span { font-size: 0.78rem; color: var(--app-text-muted); }
      time { font-size: 0.72rem; color: var(--app-text-muted); font-family: 'JetBrains Mono', monospace; }
    }
  `,
})
export class ActivityTimelineComponent {
  @Input() events: Record<string, unknown>[] = []
  @Input() loading = false

  eventIcon = (ev: Record<string, unknown>): string => {
    const action = String(ev['action'] ?? ev['eventType'] ?? '').toLowerCase()
    if (action.includes('delete') || action.includes('stop')) return 'stop_circle'
    if (action.includes('create') || action.includes('start') || action.includes('launch')) return 'add_circle'
    if (action.includes('update') || action.includes('sync')) return 'sync'
    if (action.includes('alert') || action.includes('fail')) return 'error'
    return 'bolt'
  }

  eventTone = (ev: Record<string, unknown>): string => {
    const action = String(ev['action'] ?? ev['eventType'] ?? '').toLowerCase()
    if (action.includes('fail') || action.includes('delete')) return 'tone-danger'
    if (action.includes('warn')) return 'tone-warn'
    if (action.includes('create') || action.includes('success')) return 'tone-success'
    return ''
  }
}
