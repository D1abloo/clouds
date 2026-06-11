import { DatePipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core'
import { RouterLink } from '@angular/router'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { MatTooltipModule } from '@angular/material/tooltip'
import { NotificationsService } from '../../core/services/notifications.service'
import { NotificationsStore } from '../../core/stores/notifications.store'
import type { NotificationItem } from '../../core/models/api.models'

@Component({
  selector: 'app-notifications-dropdown',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, MatButtonModule, MatIconModule, MatMenuModule, MatTooltipModule],
  template: `
    <button
      mat-icon-button
      type="button"
      class="topbar-btn topbar-btn--notif"
      [class.topbar-btn--notif-active]="store.unreadTotal() > 0"
      [matMenuTriggerFor]="notifMenu"
      aria-label="Notificaciones"
      matTooltip="Notificaciones"
      (menuOpened)="handleOpen()"
    >
      <mat-icon>notifications</mat-icon>
      @if (store.unreadTotal() > 0) {
        <span class="notif-dot" aria-hidden="true"></span>
      }
    </button>

    <mat-menu #notifMenu="matMenu" class="notif-menu-panel" xPosition="before">
      <div class="notif-menu" (click)="$event.stopPropagation()">
        <header class="notif-menu__head">
          <div>
            <strong>Notificaciones</strong>
            @if (store.unreadTotal() > 0) {
              <span class="notif-menu__badge">{{ store.unreadTotal() }} sin leer</span>
            }
          </div>
          @if (store.unreadTotal() > 0) {
            <button type="button" class="notif-menu__mark" (click)="handleMarkAll()">
              Marcar todas
            </button>
          }
        </header>

        @if (loading()) {
          <p class="notif-menu__empty">Cargando…</p>
        } @else if (items().length === 0) {
          <p class="notif-menu__empty">
            <mat-icon>notifications_none</mat-icon>
            Sin notificaciones nuevas
          </p>
        } @else {
          <ul class="notif-menu__list">
            @for (n of items(); track n.id) {
              <li class="notif-menu__item" [class.notif-menu__item--unread]="!n.read">
                <button type="button" class="notif-menu__row" (click)="handleMarkRead(n)">
                  <span class="notif-menu__icon" [attr.data-tone]="tone(n)">
                    <mat-icon>{{ icon(n) }}</mat-icon>
                  </span>
                  <span class="notif-menu__body">
                    <strong>{{ n.title }}</strong>
                    <span>{{ n.message }}</span>
                    <time>{{ n.createdAt | date: 'dd MMM, HH:mm' }}</time>
                  </span>
                  @if (!n.read) {
                    <i class="notif-menu__unread-dot" aria-hidden="true"></i>
                  }
                </button>
              </li>
            }
          </ul>
        }

        <footer class="notif-menu__foot">
          <a routerLink="/notifications/all" class="notif-menu__all">Ver todas</a>
        </footer>
      </div>
    </mat-menu>
  `,
  styles: `
    :host { display: contents; }
    .topbar-btn {
      width: 44px !important;
      height: 44px !important;
      line-height: 44px !important;
      position: relative;
      flex-shrink: 0;
    }
    .topbar-btn mat-icon {
      font-size: 1.15rem;
      width: 1.15rem;
      height: 1.15rem;
      color: var(--sidebar-text-muted);
    }
    .notif-dot {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #f44336;
      border: 1.5px solid var(--app-topbar);
    }
    @media (min-width: 1024px) {
      .topbar-btn { width: 34px !important; height: 34px !important; line-height: 34px !important; }
      .notif-dot { top: 5px; right: 5px; }
    }
    ::ng-deep .notif-menu-panel .mat-mdc-menu-content { padding: 0 !important; }
    .notif-menu {
      width: min(22rem, 92vw);
      max-height: min(24rem, 70vh);
      display: flex;
      flex-direction: column;
      color: #0f172a;
    }
    .notif-menu__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.65rem 0.85rem;
      border-bottom: 1px solid #e2e8f0;
      strong { font-size: 0.82rem; font-weight: 700; }
    }
    .notif-menu__badge {
      display: block;
      font-size: 0.62rem;
      font-weight: 600;
      color: #64748b;
      margin-top: 0.1rem;
    }
    .notif-menu__mark {
      border: none;
      background: none;
      font: inherit;
      font-size: 0.64rem;
      font-weight: 600;
      color: #4f46e5;
      cursor: pointer;
      &:hover { text-decoration: underline; }
    }
    .notif-menu__list {
      list-style: none;
      margin: 0;
      padding: 0.25rem 0;
      overflow-y: auto;
      flex: 1;
      scrollbar-width: thin;
    }
    .notif-menu__row {
      display: flex;
      align-items: flex-start;
      gap: 0.55rem;
      width: 100%;
      padding: 0.55rem 0.85rem;
      border: none;
      background: transparent;
      text-align: left;
      font: inherit;
      cursor: pointer;
      &:hover { background: #f8fafc; }
    }
    .notif-menu__item--unread .notif-menu__row { background: #fafbff; }
    .notif-menu__icon {
      width: 2rem;
      height: 2rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: #e0e7ff;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: #4f46e5; }
      &[data-tone='warn'] { background: #fef3c7; mat-icon { color: #b45309; } }
      &[data-tone='danger'] { background: #fee2e2; mat-icon { color: #b91c1c; } }
    }
    .notif-menu__body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.12rem;
      strong { font-size: 0.72rem; font-weight: 700; line-height: 1.35; }
      span { font-size: 0.64rem; color: #64748b; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      time { font-size: 0.58rem; color: #94a3b8; }
    }
    .notif-menu__unread-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #4f46e5;
      flex-shrink: 0;
      margin-top: 0.35rem;
    }
    .notif-menu__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      padding: 1.5rem 1rem;
      margin: 0;
      font-size: 0.72rem;
      color: #94a3b8;
      text-align: center;
      mat-icon { font-size: 1.75rem; width: 1.75rem; height: 1.75rem; color: #c7d2fe; }
    }
    .notif-menu__foot {
      padding: 0.5rem 0.85rem;
      border-top: 1px solid #e2e8f0;
      text-align: center;
    }
    .notif-menu__all {
      font-size: 0.68rem;
      font-weight: 600;
      color: #4f46e5;
      text-decoration: none;
      &:hover { text-decoration: underline; }
    }
  `,
})
export class NotificationsDropdownComponent implements OnInit {
  readonly store = inject(NotificationsStore)
  private readonly api = inject(NotificationsService)

