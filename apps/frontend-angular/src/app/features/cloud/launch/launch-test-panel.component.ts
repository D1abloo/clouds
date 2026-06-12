import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component'
import { CloudResourceInventoryCardComponent } from './cloud-resource-inventory-card.component'
import type { LaunchedResource } from './cloud-launch.types'

@Component({
  selector: 'app-launch-test-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, LoadingStateComponent, CloudResourceInventoryCardComponent],
  template: `
    <section class="test-panel">
      <header>
        <mat-icon>network_check</mat-icon>
        <div>
          <strong>Prueba de conectividad</strong>
          <span>Verifica inventario, IP pública y descubrimiento básico.</span>
        </div>
      </header>
      <app-cloud-resource-inventory-card [resource]="resource()" (test)="test.emit()" (remove)="remove.emit()" />
      @if (testing()) {
        <app-loading-state message="Ejecutando prueba de conectividad…" />
      }
      @if (result()) {
        <p class="test-panel__result">{{ result() }}</p>
        <button mat-stroked-button type="button" (click)="test.emit()">
          <mat-icon>refresh</mat-icon>
          Reintentar
        </button>
      }
    </section>
  `,
  styles: `
    .test-panel { display: grid; gap: 0.75rem; }
    header { display: flex; align-items: center; gap: 0.55rem; padding: 0.75rem; border-radius: 12px; background: var(--primary-soft); }
    header mat-icon { color: var(--primary); }
    strong { display: block; color: var(--text-main); }
    span { color: var(--text-muted); font-size: 0.78rem; }
    .test-panel__result { margin: 0; padding: 0.75rem; border-radius: 8px; background: color-mix(in srgb, var(--success) 10%, var(--bg-card)); color: var(--success); font-size: 0.85rem; font-weight: 700; }
  `,
})
export class LaunchTestPanelComponent {
  readonly resource = input<LaunchedResource | null>(null)
  readonly testing = input(false)
  readonly result = input('')
  readonly test = output<void>()
  readonly remove = output<void>()
}
