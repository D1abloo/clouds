import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { DatePipe } from '@angular/common'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'
import { catchError, delay, of } from 'rxjs'
import { CopilotApiService } from '../../core/services/copilot-api.service'
import { RealtimeService } from '../../core/services/realtime.service'
import { PlatformCacheService } from '../../core/services/platform-cache.service'
import type { CopilotContextDomain, CopilotStatus, CopilotTask } from '../../core/models/api.models'
import { PageHeaderComponent, type PageHeaderAction } from '../../shared/components/page-header/page-header.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { PlatformActionService } from '../../shared/platform/platform-action.service'
import { ProModeService } from '../../core/services/pro-mode.service'
import { allowsDemoDataFrom } from '../../core/utils/demo-runtime.util'
import { ConnectionRequiredComponent } from '../../shared/components/connection-required/connection-required.component'
import { ToastService } from '../../core/services/toast.service'
import { AuthService } from '../../core/services/auth.service'
import {
  ADMIN_COPILOT_ACCENT,
  ADMIN_COPILOT_ACCENT_BORDER,
  ADMIN_SETTINGS_ACCENT,
  ADMIN_SETTINGS_ACCENT_BORDER,
  ADMIN_SETTINGS_ACCENT_LIGHT,
  downloadBlob,
} from '../admin/admin.config'
import {
  COPILOT_CONTEXT_DOMAINS,
  COPILOT_QUICK_PROMPTS,
  copilotPromptsForContext,
  resolveCopilotResponse,
  type CopilotAction,
  type CopilotContextId,
  type CopilotMessage,
  type CopilotQuickPrompt,
} from '../../shared/platform/advanced-modules.data'

