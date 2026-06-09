import { PlatformActionService } from '../../shared/platform/platform-action.service'
import { DatePipe } from '@angular/common'
import { Component, inject, OnInit, signal, computed, DestroyRef } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ActivatedRoute } from '@angular/router'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { debounceTime, startWith, delay, of, map } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { VpsService } from '../../core/services/vps.service'
import type { VpsHost } from '../../core/models/api.models'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { createPageLoader } from '../../core/utils/page-load.util'
import { TerminalEmulatorComponent } from './terminal-emulator.component'
import {
  bootstrapTerminalLines,
  defaultTerminalHistory,
  defaultTerminalSessions,
  type TerminalSession,
} from './terminal.data'

@Component({
  selector: 'app-terminal-page',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    TerminalEmulatorComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
  ],
  template: `
    @if (page.loading()) {
      <app-loading-state message="Cargando hosts y sesiones…" />
    } @else if (page.error()) {
      <app-error-state [message]="page.error()!" (retry)="loadHosts()" />
    } @else if (hosts().length === 0) {
      <app-empty-state
        title="Sin hosts VPS"
        description="Añade un host o ejecuta el seed demo para probar el terminal."
      />
    } @else if (section() === 'history') {
      <div class="page-container terminal-history animate-fade-in">
        <div class="table-card">
          <div class="table-toolbar">
            <h3>Historial de sesiones</h3>
            <span class="terminal-history__meta">{{ history().length }} conexiones cerradas · demo</span>
          </div>
          <div class="data-table-wrap">
            <table class="premium-table table-row-hover">
              <thead>
                <tr>
                  <th>Host</th>
                  <th>Usuario</th>
                  <th>Inicio</th>
                  <th>Duración</th>
                  <th>Comandos</th>
                  <th>Salida</th>
                </tr>
              </thead>
              <tbody>
                @for (h of history(); track h.id) {
                  <tr>
                    <td>
                      <strong>{{ h.hostName }}</strong>
                      <span class="terminal-history__sub mono">{{ h.hostAddress }}</span>
                    </td>
                    <td class="mono">{{ h.user }}</td>
                    <td>{{ h.startedAt | date: 'dd MMM yyyy, HH:mm' }}</td>
                    <td>{{ h.durationLabel }}</td>
                    <td>{{ h.commandCount }}</td>
                    <td>
                      <span
                        class="terminal-history__exit"
                        [class.terminal-history__exit--ok]="h.exitCode === 0"
                      >
                        exit {{ h.exitCode }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    } @else {
    <div
      class="terminal-studio terminal-studio--zsh"
      [class.terminal-studio--live]="connected()"
    >
      <div class="terminal-studio__ambient" aria-hidden="true"></div>
      <div class="terminal-studio__grid-bg" aria-hidden="true"></div>

        <header class="zsh-hud">
          <div class="zsh-hud__prompt" aria-hidden="true">
            <span class="zsh-hud__seg zsh-hud__seg--p">%</span>
            <span class="zsh-hud__seg zsh-hud__seg--shell">zsh</span>
            <span class="zsh-hud__seg zsh-hud__seg--theme">agnoster</span>
            <span class="zsh-hud__seg zsh-hud__seg--path mono">~/cloudops</span>
          </div>
          <div class="zsh-hud__stats mono">
            <span><em>{{ activeSessionCount() }}</em> jobs</span>
            <span><em>{{ onlineHostCount() }}</em> hosts</span>
            <span class="zsh-hud__host">{{ selectedHost()?.name ?? '—' }}</span>
          </div>
          <div class="zsh-hud__actions">
            <span class="zsh-hud__rprompt" [attr.data-live]="connected()">
              {{ connected() ? '↵ 0' : '○ offline' }}
            </span>
            <button type="button" class="zsh-hud__btn" (click)="loadHosts()" aria-label="Actualizar">
              <mat-icon>refresh</mat-icon>
            </button>
            <button type="button" class="zsh-hud__btn zsh-hud__btn--new" (click)="handleNewSession()">
              <mat-icon>add</mat-icon>
              tab +
            </button>
          </div>
        </header>

        <div class="terminal-studio__grid">
          <nav class="terminal-dock" aria-label="Hosts SSH">
            <div class="terminal-dock__head">
              <span class="terminal-dock__title mono"># plugins · ssh</span>
              <span class="terminal-dock__badge mono">{{ filteredHosts().length }}</span>
            </div>
            <label class="terminal-dock__search">
              <mat-icon>search</mat-icon>
              <input
                type="search"
                [formControl]="hostSearch"
                placeholder="Buscar host o IP…"
                aria-label="Buscar host"
              />
            </label>
            <ul class="terminal-dock__list">
              @for (host of filteredHosts(); track host.id) {
                <li>
                  <button
                    type="button"
                    class="terminal-dock__item"
                    [class.terminal-dock__item--on]="selectedHostId() === host.id"
                    (click)="selectHost(host.id)"
                  >
                    <span class="terminal-dock__rail" aria-hidden="true"></span>
                    <span class="terminal-dock__dot" [attr.data-status]="host.status ?? 'connected'"></span>
                    <span class="terminal-dock__label">
                      <em>{{ host.name }}</em>
                      <span class="mono">{{ host.host }}:{{ host.port ?? 22 }}</span>
                    </span>
                  </button>
                </li>
              }
            </ul>
          </nav>

          <section class="terminal-stage">
              <div class="terminal-stage__chrome">
                <div class="terminal-tabbar" role="tablist" aria-label="Sesiones">
                  @for (sess of sessions(); track sess.id) {
                    <button
                      type="button"
                      role="tab"
                      class="terminal-tab"
                      [class.terminal-tab--on]="activeSessionId() === sess.id"
                      [attr.aria-selected]="activeSessionId() === sess.id"
                      (click)="openSession(sess.id)"
                    >
                      <span class="terminal-tab__dot" [attr.data-status]="sess.status"></span>
                      <span class="terminal-tab__name">{{ sess.hostName }}</span>
                      <span class="terminal-tab__user mono">{{ sess.user }}</span>
                    </button>
                  }
                </div>

                <div class="terminal-stage__viewport">
                  <app-terminal-emulator
                    [lines]="terminalLines()"
                    [hostLabel]="emulatorLabel()"
                    [prompt]="shellPrompt()"
                    [promptUser]="promptUser()"
                    [promptHost]="promptHost()"
                    [promptPath]="promptPath()"
                    [promptBranch]="promptBranch()"
                    shellName="zsh"
                    [connected]="connected()"
                    [busy]="commandBusy()"
                    (connect)="handleConnect()"
                    (disconnect)="handleDisconnect()"
                    (clear)="handleClear()"
                    (command)="handleCommand($event)"
                  />
                </div>
              </div>
          </section>
        </div>
    </div>
    }
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
      --term-brand: var(--zsh-purple);
      --term-brand-soft: color-mix(in srgb, var(--zsh-purple) 18%, transparent);
      --term-ink: var(--zsh-fg);
      --term-muted: var(--zsh-muted);
      --term-surface: color-mix(in srgb, var(--zsh-surface) 88%, transparent);
      --term-border: color-mix(in srgb, var(--zsh-purple) 28%, transparent);
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      height: 100%;
    }
    .terminal-studio {
      position: relative;
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      height: 100%;
      gap: 0.65rem;
      color: var(--term-ink);
      isolation: isolate;
      overflow: hidden;
    }
    .terminal-studio--zsh {
      font-family: var(--app-font-mono, 'JetBrains Mono', ui-monospace, monospace);
    }
    .terminal-studio__ambient {
      position: absolute;
      inset: -15% -5% auto;
      height: 60%;
      pointer-events: none;
      z-index: 0;
      background:
        radial-gradient(ellipse 50% 60% at 8% 0%, color-mix(in srgb, var(--zsh-purple) 35%, transparent), transparent 70%),
        radial-gradient(ellipse 40% 50% at 92% 5%, color-mix(in srgb, var(--zsh-cyan) 18%, transparent), transparent 72%),
        radial-gradient(ellipse 45% 40% at 70% 90%, color-mix(in srgb, var(--zsh-magenta) 12%, transparent), transparent 75%);
      opacity: 1;
    }
    .terminal-studio--live .terminal-studio__ambient {
      background:
        radial-gradient(ellipse 50% 60% at 8% 0%, color-mix(in srgb, var(--zsh-purple) 42%, transparent), transparent 70%),
        radial-gradient(ellipse 42% 55% at 95% 8%, color-mix(in srgb, var(--zsh-green) 22%, transparent), transparent 72%),
        radial-gradient(ellipse 45% 40% at 50% 100%, color-mix(in srgb, var(--zsh-magenta) 15%, transparent), transparent 75%);
    }
    .terminal-studio__grid-bg {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 0;
      opacity: 0.04;
      background-image:
        linear-gradient(var(--zsh-muted) 1px, transparent 1px),
        linear-gradient(90deg, var(--zsh-muted) 1px, transparent 1px);
      background-size: 24px 24px;
    }
    .terminal-studio > :not(.terminal-studio__ambient):not(.terminal-studio__grid-bg) {
      position: relative;
      z-index: 1;
    }
    .zsh-hud {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-shrink: 0;
      padding: 0.45rem 0.6rem;
      border-radius: 10px;
      background: var(--zsh-bg-deep);
      border: 1px solid var(--term-border);
      box-shadow: 0 8px 28px color-mix(in srgb, #000 35%, transparent);
    }
    .zsh-hud__prompt {
      display: flex;
      align-items: stretch;
      flex-shrink: 0;
      font-size: 0.68rem;
      font-weight: 700;
      line-height: 1;
    }
    .zsh-hud__seg {
      padding: 0.32rem 0.5rem;
    }
    .zsh-hud__seg--p {
      background: var(--zsh-green);
      color: var(--zsh-bg-deep);
      border-radius: 6px 0 0 6px;
      font-size: 0.85rem;
    }
    .zsh-hud__seg--shell {
      background: var(--zsh-purple);
      color: var(--zsh-bg-deep);
    }
    .zsh-hud__seg--theme {
      background: var(--zsh-magenta);
      color: var(--zsh-bg-deep);
    }
    .zsh-hud__seg--path {
      background: var(--zsh-cyan);
      color: var(--zsh-bg-deep);
      border-radius: 0 6px 6px 0;
      max-width: 8rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .zsh-hud__stats {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 0.85rem;
      flex: 1;
      min-width: 0;
      font-size: 0.7rem;
      color: var(--zsh-muted);
    }
    .zsh-hud__stats em {
      font-style: normal;
      color: var(--zsh-cyan);
      font-weight: 700;
    }
    .zsh-hud__host {
      color: var(--zsh-orange);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .zsh-hud__actions {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      flex-shrink: 0;
    }
    .zsh-hud__rprompt {
      font-size: 0.65rem;
      font-weight: 700;
      color: var(--zsh-muted);
      padding: 0.2rem 0.45rem;
      border-radius: 4px;
      background: color-mix(in srgb, var(--zsh-surface) 80%, transparent);
    }
    .zsh-hud__rprompt[data-live='true'] {
      color: var(--zsh-green);
      background: color-mix(in srgb, var(--zsh-green) 12%, transparent);
    }
    .zsh-hud__btn {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.32rem 0.5rem;
      border: 1px solid var(--term-border);
      border-radius: 6px;
      background: var(--zsh-surface);
      color: var(--zsh-fg);
      font: inherit;
      font-size: 0.68rem;
      font-weight: 600;
      cursor: pointer;
    }
    .zsh-hud__btn:hover {
      filter: brightness(1.12);
    }
    .zsh-hud__btn mat-icon {
      font-size: 0.95rem;
      width: 0.95rem;
      height: 0.95rem;
      color: var(--zsh-cyan);
    }
    .zsh-hud__btn--new {
      background: linear-gradient(135deg, var(--zsh-purple), var(--zsh-magenta));
      border-color: transparent;
      color: var(--zsh-bg-deep);
      font-weight: 800;
    }
    .zsh-hud__btn--new mat-icon {
      color: inherit;
    }
    .terminal-studio__grid {
      display: grid;
      grid-template-columns: minmax(200px, 228px) minmax(0, 1fr);
      gap: 0.7rem;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
    .terminal-dock {
      display: flex;
      flex-direction: column;
      min-height: 0;
      padding: 0.55rem 0.45rem;
      border-radius: 10px;
      background: var(--zsh-bg-deep);
      border: 1px solid var(--term-border);
      box-shadow: inset 0 1px 0 color-mix(in srgb, var(--zsh-purple) 15%, transparent);
    }
    .terminal-dock__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.45rem;
      padding: 0 0.15rem;
      flex-shrink: 0;
    }
    .terminal-dock__title {
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--term-muted);
    }
    .terminal-dock__badge {
      font-size: 0.62rem;
      font-weight: 700;
      padding: 0.1rem 0.4rem;
      border-radius: 6px;
      background: var(--term-brand-soft);
      color: var(--term-brand);
    }
    .terminal-dock__search {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.38rem 0.5rem;
      margin-bottom: 0.45rem;
      border-radius: 10px;
      background: color-mix(in srgb, var(--term-ink) 4%, transparent);
      border: 1px solid transparent;
      flex-shrink: 0;
      transition: border-color 0.15s ease;
    }
    .terminal-dock__search:focus-within {
      border-color: color-mix(in srgb, var(--term-brand) 35%, transparent);
    }
    .terminal-dock__search mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: var(--term-muted);
    }
    .terminal-dock__search input {
      border: none;
      background: transparent;
      font: inherit;
      font-size: 0.74rem;
      color: var(--term-ink);
      width: 100%;
      min-width: 0;
    }
    .terminal-dock__search input:focus {
      outline: none;
    }
    .terminal-dock__list {
      list-style: none;
      margin: 0;
      padding: 0;
      overflow-y: auto;
      flex: 1;
      min-height: 0;
      scrollbar-width: thin;
    }
    .terminal-dock__item {
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: 0.4rem;
      width: 100%;
      padding: 0.48rem 0.4rem 0.48rem 0.55rem;
      border: none;
      border-radius: 10px;
      background: transparent;
      font: inherit;
      text-align: left;
      color: var(--term-ink);
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .terminal-dock__item:hover {
      background: color-mix(in srgb, var(--term-ink) 4%, transparent);
    }
    .terminal-dock__item--on {
      background: var(--term-brand-soft);
    }
    .terminal-dock__rail {
      position: absolute;
      left: 0;
      top: 0.35rem;
      bottom: 0.35rem;
      width: 3px;
      border-radius: 3px;
      background: transparent;
      transition: background 0.15s ease;
    }
    .terminal-dock__item--on .terminal-dock__rail {
      background: linear-gradient(180deg, var(--term-brand), color-mix(in srgb, var(--term-brand) 40%, transparent));
    }
    .terminal-dock__dot {
      width: 8px;
      height: 8px;
      margin-top: 0.32rem;
      border-radius: 50%;
      flex-shrink: 0;
      background: #94a3b8;
    }
    .terminal-dock__dot[data-status='connected'] {
      background: var(--zsh-green);
      box-shadow: 0 0 8px color-mix(in srgb, var(--zsh-green) 55%, transparent);
    }
    .terminal-dock__label {
      flex: 1;
      min-width: 0;
    }
    .terminal-dock__label em {
      display: block;
      font-style: normal;
      font-size: 0.76rem;
      font-weight: 650;
    }
    .terminal-dock__label span {
      display: block;
      font-size: 0.64rem;
      color: var(--term-muted);
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .terminal-stage {
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 0;
      overflow: hidden;
    }
    .terminal-stage__chrome {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      gap: 0;
      border-radius: 10px;
      border: 1px solid var(--term-border);
      background: var(--zsh-bg);
      overflow: hidden;
      box-shadow: 0 16px 40px color-mix(in srgb, #000 40%, transparent);
    }
    .terminal-studio--live .terminal-stage__chrome {
      border-color: color-mix(in srgb, var(--zsh-green) 40%, transparent);
      box-shadow:
        0 0 0 1px color-mix(in srgb, var(--zsh-green) 18%, transparent),
        0 16px 40px color-mix(in srgb, #000 45%, transparent);
    }
    .terminal-tabbar {
      display: flex;
      gap: 0;
      padding: 0.35rem 0.45rem 0;
      overflow-x: auto;
      flex-shrink: 0;
      scrollbar-width: none;
      border-bottom: 1px solid var(--term-border);
      background: var(--zsh-bg-deep);
    }
    .terminal-tab {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.45rem 0.75rem 0.5rem;
      border: none;
      border-radius: 10px 10px 0 0;
      background: transparent;
      font: inherit;
      font-size: 0.72rem;
      color: var(--term-muted);
      cursor: pointer;
      white-space: nowrap;
      transition: color 0.15s ease, background 0.15s ease;
    }
    .terminal-tab:hover {
      color: var(--term-ink);
      background: color-mix(in srgb, var(--term-ink) 4%, transparent);
    }
    .terminal-tab--on {
      color: var(--zsh-cyan);
      background: var(--zsh-surface);
      box-shadow: inset 0 -2px 0 var(--zsh-green);
    }
    .terminal-tab__dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #94a3b8;
      flex-shrink: 0;
    }
    .terminal-tab__dot[data-status='connected'] {
      background: var(--zsh-green);
      box-shadow: 0 0 6px var(--zsh-green);
    }
    .terminal-tab__name {
      font-weight: 650;
    }
    .terminal-tab__user {
      font-size: 0.62rem;
      color: var(--term-muted);
      display: none;
    }
    .terminal-tab--on .terminal-tab__user {
      display: inline;
    }
    .terminal-stage__viewport {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      padding: 0.45rem;
      background: var(--zsh-bg);
    }
    .terminal-history {
      color: #111;
      font-family: inherit;
    }
    .terminal-history__meta {
      font-size: 0.72rem;
      color: var(--app-text-muted, #64748b);
    }
    .terminal-history .table-toolbar h3 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 600;
      color: #111;
    }
    .terminal-history__sub {
      display: block;
      font-size: 0.72rem;
      color: var(--app-text-muted, #64748b);
      font-weight: 400;
    }
    .terminal-history__exit {
      font-size: 0.68rem;
      font-weight: 700;
      padding: 0.15rem 0.45rem;
      border-radius: 6px;
      background: color-mix(in srgb, #ef4444 12%, transparent);
      color: #b91c1c;
    }
    .terminal-history__exit--ok {
      background: color-mix(in srgb, #22c55e 14%, transparent);
      color: #15803d;
    }
    .mono {
      font-family: var(--app-font-mono, ui-monospace, monospace);
    }
    @media (max-width: 900px) {
      .terminal-studio__grid {
        grid-template-columns: 1fr;
      }
      .terminal-dock {
        max-height: 200px;
      }
      .zsh-hud {
        flex-wrap: wrap;
      }
      .terminal-tab__user {
        display: none !important;
      }
    }
  `,
})
export class TerminalPageComponent implements OnInit {
  private readonly actions = inject(PlatformActionService)

