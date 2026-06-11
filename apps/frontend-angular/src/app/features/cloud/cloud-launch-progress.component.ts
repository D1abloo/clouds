import { Component, input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import type { NavLogoKey } from '../../shared/theme/nav-logo.types'

export type CloudLaunchProgressState = {
  percent: number
  step: string
  log?: string
  status: 'running' | 'success' | 'error'
  instanceName?: string
  provider?: string
  region?: string
}

@Component({
  selector: 'app-cloud-launch-progress',
  standalone: true,
  imports: [MatIconModule, BrandLogoComponent],
  template: `
    @if (progress(); as p) {
      <section
        class="clp"
        role="status"
        aria-live="polite"
        [attr.aria-label]="'Lanzamiento al ' + p.percent + ' por ciento'"
        [class.clp--success]="p.status === 'success'"
        [class.clp--error]="p.status === 'error'"
      >
        <div class="clp__main">
          <app-brand-logo [logo]="providerLogo(p.provider)" size="md" />
          <div class="clp__copy">
            <h3>
              @if (p.status === 'success') { Instancia provisionada }
              @else if (p.status === 'error') { Error en el lanzamiento }
              @else { Provisionando infraestructura }
            </h3>
            <p>
              @if (p.instanceName) {
                <strong>{{ p.instanceName }}</strong>
                @if (p.region) { <span> · {{ p.region }}</span> }
              }
              <span class="clp__step">{{ p.step }}</span>
            </p>
          </div>
          <div class="clp__pct" aria-hidden="true">
            <span class="clp__pct-val">{{ p.percent }}%</span>
            <span class="clp__pct-lbl">completado</span>
          </div>
        </div>
        <div
          class="clp__bar"
          role="progressbar"
          [attr.aria-valuenow]="p.percent"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <span class="clp__bar-fill" [style.width.%]="p.percent"></span>
        </div>
        @if (p.log && p.status === 'running') {
          <p class="clp__log">{{ p.log }}</p>
        }
      </section>
    }
  `,
  styles: `
    .clp {
      padding: 0.85rem 1rem;
      border-radius: 14px;
      background: color-mix(in srgb, var(--cloud-accent, #0284c7) 8%, var(--app-card));
      border: 1px solid color-mix(in srgb, var(--cloud-accent, #0284c7) 22%, transparent);
      margin-bottom: 1rem;
    }
    .clp--success { background: color-mix(in srgb, #22c55e 10%, var(--app-card)); border-color: #86efac; }
    .clp--error { background: color-mix(in srgb, #ef4444 10%, var(--app-card)); border-color: #fecaca; }
    .clp__main { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.55rem; min-width: 0; }
    .clp__copy { flex: 1; min-width: 0; }
    .clp__copy h3 { margin: 0 0 0.2rem; font-size: 0.85rem; font-weight: 800; }
    .clp__copy p { margin: 0; font-size: 0.74rem; color: var(--app-text-muted); line-height: 1.4; }
    .clp__copy strong { color: var(--app-text); }
    .clp__step { display: block; margin-top: 0.2rem; font-weight: 600; color: var(--cloud-accent, #0284c7); }
    .clp__pct { text-align: right; flex-shrink: 0; }
    .clp__pct-val { font-size: 1.65rem; font-weight: 800; font-variant-numeric: tabular-nums; color: var(--cloud-accent, #0284c7); }
    .clp--success .clp__pct-val { color: #15803d; }
    .clp__pct-lbl { font-size: 0.58rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--app-text-muted); }
    .clp__bar { height: 10px; border-radius: 999px; background: var(--app-elevated); overflow: hidden; }
    .clp__bar-fill {
      display: block; height: 100%; border-radius: 999px;
      background: linear-gradient(90deg, color-mix(in srgb, var(--cloud-accent) 80%, #000), var(--cloud-accent, #0284c7));
      transition: width 0.4s ease;
    }
    .clp--success .clp__bar-fill { background: linear-gradient(90deg, #16a34a, #22c55e); }
    .clp__log { margin: 0.45rem 0 0; font-size: 0.68rem; font-family: var(--app-font-mono, monospace); color: var(--app-text-muted); }
  `,
})
export class CloudLaunchProgressComponent {
  readonly progress = input<CloudLaunchProgressState | null>(null)

  providerLogo = (provider?: string): NavLogoKey => {
    if (provider === 'GCP') return 'gcp'
    if (provider === 'AZURE') return 'azure'
    if (provider === 'CLOUDING') return 'clouding'
    return 'aws'
  }
}
