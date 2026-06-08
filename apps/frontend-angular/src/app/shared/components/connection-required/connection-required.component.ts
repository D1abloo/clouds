import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { RouterLink } from '@angular/router'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'

@Component({
  selector: 'app-connection-required',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, RouterLink],
  template: `
    <div class="conn-req animate-fade-in" role="status" aria-live="polite">
      <div class="conn-req__icon" aria-hidden="true">
        <mat-icon>link_off</mat-icon>
      </div>
      <h2>{{ title() }}</h2>
      <p class="conn-req__lead">{{ description() }}</p>
      <div class="conn-req__actions">
        <a mat-flat-button color="primary" [routerLink]="actionRoute()">
          {{ actionLabel() }}
        </a>
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
  `,
})
export class ConnectionRequiredComponent {
  readonly title = input<string>('Sin cuentas conectadas')
  readonly description = input<string>('Añade una cuenta para comenzar.')
  readonly actionLabel = input<string>('Añadir cuenta')
  readonly actionRoute = input<string>('/admin/settings')
  /** @deprecated use title/description/actionLabel */
  readonly module = input<string>('')
}
