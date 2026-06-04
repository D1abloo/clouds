import { Component, Input } from '@angular/core'
import { RouterLink } from '@angular/router'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'
import { NavIconComponent } from '../../../shared/components/nav-icon/nav-icon.component'
import type { NavLogoKey } from '../../../shared/theme/nav-logo.types'

const PLATFORM_LOGO: Record<string, NavLogoKey> = {
  docker: 'docker',
  k8s: 'kubernetes',
  jenkins: 'jenkins',
  terraform: 'terraform',
}

@Component({
  selector: 'app-platform-detail-panel',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatTooltipModule, NavIconComponent],
  template: `
    <article class="platform-panel animate-fade-in" [class]="'platform-panel--' + tone">
      <header>
        <span class="platform-panel__icon-wrap">
          <app-nav-icon [icon]="icon" [logo]="panelLogo()" size="md" />
        </span>
        <div>
          <h4>{{ title }}</h4>
          <p>{{ subtitle }}</p>
        </div>
      </header>
      <div class="platform-panel__metrics">
        @for (m of metrics; track m.label) {
          <div class="metric-row metric-row--compact" [matTooltip]="m.label + ': ' + m.value">
            <span class="metric-row__icon tone-primary"><mat-icon>insights</mat-icon></span>
            <span class="metric-row__label">{{ m.label }}</span>
            <span class="metric-row__value">{{ m.value }}</span>
          </div>
        }
      </div>
      @if (details.length) {
        <ul>
          @for (d of details; track d) {
            <li [matTooltip]="d">{{ d }}</li>
          }
        </ul>
      }
      <a mat-stroked-button [routerLink]="route">
        Ver detalles
        <mat-icon>arrow_forward</mat-icon>
      </a>
    </article>
  `,
  styles: `
    .platform-panel {
      padding: 1.25rem 1.35rem;
      border-radius: var(--app-radius-lg);
      background: var(--app-card);
      box-shadow: var(--app-shadow-sm);
      min-height: 240px;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      transition: transform 0.28s ease, box-shadow 0.28s ease;
      &:hover { transform: translateY(-2px); box-shadow: var(--app-shadow-md); }
      header {
        display: flex;
        gap: 0.75rem;
        align-items: flex-start;
        mat-icon { color: var(--app-accent); margin-top: 2px; }
        h4 { margin: 0; font-size: 0.95rem; font-weight: 700; }
        p { margin: 0.2rem 0 0; font-size: 0.78rem; color: var(--app-text-muted); line-height: 1.4; }
      }
    }
    .platform-panel--docker mat-icon { color: #0ea5e9; }
    .platform-panel--k8s mat-icon { color: #8b5cf6; }
    .platform-panel--jenkins mat-icon { color: #f97316; }
    .platform-panel--terraform mat-icon { color: #6366f1; }
    .platform-panel__metrics {
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .metric-row--compact {
      grid-template-columns: 32px 1fr auto;
      gap: 0.65rem 1rem;
      padding: 0.55rem 0;
      margin-inline: 0;
      &:hover { margin-inline: 0; padding-inline: 0; background: transparent; }
    }
    .metric-row--compact .metric-row__icon {
      width: 28px;
      height: 28px;
      mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; }
    }
    .metric-row--compact .metric-row__value { font-size: 1.05rem; }
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
      font-size: 0.76rem;
      color: var(--app-text-muted);
      li {
        padding: 0.3rem 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
    a {
      margin-top: auto;
      align-self: flex-start;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.78rem;
    }
  `,
})
export class PlatformDetailPanelComponent {
  @Input({ required: true }) title!: string
  @Input() subtitle = ''
  @Input() icon = 'hub'
  @Input() tone = 'default'
  @Input() route = '/dashboard'
  @Input() metrics: { label: string; value: string | number }[] = []
  @Input() details: string[] = []

  panelLogo = (): NavLogoKey | undefined => PLATFORM_LOGO[this.tone]
}
