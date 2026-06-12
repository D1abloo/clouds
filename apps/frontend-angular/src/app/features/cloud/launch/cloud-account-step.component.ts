import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'

@Component({
  selector: 'app-cloud-account-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <section class="step-card">
      <header class="step-card__head">
        <div>
          <p>Cuenta y credenciales</p>
          <h3>{{ title() }}</h3>
        </div>
        <span class="step-card__state" [class.step-card__state--ok]="valid()" [class.step-card__state--bad]="valid() === false">
          <mat-icon>{{ valid() ? 'verified' : valid() === false ? 'error' : 'sync' }}</mat-icon>
          {{ valid() ? 'ready' : valid() === false ? 'failed' : 'validating' }}
        </span>
      </header>
      <p class="step-card__hint">{{ hint() }}</p>
      <dl class="step-card__facts">
        <div><dt>Proveedor</dt><dd>{{ provider() || '—' }}</dd></div>
        <div><dt>Cuenta</dt><dd>{{ accountName() || 'Sin cuenta' }}</dd></div>
        <div><dt>Estado</dt><dd>{{ message() || 'Esperando validación' }}</dd></div>
      </dl>
      <ng-content />
    </section>
  `,
  styles: `
    .step-card { display: grid; gap: 0.85rem; }
    .step-card__head { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; }
    .step-card__head p { margin: 0 0 0.15rem; color: var(--text-soft); font-size: 0.72rem; font-weight: 800; text-transform: uppercase; }
    .step-card__head h3 { margin: 0; font-size: 1.05rem; color: var(--text-main); }
    .step-card__hint { margin: 0; color: var(--text-muted); font-size: 0.84rem; }
    .step-card__state {
      display: inline-flex; align-items: center; gap: 0.35rem; flex-shrink: 0;
      padding: 0.25rem 0.55rem; border-radius: 999px; color: var(--warning);
      background: color-mix(in srgb, var(--warning) 12%, transparent); font-size: 0.7rem; font-weight: 800;
    }
    .step-card__state mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    .step-card__state--ok { color: var(--success); background: color-mix(in srgb, var(--success) 12%, transparent); }
    .step-card__state--bad { color: var(--danger); background: var(--danger-soft); }
    .step-card__facts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.55rem; margin: 0; }
    .step-card__facts div { border: 1px solid var(--border-soft); border-radius: 10px; background: var(--bg-main); padding: 0.65rem; min-width: 0; }
    .step-card__facts dt { color: var(--text-soft); font-size: 0.68rem; font-weight: 800; text-transform: uppercase; }
    .step-card__facts dd { margin: 0.2rem 0 0; color: var(--text-main); font-size: 0.82rem; font-weight: 700; overflow-wrap: anywhere; }
    @media (max-width: 760px) { .step-card__facts { grid-template-columns: 1fr; } }
  `,
})
export class CloudAccountStepComponent {
  readonly title = input('Cuenta conectada')
  readonly hint = input('Verifica credenciales y permisos antes de provisionar.')
  readonly provider = input('')
  readonly accountName = input('')
  readonly valid = input<boolean | null>(null)
  readonly message = input('')
}
