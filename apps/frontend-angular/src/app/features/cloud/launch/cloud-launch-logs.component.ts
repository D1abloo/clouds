import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'

@Component({
  selector: 'app-cloud-launch-logs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    @if (lines().length) {
      <section class="logs" aria-label="Logs de lanzamiento en tiempo real">
        <header>
          <mat-icon>article</mat-icon>
          <strong>{{ title() }}</strong>
        </header>
        <pre>{{ lines().join('\n') }}</pre>
      </section>
    }
  `,
  styles: `
    .logs {
      margin-top: 0.85rem;
      border: 1px solid var(--border-soft);
      border-radius: 12px;
      background: color-mix(in srgb, #020617 92%, var(--bg-card));
      color: #dbeafe;
      overflow: hidden;
    }
    header {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.55rem 0.75rem;
      border-bottom: 1px solid color-mix(in srgb, #fff 12%, transparent);
      font-size: 0.78rem;
    }
    mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: #93c5fd; }
    pre {
      margin: 0;
      padding: 0.75rem;
      max-height: 190px;
      overflow: auto;
      white-space: pre-wrap;
      font-size: 0.72rem;
      line-height: 1.5;
      font-family: var(--app-font-mono, ui-monospace, monospace);
    }
  `,
})
export class CloudLaunchLogsComponent {
  readonly title = input('Logs en tiempo real')
  readonly lines = input<string[]>([])
}
