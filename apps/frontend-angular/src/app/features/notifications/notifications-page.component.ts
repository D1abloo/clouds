import { Component, inject, OnInit, signal, computed } from '@angular/core'
import { DatePipe } from '@angular/common'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatTabsModule } from '@angular/material/tabs'
import { MatListModule } from '@angular/material/list'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { debounceTime, startWith } from 'rxjs'
import { toSignal } from '@angular/core/rxjs-interop'
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { NotificationsService } from '../../core/services/notifications.service'
import { DemoActionsService } from '../../core/services/demo-actions.service'
import { ToastService } from '../../core/services/toast.service'
import { NotificationItem } from '../../core/models/api.models'
import { createPageLoader } from '../../core/utils/page-load.util'

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    PageHeaderComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    MatTabsModule,
    MatListModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
  ],
  template: `
    <div class="page-container">
      <app-page-header
        title="Notifications"
        description="In-app alerts and channel configuration"
        [actions]="[
          { label: 'Mark all read', icon: 'done_all', primary: true },
          { label: 'Refresh', icon: 'refresh' },
        ]"
        (actionClick)="handleHeader($event)"
      />

      <mat-tab-group>
        <mat-tab label="Inbox">
          <div class="tab-panel">
            <div class="filter-row">
              <mat-form-field appearance="outline"><mat-label>Search</mat-label><input matInput [formControl]="searchControl" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Status</mat-label>
                <mat-select [formControl]="readControl">
                  <mat-option value="">All</mat-option>
                  <mat-option value="unread">Unread</mat-option>
                  <mat-option value="read">Read</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Severity</mat-label>
                <mat-select [formControl]="severityControl">
                  <mat-option value="">All</mat-option>
                  <mat-option value="critical">Critical</mat-option>
                  <mat-option value="warning">Warning</mat-option>
                  <mat-option value="info">Info</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            @if (page.loading()) {
              <app-loading-state />
            } @else if (page.error()) {
              <app-error-state [message]="page.error()!" (retry)="load()" />
            } @else if (filtered().length === 0) {
              <app-empty-state icon="notifications_none" title="No notifications" description="You're all caught up." />
            } @else {
              <mat-list class="notification-list table-card">
                @for (item of filtered(); track item.id) {
                  <mat-list-item [class.unread]="!item.read">
                    <mat-icon matListItemIcon>{{ item.read ? 'drafts' : 'mark_email_unread' }}</mat-icon>
                    <div matListItemTitle>{{ item.title }}</div>
                    <div matListItemLine>{{ item.message }}</div>
                    <div matListItemMeta class="meta">
                      <span class="date">{{ item.createdAt | date: 'short' }}</span>
                      @if (!item.read) {
                        <button mat-button type="button" (click)="handleMarkRead(item)">Mark read</button>
                      }
                      <button mat-icon-button type="button" aria-label="Delete" (click)="handleDelete(item)"><mat-icon>delete</mat-icon></button>
                      <button mat-icon-button type="button" aria-label="View resource" (click)="viewResource(item)"><mat-icon>open_in_new</mat-icon></button>
                    </div>
                  </mat-list-item>
                }
              </mat-list>
            }
          </div>
        </mat-tab>
        <mat-tab label="Channels">
          <div class="tab-panel channels">
            <div class="channel-row"><span>In-app</span><mat-slide-toggle checked disabled /></div>
            <div class="channel-row"><span>Email</span><mat-slide-toggle checked (change)="toggleChannel('email')" /></div>
            <div class="channel-row"><span>Webhook</span><mat-slide-toggle (change)="toggleChannel('webhook')" /></div>
            <div class="channel-row"><span>Slack (demo)</span><mat-slide-toggle checked (change)="toggleChannel('slack')" /></div>
            <div class="channel-row"><span>Teams (demo)</span><mat-slide-toggle (change)="toggleChannel('teams')" /></div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: `
    .notification-list { padding: 0; }
    .unread { background: rgba(59, 130, 246, 0.06); }
    .meta { display: flex; align-items: center; gap: 0.25rem; }
    .date { font-size: 0.75rem; color: var(--app-text-muted); }
    .channels { max-width: 420px; }
    .channel-row { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid var(--app-border); }
  `,
})
export class NotificationsPageComponent implements OnInit {
  private readonly service = inject(NotificationsService)
  private readonly toast = inject(ToastService)
  private readonly demoActions = inject(DemoActionsService)

  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly readControl = new FormControl('', { nonNullable: true })
  readonly severityControl = new FormControl('', { nonNullable: true })
  readonly page = createPageLoader(true)
  readonly items = signal<NotificationItem[]>([])

  private readonly searchTerm = toSignal(this.searchControl.valueChanges.pipe(debounceTime(200), startWith('')), { initialValue: '' })
  private readonly readFilter = toSignal(this.readControl.valueChanges.pipe(startWith('')), { initialValue: '' })

  filtered = computed(() => {
    const term = (this.searchTerm() ?? '').toLowerCase()
    const read = this.readFilter()
    return this.items().filter((i) => {
      const matchTerm = !term || i.title.toLowerCase().includes(term) || i.message.toLowerCase().includes(term)
      const matchRead = !read || (read === 'unread' ? !i.read : i.read)
      return matchTerm && matchRead
    })
  })

  ngOnInit = (): void => this.load()

  load = (): void => {
    this.page.run(this.service.list(), {
      onSuccess: (data) => this.items.set(data),
      errorMessage: 'Failed to load notifications',
    })
  }

  handleHeader = (label: string): void => {
    if (label === 'Mark all read') {
      this.demoActions.simulate('Mark all read', 500, 'All notifications marked as read').subscribe(() => this.load())
      return
    }
    this.load()
  }

  handleMarkRead = (item: NotificationItem): void => {
    this.service.markRead(item.id).subscribe({
      next: () => this.load(),
      error: () => this.demoActions.simulate('Mark read', 300).subscribe(() => this.load()),
    })
  }

  handleDelete = (item: NotificationItem): void => {
    this.demoActions.simulate(`Delete notification`, 400, 'Notification removed').subscribe(() =>
      this.items.update((list) => list.filter((i) => i.id !== item.id)),
    )
  }

  viewResource = (item: NotificationItem): void => {
    this.demoActions.simulate(`Open resource for ${item.title}`, 300).subscribe()
  }

  toggleChannel = (channel: string): void => {
    this.demoActions.simulate(`Toggle ${channel} channel`, 300).subscribe()
  }
}
