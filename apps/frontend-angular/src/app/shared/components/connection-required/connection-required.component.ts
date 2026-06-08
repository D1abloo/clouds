import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { IntegrationConnectionService } from '../../../core/services/integration-connection.service'
import { resolveConnectionCopy } from '../../../core/routing/module-requirements.util'

@Component({
  selector: 'app-connection-required',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div
      class="conn-req animate-fade-in"
      [class.conn-req--inline]="variant() === 'inline'"
      role="status"
      aria-live="polite"
    >
      <div class="conn-req__icon" aria-hidden="true">
        <mat-icon>{{ icon() }}</mat-icon>
      </div>
      <h2>{{ displayTitle() }}</h2>
      <p class="conn-req__lead">{{ displayDescription() }}</p>
      <div class="conn-req__actions">
        <button
          mat-flat-button
          color="primary"
          type="button"
          [attr.aria-label]="displayActionLabel()"
          (click)="handleConnect()"
        >
          {{ displayActionLabel() }}
        </button>
      </div>
    </div>
  `,
  styles: `
    .conn-req {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 2.5rem 1.5rem;
      margin: 0.5rem 0;
      border-radius: var(--app-radius-md, 12px);
      border: 1px dashed color-mix(in srgb, var(--app-text) 14%, transparent);
      background: color-mix(in srgb, var(--app-text) 2%, transparent);
    }
    .conn-req--inline {
      flex-direction: row;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-start;
      text-align: left;
      padding: 1rem 1.15rem;
      gap: 0.65rem 1rem;
      margin: 0 0 1rem;
    }
    .conn-req--inline h2 { font-size: 0.95rem; margin: 0; flex: 1 1 100%; }
    .conn-req--inline .conn-req__lead { margin: 0; flex: 1 1 220px; max-width: none; }
    .conn-req--inline .conn-req__icon {
      width: 48px;
      height: 48px;
      margin-bottom: 0;
      mat-icon { font-size: 1.5rem; width: 1.5rem; height: 1.5rem; }
    }
    .conn-req--inline .conn-req__actions { margin-left: auto; }
    .conn-req__icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--app-elevated);
      margin-bottom: 0.75rem;
      mat-icon { font-size: 2rem; width: 2rem; height: 2rem; color: #0ea5e9; }
    }
    h2 { margin: 0 0 0.45rem; font-size: 1.05rem; font-weight: 700; }
    .conn-req__lead { margin: 0 0 1.25rem; max-width: 420px; line-height: 1.55; color: var(--app-text-muted); font-size: 0.9rem; }
    .conn-req__actions { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; }
    .conn-req--inline .conn-req__actions { justify-content: flex-start; }
  `,
})
export class ConnectionRequiredComponent {
  private readonly connections = inject(IntegrationConnectionService)

  readonly moduleId = input<string>('')
  /** @deprecated use moduleId */
  readonly module = input<string>('')
  readonly title = input<string>('')
  readonly description = input<string>('')
  readonly actionLabel = input<string>('')
  readonly actionRoute = input<string>('')
  readonly variant = input<'full' | 'inline'>('full')
  readonly icon = input<string>('link_off')

  private readonly resolvedKey = computed(() => {
    const id = this.moduleId().trim()
    if (id) return id
    return this.module().trim()
  })

  private readonly resolvedCopy = computed(() => resolveConnectionCopy(this.resolvedKey()))

  readonly displayTitle = computed(() => this.title() || this.resolvedCopy().title)
  readonly displayDescription = computed(() => this.description() || this.resolvedCopy().description)
  readonly displayActionLabel = computed(() => this.actionLabel() || this.resolvedCopy().actionLabel)
  readonly displayActionRoute = computed(() => this.actionRoute() || this.resolvedCopy().actionRoute)

  handleConnect = (): void => {
    this.connections.openForModuleId(this.resolvedKey()).subscribe()
  }
}
