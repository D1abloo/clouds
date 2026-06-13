import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { logReveal } from '../../../shared/animations/ui-motion.animations'

@Component({
  selector: 'app-cloud-launch-logs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  animations: [logReveal],
  template: `
    @if (lines().length) {
      <section class="logs" aria-label="Logs de lanzamiento en tiempo real" @logReveal>
        <header>
          <mat-icon>article</mat-icon>
          <strong>{{ title() }}</strong>
        </header>
        <div class="logs__stream" role="log" aria-live="polite">
          @for (line of lines(); track line) {
            <p class="logs__line" [class.logs__line--error]="logLevel(line) === 'error'" [class.logs__line--ok]="logLevel(line) === 'ok'">
              <mat-icon>{{ logIcon(line) }}</mat-icon>
              <span>{{ line }}</span>
            </p>
          }
        </div>
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
    .logs__stream {
      margin: 0;
      padding: 0.75rem;
      max-height: 190px;
      overflow: auto;
      display: grid;
      gap: 0.38rem;
    }
    .logs__line {
      margin: 0;
      display: grid;
      grid-template-columns: 1rem minmax(0, 1fr);
      gap: 0.45rem;
      align-items: flex-start;
      color: #dbeafe;
      font-size: 0.72rem;
      line-height: 1.5;
      font-family: var(--app-font-mono, ui-monospace, monospace);
    }
    .logs__line mat-icon { margin-top: 0.12rem; color: #93c5fd; }
    .logs__line--ok { color: #bbf7d0; }
    .logs__line--ok mat-icon { color: #86efac; }
    .logs__line--error { color: #fecaca; }
    .logs__line--error mat-icon { color: #fca5a5; }
  `,
})
export class CloudLaunchLogsComponent {
  readonly title = input('Logs en tiempo real')
  readonly lines = input<string[]>([])

  logLevel = (line: string): 'error' | 'ok' | 'info' => {
    const value = line.toLowerCase()
    if (value.includes('error') || value.includes('fall') || value.includes('no se pudo')) return 'error'
    if (value.includes('ok') || value.includes('cread') || value.includes('operativo') || value.includes('provisionada')) return 'ok'
    return 'info'
  }

  logIcon = (line: string): string => {
    const level = this.logLevel(line)
    if (level === 'error') return 'error'
    if (level === 'ok') return 'check_circle'
    return 'terminal'
  }
}