type MessageSegment = { kind: 'text' | 'bold'; value: string }

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ConnectionRequiredComponent,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTooltipModule,
  ],
  template: `
    <div class="page-container cop-page animate-fade-in">
      <app-page-header
        icon="auto_awesome"
        title="Asistente IA"
        description="CloudOps Copilot — consulta instancias, costes, alertas, Kubernetes, aprobaciones y diagnósticos con contexto de plataforma."
        [actions]="headerActions"
        (actionClick)="handleHeader($event)"
      />

      <section class="cop-intro">
        <div class="cop-intro__main">
          <span class="cop-intro__eyebrow">Administración · Copilot</span>
          <h2 class="cop-intro__title">CloudOps Copilot</h2>
          <p class="cop-intro__desc">
            Asistente contextual con acceso a datos de instancias, alertas, costes y despliegues cuando las integraciones están conectadas.
            Escribe en español natural o usa las sugerencias para obtener respuestas accionables.
          </p>
          <ul class="cop-intro__meta">
            @if (pro.proMode()) {
              <li><mat-icon>memory</mat-icon> {{ providerLabel() }}</li>
              <li><mat-icon>hub</mat-icon> {{ modeLabel() }}</li>
            } @else {
              <li><mat-icon>schedule</mat-icon> Datos locales · sync pendiente</li>
              <li><mat-icon>memory</mat-icon> Modo asistido</li>
            }
            <li><mat-icon>language</mat-icon> Español</li>
          </ul>
        </div>
        <ul class="cop-intro__stats">
          <li>
            <strong>{{ queryCount() }}</strong>
            <span>Consultas</span>
          </li>
          <li>
            <strong>{{ messages().length }}</strong>
            <span>Mensajes</span>
          </li>
          <li>
            <strong>{{ activeDomain().count }}</strong>
            <span>{{ activeDomain().label }}</span>
          </li>
          <li>
            <strong>{{ globalHealth() }}</strong>
            <span>Salud global</span>
          </li>
        </ul>
      </section>

      @if (loading()) {
        <app-loading-state message="Inicializando Copilot…" />
      } @else if (pro.proMode() && !copilotReady()) {
        <app-connection-required moduleId="ai-assistant" variant="inline" icon="smart_toy" />
      } @else {
        <div class="cop-layout">
          <aside class="cop-sidebar">
            <header class="cop-sidebar__head">
              <mat-icon>hub</mat-icon>
              <div>
                <h3>Contexto activo</h3>
                <p>Filtra sugerencias y respuestas por dominio</p>
              </div>
            </header>

            <div class="cop-live-context">
              <span class="cop-live-context__chip">
                <mat-icon>person</mat-icon>
                {{ userName() }}
              </span>
              <span class="cop-live-context__chip">
                <mat-icon>location_on</mat-icon>
                Asistente IA
              </span>
              <span class="cop-live-context__chip cop-live-context__chip--sync">
                <i class="cop-live-dot"></i>
                {{ pro.proMode() ? 'En línea · PRO' : 'En línea · local' }}
              </span>
            </div>

            @if (pro.proMode() && copilotStatus()?.allowAutonomous) {
              <section class="cop-tasks">
                <header class="cop-sidebar__head cop-sidebar__head--sub">
                  <mat-icon>rocket_launch</mat-icon>
                  <div>
                    <h3>Tareas autónomas</h3>
                    <p>El Copilot ejecuta sin interacción</p>
                  </div>
                </header>
                <form class="cop-tasks__form" (submit)="handleTaskSubmit($event)">
                  <mat-form-field appearance="outline" class="cop-tasks__field">
                    <mat-label>Instrucción autónoma…</mat-label>
                    <input matInput [formControl]="taskControl" [disabled]="taskSubmitting()" aria-label="Tarea autónoma" />
                  </mat-form-field>
                  <button type="submit" class="cop-tasks__btn" [disabled]="taskSubmitting() || !taskControl.value.trim()">
                    <mat-icon>play_arrow</mat-icon>
                  </button>
                </form>
                <ul class="cop-tasks__list">
                  @for (task of autonomousTasks(); track task.id) {
                    <li [class]="'cop-task cop-task--' + task.status.toLowerCase()">
                      <strong>{{ taskStatusLabel(task.status) }}</strong>
                      <span>{{ task.prompt }}</span>
                    </li>
                  } @empty {
                    <li class="cop-task cop-task--empty">Sin tareas recientes</li>
                  }
                </ul>
              </section>
            }

            <div class="cop-chips">
              @for (chip of contextChips(); track chip.id) {
                <button
                  type="button"
                  class="cop-chip"
                  [class.cop-chip--on]="activeContext() === chip.id"
                  [attr.aria-pressed]="activeContext() === chip.id"
                  (click)="selectContext($any(chip.id))"
                >
                  <mat-icon>{{ chip.icon }}</mat-icon>
                  <span class="cop-chip__text">
                    <strong>{{ chip.label }}</strong>
                    <em>{{ chip.hint }}</em>
                  </span>
                  <b>{{ chip.count }}</b>
                </button>
              }
            </div>

            <header class="cop-sidebar__head cop-sidebar__head--sub">
              <mat-icon>bolt</mat-icon>
              <div>
                <h3>Sugerencias rápidas</h3>
                <p>Para {{ activeDomain().label.toLowerCase() }}</p>
              </div>
            </header>
            <div class="cop-suggestions">
              @for (prompt of filteredPrompts(); track prompt.id) {
                <button
                  type="button"
                  class="cop-suggestion"
                  (click)="ask(prompt.question)"
                  [matTooltip]="prompt.question"
                >
                  <mat-icon>{{ prompt.icon }}</mat-icon>
                  <span>{{ prompt.label }}</span>
                </button>
              }
            </div>

            <footer class="cop-sidebar__foot">
              <mat-icon>keyboard</mat-icon>
              <span><kbd>Enter</kbd> enviar · <kbd>Esc</kbd> limpiar · <kbd>Ctrl</kbd>+<kbd>K</kbd> sugerencias</span>
            </footer>
          </aside>

          <div class="table-card cop-chat">
            <header class="cop-chat__bar">
              <div class="cop-chat__bar-main">
                <div class="cop-chat__status">
                  <i class="cop-live-dot"></i>
                  <span>Sesión {{ sessionShort() }}</span>
                </div>
                <span class="cop-chat__context-tag">
                  <mat-icon>{{ activeDomain().icon }}</mat-icon>
                  Contexto: {{ activeDomain().label }}
                </span>
              </div>
              <div class="cop-chat__bar-actions">
                <button
                  type="button"
                  class="cop-icon-btn"
                  matTooltip="Limpiar chat"
                  aria-label="Limpiar chat"
                  (click)="clearChat()"
                >
                  <mat-icon>delete_sweep</mat-icon>
                </button>
                <button
                  type="button"
                  class="cop-icon-btn"
                  matTooltip="Exportar conversación"
                  aria-label="Exportar conversación"
                  (click)="exportConversation()"
                >
                  <mat-icon>download</mat-icon>
                </button>
              </div>
            </header>

            <div class="cop-messages" #messagesEl role="log" aria-live="polite" aria-label="Conversación con Copilot">
              @if (showEmptyState()) {
                <div class="cop-empty">
                  <div class="cop-empty__orb">
                    <mat-icon>auto_awesome</mat-icon>
                  </div>
                  <h3>¿Por dónde empezamos?</h3>
                  <p>{{ emptyStateDescription() }}</p>
                  <div class="cop-empty__prompts">
                    @for (prompt of emptyPrompts; track prompt.id) {
                      <button type="button" class="cop-empty__prompt" (click)="ask(prompt.question)">
                        <mat-icon>{{ prompt.icon }}</mat-icon>
                        {{ prompt.label }}
                      </button>
                    }
                  </div>
                </div>
              }

              @for (msg of messages(); track msg.ts) {
                <article
                  class="cop-msg"
                  [class.cop-msg--user]="msg.role === 'user'"
                  [class.cop-msg--assistant]="msg.role === 'assistant'"
                >
                  @if (msg.role === 'assistant') {
                    <div class="cop-msg__avatar" aria-hidden="true">
                      <mat-icon>auto_awesome</mat-icon>
                    </div>
                  }
                  <div class="cop-msg__body">
                    <div class="cop-msg__bubble">
                      @for (line of splitLines(msg.text); track $index) {
                        <p class="cop-msg__line">
                          @for (seg of parseSegments(line); track $index) {
                            @if (seg.kind === 'bold') {
                              <strong>{{ seg.value }}</strong>
                            } @else {
                              {{ seg.value }}
                            }
                          }
                        </p>
                      }
                    </div>

                    @if (msg.role === 'assistant') {
                      <footer class="cop-msg__foot">
                        <time>{{ msg.ts | date:'HH:mm' }}</time>
                        @if (msg.sources?.length) {
                          <span class="cop-msg__sources">
                            @for (src of msg.sources; track src) {
                              <span class="cop-msg__source">{{ src }}</span>
                            }
                          </span>
                        }
                        <button
                          type="button"
                          class="cop-msg__copy"
                          matTooltip="Copiar mensaje"
                          aria-label="Copiar mensaje"
                          (click)="copyMessage(msg.text)"
                        >
                          <mat-icon>content_copy</mat-icon>
                        </button>
                      </footer>

                      @if (msg.launchProgress) {
                        <div
                          class="cop-launch-progress"
                          role="progressbar"
                          [attr.aria-valuenow]="msg.launchProgress.percent"
                          aria-valuemin="0"
                          aria-valuemax="100"
                        >
                          <div class="cop-launch-progress__head">
                            <span>{{ msg.launchProgress.step || 'Provisionando…' }}</span>
                            <strong>{{ msg.launchProgress.percent }}%</strong>
                          </div>
                          <div class="cop-launch-progress__bar">
                            <span [style.width.%]="msg.launchProgress.percent"></span>
                          </div>
                        </div>
                      }

                      @if (msg.actions?.length) {
                        <div class="cop-msg__actions">
                          @for (action of msg.actions; track action.id) {
                            <button
                              type="button"
                              class="cop-action-btn"
                              (click)="runAction(action)"
                            >
                              <mat-icon>{{ action.icon }}</mat-icon>
                              {{ action.label }}
                            </button>
                          }
                        </div>
                      }
                    }
                  </div>
                </article>
              }

              @if (typing()) {
                <div class="cop-msg cop-msg--assistant">
                  <div class="cop-msg__avatar" aria-hidden="true">
                    <mat-icon>auto_awesome</mat-icon>
                  </div>
                  <div class="cop-msg__body">
                    <div class="cop-msg__bubble cop-msg__typing">
                      <span class="cop-typing-label">Analizando {{ activeDomain().label.toLowerCase() }}</span>
                      <span class="cop-typing-dots" aria-hidden="true">
                        <i></i><i></i><i></i>
                      </span>
                    </div>
                  </div>
                </div>
              }
            </div>

            <div class="cop-input-wrap">
              <div class="cop-input-chips">
                @for (prompt of inputQuickPrompts(); track prompt.id) {
                  <button
                    type="button"
                    class="cop-input-chip"
                    [disabled]="typing()"
                    (click)="ask(prompt.question)"
                  >
                    {{ prompt.label }}
                  </button>
                }
              </div>

              <form class="cop-input" (submit)="handleSubmit($event)">
                <mat-form-field appearance="outline" class="cop-input__field">
                  <mat-label>Pregunta a CloudOps Copilot…</mat-label>
                  <input
                    matInput
                    #inputEl
                    [formControl]="inputControl"
                    [disabled]="typing()"
                    aria-label="Mensaje para Copilot"
                    autocomplete="off"
                    (keydown)="handleInputKeydown($event)"
                  />
                  <mat-hint>Enter para enviar · Esc para vaciar el campo</mat-hint>
                </mat-form-field>
                <button
                  type="submit"
                  class="page-action-btn page-action-btn--primary cop-send"
                  [disabled]="typing() || !inputControl.value.trim()"
                  aria-label="Enviar mensaje"
                >
                  <mat-icon>send</mat-icon>
                  Enviar
                </button>
              </form>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; flex: 1; min-height: 0; }

    .cop-page {
      display: flex; flex-direction: column; gap: 0.65rem;
      overflow-y: auto; scrollbar-width: thin;
      --page-accent: ${ADMIN_SETTINGS_ACCENT};
      --cop-accent: ${ADMIN_COPILOT_ACCENT};
    }

    .cop-page ::ng-deep .page-action-btn--primary {
      background: ${ADMIN_SETTINGS_ACCENT};
      border-color: #334155;
      &:hover:not(:disabled) { background: #334155; }
    }

    .cop-intro {
      display: flex; flex-wrap: wrap; gap: 0.85rem; align-items: stretch; justify-content: space-between;
      padding: 0.85rem 1rem; border-radius: var(--app-radius-md, 10px);
      border: 1px solid ${ADMIN_SETTINGS_ACCENT_BORDER};
      background: linear-gradient(135deg, ${ADMIN_SETTINGS_ACCENT_LIGHT}, #fff 55%, color-mix(in srgb, ${ADMIN_COPILOT_ACCENT} 4%, #fff));
    }
    .cop-intro__eyebrow { font-size: 0.58rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: ${ADMIN_SETTINGS_ACCENT}; }
    .cop-intro__title { margin: 0.2rem 0; font-size: 1.05rem; font-weight: 800; letter-spacing: -0.02em; color: #0f172a; }
    .cop-intro__desc { margin: 0; font-size: 0.72rem; color: #64748b; line-height: 1.55; max-width: 36rem; }
    .cop-intro__meta {
      list-style: none; margin: 0.55rem 0 0; padding: 0;
      display: flex; flex-wrap: wrap; gap: 0.65rem;
      li {
        display: inline-flex; align-items: center; gap: 0.25rem;
        font-size: 0.62rem; font-weight: 600; color: #94a3b8;
        mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; }
      }
    }
    .cop-intro__stats {
      list-style: none; margin: 0; padding: 0;
      display: grid; grid-template-columns: repeat(4, minmax(72px, 1fr)); gap: 0.45rem; align-self: center;
      li {
        padding: 0.5rem 0.65rem; border-radius: 9px; text-align: center;
        border: 1px solid ${ADMIN_SETTINGS_ACCENT_BORDER}; background: #fff;
        strong { display: block; font-size: 0.95rem; font-weight: 800; color: ${ADMIN_SETTINGS_ACCENT}; line-height: 1.1; }
        span { font-size: 0.52rem; color: #94a3b8; text-transform: uppercase; font-weight: 650; }
      }
    }

    .cop-layout { display: grid; grid-template-columns: minmax(240px, 300px) 1fr; gap: 0.65rem; min-height: 520px; }

    .cop-sidebar {
      padding: 0.75rem; border-radius: var(--app-radius-md, 10px);
      border: 1px solid ${ADMIN_SETTINGS_ACCENT_BORDER};
      background: ${ADMIN_SETTINGS_ACCENT_LIGHT};
      display: flex; flex-direction: column; gap: 0.55rem;
    }
    .cop-sidebar__head {
      display: flex; gap: 0.45rem; align-items: flex-start;
      mat-icon { color: ${ADMIN_SETTINGS_ACCENT}; font-size: 1rem; width: 1rem; height: 1rem; margin-top: 0.1rem; }
      h3 { margin: 0; font-size: 0.72rem; font-weight: 700; color: #0f172a; }
      p { margin: 0.12rem 0 0; font-size: 0.6rem; color: #94a3b8; line-height: 1.4; }
      &--sub { margin-top: 0.25rem; padding-top: 0.55rem; border-top: 1px solid ${ADMIN_SETTINGS_ACCENT_BORDER}; }
    }
    .cop-sidebar__foot {
      margin-top: auto; padding-top: 0.55rem; border-top: 1px solid ${ADMIN_SETTINGS_ACCENT_BORDER};
      display: flex; align-items: flex-start; gap: 0.35rem;
      font-size: 0.58rem; color: #94a3b8; line-height: 1.45;
      mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; flex-shrink: 0; margin-top: 0.05rem; }
      kbd {
        display: inline-block; padding: 0.05rem 0.28rem; border-radius: 4px;
        border: 1px solid #cbd5e1; background: #fff; font-size: 0.55rem; font-family: inherit;
      }
    }

    .cop-live-context { display: flex; flex-wrap: wrap; gap: 0.28rem; }
    .cop-live-context__chip {
      display: inline-flex; align-items: center; gap: 0.22rem;
      font-size: 0.58rem; font-weight: 600; padding: 0.12rem 0.42rem;
      border-radius: 999px; background: #fff; border: 1px solid #e2e8f0; color: #475569;
      mat-icon { font-size: 0.72rem; width: 0.72rem; height: 0.72rem; color: ${ADMIN_SETTINGS_ACCENT}; }
      &--sync { color: #15803d; border-color: #bbf7d0; background: #f0fdf4; }
    }
    .cop-live-dot {
      width: 6px; height: 6px; border-radius: 50%; background: #22c55e;
      box-shadow: 0 0 0 2px #dcfce7; flex-shrink: 0;
    }

    .cop-chips { display: flex; flex-direction: column; gap: 0.32rem; }
    .cop-chip {
      display: flex; align-items: center; gap: 0.4rem;
      padding: 0.45rem 0.55rem; border-radius: 9px;
      border: 1px solid #e2e8f0; background: #fff;
      font: inherit; cursor: pointer; text-align: left; color: #475569;
      transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
      &:hover { border-color: ${ADMIN_SETTINGS_ACCENT_BORDER}; background: #fafbfc; }
    }
    .cop-chip--on {
      border-color: ${ADMIN_COPILOT_ACCENT}; background: color-mix(in srgb, ${ADMIN_COPILOT_ACCENT} 6%, #fff);
      box-shadow: 0 2px 10px rgb(147 51 234 / 0.1);
      .cop-chip__text strong { color: ${ADMIN_COPILOT_ACCENT}; }
    }
    .cop-chip mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; flex-shrink: 0; color: ${ADMIN_SETTINGS_ACCENT}; }
    .cop-chip__text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.06rem; }
    .cop-chip__text strong { font-size: 0.68rem; font-weight: 700; }
    .cop-chip__text em { font-style: normal; font-size: 0.56rem; color: #94a3b8; line-height: 1.3; }
    .cop-chip b {
      font-size: 0.58rem; font-weight: 800; padding: 0.08rem 0.38rem;
      border-radius: 999px; background: #f1f5f9; color: ${ADMIN_SETTINGS_ACCENT};
    }
    .cop-chip--on b { background: color-mix(in srgb, ${ADMIN_COPILOT_ACCENT} 12%, #fff); color: ${ADMIN_COPILOT_ACCENT}; }

    .cop-suggestions { display: flex; flex-direction: column; gap: 0.28rem; }
    .cop-suggestion {
      display: flex; align-items: center; gap: 0.35rem;
      padding: 0.38rem 0.5rem; border-radius: 8px;
      border: 1px solid #e2e8f0; background: #fff;
      font: inherit; font-size: 0.64rem; font-weight: 600; text-align: left;
      cursor: pointer; color: #475569; line-height: 1.35;
      transition: background 0.15s, border-color 0.15s;
      mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; color: ${ADMIN_COPILOT_ACCENT}; flex-shrink: 0; }
      &:hover { background: color-mix(in srgb, ${ADMIN_COPILOT_ACCENT} 5%, #fff); border-color: ${ADMIN_COPILOT_ACCENT_BORDER}; }
    }

    .cop-chat {
      display: flex; flex-direction: column; min-height: 520px; padding: 0; overflow: hidden;
      background:
        linear-gradient(180deg, #fafbfc 0%, #fff 120px),
        radial-gradient(ellipse 80% 50% at 100% 0%, color-mix(in srgb, ${ADMIN_COPILOT_ACCENT} 5%, transparent), transparent);
    }
    .cop-chat__bar {
      display: flex; align-items: center; justify-content: space-between; gap: 0.65rem;
      padding: 0.65rem 0.85rem; border-bottom: 1px solid #e2e8f0; background: #fff;
    }
    .cop-chat__bar-main { display: flex; flex-wrap: wrap; align-items: center; gap: 0.45rem; }
    .cop-chat__status {
      display: inline-flex; align-items: center; gap: 0.35rem;
      font-size: 0.62rem; font-weight: 700; color: #15803d;
    }
    .cop-chat__context-tag {
      display: inline-flex; align-items: center; gap: 0.25rem;
      font-size: 0.6rem; font-weight: 600; padding: 0.12rem 0.45rem;
      border-radius: 999px; background: #f1f5f9; color: #475569;
      mat-icon { font-size: 0.78rem; width: 0.78rem; height: 0.78rem; color: ${ADMIN_SETTINGS_ACCENT}; }
    }
    .cop-chat__bar-actions { display: flex; gap: 0.25rem; }
    .cop-icon-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 2rem; height: 2rem; border-radius: 8px;
      border: 1px solid #e2e8f0; background: #fff; cursor: pointer; color: #64748b;
      transition: background 0.15s, color 0.15s;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
      &:hover { background: ${ADMIN_SETTINGS_ACCENT_LIGHT}; color: ${ADMIN_SETTINGS_ACCENT}; }
    }

    .cop-messages {
      flex: 1; overflow-y: auto; padding: 1rem 1.1rem;
      display: flex; flex-direction: column; gap: 0.85rem;
      min-height: 0; scroll-behavior: smooth;
    }

    .cop-empty {
      text-align: center; padding: 2rem 1rem 1rem; margin: auto 0;
      max-width: 28rem; align-self: center;
    }
    .cop-empty__orb {
      width: 3.5rem; height: 3.5rem; margin: 0 auto 0.85rem; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, ${ADMIN_SETTINGS_ACCENT}, ${ADMIN_COPILOT_ACCENT});
      box-shadow: 0 12px 32px color-mix(in srgb, ${ADMIN_COPILOT_ACCENT} 28%, transparent);
      mat-icon { color: #fff; font-size: 1.5rem; width: 1.5rem; height: 1.5rem; }
    }
    .cop-empty h3 { margin: 0 0 0.35rem; font-size: 0.95rem; font-weight: 800; color: #0f172a; }
    .cop-empty p { margin: 0 0 0.85rem; font-size: 0.72rem; color: #64748b; line-height: 1.55; }
    .cop-empty__prompts { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.35rem; }
    .cop-empty__prompt {
      display: inline-flex; align-items: center; gap: 0.28rem;
      padding: 0.35rem 0.65rem; border-radius: 999px;
      border: 1px solid ${ADMIN_COPILOT_ACCENT_BORDER}; background: #fff;
      font: inherit; font-size: 0.64rem; font-weight: 600; cursor: pointer; color: #475569;
      mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; color: ${ADMIN_COPILOT_ACCENT}; }
      &:hover { background: color-mix(in srgb, ${ADMIN_COPILOT_ACCENT} 6%, #fff); }
    }

    .cop-msg {
      display: flex; gap: 0.55rem; align-items: flex-start;
      animation: cop-msg-in 0.28s ease both;
      &--user { flex-direction: row-reverse; .cop-msg__bubble { background: ${ADMIN_SETTINGS_ACCENT}; color: #fff; border-color: #334155; } .cop-msg__line strong { color: #e2e8f0; } }
    }
    @keyframes cop-msg-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

    .cop-msg__avatar {
      width: 1.85rem; height: 1.85rem; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, color-mix(in srgb, ${ADMIN_COPILOT_ACCENT} 18%, #fff), #fff);
      border: 1px solid ${ADMIN_COPILOT_ACCENT_BORDER};
      box-shadow: 0 2px 8px rgb(147 51 234 / 0.12);
      mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; color: ${ADMIN_COPILOT_ACCENT}; }
    }
    .cop-msg__body { max-width: min(88%, 640px); display: flex; flex-direction: column; gap: 0.35rem; }
    .cop-msg--user .cop-msg__body { align-items: flex-end; }

    .cop-msg__bubble {
      padding: 0.65rem 0.85rem; border-radius: 14px 14px 14px 4px;
      background: #fff; border: 1px solid #e2e8f0;
      box-shadow: 0 2px 8px rgb(15 23 42 / 0.04);
    }
    .cop-msg--user .cop-msg__bubble { border-radius: 14px 14px 4px 14px; }
    .cop-msg__line {
      margin: 0; font-size: 0.78rem; line-height: 1.55; color: inherit;
      & + & { margin-top: 0.35rem; }
      strong { font-weight: 700; color: #0f172a; }
    }

    .cop-msg__foot {
      display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem;
      time { font-size: 0.56rem; color: #94a3b8; }
    }
    .cop-msg__sources { display: flex; flex-wrap: wrap; gap: 0.22rem; }
    .cop-msg__source {
      font-size: 0.52rem; font-weight: 650; padding: 0.06rem 0.32rem;
      border-radius: 999px; background: #f1f5f9; color: #64748b; text-transform: uppercase;
    }
    .cop-msg__copy {
      margin-left: auto; display: inline-flex; align-items: center; justify-content: center;
      width: 1.5rem; height: 1.5rem; border-radius: 6px;
      border: none; background: transparent; cursor: pointer; color: #94a3b8;
      mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; }
      &:hover { background: #f1f5f9; color: ${ADMIN_SETTINGS_ACCENT}; }
    }

    .cop-msg__actions { display: flex; flex-wrap: wrap; gap: 0.32rem; }
    .cop-action-btn {
      display: inline-flex; align-items: center; gap: 0.28rem;
      padding: 0.32rem 0.55rem; border-radius: 8px;
      border: 1px solid ${ADMIN_SETTINGS_ACCENT_BORDER}; background: #fff;
      font: inherit; font-size: 0.62rem; font-weight: 700; cursor: pointer; color: ${ADMIN_SETTINGS_ACCENT};
      mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; }
      &:hover { background: ${ADMIN_SETTINGS_ACCENT_LIGHT}; }
    }

    .cop-launch-progress {
      margin-top: 0.35rem; padding: 0.45rem 0.55rem; border-radius: 8px;
      border: 1px solid ${ADMIN_COPILOT_ACCENT_BORDER};
      background: color-mix(in srgb, ${ADMIN_COPILOT_ACCENT} 4%, #fff);
    }
    .cop-launch-progress__head {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 0.62rem; color: #64748b; margin-bottom: 0.3rem;
      strong { color: ${ADMIN_COPILOT_ACCENT}; font-size: 0.72rem; }
    }
    .cop-launch-progress__bar {
      height: 5px; border-radius: 999px; background: #e2e8f0; overflow: hidden;
      span {
        display: block; height: 100%; border-radius: inherit;
        background: linear-gradient(90deg, ${ADMIN_COPILOT_ACCENT}, ${ADMIN_SETTINGS_ACCENT});
        transition: width 0.35s ease;
      }
    }

    .cop-msg__typing {
      display: inline-flex; align-items: center; gap: 0.55rem;
      padding: 0.55rem 0.75rem !important;
    }
    .cop-typing-label { font-size: 0.72rem; color: #64748b; }
    .cop-typing-dots {
      display: inline-flex; gap: 0.22rem;
      i {
        width: 5px; height: 5px; border-radius: 50%; background: ${ADMIN_COPILOT_ACCENT};
        animation: cop-dot 1.2s ease infinite;
        &:nth-child(2) { animation-delay: 0.15s; }
        &:nth-child(3) { animation-delay: 0.3s; }
      }
    }
    @keyframes cop-dot { 0%, 80%, 100% { opacity: 0.25; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-3px); } }

    .cop-input-wrap {
      border-top: 1px solid #e2e8f0;
      background: linear-gradient(180deg, #fafbfc, #fff);
      padding: 0.55rem 0.85rem 0.75rem;
    }
    .cop-input-chips {
      display: flex; flex-wrap: wrap; gap: 0.28rem; margin-bottom: 0.45rem;
    }
    .cop-input-chip {
      padding: 0.22rem 0.48rem; border-radius: 999px;
      border: 1px solid #e2e8f0; background: #fff;
      font: inherit; font-size: 0.58rem; font-weight: 650; cursor: pointer; color: #64748b;
      &:hover:not(:disabled) { border-color: ${ADMIN_COPILOT_ACCENT_BORDER}; color: ${ADMIN_COPILOT_ACCENT}; }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
    .cop-input { display: flex; gap: 0.55rem; align-items: flex-start; }
    .cop-input__field { flex: 1; margin: 0; }
    .cop-send { flex-shrink: 0; align-self: center; min-height: 42px; }

    .cop-tasks {
      margin-top: 0.25rem; padding-top: 0.55rem; border-top: 1px solid ${ADMIN_SETTINGS_ACCENT_BORDER};
    }
    .cop-tasks__form { display: flex; gap: 0.35rem; align-items: flex-start; margin-bottom: 0.45rem; }
    .cop-tasks__field { flex: 1; margin: 0; font-size: 0.72rem; }
    .cop-tasks__btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 2.25rem; height: 2.25rem; border-radius: 8px; border: none;
      background: ${ADMIN_COPILOT_ACCENT}; color: #fff; cursor: pointer;
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
    .cop-tasks__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.32rem; max-height: 140px; overflow-y: auto; }
    .cop-task {
      padding: 0.38rem 0.5rem; border-radius: 8px; border: 1px solid #e2e8f0; background: #fff;
      font-size: 0.6rem; color: #64748b; line-height: 1.35;
      strong { display: block; font-size: 0.58rem; text-transform: uppercase; margin-bottom: 0.12rem; }
    }
    .cop-task--completed strong { color: #15803d; }
    .cop-task--failed strong { color: #dc2626; }
    .cop-task--running strong, .cop-task--pending strong { color: ${ADMIN_COPILOT_ACCENT}; }
    .cop-task--empty { text-align: center; font-style: italic; border-style: dashed; }

    @media (max-width: 900px) {
      .cop-layout { grid-template-columns: 1fr; }
      .cop-intro__stats { grid-template-columns: repeat(2, 1fr); width: 100%; }
      .cop-sidebar__foot kbd { display: none; }
    }
  `,
})
export class AiAssistantComponent implements OnInit {
  readonly pro = inject(ProModeService)
  private readonly actions = inject(PlatformActionService)
  private readonly toast = inject(ToastService)
  private readonly router = inject(Router)
  private readonly auth = inject(AuthService)
  private readonly copilotApi = inject(CopilotApiService)
  private readonly platformCache = inject(PlatformCacheService)
  private readonly realtime = inject(RealtimeService)
  private readonly destroyRef = inject(DestroyRef)

