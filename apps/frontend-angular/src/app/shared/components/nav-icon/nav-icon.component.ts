import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { BrandLogoComponent } from '../brand-logo/brand-logo.component'
import type { NavLogoKey } from '../../theme/nav-logo.types'

export type NavIconSize = 'sm' | 'md' | 'lg' | 'xl' | 'topo'

@Component({
  selector: 'app-nav-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, BrandLogoComponent],
  template: `
    <span
      class="nav-icon-shell"
      [class.nav-icon-shell--animated]="animated()"
      [class.nav-icon-shell--active]="active()"
      [class]="sizeShellClass()"
    >
      @if (logo()) {
        <app-brand-logo
          [logo]="logo()!"
          [size]="size()"
          [animated]="animated()"
          [active]="active()"
          [glow]="glow()"
        />
      } @else if (icon()) {
        <mat-icon [class]="matClass()">{{ icon() }}</mat-icon>
      }
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .nav-icon-shell {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      transition: transform 0.22s cubic-bezier(0.34, 1.4, 0.64, 1), box-shadow 0.25s ease;
    }
    .nav-icon-shell--animated:hover {
      transform: scale(1.1);
      box-shadow: 0 0 14px color-mix(in srgb, #6366f1 35%, transparent);
    }
    .nav-icon-shell--active {
      animation: navIconPulse 2.2s ease-in-out infinite;
      box-shadow: 0 0 12px color-mix(in srgb, #22d3ee 40%, transparent);
    }
    @keyframes navIconPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.06); }
    }
    mat-icon {
      font-size: inherit;
      width: 1em;
      height: 1em;
      line-height: 1;
    }
    .nav-icon--sm { font-size: 0.95rem; }
    .nav-icon--md { font-size: 1.1rem; }
    .nav-icon--lg { font-size: 1.25rem; }
    .nav-icon-shell--sm { width: 22px; height: 22px; }
    .nav-icon-shell--md { width: 26px; height: 26px; }
    .nav-icon-shell--lg { width: 30px; height: 30px; }
  `,
})
export class NavIconComponent {
  readonly icon = input<string | undefined>()
  readonly logo = input<NavLogoKey | undefined>()
  readonly size = input<NavIconSize>('md')
  readonly animated = input(true)
  readonly active = input(false)
  readonly glow = input(false)

  matClass = (): string => `nav-icon--${this.size()}`
  sizeShellClass = (): string => `nav-icon-shell--${this.size()}`
}
