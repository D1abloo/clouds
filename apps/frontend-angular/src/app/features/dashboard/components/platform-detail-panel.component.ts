import { Component, Input } from '@angular/core'
import { RouterLink } from '@angular/router'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component'
import type { NavLogoKey } from '../../../shared/theme/nav-logo.types'

const PLATFORM_LOGO: Record<string, NavLogoKey> = {
  docker: 'docker',
  k8s: 'kubernetes',
  jenkins: 'jenkins',
  terraform: 'terraform',
  github: 'github',
}

@Component({
  selector: 'app-platform-detail-panel',
  standalone: true,
  imports: [RouterLink, MatIconModule, MatTooltipModule, BrandLogoComponent],
  template: `
    <article class="stack-card animate-fade-in" [class]="'stack-card--' + tone">
      <div class="stack-card__accent" aria-hidden="true"></div>

      <header class="stack-card__head">
        <div class="stack-card__brand">
          @if (panelLogo(); as logoKey) {
            <app-brand-logo [logo]="logoKey" size="md" />
          } @else {
            <mat-icon>{{ icon }}</mat-icon>
          }
        </div>
        <div class="stack-card__titles">
          <h4>{{ title }}</h4>
          <p>{{ subtitle }}</p>
        </div>
        @if (heroMetric(); as hero) {
          <div class="stack-card__hero">
            <span>{{ hero.label }}</span>
            <strong>{{ hero.value }}</strong>
          </div>
        }
      </header>

      @if (secondaryMetrics().length) {
        <div class="stack-card__metrics">
          @for (m of secondaryMetrics(); track m.label) {
            <div class="stack-card__metric" [matTooltip]="m.label + ': ' + m.value">
              <span>{{ m.label }}</span>
              <strong>{{ m.value }}</strong>
            </div>
          }
        </div>
      }

      @if (details.length) {
        <ul class="stack-card__details">
          @for (d of details; track d) {
            <li [matTooltip]="d">
              <mat-icon>fiber_manual_record</mat-icon>
              <span>{{ d }}</span>
            </li>
          }
        </ul>
      }

      <a class="stack-card__cta" [routerLink]="route">
        Abrir {{ title }}
        <mat-icon>arrow_forward</mat-icon>
      </a>
    </article>
  `,
  styles: `
    .stack-card {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 0.72rem;
      min-height: 252px;
      padding: 0.95rem 1rem 0.9rem 1.05rem;
      border-radius: 14px;
      background: color-mix(in srgb, var(--app-surface) 36%, var(--app-card));
      overflow: hidden;
      transition: background 0.22s ease, transform 0.22s ease;
      &:hover {
        background: color-mix(in srgb, var(--app-surface) 22%, var(--app-card));
        transform: translateY(-2px);
        .stack-card__cta mat-icon { transform: translateX(3px); }
      }
    }
    .stack-card__accent {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      border-radius: 14px 0 0 14px;
    }
    .stack-card--docker .stack-card__accent { background: linear-gradient(180deg, #0ea5e9, #38bdf8); }
    .stack-card--k8s .stack-card__accent { background: linear-gradient(180deg, #326ce5, #8b5cf6); }
    .stack-card--jenkins .stack-card__accent { background: linear-gradient(180deg, #d33833, #f97316); }
    .stack-card--terraform .stack-card__accent { background: linear-gradient(180deg, #844fba, #6366f1); }
    .stack-card--github .stack-card__accent { background: linear-gradient(180deg, #24292f, #57606a); }
    .stack-card--default .stack-card__accent { background: var(--app-accent); }

    .stack-card__head {
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
    }
    .stack-card__brand {
      width: 42px;
      height: 42px;
      border-radius: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: color-mix(in srgb, var(--app-accent) 10%, var(--app-card));
    }
    .stack-card--docker .stack-card__brand { background: color-mix(in srgb, #0ea5e9 14%, var(--app-card)); }
    .stack-card--k8s .stack-card__brand { background: color-mix(in srgb, #326ce5 14%, var(--app-card)); }
    .stack-card--jenkins .stack-card__brand { background: color-mix(in srgb, #d33833 14%, var(--app-card)); }
    .stack-card--terraform .stack-card__brand { background: color-mix(in srgb, #844fba 14%, var(--app-card)); }
    .stack-card--github .stack-card__brand { background: color-mix(in srgb, #24292f 10%, var(--app-card)); }

    .stack-card__titles {
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
    .stack-card__hero {
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
    .stack-card__metrics {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.45rem;
    }
    .stack-card__metric {
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
    .stack-card__details {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.28rem;
      li {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        font-size: 0.64rem;
        color: var(--app-text-muted);
        min-width: 0;
        mat-icon {
          font-size: 0.45rem;
          width: 0.45rem;
          height: 0.45rem;
          color: var(--app-accent);
          flex-shrink: 0;
        }
        span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }
    .stack-card__cta {
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
export class PlatformDetailPanelComponent {
  @Input({ required: true }) title!: string
  @Input() subtitle = ''
  @Input() icon = 'hub'
  @Input() tone = 'default'
  @Input() route = '/dashboard'
  @Input() metrics: { label: string; value: string | number }[] = []
  @Input() details: string[] = []

  panelLogo = (): NavLogoKey | undefined => PLATFORM_LOGO[this.tone]

  heroMetric = () => this.metrics[0]

  secondaryMetrics = () => this.metrics.slice(1)
}
