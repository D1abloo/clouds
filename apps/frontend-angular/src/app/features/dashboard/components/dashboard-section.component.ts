import { Component, Input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'

@Component({
  selector: 'app-dashboard-section',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <section class="dash-section animate-fade-in" [style.animation-delay.ms]="delay">
      @if (title) {
        <header class="dash-section__head">
          <div>
            @if (icon) {
              <div class="dash-section__icon"><mat-icon>{{ icon }}</mat-icon></div>
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
  `,
})
export class DashboardSectionComponent {
  @Input() title = ''
  @Input() subtitle = ''
  @Input() icon = ''
  @Input() delay = 0
}
