import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import type { LaunchedResource } from './cloud-launch.types'

@Component({
  selector: 'app-cloud-resource-inventory-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule],
  template: `
    @if (resource(); as r) {
      <article class="inv">
        <header>
          <mat-icon>inventory_2</mat-icon>
          <div>
            <strong>{{ r.name }}</strong>
            <span>{{ r.provider }} · {{ r.region ?? '—' }}</span>
          </div>
          <span class="inv__status" [class.inv__status--ok]="r.status === 'RUNNING' || r.status === 'running'">
            {{ r.status ?? 'pending' }}
          </span>
        </header>
        <dl>
          <div><dt>ID</dt><dd>{{ r.id }}</dd></div>
          @if (r.publicIp) {
            <div><dt>IP pública</dt><dd>{{ r.publicIp }}</dd></div>
          }
        </dl>
        <div class="inv__actions">
          <button mat-stroked-button type="button" (click)="test.emit()">
            <mat-icon>network_check</mat-icon> Probar conectividad
          </button>
          <button mat-flat-button color="warn" type="button" (click)="remove.emit()">
            <mat-icon>delete_forever</mat-icon> Eliminar recurso
          </button>
        </div>
      </article>
    }
  `,
  styleUrl: './cloud-resource-inventory-card.component.scss',
})
export class CloudResourceInventoryCardComponent {
  readonly resource = input<LaunchedResource | null>(null)
  readonly test = output<void>()
  readonly remove = output<void>()
}
