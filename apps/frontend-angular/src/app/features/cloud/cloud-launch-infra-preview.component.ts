import { Component, computed, input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import { cloudLaunchTheme } from './cloud-launch-theme.util'
import type { CloudSlug } from './cloud-provider.data'

@Component({
  selector: 'app-cloud-launch-infra-preview',
  standalone: true,
  imports: [MatIconModule, BrandLogoComponent],
  template: `
    <section
      class="clip"
      [class.clip--aws]="slug() === 'aws'"
      [class.clip--azure]="slug() === 'azure'"
      [class.clip--gcp]="slug() === 'gcp'"
      [class.clip--clouding]="slug() === 'clouding'"
      [style.--clip-accent]="theme().accent"
      aria-label="Vista previa gráfica de infraestructura"
    >
      <header class="clip__head">
        <app-brand-logo [logo]="theme().logo" size="md" />
        <div>
          <h4>Arquitectura a provisionar</h4>
          <p>La vista refleja la configuración seleccionada en tiempo real.</p>
        </div>
      </header>

      <div class="clip__canvas">
        <div class="clip__lane clip__lane--edge">
          <span class="clip__pill"><mat-icon>public</mat-icon> Internet</span>
        </div>
        <div class="clip__arrow"></div>
        <div class="clip__lane">
          <article class="clip__node clip__node--region">
            <mat-icon>public</mat-icon>
            <div>
              <span>Región</span>
              <strong>{{ region() || '—' }}</strong>
            </div>
          </article>
        </div>
        <div class="clip__arrow"></div>
        <div class="clip__lane clip__lane--row">
          <article class="clip__node">
            <mat-icon>device_hub</mat-icon>
            <div>
              <span>{{ theme().networkKind }}</span>
              <strong>{{ network() || 'vpc-main' }}</strong>
            </div>
          </article>
          <article class="clip__node">
            <mat-icon>security</mat-icon>
            <div>
              <span>{{ theme().sgLabel }}</span>
              <strong>{{ securityGroup() || 'default' }}</strong>
            </div>
          </article>
        </div>
        <div class="clip__arrow"></div>
        <div class="clip__lane clip__lane--row">
          <article class="clip__node clip__node--hero">
            <mat-icon>dns</mat-icon>
            <div>
              <span>{{ theme().computeLabel }}</span>
              <strong>{{ instanceType() || '—' }}</strong>
              <em>{{ imageName() || 'Imagen SO' }}</em>
            </div>
            <div class="clip__meter" aria-hidden="true">
              <span [style.width.%]="progressPct()"></span>
            </div>
          </article>
          <article class="clip__node">
            <mat-icon>storage</mat-icon>
            <div>
              <span>Disco raíz</span>
              <strong>{{ diskLabel() }}</strong>
              <em>{{ diskTypeLabel() }}</em>
            </div>
          </article>
        </div>
        <div class="clip__arrow"></div>
        <div class="clip__lane">
          <article class="clip__node clip__node--monitor">
            <mat-icon>monitoring</mat-icon>
            <div>
              <span>Observabilidad</span>
              <strong>{{ theme().monitorLabel }}</strong>
              <em>Agente + health checks</em>
            </div>
          </article>
        </div>
      </div>

      <ul class="clip__stats">
        <li><mat-icon>memory</mat-icon> {{ specs() }}</li>
        <li><mat-icon>payments</mat-icon> ~{{ monthlyCost() }}/mes est.</li>
        @if (keyPair()) {
          <li><mat-icon>vpn_key</mat-icon> {{ keyPair() }}</li>
        }
        @if (publicIp()) {
          <li><mat-icon>public</mat-icon> IP pública asignada</li>
        }
        <li><mat-icon>verified_user</mat-icon> Workspace aislado · cifrado AES-256</li>
        <li><mat-icon>bolt</mat-icon> {{ instanceName() || 'Nueva instancia' }}</li>
      </ul>
    </section>
  `,
  styles: `
    .clip {
      padding: 0.85rem;
      border-radius: 14px;
      background: linear-gradient(145deg, color-mix(in srgb, var(--clip-accent) 6%, var(--app-card)), var(--app-elevated));
      border: 1px solid color-mix(in srgb, var(--clip-accent) 22%, transparent);
    }
    .clip__head {
      display: flex; align-items: center; gap: 0.65rem; margin-bottom: 0.75rem;
      h4 { margin: 0 0 0.15rem; font-size: 0.82rem; font-weight: 800; }
      p { margin: 0; font-size: 0.68rem; color: var(--app-text-muted); }
    }
    .clip__canvas { display: flex; flex-direction: column; align-items: center; gap: 0.35rem; margin-bottom: 0.65rem; }
    .clip__lane { width: 100%; display: flex; justify-content: center; }
    .clip__lane--row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.45rem; }
    .clip__lane--edge { opacity: 0.85; }
    .clip__pill {
      display: inline-flex; align-items: center; gap: 0.25rem;
      padding: 0.2rem 0.55rem; border-radius: 999px; font-size: 0.62rem; font-weight: 700;
      background: color-mix(in srgb, var(--clip-accent) 12%, var(--app-card));
      border: 1px dashed color-mix(in srgb, var(--clip-accent) 35%, transparent);
      mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; }
    }
    .clip__arrow {
      width: 2px; height: 14px;
      background: linear-gradient(180deg, var(--clip-accent), color-mix(in srgb, var(--clip-accent) 30%, transparent));
    }
    .clip__node {
      width: 100%; padding: 0.5rem 0.6rem; border-radius: 10px;
      background: var(--app-card);
      border: 1px solid color-mix(in srgb, var(--app-text-muted) 14%, transparent);
      display: grid; grid-template-columns: auto 1fr; gap: 0.12rem 0.45rem; align-items: center;
      mat-icon { grid-row: span 3; color: var(--clip-accent); font-size: 1.15rem; width: 1.15rem; height: 1.15rem; }
      span { font-size: 0.55rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--app-text-muted); grid-column: 2; }
      strong { font-size: 0.76rem; grid-column: 2; }
      em { grid-column: 2; font-size: 0.64rem; color: var(--app-text-muted); font-style: normal; }
    }
    .clip__node--region { border-left: 3px solid var(--clip-accent); }
    .clip__node--hero { border-color: color-mix(in srgb, var(--clip-accent) 40%, transparent); }
    .clip__node--monitor { border-style: dashed; }
    .clip__meter {
      grid-column: 1 / -1; height: 5px; border-radius: 999px; background: var(--app-elevated); overflow: hidden; margin-top: 0.25rem;
      span { display: block; height: 100%; background: var(--clip-accent); transition: width 0.35s ease; }
    }
    .clip__stats {
      list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 0.35rem 0.65rem;
      font-size: 0.68rem; color: var(--app-text-muted);
      li { display: flex; align-items: center; gap: 0.28rem; min-width: 0; }
      mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; color: var(--clip-accent); flex-shrink: 0; }
    }
    .clip--aws {
      border-radius: 4px;
      background: #fafafa;
      border-color: #d5dbdb;
    }
    .clip--azure {
      border-left: 3px solid var(--clip-accent);
      border-radius: 2px;
      box-shadow: none;
    }
    .clip--gcp {
      border: none;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(60, 64, 67, 0.2);
    }
    .clip--clouding {
      border-radius: 12px;
      background: linear-gradient(145deg, color-mix(in srgb, var(--clip-accent) 8%, #fff), #f5f3ff);
    }
  `,
})
export class CloudLaunchInfraPreviewComponent {
  readonly slug = input.required<CloudSlug>()
  readonly region = input('')
  readonly network = input('')
  readonly securityGroup = input('')
  readonly instanceType = input('')
  readonly imageName = input('')
  readonly instanceName = input('')
  readonly specs = input('—')
  readonly monthlyCost = input('$0')
  readonly launchPercent = input(0)
  readonly diskGb = input<number | undefined>()
  readonly diskType = input('')
  readonly keyPair = input('')
  readonly publicIp = input(false)

  readonly theme = computed(() => cloudLaunchTheme(this.slug()))
  readonly progressPct = computed(() => Math.min(100, Math.max(8, this.launchPercent() || 12)))
  readonly diskLabel = computed(() => {
    const gb = this.diskGb()
    return gb ? `${gb} GB` : this.theme().diskLabel
  })
  readonly diskTypeLabel = computed(() => this.diskType() || this.theme().diskType)
}
