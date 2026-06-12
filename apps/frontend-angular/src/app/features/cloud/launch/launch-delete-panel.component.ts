import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component'
import { CloudResourceInventoryCardComponent } from './cloud-resource-inventory-card.component'
import type { LaunchedResource } from './cloud-launch.types'

@Component({
  selector: 'app-launch-delete-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, LoadingStateComponent, CloudResourceInventoryCardComponent],
  template: `
    <section class="delete-panel">
      <header>
        <mat-icon>delete_forever</mat-icon>
        <div>
          <strong>Eliminación controlada</strong>
          <span>Confirma la retirada del recurso de prueba y conserva el log.</span>
        </div>
      </header>
      @if (deleting()) {
        <app-loading-state message="Eliminando recurso…" />
      } @else if (resource()) {
        <app-cloud-resource-inventory-card [resource]="resource()" (remove)="remove.emit()" />
        <div class="delete-panel__actions">
          <button mat-flat-button color="warn" type="button" (click)="remove.emit()">
            <mat-icon>delete_forever</mat-icon>
            Confirmar eliminación
          </button>
        </div>
      } @else {
        <p class="delete-panel__done"><mat-icon>check_circle</mat-icon> Recurso eliminado correctamente.</p>
      }
      <p class="delete-panel__final"><mat-icon>inventory</mat-icon> Estado final: {{ resource() ? resource()?.status ?? 'running' : 'deleted' }}</p>
    </section>
  `,
  styles: `
    .delete-panel { display: grid; gap: 0.75rem; }
    header { display: flex; align-items: center; gap: 0.55rem; padding: 0.75rem; border-radius: 12px; background: var(--danger-soft); }
    header mat-icon { color: var(--danger); }
    strong { display: block; color: var(--text-main); }
    span { color: var(--text-muted); font-size: 0.78rem; }
    .delete-panel__actions { display: flex; justify-content: flex-end; }
    .delete-panel__done, .delete-panel__final {
      display: flex; align-items: center; gap: 0.35rem; margin: 0; padding: 0.65rem 0.75rem; border-radius: 10px; font-size: 0.82rem; font-weight: 700;
    }
    .delete-panel__done { background: color-mix(in srgb, var(--success) 10%, var(--bg-card)); color: var(--success); }
    .delete-panel__final { background: var(--bg-main); color: var(--text-muted); }
    .delete-panel__done mat-icon, .delete-panel__final mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
  `,
})
export class LaunchDeletePanelComponent {
  readonly resource = input<LaunchedResource | null>(null)
  readonly deleting = input(false)
  readonly remove = output<void>()
}
