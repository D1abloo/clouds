import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'

@Component({
  selector: 'app-cloud-region-zone-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <section class="rz">
      <header class="rz__head">
        <div>
          <p>Ubicación</p>
          <h3>{{ title() }}</h3>
          <span>{{ hint() }}</span>
        </div>
        <div class="rz__badges">
          <span><mat-icon>public</mat-icon>{{ region() || 'Sin región' }}</span>
          <span><mat-icon>place</mat-icon>{{ zone() || zoneFallback() }}</span>
        </div>
      </header>
      <ng-content />
    </section>
  `,
  styles: `
    .rz { display: grid; gap: 0.8rem; }
    .rz__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; }
    .rz__head p { margin: 0 0 0.15rem; color: var(--text-soft); font-size: 0.72rem; font-weight: 800; text-transform: uppercase; }
    .rz__head h3 { margin: 0; font-size: 1.05rem; }
    .rz__head span { display: block; margin-top: 0.25rem; color: var(--text-muted); font-size: 0.82rem; }
    .rz__badges { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 0.4rem; }
    .rz__badges span {
      display: inline-flex; align-items: center; gap: 0.28rem; padding: 0.35rem 0.6rem; border-radius: 999px;
      background: var(--primary-soft); color: var(--primary); font-size: 0.74rem; font-weight: 800;
    }
    .rz__badges mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    @media (max-width: 760px) { .rz__head { flex-direction: column; } .rz__badges { justify-content: flex-start; } }
  `,
})
export class CloudRegionZoneStepComponent {
  readonly title = input('Región / zona')
  readonly hint = input('Selecciona la ubicación donde se creará el recurso.')
  readonly region = input('')
  readonly zone = input('')
  readonly zoneFallback = input('Sin zona')
}
