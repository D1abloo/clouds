import { ChangeDetectionStrategy, Component, input } from '@angular/core'

@Component({
  selector: 'app-logo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <img
      class="app-logo"
      [class]="sizeClass()"
      src="assets/logos/cloudops-mark.svg"
      alt="CloudOps Control Center"
      width="38"
      height="38"
      decoding="async"
    />
  `,
  styles: `
    .app-logo {
      display: block;
      flex-shrink: 0;
      object-fit: contain;
      border-radius: 12px;
    }
    .app-logo--sm { width: 24px; height: 24px; border-radius: 8px; }
    .app-logo--md { width: 38px; height: 38px; }
    .app-logo--lg { width: 48px; height: 48px; border-radius: 14px; }
  `,
})
export class AppLogoComponent {
  readonly size = input<'sm' | 'md' | 'lg'>('md')

  sizeClass = (): string => `app-logo app-logo--${this.size()}`
}
