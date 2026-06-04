import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { NAV_LOGO_ASSET, type NavLogoKey } from '../../theme/nav-logo.types'

@Component({
  selector: 'app-brand-logo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <img
      class="brand-logo"
      [class]="sizeClass()"
      [src]="src()"
      [alt]="logo()"
      loading="lazy"
      decoding="async"
    />
  `,
  styles: `
    .brand-logo {
      display: block;
      object-fit: contain;
      flex-shrink: 0;
    }
    .brand-logo--sm { width: 16px; height: 16px; }
    .brand-logo--md { width: 20px; height: 20px; }
    .brand-logo--lg { width: 24px; height: 24px; }
  `,
})
export class BrandLogoComponent {
  readonly logo = input.required<NavLogoKey>()
  readonly size = input<'sm' | 'md' | 'lg'>('md')

  src = (): string => NAV_LOGO_ASSET[this.logo()]

  sizeClass = (): string => `brand-logo brand-logo--${this.size()}`
}
