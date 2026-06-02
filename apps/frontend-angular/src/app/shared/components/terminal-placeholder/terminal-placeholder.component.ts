import { Component, Input } from '@angular/core'

@Component({
  selector: 'app-terminal-placeholder',
  standalone: true,
  template: `
    <div
      class="terminal-placeholder"
      role="region"
      [attr.aria-label]="ariaLabel"
      tabindex="0"
    >
      <div>$ cloudops ssh {{ hostRef ?? 'host' }}</div>
      <div>Connecting to secure shell session...</div>
      <div class="terminal-cursor">_</div>
      <p class="terminal-hint">
        xterm.js integration placeholder — WebSocket via /api/v1/ssh
      </p>
    </div>
  `,
  styles: `
    .terminal-cursor {
      animation: blink 1s step-end infinite;
    }
    .terminal-hint {
      margin-top: 1.5rem;
      color: #8b949e;
      font-size: 0.75rem;
    }
    @keyframes blink {
      50% { opacity: 0; }
    }
  `,
})
export class TerminalPlaceholderComponent {
  @Input() hostRef?: string
  @Input() ariaLabel = 'Terminal session placeholder'
}
