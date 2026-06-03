import { Component, inject, OnInit, signal } from '@angular/core'
import { MatListModule } from '@angular/material/list'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { DatePipe } from '@angular/common'
import { NotificationsService } from '../../core/services/notifications.service'
import { NotificationItem } from '../../core/models/api.models'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { ToastService } from '../../core/services/toast.service'
import { createPageLoader } from '../../core/utils/page-load.util'

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [
    MatListModule,
    MatIconModule,
    MatButtonModule,
    DatePipe,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
  ],
  template: `
    <div class="page-container">
      <header class="page-header">
        <h1>Notifications</h1>
        <p>System and operational notifications</p>
      </header>

      @if (page.loading()) {
        <app-loading-state />
      } @else if (page.error()) {
        <app-error-state [message]="page.error()!" (retry)="load()" />
      } @else if (items().length === 0) {
        <app-empty-state
          icon="notifications_none"
          title="No notifications"
          description="You're all caught up."
        />
      } @else {
        <mat-list class="notification-list table-card">
          @for (item of items(); track item.id) {
            <mat-list-item [class.unread]="!item.read">
              <mat-icon matListItemIcon>{{
                item.read ? 'drafts' : 'mark_email_unread'
              }}</mat-icon>
              <div matListItemTitle>{{ item.title }}</div>
              <div matListItemLine>{{ item.message }}</div>
              <div matListItemMeta>
                <span class="date">{{ item.createdAt | date: 'short' }}</span>
                @if (!item.read) {
                  <button
                    mat-button
                    type="button"
                    (click)="handleMarkRead(item)"
                  >
                    Mark read
                  </button>
                }
              </div>
            </mat-list-item>
          }
        </mat-list>
      }
    </div>
  `,
  styles: `
    .notification-list { padding: 0; }
    .unread { background: rgba(59, 130, 246, 0.06); }
    .date {
      font-size: 0.75rem;
      color: var(--app-text-muted);
      margin-right: 0.5rem;
    }
  `,
})
export class NotificationsPageComponent implements OnInit {
  private readonly service = inject(NotificationsService)
  private readonly toast = inject(ToastService)

  readonly page = createPageLoader(true)
  readonly items = signal<NotificationItem[]>([])

  ngOnInit = (): void => this.load()

  load = (): void => {
    this.page.run(this.service.list(), {
      onSuccess: (data) => this.items.set(data),
      errorMessage: 'Failed to load notifications',
    })
  }

  handleMarkRead = (item: NotificationItem): void => {
    this.service.markRead(item.id).subscribe({
      next: () => this.load(),
      error: () => this.toast.error('Failed to mark as read'),
    })
  }
}
