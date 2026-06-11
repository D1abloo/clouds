import { ChangeDetectionStrategy, Component, input, computed } from '@angular/core'
import { BRAND_LOGO_SVG } from '../../theme/brand-logo-svg.data'
import type { NavLogoKey } from '../../theme/nav-logo.types'

@Component({
  selector: 'app-brand-logo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (def(); as svg) {
      <span
        class="brand-logo-wrap"
        [class.brand-logo-wrap--animated]="animated()"
        [class.brand-logo-wrap--active]="active()"
        [class.brand-logo-wrap--glow]="glow()"
      >
        <svg
          class="brand-logo"
          [class]="sizeClass()"
          [attr.viewBox]="svg.viewBox"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          [attr.aria-label]="logo()"
          focusable="false"
        >
          @for (p of svg.paths; track p.d) {
            <path [attr.d]="p.d" [attr.fill]="p.fill" />
          }
        </svg>
      </span>
    }
  `,
  styles: `
    .brand-logo-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      position: relative;
      transition: transform 0.22s cubic-bezier(0.34, 1.4, 0.64, 1);
    }
    .brand-logo {
      display: block;
      flex-shrink: 0;
      transition: transform 0.22s cubic-bezier(0.34, 1.4, 0.64, 1);
    }
    .brand-logo--sm { width: 16px; height: 16px; }
    .brand-logo--md { width: 20px; height: 20px; }
    .brand-logo--lg { width: 24px; height: 24px; }
    .brand-logo--topo { width: 32px; height: 32px; }
    .brand-logo--xl { width: 40px; height: 40px; }

    .brand-logo-wrap--animated::before {
      content: '';
      position: absolute;
      inset: -3px;
      border-radius: 12px;
      background: conic-gradient(from 180deg, #6366f1, #22d3ee, #34d399, #a78bfa, #6366f1);
      opacity: 0;
      z-index: 0;
      transition: opacity 0.25s ease;
      mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      mask-composite: exclude;
      -webkit-mask-composite: xor;
      padding: 2px;
    }
    .brand-logo-wrap--animated:hover::before,
    .brand-logo-wrap--glow::before {
      opacity: 0.85;
    }
    .brand-logo-wrap--animated:hover .brand-logo,
    .brand-logo-wrap--glow .brand-logo {
      transform: scale(1.08);
    }
    .brand-logo-wrap--active {
      animation: logoPulse 2.4s ease-in-out infinite;
    }
    .brand-logo-wrap--active::before {
      opacity: 0.65;
      animation: ringSpin 6s linear infinite;
    }
    @keyframes logoPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.04); }
    }
    @keyframes ringSpin {
      from { filter: hue-rotate(0deg); }
      to { filter: hue-rotate(360deg); }
    }
    .brand-logo-wrap svg { position: relative; z-index: 1; }
  `,
})
export class BrandLogoComponent {
  readonly logo = input.required<NavLogoKey>()
  readonly size = input<'sm' | 'md' | 'lg' | 'topo' | 'xl'>('md')
  readonly animated = input(true)
  readonly active = input(false)
  readonly glow = input(false)

  readonly def = computed(() => BRAND_LOGO_SVG[this.logo()])

  sizeClass = (): string => `brand-logo brand-logo--${this.size()}`
}
