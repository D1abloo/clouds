import { Component, Input } from '@angular/core'
import { DatePipe } from '@angular/common'
import { MatIconModule } from '@angular/material/icon'

@Component({
  selector: 'app-github-sync-status',
  standalone: true,
  imports: [DatePipe, MatIconModule],
  template: `
    <div class="sync-status" [class.sync-status--ok]="status === 'connected'" [class.sync-status--warn]="status === 'pending'">
      <mat-icon>{{ icon }}</mat-icon>
      <div>
        <strong>{{ label }}</strong>
        @if (lastSyncAt) {
          <span>Última sincronización: {{ lastSyncAt | date: 'short' }}</span>
        } @else if (status === 'connected') {
          <span>Sin sincronizar aún</span>
        } @else {
          <span>{{ hint }}</span>
        }
      </div>
    </div>
  `,
  styles: `
    .sync-status {
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
      padding: 0.65rem 0.85rem;
      border-radius: var(--app-radius-md);
      background: var(--app-surface-muted, rgba(0, 0, 0, 0.04));
      font-size: 0.82rem;
      strong { display: block; font-size: 0.88rem; }
      span { color: var(--app-text-muted); }
      mat-icon { font-size: 1.25rem; width: 1.25rem; height: 1.25rem; opacity: 0.85; }
    }
    .sync-status--ok mat-icon { color: var(--app-success, #2e7d32); }
    .sync-status--warn mat-icon { color: var(--app-warning, #ed6c02); }
  `,
})
export class GithubSyncStatusComponent {
  @Input() status: 'connected' | 'pending' | 'invalid' | 'disconnected' = 'disconnected'
  @Input() lastSyncAt: string | null = null
  @Input() repoCount = 0

  get label(): string {
    if (this.status === 'connected') return `${this.repoCount} repositorios sincronizados`
    if (this.status === 'pending') return 'Cuenta pendiente de validación'
    if (this.status === 'invalid') return 'Token inválido'
    return 'Sin cuenta conectada'
  }

  get hint(): string {
    return 'Añade una cuenta y valida la conexión'
  }

  get icon(): string {
    if (this.status === 'connected') return 'cloud_done'
    if (this.status === 'invalid') return 'error_outline'
    if (this.status === 'pending') return 'hourglass_top'
    return 'cloud_off'
  }
}