  private readonly route = inject(ActivatedRoute)
  private readonly vps = inject(VpsService)
  private readonly destroyRef = inject(DestroyRef)

  readonly hostSearch = new FormControl('', { nonNullable: true })
  readonly page = createPageLoader(true)
  readonly hosts = signal<VpsHost[]>([])
  readonly sessions = signal<TerminalSession[]>(defaultTerminalSessions())
  readonly history = signal(defaultTerminalHistory())
  readonly selectedHostId = signal<string>('')
  readonly activeSessionId = signal<string>('sess-1')
  readonly terminalLines = signal<string[]>([])
  readonly connected = signal(false)
  readonly commandBusy = signal(false)

  readonly hostSearchTerm = toSignal(
    this.hostSearch.valueChanges.pipe(debounceTime(150), startWith('')),
    { initialValue: '' },
  )

  readonly section = toSignal(
    this.route.paramMap.pipe(
      startWith(this.route.snapshot.paramMap),
      map((p) => p.get('section') ?? 'active-sessions'),
    ),
    { initialValue: 'active-sessions' },
  )

  readonly filteredHosts = computed(() => {
    const term = (this.hostSearchTerm() ?? '').toLowerCase()
    const list = this.hosts()
    if (!term) return list
    return list.filter(
      (h) =>
        h.name.toLowerCase().includes(term) ||
        h.host.toLowerCase().includes(term) ||
        h.id.toLowerCase().includes(term),
    )
  })

