import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { delay, of } from 'rxjs'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { SummaryCardComponent } from '../../shared/components/summary-card/summary-card.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { DemoActionsService } from '../../core/services/demo-actions.service'
import {
  COPILOT_SUGGESTIONS,
  COPILOT_RESPONSES,
  defaultCopilotResponse,
  type CopilotMessage,
} from '../../shared/platform/advanced-modules.demo'

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    SummaryCardComponent,
    LoadingStateComponent,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <div class="page-container animate-fade-in">
      <app-page-header
        icon="smart_toy"
        title="AI Assistant"
        description="CloudOps Copilot — ask about instances, costs, alerts, Kubernetes, approvals and diagnostics (demo mode)."
        [actions]="[{ label: 'Clear chat', icon: 'delete_sweep' }]"
        (actionClick)="clearChat()"
      />

      @if (loading()) {
        <app-loading-state message="Initializing Copilot…" />
      } @else {
        <div class="summary-grid">
          <app-summary-card title="Queries today" [value]="queryCount()" icon="chat" variant="elevated" iconColor="purple" />
          <app-summary-card title="Data sources" [value]="6" icon="database" variant="elevated" iconColor="cyan" />
          <app-summary-card title="Mode" value="Demo" icon="science" variant="elevated" iconColor="warn" />
          <app-summary-card title="Suggestions" [value]="suggestions.length" icon="lightbulb" variant="elevated" iconColor="success" />
        </div>

        <div class="copilot-suggestions hub-quick-actions">
          @for (s of suggestions; track s) {
            <button type="button" class="hub-action-chip" (click)="ask(s)">{{ s }}</button>
          }
        </div>

        <div class="table-card copilot-chat">
          <div class="copilot-messages">
            @for (msg of messages(); track msg.ts) {
              <div class="copilot-msg" [class.copilot-msg--user]="msg.role === 'user'" [class.copilot-msg--assistant]="msg.role === 'assistant'">
                @if (msg.role === 'assistant') {
                  <mat-icon class="copilot-msg__avatar">smart_toy</mat-icon>
                }
                <div class="copilot-msg__bubble">
                  <pre>{{ msg.text }}</pre>
                </div>
              </div>
            }
            @if (typing()) {
              <div class="copilot-msg copilot-msg--assistant">
                <mat-icon class="copilot-msg__avatar">smart_toy</mat-icon>
                <div class="copilot-msg__bubble copilot-msg__typing">Analyzing demo data…</div>
              </div>
            }
          </div>

          <form class="copilot-input" (submit)="handleSubmit($event)">
            <mat-form-field appearance="outline" class="copilot-input__field">
              <mat-label>Ask CloudOps Copilot…</mat-label>
              <input matInput [formControl]="inputControl" [disabled]="typing()" />
            </mat-form-field>
            <button mat-flat-button color="primary" type="submit" [disabled]="typing() || !inputControl.value.trim()">
              <mat-icon>send</mat-icon>
              Send
            </button>
          </form>
        </div>
      }
    </div>
  `,
  styles: `
    .copilot-suggestions { margin-bottom: 1rem; flex-wrap: wrap; }
    .copilot-chat {
      display: flex;
      flex-direction: column;
      min-height: 480px;
      padding: 0;
      overflow: hidden;
    }
    .copilot-messages {
      flex: 1;
      overflow-y: auto;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-height: 420px;
    }
    .copilot-msg {
      display: flex;
      gap: 0.65rem;
      align-items: flex-start;
      &--user { flex-direction: row-reverse; }
    }
    .copilot-msg__avatar {
      color: var(--app-accent);
      background: color-mix(in srgb, var(--app-accent) 15%, transparent);
      border-radius: 50%;
      padding: 4px;
      font-size: 1.25rem;
      width: 1.25rem;
      height: 1.25rem;
    }
    .copilot-msg__bubble {
      max-width: 75%;
      padding: 0.75rem 1rem;
      border-radius: 14px;
      background: var(--app-elevated);
      box-shadow: var(--app-shadow-xs);
      pre {
        margin: 0;
        white-space: pre-wrap;
        font-family: inherit;
        font-size: 0.85rem;
        line-height: 1.45;
      }
    }
    .copilot-msg--user .copilot-msg__bubble {
      background: color-mix(in srgb, var(--app-accent) 18%, var(--app-elevated));
    }
    .copilot-msg__typing {
      font-size: 0.85rem;
      color: var(--app-text-muted);
      animation: pulse 1.2s ease infinite;
    }
    .copilot-input {
      display: flex;
      gap: 0.75rem;
      padding: 1rem;
      align-items: flex-start;
      border-top: none;
      background: color-mix(in srgb, var(--app-accent) 4%, transparent);
    }
    .copilot-input__field { flex: 1; }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `,
})
export class AiAssistantComponent implements OnInit {
  private readonly demo = inject(DemoActionsService)

  readonly suggestions = COPILOT_SUGGESTIONS
  readonly inputControl = new FormControl('', { nonNullable: true })
  readonly loading = signal(true)
  readonly typing = signal(false)
  readonly messages = signal<CopilotMessage[]>([
    {
      role: 'assistant',
      text: 'Hola — soy CloudOps Copilot (demo). Pregúntame sobre instancias, costes, alertas, Kubernetes o aprobaciones pendientes.',
      ts: Date.now(),
    },
  ])

  readonly queryCount = computed(() => this.messages().filter((m) => m.role === 'user').length)

  ngOnInit(): void {
    of(true).pipe(delay(300)).subscribe(() => this.loading.set(false))
  }

  ask = (question: string): void => {
    this.inputControl.setValue(question)
    this.submitQuestion(question)
  }

  handleSubmit = (e: Event): void => {
    e.preventDefault()
    const q = this.inputControl.value.trim()
    if (!q || this.typing()) return
    this.submitQuestion(q)
    this.inputControl.setValue('')
  }

  submitQuestion = (question: string): void => {
    this.messages.update((m) => [...m, { role: 'user', text: question, ts: Date.now() }])
    this.typing.set(true)
    of(null)
      .pipe(delay(900))
      .subscribe(() => {
        const answer = COPILOT_RESPONSES[question] ?? defaultCopilotResponse(question)
        this.messages.update((m) => [...m, { role: 'assistant', text: answer, ts: Date.now() }])
        this.typing.set(false)
      })
  }

  clearChat = (): void => {
    this.messages.set([
      { role: 'assistant', text: 'Chat cleared. ¿En qué puedo ayudarte?', ts: Date.now() },
    ])
    this.demo.simulate('Clear chat', 200).subscribe()
  }
}
