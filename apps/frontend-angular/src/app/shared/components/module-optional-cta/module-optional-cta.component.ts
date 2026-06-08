import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { IntegrationConnectionService } from '../../../core/services/integration-connection.service'
import { optionalCloudCtaCopy } from '../../../core/routing/module-requirements.util'

@Component({
  selector: 'app-module-optional-cta',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <aside class="mod-cta" role="note" aria-label="Conexión opcional">
      <mat-icon aria-hidden="true">cloud_queue</mat-icon>
      <div class="mod-cta__copy">
        <strong>{{ title() }}</strong>
        <p>{{ description() }}</p>
      </div>
      <button
        mat-stroked-button
        color="primary"
        type="button"
        [attr.aria-label]="actionLabel()"
        (click)="handleConnect()"
      >
        {{ actionLabel() }}
      </button>
    </aside>
  `,
  styles: `
    .mod-cta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.65rem 1rem;
      padding: 0.75rem 1rem;
      margin: 0 0 1rem;
      border-radius: var(--app-radius-md, 12px);
      border: 1px solid color-mix(in srgb, #0ea5e9 22%, transparent);
      background: color-mix(in srgb, #0ea5e9 6%, transparent);
    }
    mat-icon { color: #0284c7; }
    .mod-cta__copy {
      flex: 1 1 200px;
      strong { display: block; font-size: 0.85rem; }
      p { margin: 0.15rem 0 0; font-size: 0.78rem; color: var(--app-text-muted); line-height: 1.45; }
    }
  `,
})
export class ModuleOptionalCtaComponent {
  private readonly connections = inject(IntegrationConnectionService)
  private readonly defaults = optionalCloudCtaCopy()

  readonly title = input(this.defaults.title)
  readonly description = input(this.defaults.description)
  readonly actionLabel = input(this.defaults.actionLabel)
  readonly actionRoute = input(this.defaults.actionRoute)

  handleConnect = (): void => {
    this.connections.openDataSource().subscribe()
  }
}
