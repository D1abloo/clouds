import { Component, Input } from '@angular/core'
import { RouterLink } from '@angular/router'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component'
import type { NavLogoKey } from '../../../shared/theme/nav-logo.types'

const PROVIDER_LOGO: Record<string, NavLogoKey> = {
  aws: 'aws',
  gcp: 'gcp',
  azure: 'azure',
}

@Component({
  selector: 'app-provider-summary-panel',
  standalone: true,
  imports: [RouterLink, MatIconModule, MatTooltipModule, BrandLogoComponent],
  template: `
    <article class="provider-card animate-fade-in" [class]="'provider-card--' + tone">
      <div class="provider-card__accent" aria-hidden="true"></div>

      <header class="provider-card__head">
        <div class="provider-card__brand">
          @if (panelLogo(); as logoKey) {
            <app-brand-logo [logo]="logoKey" size="md" />
          } @else {
            <mat-icon>{{ icon }}</mat-icon>
          }
        </div>
        <div class="provider-card__titles">
          <h4>{{ title }}</h4>
          <p>{{ subtitle }}</p>
        </div>
        @if (heroMetric(); as hero) {
          <div class="provider-card__hero">
            <span>{{ hero.label }}</span>
            <strong>{{ hero.value }}</strong>
          </div>
        }
      </header>

      @if (secondaryMetrics().length) {
        <div class="provider-card__metrics">
          @for (m of secondaryMetrics(); track m.label) {
            <div class="provider-card__metric" [matTooltip]="m.label + ': ' + m.value">
              <span>{{ m.label }}</span>
              <strong>{{ m.value }}</strong>
            </div>
          }
        </div>
      }

      @if (extraLines.length) {
        <ul class="provider-card__tags">
          @for (line of extraLines; track line) {
            <li [matTooltip]="line">{{ line }}</li>
          }
        </ul>
      }

      <a class="provider-card__cta" [routerLink]="route">
        Explorar {{ title }}
        <mat-icon>arrow_forward</mat-icon>
      </a>
    </article>
  `,
  styles: `
    .provider-card {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      min-height: 248px;
      padding: 0.95rem 1rem 0.9rem 1.05rem;
      border-radius: 14px;
      background: color-mix(in srgb, var(--app-surface) 36%, var(--app-card));
      overflow: hidden;
      transition: background 0.22s ease, transform 0.22s ease;
      &:hover {
        background: color-mix(in srgb, var(--app-surface) 22%, var(--app-card));
        transform: translateY(-2px);
        .provider-card__cta mat-icon { transform: translateX(3px); }
      }
    }
    .provider-card__accent {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      border-radius: 14px 0 0 14px;
    }
    .provider-card--aws .provider-card__accent { background: linear-gradient(180deg, #ff9900, #ffb84d); }
    .provider-card--gcp .provider-card__accent { background: linear-gradient(180deg, #4285f4, #669df6); }
    .provider-card--azure .provider-card__accent { background: linear-gradient(180deg, #0078d4, #50a3e5); }
    .provider-card--vps .provider-card__accent { background: linear-gradient(180deg, #10b981, #34d399); }
    .provider-card--default .provider-card__accent { background: var(--app-accent); }

    .provider-card__head {
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
    }
    .provider-card__brand {
      width: 42px;
      height: 42px;
      border-radius: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: color-mix(in srgb, var(--app-accent) 10%, var(--app-card));
    }
    .provider-card--aws .provider-card__brand { background: color-mix(in srgb, #ff9900 14%, var(--app-card)); }
    .provider-card--gcp .provider-card__brand { background: color-mix(in srgb, #4285f4 14%, var(--app-card)); }
    .provider-card--azure .provider-card__brand { background: color-mix(in srgb, #0078d4 14%, var(--app-card)); }
    .provider-card--vps .provider-card__brand {
      background: color-mix(in srgb, #10b981 14%, var(--app-card));
      mat-icon { color: #10b981; font-size: 1.2rem; width: 1.2rem; height: 1.2rem; }
    }
    .provider-card__titles {
      flex: 1;
      min-width: 0;
      h4 {
        margin: 0;
        font-size: 0.88rem;
        font-weight: 700;
        letter-spacing: -0.02em;
      }
      p {
        margin: 0.15rem 0 0;
        font-size: 0.66rem;
        color: var(--app-text-muted);
        line-height: 1.45;
      }
    }
    .provider-card__hero {
      flex-shrink: 0;
      text-align: right;
      span {
        display: block;
        font-size: 0.52rem;
        font-weight: 650;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--app-text-muted);
      }
      strong {
        display: block;
        margin-top: 0.08rem;
        font-size: 1.05rem;
        font-weight: 800;
        letter-spacing: -0.03em;
        font-variant-numeric: tabular-nums;
      }
    }
    .provider-card__metrics {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.45rem;
    }
    .provider-card__metric {
      padding: 0.48rem 0.55rem;
      border-radius: 10px;
      background: color-mix(in srgb, var(--app-text) 2.5%, transparent);
      span {
        display: block;
        font-size: 0.58rem;
        font-weight: 650;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        color: var(--app-text-muted);
      }
      strong {
        display: block;
        margin-top: 0.12rem;
        font-size: 0.88rem;
        font-weight: 750;
        font-variant-numeric: tabular-nums;
      }
    }
    .provider-card__tags {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 0.32rem;
      li {
        font-size: 0.6rem;
        font-weight: 600;
        padding: 0.18rem 0.45rem;
        border-radius: 999px;
        color: var(--app-text-muted);
        background: color-mix(in srgb, var(--app-text) 4%, transparent);
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
    .provider-card__cta {
      margin-top: auto;
      display: inline-flex;
      align-items: center;
      gap: 0.22rem;
      align-self: flex-start;
      font-size: 0.72rem;
      font-weight: 650;
      color: var(--app-accent);
      text-decoration: none;
      mat-icon {
        font-size: 0.95rem;
        width: 0.95rem;
        height: 0.95rem;
        transition: transform 0.2s ease;
      }
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

  panelLogo = (): NavLogoKey | undefined => PROVIDER_LOGO[this.tone]

  heroMetric = () => this.metrics[0]

  secondaryMetrics = () => this.metrics.slice(1)
}
