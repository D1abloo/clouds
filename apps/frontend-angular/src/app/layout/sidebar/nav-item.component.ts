import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { RouterLink, RouterLinkActive } from '@angular/router'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'
import type { NavIconTone } from './sidebar-nav.config'

@Component({
  selector: 'app-nav-item',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, MatIconModule, MatTooltipModule],
  template: `
    <a
      class="nav-item"
      [class.nav-item--collapsed]="collapsed()"
      [routerLink]="route()"
      routerLinkActive="nav-item--active"
      [matTooltip]="collapsed() ? label() : ''"
      matTooltipPosition="right"
    >
      @if (brand()) {
        <span class="nav-brand" [class]="'nav-brand--' + brand()">{{ brandLabel() }}</span>
      } @else {
        <span class="nav-icon-wrap" [class]="iconWrapClass()">
          <mat-icon class="nav-icon">{{ icon() }}</mat-icon>
        </span>
      }

      @if (!collapsed()) {
        <span class="nav-label">{{ label() }}</span>

        @if (badge() && badge()! > 0) {
          <span class="nav-badge nav-badge--red">{{ badge()! > 99 ? '99+' : badge() }}</span>
        }
        @if (badgeText()) {
          <span class="nav-badge nav-badge--muted">{{ badgeText() }}</span>
        }
      } @else if (badge() && badge()! > 0) {
        <span class="nav-badge-dot"></span>
      }

      @if (statusDot()) {
        <span class="nav-status" [class]="'nav-status--' + statusDot()"></span>
      }
    </a>
  `,
  styles: `
    .nav-item {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.65rem;
      margin-bottom: 2px;
      padding: 0.5rem 0.65rem;
      border-radius: 12px;
      text-decoration: none;
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--sidebar-text-muted);
      border: none;
      transition: background 0.22s ease, color 0.22s ease, transform 0.18s ease, box-shadow 0.22s ease;
    }
    .nav-item:hover {
      background: var(--sidebar-item-hover);
      color: var(--sidebar-text);
      transform: translateX(3px);
      box-shadow: var(--app-shadow-xs);
    }
    .nav-item--active {
      background: var(--sidebar-item-active);
      color: var(--sidebar-primary);
      box-shadow: 0 4px 18px color-mix(in srgb, var(--sidebar-primary) 28%, transparent);
      transform: translateX(2px);
    }
    .nav-item--collapsed {
      justify-content: center;
      padding: 0.55rem;
    }
    .nav-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 10px;
      flex-shrink: 0;
      background: color-mix(in srgb, var(--sidebar-primary) 12%, transparent);
      border: none;
      transition: transform 0.2s ease;
    }
    .nav-item--active .nav-icon-wrap,
    .nav-item:hover .nav-icon-wrap {
      transform: scale(1.05);
    }
    .nav-icon {
      font-size: 1.1rem !important;
      width: 1.1rem !important;
      height: 1.1rem !important;
      color: var(--sidebar-primary);
    }
    .tone-violet .nav-icon { color: #a78bfa; }
    .tone-violet { background: color-mix(in srgb, #a78bfa 18%, transparent); }
    .tone-blue .nav-icon { color: #38bdf8; }
    .tone-blue { background: color-mix(in srgb, #38bdf8 18%, transparent); }
    .tone-green .nav-icon { color: #34d399; }
    .tone-green { background: color-mix(in srgb, #34d399 18%, transparent); }
    .tone-orange .nav-icon { color: #fb923c; }
    .tone-orange { background: color-mix(in srgb, #fb923c 18%, transparent); }
    .tone-cyan .nav-icon { color: #22d3ee; }
    .tone-cyan { background: color-mix(in srgb, #22d3ee 18%, transparent); }
    .tone-pink .nav-icon { color: #f472b6; }
    .tone-pink { background: color-mix(in srgb, #f472b6 18%, transparent); }
    .tone-amber .nav-icon { color: #fbbf24; }
    .tone-amber { background: color-mix(in srgb, #fbbf24 18%, transparent); }
    .tone-indigo .nav-icon { color: #818cf8; }
    .tone-indigo { background: color-mix(in srgb, #818cf8 18%, transparent); }
    .tone-slate .nav-icon { color: #94a3b8; }
    .tone-slate { background: color-mix(in srgb, #94a3b8 14%, transparent); }

    .nav-brand {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 10px;
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      flex-shrink: 0;
      border: none;
    }
    .nav-brand--aws { color: #ff9900; background: color-mix(in srgb, #ff9900 20%, transparent); }
    .nav-brand--gcp { color: #4285f4; background: color-mix(in srgb, #4285f4 20%, transparent); }
    .nav-brand--azure { color: #0078d4; background: color-mix(in srgb, #0078d4 20%, transparent); }

    .nav-label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .nav-badge {
      flex-shrink: 0;
      padding: 0.15rem 0.45rem;
      border-radius: 999px;
      font-size: 0.6rem;
      font-weight: 800;
      border: none;
    }
    .nav-badge--red {
      background: linear-gradient(135deg, #ef4444, #f97316);
      color: #fff;
    }
    .nav-badge--muted {
      background: color-mix(in srgb, var(--sidebar-primary) 14%, transparent);
      color: var(--sidebar-text-muted);
    }
    .nav-badge-dot {
      position: absolute;
      top: 6px;
      right: 6px;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #ef4444;
      border: none;
    }
    .nav-status {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
      border: none;
    }
    .nav-status--ok { background: #34d399; }
    .nav-status--warn { background: #fbbf24; }
    .nav-status--error { background: #f87171; }
  `,
})
export class NavItemComponent {
  readonly label = input.required<string>()
  readonly icon = input.required<string>()
  readonly route = input.required<string>()
  readonly collapsed = input<boolean>(false)
  readonly badge = input<number | null>(null)
  readonly badgeText = input<string | null>(null)
  readonly badgeColor = input<'red' | 'amber'>('red')
  readonly statusDot = input<'ok' | 'warn' | 'error' | null>(null)
  readonly tone = input<NavIconTone | null>(null)
  readonly brand = input<'aws' | 'gcp' | 'azure' | null>(null)

  iconWrapClass = (): string => {
    const t = this.tone()
    return t ? `tone-${t}` : ''
  }

  brandLabel = (): string => {
    const b = this.brand()
    if (b === 'aws') return 'AWS'
    if (b === 'gcp') return 'GCP'
    return 'Az'
  }
}
