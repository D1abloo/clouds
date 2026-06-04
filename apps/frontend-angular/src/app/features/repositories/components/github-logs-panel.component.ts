import { Component, Input, output } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'

@Component({
  selector: 'app-github-logs-panel',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    @if (open) {
      <div class="logs-panel">
        <header>
          <strong>Registros de despliegue</strong>
          @if (title) { <span class="logs-sub">{{ title }}</span> }
          <button mat-icon-button type="button" aria-label="Cerrar registros" (click)="close.emit()">
            <mat-icon>close</mat-icon>
          </button>
        </header>
        <pre class="logs-body" tabindex="0" role="log" aria-live="polite">{{ logs || 'Sin registros disponibles.' }}</pre>
      </div>
    }
  `,
  styles: `
    .logs-panel {
      margin-top: 1rem;
      border-radius: var(--app-radius-lg);
      background: #0d1117;
      color: #c9d1d9;
      overflow: hidden;
      box-shadow: var(--app-shadow-sm);
    }
    header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 0.85rem;
      background: #161b22;
      strong { flex: 1; font-size: 0.88rem; }
    }
    .logs-sub { font-size: 0.75rem; opacity: 0.75; }
    .logs-body {
      margin: 0;
      padding: 1rem;
      max-height: 220px;
      overflow: auto;
      font-family: ui-monospace, monospace;
      font-size: 0.72rem;
      line-height: 1.45;
      white-space: pre-wrap;
    }
  `,
})
export class GithubLogsPanelComponent {
  @Input() open = false
  @Input() logs = ''
  @Input() title = ''

  readonly close = output<void>()
}
