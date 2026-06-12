import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'

@Component({
  selector: 'app-cloud-image-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <section class="image-step">
      <header>
        <div>
          <p>Imagen</p>
          <h3>{{ title() }}</h3>
          <span>{{ hint() }}</span>
        </div>
        <span class="image-step__count"><mat-icon>image</mat-icon>{{ imageCount() }} disponibles</span>
      </header>
      <ng-content />
    </section>
  `,
  styles: `
    .image-step { display: grid; gap: 0.8rem; }
    header { display: flex; justify-content: space-between; gap: 0.8rem; align-items: flex-start; }
    p { margin: 0 0 0.15rem; color: var(--text-soft); font-size: 0.72rem; font-weight: 800; text-transform: uppercase; }
    h3 { margin: 0; font-size: 1.05rem; }
    header span { display: block; margin-top: 0.25rem; color: var(--text-muted); font-size: 0.82rem; }
    .image-step__count {
      display: inline-flex; align-items: center; gap: 0.35rem; margin: 0; padding: 0.35rem 0.6rem; border-radius: 999px;
      background: var(--primary-soft); color: var(--primary); font-size: 0.72rem; font-weight: 800;
    }
    .image-step__count mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    @media (max-width: 760px) { header { flex-direction: column; } }
  `,
})
export class CloudImageStepComponent {
  readonly title = input('Imagen / sistema operativo')
  readonly hint = input('Selecciona una imagen compatible con la región y el tipo de recurso.')
  readonly imageCount = input(0)
}
