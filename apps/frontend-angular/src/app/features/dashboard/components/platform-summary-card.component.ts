import { Component, Input } from '@angular/core'
import { RouterLink } from '@angular/router'
import { MatIconModule } from '@angular/material/icon'
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component'
import type { NavLogoKey } from '../../../shared/theme/nav-logo.types'

@Component({
  selector: 'app-platform-summary-card',
  standalone: true,
  imports: [RouterLink, MatIconModule, BrandLogoComponent],
  template: `
    <a
      class="hub-card animate-fade-in"
      [class]="'hub-card--' + tone"
      [routerLink]="route"
      [style.animation-delay.ms]="delay"
      [attr.aria-label]="title + ' — ' + summary"
    >
      <div class="hub-card__accent" aria-hidden="true"></div>

      <header class="hub-card__head">
        <span class="hub-card__icon" [class.hub-card__icon--logos]="logos.length > 0">
          @if (logos.length) {
            <span class="hub-card__logo-strip">
              @for (logoKey of logos; track logoKey) {
                <app-brand-logo [logo]="logoKey" size="sm" />
              }
            </span>
          } @else if (logo) {
            <app-brand-logo [logo]="logo" size="sm" />
          } @else {
            <mat-icon>{{ icon }}</mat-icon>
          }
        </span>
        <div class="hub-card__titles">
          <h3>{{ title }}</h3>
          <p>{{ summary }}</p>
        </div>
        @if (status) {
          <span class="hub-card__status" [class]="'hub-card__status--' + statusTone">{{ status }}</span>
        }
      </header>

      @if (heroValue !== undefined && heroValue !== null && heroValue !== '') {
        <div class="hub-card__hero">
          <span class="hub-card__hero-label">{{ heroLabel }}</span>
          <strong class="hub-card__hero-value">{{ heroValue }}</strong>
          @if (heroHint) {
            <span class="hub-card__hero-hint">{{ heroHint }}</span>
          }
        </div>
      }

      <div class="hub-card__stats">
        @for (m of metrics; track m.label) {
          <div class="hub-card__stat">
            <span class="hub-card__stat-label">{{ m.label }}</span>
            <strong class="hub-card__stat-value">{{ m.value }}</strong>
          </div>
        }
      </div>

      @if (footnote) {
        <p class="hub-card__foot">{{ footnote }}</p>
      }

      <span class="hub-card__cta">
        Ver detalles
        <mat-icon>arrow_forward</mat-icon>
      </span>
    </a>
  `,
  styles: `
    .hub-card {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 0.72rem;
      padding: 0.95rem 1rem 0.9rem 1.05rem;
      border-radius: 14px;
      background: color-mix(in srgb, var(--app-surface) 36%, var(--app-card));
      border: none;
      box-shadow: none;
      text-decoration: none;
      color: inherit;
      min-height: 220px;
      overflow: hidden;
      transition: background 0.22s ease, transform 0.22s ease;
      &:hover {
        background: color-mix(in srgb, var(--app-surface) 22%, var(--app-card));
        transform: translateY(-2px);
        .hub-card__cta mat-icon { transform: translateX(3px); }
      }
    }
    .hub-card__accent {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      border-radius: 14px 0 0 14px;
    }
    .hub-card--health .hub-card__accent { background: linear-gradient(180deg, #ef4444, #f87171); }
    .hub-card--command .hub-card__accent { background: linear-gradient(180deg, #f97316, #fb923c); }
    .hub-card--billing .hub-card__accent { background: linear-gradient(180deg, #6366f1, #818cf8); }
    .hub-card--alerts .hub-card__accent { background: linear-gradient(180deg, #f59e0b, #fbbf24); }
    .hub-card--docker .hub-card__accent { background: #0ea5e9; }
    .hub-card--k8s .hub-card__accent { background: #8b5cf6; }
    .hub-card--jenkins .hub-card__accent { background: #f97316; }
    .hub-card--terraform .hub-card__accent { background: #6366f1; }
    .hub-card--default .hub-card__accent { background: var(--app-accent); }

    .hub-card__head {
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
    }
    .hub-card__icon {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: color-mix(in srgb, var(--app-accent) 10%, var(--app-card));
      mat-icon { font-size: 1.15rem; width: 1.15rem; height: 1.15rem; color: var(--app-accent); }
    }
    .hub-card__icon--logos {
      width: auto;
      min-width: 38px;
      max-width: 76px;
      padding: 0 0.35rem;
    }
    .hub-card__logo-strip {
      display: inline-flex;
      align-items: center;
      gap: 0.22rem;
      flex-wrap: wrap;
      justify-content: center;
    }
    .hub-card--health .hub-card__icon { background: color-mix(in srgb, #ef4444 10%, var(--app-card)); mat-icon { color: #ef4444; } }
    .hub-card--command .hub-card__icon { background: color-mix(in srgb, #f97316 10%, var(--app-card)); mat-icon { color: #f97316; } }
    .hub-card--billing .hub-card__icon { background: color-mix(in srgb, #6366f1 10%, var(--app-card)); mat-icon { color: #6366f1; } }
    .hub-card--alerts .hub-card__icon { background: color-mix(in srgb, #f59e0b 10%, var(--app-card)); mat-icon { color: #b45309; } }
    .hub-card--health .hub-card__icon:has(.brand-logo) { background: color-mix(in srgb, #f46800 12%, var(--app-card)); }
    .hub-card--alerts .hub-card__icon:has(.brand-logo) { background: color-mix(in srgb, #e6522c 12%, var(--app-card)); }

    .hub-card__titles {
      flex: 1;
      min-width: 0;
      h3 { margin: 0; font-size: 0.88rem; font-weight: 700; letter-spacing: -0.02em; }
      p { margin: 0.18rem 0 0; font-size: 0.68rem; color: var(--app-text-muted); line-height: 1.4; }
    }
    .hub-card__status {
      flex-shrink: 0;
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.16rem 0.42rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--status-running) 12%, var(--app-card));
      color: var(--status-running);
    }
    .hub-card__status--warn {
      background: color-mix(in srgb, #f59e0b 14%, var(--app-card));
      color: #b45309;
    }
    .hub-card__status--danger {
      background: color-mix(in srgb, #ef4444 12%, var(--app-card));
      color: #dc2626;
    }

    .hub-card__hero {
      display: flex;
      flex-direction: column;
      gap: 0.12rem;
      padding: 0.6rem 0.68rem;
      border-radius: 10px;
      background: color-mix(in srgb, var(--app-text) 2.5%, transparent);
    }
    .hub-card__hero-label {
      width: 100%;
      font-size: 0.62rem;
      font-weight: 650;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--app-text-muted);
    }
    .hub-card__hero-value {
      font-size: 1.65rem;
      font-weight: 800;
      letter-spacing: -0.04em;
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .hub-card__hero-hint {
      font-size: 0.66rem;
      color: var(--app-text-muted);
    }

    .hub-card__stats {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.45rem;
      padding-top: 0.15rem;
      border-top: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
    }
    .hub-card__stat {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
      min-width: 0;
      padding: 0.35rem 0.15rem 0;
    }
    .hub-card__stat-label {
      font-size: 0.62rem;
      font-weight: 600;
      color: var(--app-text-muted);
    }
    .hub-card__stat-value {
      font-size: 0.92rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }

    .hub-card__foot {
      margin: 0;
      font-size: 0.66rem;
      line-height: 1.45;
      color: var(--app-text-muted);
    }

    .hub-card__cta {
      display: inline-flex;
      align-items: center;
      gap: 0.22rem;
      margin-top: auto;
      font-size: 0.72rem;
      font-weight: 650;
      color: var(--app-accent);
      mat-icon {
        font-size: 15px;
        width: 15px;
        height: 15px;
        transition: transform 0.2s ease;
      }
    }
  `,
})
export class PlatformSummaryCardComponent {
  @Input({ required: true }) title!: string
  @Input({ required: true }) summary!: string
  @Input({ required: true }) icon!: string
  @Input({ required: true }) route!: string
  @Input() tone = 'default'
  @Input() delay = 0
  @Input() logo?: NavLogoKey
  @Input() logos: NavLogoKey[] = []
  @Input() status = ''
  @Input() statusTone: 'ok' | 'warn' | 'danger' = 'ok'
  @Input() heroLabel = ''
  @Input() heroValue: string | number = ''
  @Input() heroHint = ''
  @Input() footnote = ''
  @Input() metrics: { label: string; value: string | number }[] = []
}