  @ViewChild('messagesEl') messagesEl?: ElementRef<HTMLElement>
  @ViewChild('inputEl') inputEl?: ElementRef<HTMLInputElement>

  readonly emptyPrompts = COPILOT_QUICK_PROMPTS.slice(0, 4)
  readonly inputControl = new FormControl('', { nonNullable: true })
  readonly taskControl = new FormControl('', { nonNullable: true })
  readonly loading = signal(true)
  readonly typing = signal(false)
  readonly taskSubmitting = signal(false)
  readonly activeContext = signal<CopilotContextId>('instances')
  readonly queryCount = signal(0)
  readonly sessionId = signal(`ses-${Date.now()}`)
  readonly threadId = signal<string | null>(null)
  readonly copilotStatus = signal<CopilotStatus | null>(null)
  readonly autonomousTasks = signal<CopilotTask[]>([])

  readonly headerActions: PageHeaderAction[] = [
    { label: 'Limpiar chat', icon: 'delete_sweep' },
    { label: 'Exportar conversación', icon: 'download' },
    { label: 'Nueva sesión', icon: 'add_comment', primary: true },
  ]

  readonly messages = signal<CopilotMessage[]>([])

  readonly contextChips = computed((): CopilotContextDomain[] => {
    if (this.pro.proMode()) {
      const live = this.copilotStatus()?.context?.domains
      if (live?.length) return live
      return COPILOT_CONTEXT_DOMAINS.map((d) => ({
        ...d,
        count: d.id === 'instances' ? '0' : d.count,
        hint: d.id === 'instances' ? 'Sin datos en caché · panel en vivo' : d.hint,
      }))
    }
    return COPILOT_CONTEXT_DOMAINS
  })

