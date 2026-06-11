import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component'
import type { ProviderCard } from './cloud-launch.types'

@Component({
  selector: 'app-cloud-provider-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, BrandLogoComponent],
  template: `
    <div class="cps" role="list">
      @for (p of providers(); track p.slug) {
        <button
          type="button"
          class="cps__card"
          role="listitem"
          [class.cps__card--on]="selected() === p.slug"
          (click)="selectedChange.emit(p.slug)"
        >
          <app-brand-logo [logo]="p.logo" size="lg" />
          <strong>{{ p.label }}</strong>
          <span>{{ p.tagline }}</span>
          @if (selected() === p.slug) {
            <mat-icon class="cps__check">check_circle</mat-icon>
          }
        </button>
      }
    </div>
  `,
  styleUrl: './cloud-provider-selector.component.scss',
})
export class CloudProviderSelectorComponent {
  readonly providers = input.required<ProviderCard[]>()
  readonly selected = input<string | null>(null)
  readonly selectedChange = output<string>()
}
