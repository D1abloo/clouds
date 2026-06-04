import { Component, Input, output, inject, computed } from '@angular/core'
import { Router, NavigationEnd } from '@angular/router'
import { toSignal } from '@angular/core/rxjs-interop'
import { filter, map, startWith } from 'rxjs'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { RealtimeStatusBadgeComponent } from '../realtime-status-badge/realtime-status-badge.component'
import { resolvePageVisual, type NavVisualTone } from '../../theme/nav-visual.config'

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
        <div class="page-header-premium__icon" [class]="'tone-' + visualTone()">
          <mat-icon>{{ displayIcon() }}</mat-icon>
        </div>
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
      background: linear-gradient(135deg, var(--app-card), color-mix(in srgb, var(--app-surface) 40%, var(--app-card)));
    }
    .page-header-premium__main {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
      flex: 1;
      min-width: min(100%, 260px);
    }
    .page-header-premium__icon {
      width: 52px;
      height: 52px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 8px 22px color-mix(in srgb, var(--app-accent) 18%, transparent);
      mat-icon { font-size: 1.55rem; width: 1.55rem; height: 1.55rem; }
    }
    .page-header-premium__title-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.65rem;
      h1 { margin: 0; font-size: 1.65rem; font-weight: 700; letter-spacing: -0.03em; }
    }
    p {
      margin: 0.35rem 0 0;
      color: var(--app-text-muted);
      font-size: 0.9rem;
      max-width: 640px;
      line-height: 1.5;
    }
    .last-sync {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      margin-top: 0.5rem;
      font-size: 0.75rem;
      color: var(--app-text-muted);
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }
    .page-header-premium__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      button { display: inline-flex; align-items: center; gap: 0.35rem; }
    }
  `,
})
export class PageHeaderComponent {
  private readonly router = inject(Router)

  @Input({ required: true }) title!: string
  @Input() description = ''
  @Input() icon = ''
  @Input() tone: NavVisualTone | '' = ''
  @Input() lastSync = ''
  @Input() demoMode = true
  @Input() actions: PageHeaderAction[] = []
  readonly actionClick = output<string>()

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => (e as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  )

  private readonly routeVisual = computed(() => resolvePageVisual(this.url().split('?')[0]))

  visualTone = computed((): NavVisualTone => (this.tone || this.routeVisual().tone) as NavVisualTone)

  displayIcon = computed(() => this.icon || this.routeVisual().icon)
}
