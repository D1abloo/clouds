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
import { NavIconComponent } from '../../shared/components/nav-icon/nav-icon.component'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { NotificationsService } from '../../core/services/notifications.service'
import { ToastService } from '../../core/services/toast.service'
import { PlatformActionService } from '../../shared/platform/platform-action.service'
import { NotificationItem } from '../../core/models/api.models'
import { createPageLoader } from '../../core/utils/page-load.util'

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    PageHeaderComponent,
    NavIconComponent,
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
        title="Notificaciones"
        description="Alertas in-app y configuración de canales"
        icon="notifications"
        [actions]="[
          { label: 'Marcar todas leídas', icon: 'done_all', primary: true },
          { label: 'Actualizar', icon: 'refresh' },
        ]"
        (actionClick)="handleHeader($event)"
      />

      <div class="notif-bar">
        <app-nav-icon logo="grafana" size="md" />
        <div>
          <strong>Centro de notificaciones</strong>
          <span>{{ unreadCount() }} sin leer · Email · Slack · Webhook · In-app</span>
        </div>
      </div>

      <div class="table-card">
      <mat-tab-group class="soft-tabs" animationDuration="280ms">
        <mat-tab label="Bandeja">
          <div class="tab-panel">
            <div class="filter-row">
              <mat-form-field appearance="outline">
                <mat-label>Buscar notificaciones</mat-label>
                <input matInput [formControl]="searchControl" placeholder="Título o mensaje…" aria-label="Filtrar notificaciones" />
                <mat-hint>Busca en el título y el cuerpo del aviso</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Estado</mat-label>
                <mat-select [formControl]="readControl">
                  <mat-option value="">Todas</mat-option>
                  <mat-option value="unread">No leídas</mat-option>
                  <mat-option value="read">Leídas</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Severidad</mat-label>
                <mat-select [formControl]="severityControl">
                  <mat-option value="">Todas</mat-option>
                  <mat-option value="critical">Crítica</mat-option>
                  <mat-option value="warning">Advertencia</mat-option>
                  <mat-option value="info">Info</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            @if (page.loading()) {
              <app-loading-state />
            } @else if (page.error()) {
              <app-error-state [message]="page.error()!" (retry)="load()" />
            } @else if (filtered().length === 0) {
              <app-empty-state icon="notifications_none" title="Sin notificaciones" description="Estás al día." />
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
                        <button mat-button type="button" (click)="handleMarkRead(item)">Marcar leída</button>
                      }
                      <button mat-icon-button type="button" aria-label="Eliminar" (click)="handleDelete(item)"><mat-icon>delete</mat-icon></button>
                      <button mat-icon-button type="button" aria-label="Ver recurso" (click)="viewResource(item)"><mat-icon>open_in_new</mat-icon></button>
                    </div>
                  </mat-list-item>
                }
              </mat-list>
            }
          </div>
        </mat-tab>
        <mat-tab label="Canales">
          <div class="tab-panel channels">
            <p class="channels-lead">Enrutamiento de alertas, incidentes y cambios a canales externos.</p>
            <div class="channel-row"><span><mat-icon>notifications</mat-icon> In-app</span><mat-slide-toggle checked disabled /></div>
            <div class="channel-row"><span><mat-icon>email</mat-icon> Email</span><mat-slide-toggle checked (change)="toggleChannel('email')" /></div>
            <div class="channel-row"><span><mat-icon>webhook</mat-icon> Webhook</span><mat-slide-toggle (change)="toggleChannel('webhook')" /></div>
            <div class="channel-row"><span><mat-icon>tag</mat-icon> Slack (demo)</span><mat-slide-toggle checked (change)="toggleChannel('slack')" /></div>
            <div class="channel-row"><span><mat-icon>groups</mat-icon> Teams (demo)</span><mat-slide-toggle (change)="toggleChannel('teams')" /></div>
          </div>
        </mat-tab>
      </mat-tab-group>
      </div>
    </div>
  `,
  styles: `
    .notif-bar {
      display: flex; align-items: center; gap: 0.65rem;
      padding: 0.65rem 0.85rem; margin-bottom: 0.85rem;
      border-left: 3px solid #10b981; background: color-mix(in srgb, #10b981 5%, transparent);
      strong { display: block; font-size: 0.82rem; }
      span { font-size: 0.68rem; color: var(--app-text-muted); }
    }
    .notification-list { padding: 0; }
    .unread { background: color-mix(in srgb, var(--app-accent) 8%, transparent); border-radius: var(--app-radius-sm); }
    .meta { display: flex; align-items: center; gap: 0.25rem; }
    .date { font-size: 0.75rem; color: var(--app-text-muted); }
    .channels { max-width: 520px; padding: 0.5rem 1rem; }
    .channels-lead { font-size: 0.82rem; color: var(--app-text-muted); margin: 0 0 0.75rem; }
    .channel-row span { display: flex; align-items: center; gap: 0.35rem; mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: var(--app-text-muted); } }
    .channel-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.85rem 1rem; margin-bottom: 0.5rem;
      border-radius: var(--app-radius-md);
      background: var(--app-elevated);
      box-shadow: var(--app-shadow-xs);
    }
  `,
})
export class NotificationsPageComponent implements OnInit {
  private readonly service = inject(NotificationsService)
  private readonly toast = inject(ToastService)
  private readonly actions = inject(PlatformActionService)

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

  unreadCount = computed(() => this.items().filter((i) => !i.read).length)

  ngOnInit(): void {
    this.load()
  }

  load = (): void => {
    this.page.run(this.service.list(), {
      onSuccess: (data) => this.items.set(data),
      errorMessage: 'Failed to load notifications',
    })
  }

  handleHeader = (label: string): void => {
    if (label === 'Marcar todas leídas') {
      this.actions.runPageAction('notifications', 'mark-all-read', label, {
        count: this.unreadCount(),
        area: 'observability',
      })
      this.load()
      return
    }
    this.load()
  }

  handleMarkRead = (item: NotificationItem): void => {
    this.service.markRead(item.id).subscribe({
      next: () => {
        this.actions.runPageAction('notifications', 'mark-read', 'Marcar leída', {
          row: item as unknown as Record<string, unknown>,
          area: 'observability',
        })
        this.load()
      },
      error: () => {
        this.actions.runPageAction('notifications', 'mark-read', 'Marcar leída', {
          row: item as unknown as Record<string, unknown>,
          area: 'observability',
        })
        this.load()
      },
    })
  }

  handleDelete = (item: NotificationItem): void => {
    this.actions.runPageAction('notifications', 'delete', 'Eliminar notificación', {
      row: item as unknown as Record<string, unknown>,
      area: 'observability',
    })
    this.items.update((list) => list.filter((i) => i.id !== item.id))
  }

  viewResource = (item: NotificationItem): void => {
    this.actions.runPageAction('notifications', 'detail', item.title, {
      row: item as unknown as Record<string, unknown>,
      area: 'observability',
    })
  }

  toggleChannel = (channel: string): void => {
    this.actions.runPageAction('notifications', 'channel-toggle', `Canal ${channel}`, {
      row: { channel },
      area: 'observability',
    })
  }
}
