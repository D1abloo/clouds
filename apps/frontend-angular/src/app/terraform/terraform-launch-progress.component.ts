import { Component, input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import type { LaunchProgress } from '../core/stores/terraform-run.store'
import { BrandLogoComponent } from '../shared/components/brand-logo/brand-logo.component'
import type { NavLogoKey } from '../shared/theme/nav-logo.types'

@Component({
  selector: 'app-terraform-launch-progress',
  standalone: true,
  imports: [MatIconModule, BrandLogoComponent],
  template: `
    @if (progress(); as p) {
      <section
        class="tf-launch"
        role="status"
        aria-live="polite"
        [attr.aria-label]="'Lanzamiento en curso al ' + p.percent + ' por ciento'"
        [class.tf-launch--success]="p.status === 'success'"
        [class.tf-launch--error]="p.status === 'error'"
      >
        <div class="tf-launch__main">
          <div class="tf-launch__brand" aria-hidden="true">
            <app-brand-logo [logo]="providerLogo(p.provider)" size="md" />
            <mat-icon>arrow_forward</mat-icon>
            <app-brand-logo logo="terraform" size="md" />
          </div>
          <div class="tf-launch__copy">
            <h3>
              @if (p.status === 'success') {
                Lanzamiento completado
              } @else if (p.status === 'error') {
                Error en el lanzamiento
              } @else {
                Lanzando instancia
              }
            </h3>
            <p>
              @if (p.instanceName) {
                <strong>{{ p.instanceName }}</strong>
                @if (p.provider || p.region) {
                  <span> · {{ p.provider }}{{ p.region ? ' · ' + p.region : '' }}</span>
                }
              }
              @if (p.step) {
                <span class="tf-launch__step">{{ p.step }}</span>
              }
            </p>
          </div>
          <div class="tf-launch__pct" aria-hidden="true">
            <span class="tf-launch__pct-val">{{ p.percent }}%</span>
            <span class="tf-launch__pct-lbl">progreso</span>
          </div>
        </div>
        <div
          class="tf-launch__bar"
          role="progressbar"
          [attr.aria-valuenow]="p.percent"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <span class="tf-launch__bar-fill" [style.width.%]="p.percent"></span>
        </div>
        @if (p.log && p.status === 'running') {
          <p class="tf-launch__log mono">{{ p.log }}</p>
        }
      </section>
    }
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      flex-shrink: 0;
    }
    .tf-launch {
      padding: 0.75rem 1rem 0.85rem;
      border-radius: var(--app-radius-lg);
      background: color-mix(in srgb, #844fba 8%, var(--app-card));
      margin-bottom: 0.45rem;
    }
    .tf-launch--success {
      background: color-mix(in srgb, #22c55e 10%, var(--app-card));
    }
    .tf-launch--error {
      background: color-mix(in srgb, #ef4444 10%, var(--app-card));
    }
    .tf-launch__main {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      margin-bottom: 0.55rem;
      min-width: 0;
    }
    .tf-launch__brand {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      flex-shrink: 0;
    }
    .tf-launch__brand mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: var(--app-text-muted);
    }
    .tf-launch__copy {
      flex: 1;
      min-width: 0;
    }
    .tf-launch__copy h3 {
      margin: 0 0 0.2rem;
      font-size: 0.82rem;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .tf-launch__copy p {
      margin: 0;
      font-size: 0.72rem;
      color: var(--app-text-muted);
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .tf-launch__copy strong {
      color: var(--app-text);
      font-weight: 600;
    }
    .tf-launch__step {
      display: block;
      margin-top: 0.15rem;
      color: #844fba;
      font-weight: 600;
    }
    .tf-launch--success .tf-launch__step {
      color: #15803d;
    }
    .tf-launch--error .tf-launch__step {
      color: #b91c1c;
    }
    .tf-launch__pct {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      flex-shrink: 0;
      line-height: 1;
    }
    .tf-launch__pct-val {
      font-size: 1.75rem;
      font-weight: 800;
      color: #844fba;
      font-variant-numeric: tabular-nums;
    }
    .tf-launch--success .tf-launch__pct-val {
      color: #15803d;
    }
    .tf-launch--error .tf-launch__pct-val {
      color: #b91c1c;
    }
    .tf-launch__pct-lbl {
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--app-text-muted);
      margin-top: 0.15rem;
    }
    .tf-launch__bar {
      height: 8px;
      border-radius: 999px;
      background: var(--app-elevated);
      overflow: hidden;
    }
    .tf-launch__bar-fill {
      display: block;
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, #6b3fa0, #844fba);
      transition: width 0.35s ease;
    }
    .tf-launch--success .tf-launch__bar-fill {
      background: linear-gradient(90deg, #16a34a, #22c55e);
    }
    .tf-launch--error .tf-launch__bar-fill {
      background: #ef4444;
    }
    .tf-launch__log {
      margin: 0.45rem 0 0;
      font-size: 0.65rem;
      color: var(--app-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .mono {
      font-family: var(--app-font-mono, ui-monospace, monospace);
    }
    @media (max-width: 640px) {
      .tf-launch__main {
        flex-wrap: wrap;
      }
      .tf-launch__pct {
        width: 100%;
        flex-direction: row;
        align-items: baseline;
        justify-content: space-between;
        margin-top: 0.25rem;
      }
    }
  `,
})
export class TerraformLaunchProgressComponent {
  readonly progress = input<LaunchProgress | null>(null)

  providerLogo = (provider?: string): NavLogoKey => {
    if (provider === 'GCP') return 'gcp'
    if (provider === 'AZURE') return 'azure'
    return 'aws'
  }
}
