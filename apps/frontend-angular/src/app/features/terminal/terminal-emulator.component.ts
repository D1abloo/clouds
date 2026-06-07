import {
  Component,
  ElementRef,
  Input,
  output,
  viewChild,
  AfterViewChecked,
  OnChanges,
  SimpleChanges,
} from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'

@Component({
  selector: 'app-terminal-emulator',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="zsh-term" [class.zsh-term--live]="connected">
      <header class="zsh-term__bar">
        <span class="zsh-term__traffic" aria-hidden="true"><i></i><i></i><i></i></span>
        <div class="zsh-term__meta mono">
          <span class="zsh-term__shell">{{ shellName }}</span>
          <span class="zsh-term__sep">·</span>
          <span>{{ hostLabel }}</span>
        </div>
        @if (connected) {
          <span class="zsh-term__live">● LIVE</span>
        }
        <div class="zsh-term__actions">
          @if (!connected) {
            <button type="button" class="zsh-btn zsh-btn--go" (click)="connect.emit()" [disabled]="busy">
              <mat-icon>play_arrow</mat-icon>
              ssh
            </button>
          } @else {
            <button type="button" class="zsh-btn" (click)="clear.emit()" aria-label="Limpiar">
              <mat-icon>clear_all</mat-icon>
            </button>
            <button type="button" class="zsh-btn" (click)="disconnect.emit()" aria-label="Desconectar">
              <mat-icon>close</mat-icon>
            </button>
          }
        </div>
      </header>

      @if (connected) {
        <div class="zsh-prompt" aria-hidden="true">
          <span class="zsh-prompt__seg zsh-prompt__seg--user">
            <mat-icon>person</mat-icon>
            {{ promptUser }}
          </span>
          <span class="zsh-prompt__seg zsh-prompt__seg--at">&#64;</span>
          <span class="zsh-prompt__seg zsh-prompt__seg--host">{{ promptHost }}</span>
          <span class="zsh-prompt__seg zsh-prompt__seg--path">
            <mat-icon>folder</mat-icon>
            {{ promptPath }}
          </span>
          <span class="zsh-prompt__seg zsh-prompt__seg--git">
            <mat-icon>account_tree</mat-icon>
            {{ promptBranch }}
          </span>
        </div>
      }

      <div class="zsh-term__screen" #scrollHost role="log" aria-live="polite">
        @for (line of lines; track $index) {
          <div class="zsh-line-out" [class]="lineClass(line)">{{ line }}</div>
        }
        @if (connected && lines.length) {
          <div class="zsh-line-active mono">
            <span class="zsh-arrow">❯</span>
            <span class="zsh-line-active__text">{{ prompt }}</span>
            <span class="zsh-caret" aria-hidden="true"></span>
          </div>
        }
      </div>

      <footer class="zsh-inputline" [class.zsh-inputline--off]="!connected">
        <span class="zsh-inputline__arrow mono" aria-hidden="true">❯</span>
        <input
          class="zsh-inputline__field mono"
          type="text"
          [value]="draft"
          [disabled]="!connected || busy"
          [placeholder]="connected ? 'escribe un comando…' : 'Conecta SSH para ejecutar'"
          aria-label="Comando zsh"
          (input)="onDraftInput($event)"
          (keydown)="handleKeyDown($event)"
        />
        <span class="zsh-inputline__hint mono" aria-hidden="true">↵</span>
        <button
          type="button"
          class="zsh-btn zsh-btn--send"
          [disabled]="!connected || busy || !draft.trim()"
          (click)="submitCommand()"
          aria-label="Ejecutar comando"
        >
          <mat-icon>keyboard_return</mat-icon>
        </button>
      </footer>

      <div class="zsh-rprompt mono" aria-hidden="true">
        <span class="zsh-rprompt__item">{{ shellName }} 5.9</span>
        <span class="zsh-rprompt__item zsh-rprompt__item--theme">agnoster</span>
      </div>
    </div>
  `,
  styles: `
    :host {
      --zsh-bg: #1e1e2e;
      --zsh-bg-deep: #181825;
      --zsh-surface: #282a36;
      --zsh-fg: #f8f8f2;
      --zsh-muted: #6272a4;
      --zsh-cyan: #8be9fd;
      --zsh-green: #50fa7b;
      --zsh-magenta: #ff79c6;
      --zsh-purple: #bd93f9;
      --zsh-yellow: #f1fa8c;
      --zsh-orange: #ffb86c;
      --zsh-red: #ff5555;
      --zsh-blue: #6272a4;
      display: block;
      height: 100%;
      min-height: 0;
    }
    .zsh-term {
      position: relative;
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      border-radius: 10px;
      overflow: hidden;
      background: var(--zsh-bg);
      border: 1px solid color-mix(in srgb, var(--zsh-purple) 35%, transparent);
      box-shadow:
        0 0 0 1px color-mix(in srgb, #000 40%, transparent),
        0 20px 50px color-mix(in srgb, #000 45%, transparent);
      color: var(--zsh-fg);
      font-family: var(--app-font-mono, 'JetBrains Mono', 'Fira Code', ui-monospace, monospace);
    }
    .zsh-term--live {
      border-color: color-mix(in srgb, var(--zsh-green) 45%, transparent);
      box-shadow:
        0 0 0 1px color-mix(in srgb, var(--zsh-green) 25%, transparent),
        0 0 40px color-mix(in srgb, var(--zsh-green) 12%, transparent),
        0 20px 50px color-mix(in srgb, #000 50%, transparent);
    }
    .zsh-term__bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.45rem 0.65rem;
      background: linear-gradient(90deg, var(--zsh-bg-deep), var(--zsh-surface));
      border-bottom: 1px solid color-mix(in srgb, var(--zsh-purple) 25%, transparent);
      flex-shrink: 0;
    }
    .zsh-term__traffic {
      display: inline-flex;
      gap: 5px;
    }
    .zsh-term__traffic i {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: block;
    }
    .zsh-term__traffic i:nth-child(1) { background: var(--zsh-red); }
    .zsh-term__traffic i:nth-child(2) { background: var(--zsh-yellow); }
    .zsh-term__traffic i:nth-child(3) { background: var(--zsh-green); }
    .zsh-term__meta {
      flex: 1;
      min-width: 0;
      font-size: 0.7rem;
      color: var(--zsh-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .zsh-term__shell {
      color: var(--zsh-cyan);
      font-weight: 700;
    }
    .zsh-term__sep {
      margin: 0 0.25rem;
      opacity: 0.5;
    }
    .zsh-term__live {
      font-size: 0.58rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: var(--zsh-green);
      text-shadow: 0 0 10px color-mix(in srgb, var(--zsh-green) 60%, transparent);
    }
    .zsh-term__actions {
      display: flex;
      gap: 0.25rem;
    }
    .zsh-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.2rem;
      padding: 0.28rem 0.5rem;
      border: 1px solid color-mix(in srgb, var(--zsh-purple) 35%, transparent);
      border-radius: 6px;
      background: color-mix(in srgb, var(--zsh-surface) 80%, transparent);
      color: var(--zsh-fg);
      font: inherit;
      font-size: 0.65rem;
      font-weight: 600;
      cursor: pointer;
      transition: filter 0.12s ease, background 0.12s ease;
    }
    .zsh-btn:hover:not(:disabled) {
      filter: brightness(1.15);
      background: var(--zsh-surface);
    }
    .zsh-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .zsh-btn mat-icon {
      font-size: 0.95rem;
      width: 0.95rem;
      height: 0.95rem;
    }
    .zsh-btn--go {
      background: linear-gradient(135deg, var(--zsh-purple), var(--zsh-magenta));
      border-color: transparent;
      color: var(--zsh-bg-deep);
      font-weight: 800;
      text-transform: lowercase;
    }
    .zsh-btn--send {
      padding: 0.3rem;
      color: var(--zsh-cyan);
      border-color: color-mix(in srgb, var(--zsh-cyan) 35%, transparent);
    }
    .zsh-prompt {
      display: flex;
      flex-wrap: wrap;
      align-items: stretch;
      flex-shrink: 0;
      font-size: 0.68rem;
      font-weight: 700;
      line-height: 1;
    }
    .zsh-prompt__seg {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.35rem 0.55rem;
      position: relative;
    }
    .zsh-prompt__seg mat-icon {
      font-size: 0.75rem;
      width: 0.75rem;
      height: 0.75rem;
    }
    .zsh-prompt__seg--user {
      background: var(--zsh-purple);
      color: var(--zsh-bg-deep);
    }
    .zsh-prompt__seg--at {
      background: var(--zsh-purple);
      color: var(--zsh-fg);
      padding-inline: 0.15rem;
    }
    .zsh-prompt__seg--host {
      background: var(--zsh-magenta);
      color: var(--zsh-bg-deep);
    }
    .zsh-prompt__seg--path {
      background: var(--zsh-cyan);
      color: var(--zsh-bg-deep);
    }
    .zsh-prompt__seg--git {
      background: var(--zsh-green);
      color: var(--zsh-bg-deep);
    }
    .zsh-prompt__seg--user::after,
    .zsh-prompt__seg--host::after,
    .zsh-prompt__seg--path::after {
      content: '';
      position: absolute;
      right: -8px;
      top: 0;
      border: 12px solid transparent;
      border-left-width: 8px;
      z-index: 1;
    }
    .zsh-prompt__seg--user::after {
      border-left-color: var(--zsh-purple);
    }
    .zsh-prompt__seg--host::after {
      border-left-color: var(--zsh-magenta);
    }
    .zsh-prompt__seg--path::after {
      border-left-color: var(--zsh-cyan);
    }
    .zsh-term__screen {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 0.75rem 0.85rem 0.5rem;
      font-size: 12.5px;
      line-height: 1.7;
      scrollbar-width: thin;
      scrollbar-color: var(--zsh-purple) transparent;
      background:
        radial-gradient(ellipse 80% 50% at 50% 0%, color-mix(in srgb, var(--zsh-purple) 8%, transparent), transparent),
        var(--zsh-bg);
    }
    .zsh-line-out {
      white-space: pre-wrap;
      word-break: break-word;
    }
    .zsh-line-out--cmd { color: var(--zsh-cyan); }
    .zsh-line-out--ok { color: var(--zsh-green); }
    .zsh-line-out--warn { color: var(--zsh-yellow); }
    .zsh-line-out--err { color: var(--zsh-red); }
    .zsh-line-out--muted { color: var(--zsh-muted); }
    .zsh-line-out--dir { color: var(--zsh-orange); }
    .zsh-line-out--plugin { color: var(--zsh-magenta); }
    .zsh-line-active {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin-top: 0.25rem;
      color: var(--zsh-fg);
    }
    .zsh-arrow {
      color: var(--zsh-green);
      font-weight: 700;
    }
    .zsh-line-active__text {
      color: var(--zsh-cyan);
    }
    .zsh-caret {
      width: 8px;
      height: 1.1em;
      background: var(--zsh-green);
      animation: zsh-blink 1s step-end infinite;
    }
    @keyframes zsh-blink {
      50% { opacity: 0.2; }
    }
    .zsh-inputline {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.5rem 0.6rem;
      background: var(--zsh-bg-deep);
      border-top: 1px solid color-mix(in srgb, var(--zsh-purple) 30%, transparent);
      flex-shrink: 0;
    }
    .zsh-inputline--off {
      opacity: 0.65;
    }
    .zsh-inputline__arrow {
      color: var(--zsh-green);
      font-weight: 800;
      font-size: 0.95rem;
    }
    .zsh-inputline__field {
      flex: 1;
      min-width: 0;
      border: none;
      background: transparent;
      color: var(--zsh-fg);
      font-size: 0.82rem;
      padding: 0.3rem 0;
    }
    .zsh-inputline__field:focus {
      outline: none;
    }
    .zsh-inputline__field::placeholder {
      color: var(--zsh-muted);
    }
    .zsh-inputline__hint {
      color: var(--zsh-muted);
      font-size: 0.75rem;
    }
    .zsh-inputline:focus-within {
      box-shadow: inset 0 2px 0 var(--zsh-green);
    }
    .zsh-inputline:focus-within .zsh-inputline__arrow {
      color: var(--zsh-magenta);
    }
    .zsh-rprompt {
      position: absolute;
      top: 2.6rem;
      right: 0.65rem;
      display: flex;
      gap: 0.5rem;
      font-size: 0.62rem;
      pointer-events: none;
      opacity: 0.85;
    }
    .zsh-rprompt__item {
      color: var(--zsh-muted);
    }
    .zsh-rprompt__item--theme {
      color: var(--zsh-orange);
    }
    .mono {
      font-family: inherit;
    }
  `,
})
export class TerminalEmulatorComponent implements AfterViewChecked, OnChanges {
  @Input() lines: string[] = []
  @Input() hostLabel = 'sin host'
  @Input() prompt = '$ '
  @Input() promptUser = 'cloudops'
  @Input() promptHost = 'localhost'
  @Input() promptPath = '~'
  @Input() promptBranch = 'main'
  @Input() shellName = 'zsh'
  @Input() connected = false
  @Input() busy = false

  readonly connect = output<void>()
  readonly disconnect = output<void>()
  readonly clear = output<void>()
  readonly command = output<string>()

  draft = ''

  private readonly scrollHost = viewChild<ElementRef<HTMLElement>>('scrollHost')
  private shouldScroll = false

  ngOnChanges = (changes: SimpleChanges): void => {
    if (changes['lines']) this.shouldScroll = true
  }

  ngAfterViewChecked = (): void => {
    if (!this.shouldScroll) return
    const el = this.scrollHost()?.nativeElement
    if (el) el.scrollTop = el.scrollHeight
    this.shouldScroll = false
  }

  lineClass = (line: string): string => {
    if (!line) return 'zsh-line-out--muted'
    if (line.startsWith('$') || (line.includes('@') && line.includes('$'))) return 'zsh-line-out--cmd'
    if (line.startsWith('✓') || line.toLowerCase().includes('complete')) return 'zsh-line-out--ok'
    if (line.startsWith('⚠')) return 'zsh-line-out--warn'
    if (line.startsWith('✗') || line.toLowerCase().includes('error')) return 'zsh-line-out--err'
    if (line.startsWith('CloudOps') || line.includes('Authenticat')) return 'zsh-line-out--muted'
    if (line.startsWith('cd ') || line.includes('/')) return 'zsh-line-out--dir'
    if (line.toLowerCase().includes('plugin') || line.includes('oh-my')) return 'zsh-line-out--plugin'
    return ''
  }

  onDraftInput = (ev: Event): void => {
    this.draft = (ev.target as HTMLInputElement).value
  }

  handleKeyDown = (ev: KeyboardEvent): void => {
    if (ev.key !== 'Enter' || !this.connected || this.busy) return
    ev.preventDefault()
    this.submitCommand()
  }

  submitCommand = (): void => {
    const cmd = this.draft.trim()
    if (!cmd) return
    this.command.emit(cmd)
    this.draft = ''
  }
}
