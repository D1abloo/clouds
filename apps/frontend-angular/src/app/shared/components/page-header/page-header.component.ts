import { Component, Input, output } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { RealtimeStatusBadgeComponent } from '../realtime-status-badge/realtime-status-badge.component'

export interface PageHeaderAction {
  label: string
  icon?: string
  primary?: boolean
  disabled?: boolean
}

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, RealtimeStatusBadgeComponent],
  template: `
    <header class="page-header-premium surface-elevated animate-fade-in">
      <div class="page-header-premium__main">
        @if (icon) {
          <div class="page-header-premium__icon">
            <mat-icon>{{ icon }}</mat-icon>
          </div>
        }
        <div>
          <div class="page-header-premium__title-row">
            <h1>{{ title }}</h1>
            @if (demoMode) {
              <app-realtime-status-badge mode="demo" label="Demo data" icon="science" />
            }
          </div>
          @if (description) {
            <p>{{ description }}</p>
          }
          @if (lastSync) {
            <span class="last-sync"><mat-icon>schedule</mat-icon> {{ lastSync }}</span>
          }
        </div>
      </div>
      @if (actions.length) {
        <div class="page-header-premium__actions">
          @for (action of actions; track action.label) {
            @if (action.primary) {
              <button mat-flat-button color="primary" [disabled]="action.disabled" type="button" (click)="actionClick.emit(action.label)">
                @if (action.icon) { <mat-icon>{{ action.icon }}</mat-icon> }
                {{ action.label }}
              </button>
            } @else {
              <button mat-stroked-button [disabled]="action.disabled" type="button" (click)="actionClick.emit(action.label)">
                @if (action.icon) { <mat-icon>{{ action.icon }}</mat-icon> }
                {{ action.label }}
              </button>
            }
          }
        </div>
      }
    </header>
  `,
  styles: `
    .page-header-premium {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      padding: 1.35rem 1.5rem;
      border-radius: var(--app-radius-lg);
      margin-bottom: 1.35rem;
    }
    .page-header-premium__main {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
      flex: 1;
    }
    .page-header-premium__icon {
      width: 48px; height: 48px; border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
      background: color-mix(in srgb, var(--app-accent) 12%, transparent);
      mat-icon { color: var(--app-accent); font-size: 1.5rem; width: 1.5rem; height: 1.5rem; }
    }
    .page-header-premium__title-row {
      display: flex; flex-wrap: wrap; align-items: center; gap: 0.65rem;
      h1 { margin: 0; font-size: 1.65rem; font-weight: 700; letter-spacing: -0.02em; }
    }
    p { margin: 0.35rem 0 0; color: var(--app-text-muted); font-size: 0.9rem; max-width: 640px; line-height: 1.45; }
    .last-sync {
      display: inline-flex; align-items: center; gap: 0.25rem;
      margin-top: 0.5rem; font-size: 0.75rem; color: var(--app-text-muted);
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }
    .page-header-premium__actions {
      display: flex; flex-wrap: wrap; gap: 0.5rem;
      button { display: inline-flex; align-items: center; gap: 0.35rem; }
    }
  `,
})
export class PageHeaderComponent {
  @Input({ required: true }) title!: string
  @Input() description = ''
  @Input() icon = ''
  @Input() lastSync = ''
  @Input() demoMode = true
  @Input() actions: PageHeaderAction[] = []
  readonly actionClick = output<string>()
}