  readonly activeDomain = computed(() =>
    this.contextChips().find((d) => d.id === this.activeContext()) ?? this.contextChips()[0],
  )

  readonly globalHealth = computed(() => {
    if (this.pro.proMode()) {
      const score = this.copilotStatus()?.context?.healthScore
      if (score != null) return `${score}%`
      return '—'
    }
    return '94%'
  })

  readonly filteredPrompts = computed(() => {
    const base = copilotPromptsForContext(this.activeContext())
    if (this.pro.proMode() && this.copilotStatus()?.allowLaunch) {
      return [
        {
          id: 'launch-instance',
          question: 'Lanza una instancia t3.micro en eu-west-1 llamada copilot-web',
          label: 'Lanzar instancia',
          icon: 'rocket_launch',
          context: 'instances' as CopilotContextId,
        },
        ...base,
      ]
    }
    return base
  })

  readonly inputQuickPrompts = computed(() => {
    const ctx = this.activeContext()
    const primary = copilotPromptsForContext(ctx).slice(0, 2)
    const extra = COPILOT_QUICK_PROMPTS.filter((p) => p.context !== ctx).slice(0, 2)
    return [...primary, ...extra]
  })

  readonly userName = computed(() => this.auth.user()?.name ?? 'Usuario')

  readonly sessionShort = computed(() => this.sessionId().slice(-8))