  readonly selectedHost = computed(() => {
    const id = this.selectedHostId()
    return this.hosts().find((h) => h.id === id) ?? null
  })

  readonly activeSessionCount = computed(
    () => this.sessions().filter((s) => s.status === 'connected').length,
  )

  readonly onlineHostCount = computed(
    () => this.hosts().filter((h) => (h.status ?? 'connected') === 'connected').length,
  )

  readonly activeSession = computed(() => {
    const id = this.activeSessionId()
    return this.sessions().find((s) => s.id === id) ?? null
  })

  readonly promptUser = computed(() => this.activeSession()?.user ?? 'cloudops')

  readonly promptHost = computed(() => this.selectedHost()?.name ?? 'localhost')

  readonly promptPath = computed(() => {
    const cwd = this.activeSession()?.cwd
    if (!cwd) return '~'
    return cwd.length > 24 ? `…${cwd.slice(-22)}` : cwd
  })

  readonly promptBranch = computed(() => {
    const host = this.selectedHost()?.name ?? ''
    if (host.includes('3')) return 'hotfix/vps-3'
    if (host.includes('2')) return 'develop'
    return 'main'
  })

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.loadHosts()
      this.syncSessionFromRoute()
    })
    this.loadHosts()
  }

  loadHosts = (): void => {
    const vpsId = this.route.snapshot.paramMap.get('vpsId')
    const section = this.route.snapshot.paramMap.get('section') ?? 'active-sessions'
    const knownSections = new Set(['active-sessions', 'history'])
    const hostFromSection = knownSections.has(section) ? null : section
    const routeHostId = vpsId ?? hostFromSection

    this.page.run(this.vps.list(), {
      onSuccess: (data) => {
        this.hosts.set(data)
        const initial =
          routeHostId && data.some((h) => h.id === routeHostId) ? routeHostId : data[0]?.id ?? ''
        this.selectedHostId.set(initial)
        this.bootstrapLinesForSelection()
      },
      errorMessage: 'No se pudieron cargar los hosts VPS',
    })
  }

  syncSessionFromRoute = (): void => {
    if (this.section() !== 'active-sessions') return
    const hostId = this.selectedHostId()
    const match = this.sessions().find((s) => s.hostId === hostId)
    if (match) this.activeSessionId.set(match.id)
  }

  selectHost = (hostId: string): void => {
    this.selectedHostId.set(hostId)
    this.connected.set(false)
    this.bootstrapLinesForSelection()
    const sess = this.sessions().find((s) => s.hostId === hostId)
    if (sess) this.activeSessionId.set(sess.id)
  }

  openSession = (sessionId: string): void => {
    const sess = this.sessions().find((s) => s.id === sessionId)
    if (!sess) return
    this.activeSessionId.set(sessionId)
    this.selectedHostId.set(sess.hostId)
    this.connected.set(sess.status === 'connected')
    this.terminalLines.set(
      sess.status === 'connected'
        ? [...bootstrapTerminalLines(sess.hostName, sess.hostAddress, sess.user), `${sess.user}@${sess.hostName}:${sess.cwd}$ `]
        : bootstrapTerminalLines(sess.hostName, sess.hostAddress, sess.user),
    )
  }

  emulatorLabel = (): string => {
    const h = this.selectedHost()
    if (!h) return 'Selecciona un host'
    return `${h.name} (${h.host})`
  }

  shellPrompt = (): string => {
    const sess = this.activeSession()
    const h = this.selectedHost()
    const user = sess?.user ?? 'cloudops'
    if (!h) return ''
    const cwd = sess?.cwd ?? '~'
    const short = cwd.startsWith('/') ? cwd : `~/${cwd.replace(/^~\/?/, '')}`
    return `${user}@${h.name}:${short}$ `
  }

  handleConnect = (): void => {
    const h = this.selectedHost()
    if (!h) return
    this.commandBusy.set(true)
    this.terminalLines.update((lines) => [...lines, '', 'Establishing connection…'])
    of(true)
      .pipe(delay(900))
      .subscribe({
        next: () => {
          const user = this.promptUser()
          const cwd = this.promptPath()
          this.connected.set(true)
          this.commandBusy.set(false)
          this.terminalLines.set([
            ...bootstrapTerminalLines(h.name, h.host, user),
            `${user}@${h.name}:${cwd}$ `,
          ])
          this.sessions.update((list) =>
            list.map((s) =>
              s.hostId === h.id
                ? { ...s, status: 'connected' as const, lastActivity: new Date().toISOString() }
                : s,
            ),
          )
          this.actions.simulate(`Conectado a ${h.name}`, 400).subscribe()
        },
      })
  }

  handleDisconnect = (): void => {
    const h = this.selectedHost()
    this.connected.set(false)
    this.terminalLines.update((lines) => [...lines, '', 'Connection closed.', ''])
    if (h) {
      this.sessions.update((list) =>
        list.map((s) =>
          s.hostId === h.id ? { ...s, status: 'disconnected' as const } : s,
        ),
      )
    }
  }

  handleClear = (): void => {
    const h = this.selectedHost()
    if (!h) return
    const user = this.promptUser()
    const cwd = this.promptPath()
    this.terminalLines.set(
      this.connected()
        ? [...bootstrapTerminalLines(h.name, h.host, user), `${user}@${h.name}:${cwd}$ `]
        : bootstrapTerminalLines(h.name, h.host, user),
    )
  }

  handleCommand = (cmd: string): void => {
    const h = this.selectedHost()
    if (!h || !this.connected()) return
    const prompt = this.shellPrompt()
    this.commandBusy.set(true)
    this.terminalLines.update((lines) => [...lines, `${prompt}${cmd}`])

    this.vps.execute(h.id, cmd).subscribe({
      next: (res) => {
        const out =
          typeof res === 'string'
            ? res
            : typeof res === 'object' && res && 'output' in res
              ? String((res as { output: unknown }).output)
              : this.demoOutputForCommand(cmd)
        this.appendCommandResult(out, prompt)
      },
      error: () => {
        this.appendCommandResult(this.demoOutputForCommand(cmd), prompt)
      },
    })
  }

  handleNewSession = (): void => {
    const h = this.selectedHost()
    if (!h) return
    const id = `sess-${Date.now()}`
    const sess: TerminalSession = {
      id,
      hostId: h.id,
      hostName: h.name,
      hostAddress: h.host,
      user: 'cloudops',
      status: 'disconnected',
      startedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      cwd: '~',
    }
    this.sessions.update((list) => [sess, ...list])
    this.activeSessionId.set(id)
    this.connected.set(false)
    this.bootstrapLinesForSelection()
    this.actions.simulate(`Sesión nueva en ${h.name}`, 400).subscribe()
  }

  private bootstrapLinesForSelection = (): void => {
    const h = this.selectedHost()
    if (!h) {
      this.terminalLines.set(['Selecciona un host en el panel izquierdo.'])
      return
    }
    const sess = this.sessions().find((s) => s.hostId === h.id)
    if (sess?.status === 'connected') {
      this.connected.set(true)
      this.terminalLines.set([
        ...bootstrapTerminalLines(h.name, h.host, sess.user),
        `${sess.user}@${h.name}:${sess.cwd}$ `,
      ])
      return
    }
    this.connected.set(false)
    this.terminalLines.set(bootstrapTerminalLines(h.name, h.host, sess?.user ?? 'cloudops'))
  }

  private appendCommandResult = (output: string, prompt: string): void => {
    const lines = output.split('\n').filter((l, i, arr) => i < arr.length - 1 || l.length > 0)
    this.terminalLines.update((prev) => [...prev, ...lines, prompt])
    this.commandBusy.set(false)
    const h = this.selectedHost()
    if (h) {
      this.sessions.update((list) =>
        list.map((s) =>
          s.hostId === h.id ? { ...s, lastActivity: new Date().toISOString() } : s,
        ),
      )
    }
  }

  private demoOutputForCommand = (cmd: string): string => {
    const c = cmd.trim().toLowerCase()
    if (c === 'df -h' || c.startsWith('df')) {
      return 'Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1        79G   42G   34G  56% /\ntmpfs           3.9G     0  3.9G   0% /dev/shm'
    }
    if (c.includes('docker ps')) {
      return 'NAMES          STATUS\napi-gateway    Up 3 days\nworker-01      Up 12 hours'
    }
    if (c.includes('kubectl')) {
      return 'NAMESPACE     NAME              READY\ndefault       nginx-7c4d8b    1/1\nkube-system   coredns-xyz      1/1'
    }
    if (c.startsWith('terraform')) {
      return 'Refreshing state...\nNo changes. Your infrastructure matches the configuration.'
    }
    if (c.startsWith('top')) {
      return 'PID USER      PR  NI    VIRT    RES   SHR S  %CPU  %MEM     TIME+ COMMAND\n 842 root      20   0  2451200  98200  15232 S   4.2   2.4   12:03.11 kubelet'
    }
    return `✓ ${cmd}\n(completed in 0.8s — demo)`
  }
}
