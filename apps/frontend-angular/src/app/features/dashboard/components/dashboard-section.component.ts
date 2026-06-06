import { Component, Input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component'
import type { NavLogoKey } from '../../../shared/theme/nav-logo.types'

@Component({
  selector: 'app-dashboard-section',
  standalone: true,
  imports: [MatIconModule, BrandLogoComponent],
  template: `
    <section class="dash-section animate-fade-in" [style.animation-delay.ms]="delay">
      @if (title) {
        <header class="dash-section__head">
          <div>
            @if (logos.length || logo || icon) {
              <div
                class="dash-section__icon"
                [class.dash-section__icon--logos]="logos.length > 0"
              >
                @if (logos.length) {
                  @for (logoKey of logos; track logoKey) {
                    <app-brand-logo [logo]="logoKey" size="sm" />
                  }
                } @else if (logo) {
                  <app-brand-logo [logo]="logo" size="md" />
                } @else {
                  <mat-icon>{{ icon }}</mat-icon>
                }
              </div>
            }
            <div>
              <h2>{{ title }}</h2>
              @if (subtitle) { <p>{{ subtitle }}</p> }
            </div>
          </div>
          <ng-content select="[sectionActions]" />
        </header>
      }
      <div class="dash-section__body">
        <ng-content />
      </div>
    </section>
  `,
  styles: `
    .dash-section {
      margin-bottom: 1.75rem;
    }
    .dash-section__body > .summary-grid,
    .dash-section__body > .app-section-panel {
      margin-bottom: 0;
    }
    .dash-section__body :where(.summary-grid) {
      margin-bottom: 0;
    }
    .dash-section__head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 1rem;
      > div:first-child {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
      }
      h2 { margin: 0; font-size: 1.05rem; font-weight: 700; letter-spacing: -0.02em; }
      p { margin: 0.2rem 0 0; font-size: 0.82rem; color: var(--app-text-muted); }
    }
    .dash-section__icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--app-accent) 10%, transparent);
      mat-icon { color: var(--app-accent); font-size: 1.15rem; width: 1.15rem; height: 1.15rem; }
    }
    .dash-section__icon--logos {
      width: auto;
      min-width: 36px;
      max-width: 88px;
      height: 36px;
      padding: 0 0.4rem;
      gap: 0.28rem;
      flex-wrap: wrap;
      background: color-mix(in srgb, var(--app-surface) 40%, var(--app-card));
    }
  `,
})
export class DashboardSectionComponent {
  @Input() title = ''
  @Input() subtitle = ''
  @Input() icon = ''
  @Input() logo?: NavLogoKey
  @Input() logos: NavLogoKey[] = []
  @Input() delay = 0
}