  readonly showEmptyState = computed(() =>
    this.queryCount() === 0 && !this.typing(),
  )

  readonly emptyStateDescription = computed(() =>
    allowsDemoDataFrom(this.pro)
      ? 'Pregunta sobre instancias, costes, alertas, VPS, Jenkins o Kubernetes. El Copilot usa el contexto disponible del panel.'
      : 'Pregunta sobre instancias, costes, alertas o Kubernetes. El Copilot usa los datos conectados de tu organización.',
  )

  readonly copilotReady = computed(() => {
    const s = this.copilotStatus()
    if (!this.pro.proMode()) return true
    return Boolean(s?.configured)
  })

  readonly providerLabel = computed(() => {
    const s = this.copilotStatus()
    if (!s?.provider) return 'Proveedor no configurado'
    return `${s.provider} · ${s.model ?? 'modelo por defecto'}`
  })

  readonly modeLabel = computed(() => {
    const s = this.copilotStatus()
    if (!s) return 'Cargando…'
    return s.mode === 'llm' ? 'LLM en vivo' : 'Modo asistido (sin LLM)'
  })

  private readonly onLaunchProgress = (payload: unknown): void => {
    const p = payload as { percent?: number; step?: string; status?: string }
    const percent = p.percent ?? 0
    const status = (p.status === 'success' || p.status === 'error' ? p.status : 'running') as 'running' | 'success' | 'error'
    this.messages.update((msgs) => {
      const idx = [...msgs].reverse().findIndex((m) => m.role === 'assistant')
      if (idx < 0) return msgs
      const realIdx = msgs.length - 1 - idx
      const updated = [...msgs]
      updated[realIdx] = {
        ...updated[realIdx],
        launchProgress: { percent, step: p.step ?? '', status },
      }
      return updated
    })
    if (status === 'success') {
      this.platformCache.clearAll()
      this.refreshCopilotStatus(false)
    }
  }

