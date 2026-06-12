import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'

@Component({
  selector: 'app-cloud-compute-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <section class="compute-step">
      <header>
        <div>
          <p>Compute</p>
          <h3>{{ title() }}</h3>
          <span>{{ hint() }}</span>
        </div>
        <dl>
          <div><dt>Nombre</dt><dd>{{ name() || '—' }}</dd></div>
          <div><dt>Tipo</dt><dd>{{ instanceType() || '—' }}</dd></div>
          <div><dt>Disco</dt><dd>{{ diskGb() ? diskGb() + ' GB' : '—' }}</dd></div>
        </dl>
      </header>
      <ng-content />
    </section>
  `,
  styles: `
    .compute-step { display: grid; gap: 0.8rem; }
    header { display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, 38%); gap: 0.8rem; align-items: start; }
    p { margin: 0 0 0.15rem; color: var(--text-soft); font-size: 0.72rem; font-weight: 800; text-transform: uppercase; }
    h3 { margin: 0; font-size: 1.05rem; }
    header span { display: block; margin-top: 0.25rem; color: var(--text-muted); font-size: 0.82rem; }
    dl { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.35rem; margin: 0; }
    dl div { background: var(--bg-main); border: 1px solid var(--border-soft); border-radius: 10px; padding: 0.55rem; min-width: 0; }
    dt { color: var(--text-soft); font-size: 0.62rem; font-weight: 800; text-transform: uppercase; }
    dd { margin: 0.18rem 0 0; color: var(--text-main); font-size: 0.76rem; font-weight: 800; overflow-wrap: anywhere; }
    @media (max-width: 860px) { header { grid-template-columns: 1fr; } }
  `,
})
export class CloudComputeStepComponent {
  readonly title = input('Tipo de instancia')
  readonly hint = input('Selecciona compute, disco raíz, nombre y etiquetas.')
  readonly name = input('')
  readonly instanceType = input('')
  readonly diskGb = input<number | null | undefined>(undefined)
}
