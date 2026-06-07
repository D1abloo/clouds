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
    @if (logo()) {
      <app-brand-logo [logo]="logo()!" [size]="size()" />
    } @else if (icon()) {
      <mat-icon [class]="matClass()">{{ icon() }}</mat-icon>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
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
  `,
})
export class NavIconComponent {
  readonly icon = input<string | undefined>()
  readonly logo = input<NavLogoKey | undefined>()
  readonly size = input<NavIconSize>('md')

  matClass = (): string => `nav-icon--${this.size()}`
}