  ngOnInit(): void {
    this.realtime.connect()
    this.realtime.on('instance.launch.progress', this.onLaunchProgress)
    this.destroyRef.onDestroy(() => this.realtime.off('instance.launch.progress', this.onLaunchProgress))

    if (this.pro.proMode()) {
      this.platformCache.clearAll()
      this.refreshCopilotStatus()
      return
    }
    window.setTimeout(() => this.loading.set(false), 300)
  }

  @HostListener('document:keydown', ['$event'])
  handleGlobalKeydown = (e: KeyboardEvent): void => {
    if (e.ctrlKey && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      this.focusSuggestions()
    }
  }

  selectContext = (id: CopilotContextId): void => {
    this.activeContext.set(id)
    this.toast.info(`Contexto: ${this.contextChips().find((d) => d.id === id)?.label ?? id}`)
  }

  handleHeader = (label: string): void => {
    if (label === 'Limpiar chat') {
      this.clearChat()
      return
    }
    if (label === 'Exportar conversación') {
      this.exportConversation()
      return
    }
    if (label === 'Nueva sesión') {
      this.newSession()
    }
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

  handleInputKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault()
      this.inputControl.setValue('')
    }
  }

  submitQuestion = (question: string): void => {
    this.queryCount.update((n) => n + 1)
    this.messages.update((m) => [...m, { role: 'user', text: question, ts: Date.now() }])
    this.typing.set(true)
    this.scrollToBottom()

    if (this.pro.proMode()) {
      this.copilotApi.chat(question, this.threadId() ?? undefined).pipe(
        catchError(() => {
          this.toast.error('No se pudo contactar con el Copilot')
          return of(null)
        }),
      ).subscribe((res) => {
        if (!res) {
          this.typing.set(false)
          return
        }
        this.threadId.set(res.threadId)
        const hasLaunch = (res.launchSteps?.length ?? 0) > 0 || (res.actionsExecuted ?? 0) > 0
        this.messages.update((m) => [
          ...m,
          {
            role: 'assistant',
            text: res.message,
            ts: Date.now(),
            sources: res.mode === 'llm' ? ['LLM', 'Panel en vivo'] : ['Panel en vivo'],
            launchProgress: hasLaunch
              ? { percent: res.launchSteps?.length ? 5 : 0, step: res.launchSteps?.[0]?.label ?? 'Iniciando…', status: 'running' as const }
              : undefined,
          },
        ])
        if (res.actionsExecuted) {
          this.toast.success(`Copilot ejecutó ${res.actionsExecuted} acción(es)`)
        }
        if (res.actionErrors?.length) {
          this.toast.error(res.actionErrors[0])
        }
        this.typing.set(false)
        this.scrollToBottom()
      })
      return
    }

    const ctx = this.activeContext()
    of(null)
      .pipe(delay(750 + Math.random() * 450))
      .subscribe(() => {
        const payload = resolveCopilotResponse(question, ctx)
        this.messages.update((m) => [
          ...m,
          {
            role: 'assistant',
            text: payload.text,
            ts: Date.now(),
            actions: payload.actions,
            sources: payload.sources,
          },
        ])
        this.typing.set(false)
        this.scrollToBottom()
      })
  }

  handleTaskSubmit = (e: Event): void => {
    e.preventDefault()
    const prompt = this.taskControl.value.trim()
    if (!prompt || this.taskSubmitting()) return
    this.taskSubmitting.set(true)
    this.copilotApi.createTask(prompt).subscribe({
      next: () => {
        this.taskControl.setValue('')
        this.taskSubmitting.set(false)
        this.toast.success('Tarea autónoma enviada')
        this.loadTasks()
        window.setTimeout(() => {
          this.platformCache.clearAll()
          this.refreshCopilotStatus(false)
        }, 2500)
      },
      error: (err) => {
        this.taskSubmitting.set(false)
        this.toast.error(err?.error?.message ?? 'No se pudo crear la tarea')
      },
    })
  }

  taskStatusLabel = (status: CopilotTask['status']): string => {
    const labels: Record<CopilotTask['status'], string> = {
      PENDING: 'Pendiente',
      RUNNING: 'Ejecutando',
      COMPLETED: 'Completada',
      FAILED: 'Fallida',
    }
    return labels[status] ?? status
  }

  private refreshCopilotStatus = (showLoading = true): void => {
    if (showLoading) this.loading.set(true)
    this.copilotApi.getStatus().subscribe({
      next: (status) => {
        this.copilotStatus.set(status)
        if (status.allowAutonomous) this.loadTasks()
        this.loading.set(false)
      },
      error: () => {
        this.copilotStatus.set(null)
        this.loading.set(false)
      },
    })
  }

  private loadTasks = (): void => {
    this.copilotApi.listTasks().subscribe({
      next: (tasks) => this.autonomousTasks.set(tasks.slice(0, 8)),
      error: () => this.autonomousTasks.set([]),
    })
  }

  copyMessage = (text: string): void => {
    navigator.clipboard.writeText(text.replace(/\*\*/g, '')).then(() => {
      this.toast.success('Mensaje copiado')
    }).catch(() => {
      this.toast.error('No se pudo copiar')
    })
  }

  runAction = (action: CopilotAction): void => {
    this.actions.runPageAction('ai-assistant', action.id, action.label, { area: 'admin' })
    if (action.route) {
      this.router.navigate([action.route])
      this.toast.info(`Navegando: ${action.label}`)
      return
    }
    this.toast.info(`${action.label} preparado`)
  }

  clearChat = (): void => {
    this.messages.set([])
    this.queryCount.set(0)
    this.actions.runPageAction('ai-assistant', 'clear', 'Limpiar chat', { area: 'admin' })
    this.toast.info('Conversación limpiada')
  }

  exportConversation = (): void => {
    const lines = this.messages().map((m) => {
      const role = m.role === 'user' ? 'Usuario' : 'Copilot'
      return `[${role}] ${m.text.replace(/\*\*/g, '')}`
    }).join('\n\n')
    downloadBlob(lines, `copilot-${this.sessionId()}.txt`, 'text/plain')
    this.actions.runPageAction('ai-assistant', 'export', 'Exportar conversación', { area: 'admin' })
    this.toast.success('Conversación exportada')
  }

  newSession = (): void => {
    this.sessionId.set(`ses-${Date.now()}`)
    this.threadId.set(null)
    this.queryCount.set(0)
    this.messages.set([])
    this.actions.runPageAction('ai-assistant', 'new-session', 'Nueva sesión', { area: 'admin' })
    this.toast.success('Nueva sesión de Copilot')
  }

  splitLines = (text: string): string[] => text.split('\n')

  parseSegments = (line: string): MessageSegment[] => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean)
    return parts.map((part) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return { kind: 'bold' as const, value: part.slice(2, -2) }
      }
      return { kind: 'text' as const, value: part }
    })
  }

  private focusSuggestions = (): void => {
    const first = this.filteredPrompts()[0]
    if (first) {
      this.ask(first.question)
      return
    }
    this.inputEl?.nativeElement.focus()
    this.toast.info('Atajos: Enter enviar · Esc limpiar')
  }

  private scrollToBottom = (): void => {
    requestAnimationFrame(() => {
      const el = this.messagesEl?.nativeElement
      if (el) el.scrollTop = el.scrollHeight
    })
  }
}
