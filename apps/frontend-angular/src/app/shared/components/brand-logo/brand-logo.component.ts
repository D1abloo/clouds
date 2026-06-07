import { ChangeDetectionStrategy, Component, input, computed } from '@angular/core'
import { BRAND_LOGO_SVG } from '../../theme/brand-logo-svg.data'
import type { NavLogoKey } from '../../theme/nav-logo.types'

@Component({
  selector: 'app-brand-logo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (def(); as svg) {
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
    }
  `,
  styles: `
    .brand-logo {
      display: block;
      flex-shrink: 0;
    }
    .brand-logo--sm { width: 16px; height: 16px; }
    .brand-logo--md { width: 20px; height: 20px; }
    .brand-logo--lg { width: 24px; height: 24px; }
    .brand-logo--topo { width: 32px; height: 32px; }
    .brand-logo--xl { width: 40px; height: 40px; }
  `,
})
export class BrandLogoComponent {
  readonly logo = input.required<NavLogoKey>()
  readonly size = input<'sm' | 'md' | 'lg' | 'topo' | 'xl'>('md')

  readonly def = computed(() => BRAND_LOGO_SVG[this.logo()])

  sizeClass = (): string => `brand-logo brand-logo--${this.size()}`
}
