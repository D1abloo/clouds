import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core'
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
        <mat-icon>settings_suggest</mat-icon>
      </div>
      <h2>Configuración requerida</h2>
      <p class="conn-req__lead">
        El módulo <strong>{{ module() }}</strong> necesita credenciales o integración externa antes de mostrar datos en modo PRO.
      </p>
      <p class="conn-req__hint">{{ hint() }}</p>
      <div class="conn-req__actions">
        <a mat-flat-button color="primary" routerLink="/admin/settings">
          Ir a configuración
        </a>
        <a mat-stroked-button routerLink="/dashboard">Volver al tablero</a>
      </div>
    </div>
  `,
  styles: `
    .conn-req {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 3rem 1.5rem;
      margin: 0.5rem 0;
      border-radius: var(--app-radius-md, 12px);
      border: 1px dashed color-mix(in srgb, var(--app-text) 18%, transparent);
      background: color-mix(in srgb, var(--app-text) 3%, transparent);
    }
    .conn-req__icon {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--app-elevated);
      margin-bottom: 0.75rem;
      mat-icon { font-size: 2.25rem; width: 2.25rem; height: 2.25rem; color: #0ea5e9; }
    }
    h2 { margin: 0 0 0.5rem; font-size: 1.15rem; font-weight: 700; }
    .conn-req__lead { margin: 0 0 0.5rem; max-width: 520px; line-height: 1.55; color: var(--app-text-muted); }
    .conn-req__hint { margin: 0 0 1.25rem; max-width: 480px; font-size: 0.88rem; color: var(--app-text-muted); }
    .conn-req__actions { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; }
  `,
})
export class ConnectionRequiredComponent {
  readonly module = input.required<string>()
  readonly hint = input<string | undefined>(
    'Añada las variables de entorno o conecte la cuenta en Administración → Configuración → Integraciones.',
  )
}