  readonly items = signal<NotificationItem[]>([])
  readonly loading = signal(false)

  ngOnInit(): void {
    this.store.load()
  }

  handleOpen = (): void => {
    this.loading.set(true)
    this.api.list().subscribe({
      next: (rows) => {
        this.items.set(rows.slice(0, 12))
        this.loading.set(false)
      },
      error: () => {
        this.items.set([])
        this.loading.set(false)
      },
    })
  }

  handleMarkRead = (n: NotificationItem): void => {
    if (n.read) return
    this.store.markRead(n.id)
    this.items.update((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
  }

  handleMarkAll = (): void => {
    this.store.markAllRead()
    this.items.update((list) => list.map((x) => ({ ...x, read: true })))
  }

  icon = (n: NotificationItem): string => {
    const t = `${n.title} ${n.message}`.toLowerCase()
    if (t.includes('alert') || t.includes('crít')) return 'warning'
    if (t.includes('deploy') || t.includes('jenkins')) return 'rocket_launch'
    if (t.includes('billing') || t.includes('coste')) return 'payments'
    return 'info'
  }

  tone = (n: NotificationItem): string => {
    const t = `${n.title} ${n.message}`.toLowerCase()
    if (t.includes('crít') || t.includes('fail')) return 'danger'
    if (t.includes('warn') || t.includes('alert')) return 'warn'
    return 'info'
  }
}
