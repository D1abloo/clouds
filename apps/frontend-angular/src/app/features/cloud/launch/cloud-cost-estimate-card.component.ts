import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'

@Component({
  selector: 'app-cloud-cost-estimate-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <section class="cost-card">
      <header>
        <mat-icon>payments</mat-icon>
        <div>
          <strong>Coste estimado</strong>
          <span>{{ provider() }} · {{ region() || 'sin región' }}</span>
        </div>
      </header>
      <dl>
        <div><dt>Hora</dt><dd>{{ hourly() || '—' }}</dd></div>
        <div><dt>Mes</dt><dd>{{ monthly() || '—' }}</dd></div>
        <div><dt>Tipo</dt><dd>{{ instanceType() || '—' }}</dd></div>
      </dl>
      @if (hint()) {
        <p>{{ hint() }}</p>
      }
    </section>
  `,
  styles: `
    .cost-card {
      display: grid; gap: 0.65rem; margin-bottom: 0.85rem; padding: 0.85rem;
      border: 1px solid color-mix(in srgb, var(--primary) 20%, var(--border-soft));
      border-radius: 12px; background: var(--primary-soft);
    }
    header { display: flex; align-items: center; gap: 0.55rem; }
    header mat-icon { color: var(--primary); }
    strong { display: block; color: var(--text-main); font-size: 0.9rem; }
    header span { color: var(--text-muted); font-size: 0.74rem; }
    dl { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.45rem; margin: 0; }
    dl div { background: var(--bg-card); border: 1px solid var(--border-soft); border-radius: 10px; padding: 0.55rem; }
    dt { color: var(--text-soft); font-size: 0.62rem; font-weight: 800; text-transform: uppercase; }
    dd { margin: 0.15rem 0 0; color: var(--text-main); font-size: 0.86rem; font-weight: 800; }
    p { margin: 0; color: var(--text-muted); font-size: 0.76rem; }
    @media (max-width: 720px) { dl { grid-template-columns: 1fr; } }
  `,
})
export class CloudCostEstimateCardComponent {
  readonly provider = input('')
  readonly region = input('')
  readonly instanceType = input('')
  readonly hourly = input('')
  readonly monthly = input('')
  readonly hint = input('')
}
