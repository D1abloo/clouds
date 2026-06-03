import { Component, Input } from '@angular/core'
import { RouterLink } from '@angular/router'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'

@Component({
  selector: 'app-provider-summary-panel',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <article class="provider-panel animate-fade-in" [class]="'provider-panel--' + tone">
      <header class="provider-panel__head">
        <div class="provider-panel__icon"><mat-icon>{{ icon }}</mat-icon></div>
        <div class="provider-panel__titles">
          <h4>{{ title }}</h4>
          <p>{{ subtitle }}</p>
        </div>
      </header>
      <div class="provider-panel__metrics">
        @for (m of metrics; track m.label) {
          <div class="metric" [matTooltip]="m.label + ': ' + m.value">
            <span class="metric__value">{{ m.value }}</span>
            <span class="metric__label">{{ m.label }}</span>
          </div>
        }
      </div>
      @if (extraLines.length) {
        <ul class="provider-panel__list">
          @for (line of extraLines; track line) {
            <li [matTooltip]="line">{{ line }}</li>
          }
        </ul>
      }
      <a mat-stroked-button [routerLink]="route" class="provider-panel__link">
        View {{ title }}
        <mat-icon>arrow_forward</mat-icon>
      </a>
    </article>
  `,
  styles: `
    .provider-panel {
      padding: 1.25rem 1.35rem;
      border-radius: var(--app-radius-lg);
      background: var(--app-card);
      box-shadow: var(--app-shadow-sm);
      display: flex;
      flex-direction: column;
      gap: 1rem;
      min-height: 220px;
      transition: transform 0.28s ease, box-shadow 0.28s ease;
      &:hover { transform: translateY(-2px); box-shadow: var(--app-shadow-md); }
    }
    .provider-panel__head {
      display: flex;
      gap: 0.85rem;
      align-items: flex-start;
    }
    .provider-panel__icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--app-accent) 12%, transparent);
      mat-icon { color: var(--app-accent); }
    }
    .provider-panel--aws .provider-panel__icon { background: color-mix(in srgb, #f59e0b 14%, transparent); mat-icon { color: #f59e0b; } }
    .provider-panel--gcp .provider-panel__icon { background: color-mix(in srgb, #3b82f6 14%, transparent); mat-icon { color: #3b82f6; } }
    .provider-panel--azure .provider-panel__icon { background: color-mix(in srgb, #8b5cf6 14%, transparent); mat-icon { color: #8b5cf6; } }
    .provider-panel--vps .provider-panel__icon { background: color-mix(in srgb, #10b981 14%, transparent); mat-icon { color: #10b981; } }
    .provider-panel__titles {
      min-width: 0;
      h4 { margin: 0; font-size: 0.95rem; font-weight: 700; line-height: 1.3; }
      p { margin: 0.25rem 0 0; font-size: 0.78rem; color: var(--app-text-muted); line-height: 1.45; }
    }
    .provider-panel__metrics {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
      gap: 0.65rem;
    }
    .metric {
      text-align: center;
      padding: 0.5rem 0.35rem;
      border-radius: var(--app-radius-md);
      background: color-mix(in srgb, var(--app-text) 3%, var(--app-surface));
    }
    .metric__value { display: block; font-size: 1.1rem; font-weight: 700; line-height: 1.2; }
    .metric__label {
      display: block;
      margin-top: 0.15rem;
      font-size: 0.68rem;
      color: var(--app-text-muted);
      line-height: 1.25;
      word-wrap: break-word;
    }
    .provider-panel__list {
      list-style: none;
      margin: 0;
      padding: 0;
      font-size: 0.78rem;
      color: var(--app-text-muted);
      li {
        padding: 0.35rem 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
    .provider-panel__link {
      margin-top: auto;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      align-self: flex-start;
      font-size: 0.78rem;
    }
  `,
})
export class ProviderSummaryPanelComponent {
  @Input({ required: true }) title!: string
  @Input() subtitle = ''
  @Input() icon = 'cloud'
  @Input() tone = 'default'
  @Input() route = '/dashboard'
  @Input() metrics: { label: string; value: string | number }[] = []
  @Input() extraLines: string[] = []
}
