import { Component, Input } from '@angular/core'
import { DatePipe } from '@angular/common'
import { MatIconModule } from '@angular/material/icon'

@Component({
  selector: 'app-gitlab-sync-status',
  standalone: true,
  imports: [DatePipe, MatIconModule],
  template: `
    <div class="sync-status" [class.sync-status--ok]="status === 'connected'">
      <mat-icon>{{ icon }}</mat-icon>
      <div>
        <strong>{{ label }}</strong>
        @if (lastSyncAt) {
          <span>Última sincronización: {{ lastSyncAt | date: 'short' }}</span>
        } @else {
          <span>{{ hint }}</span>
        }
      </div>
    </div>
  `,
  styles: `
    .sync-status {
      display: flex;
      gap: 0.65rem;
      padding: 0.65rem 0.85rem;
      border-radius: var(--app-radius-md);
      background: color-mix(in srgb, #fc6d26 8%, var(--app-elevated));
      font-size: 0.82rem;
      strong { display: block; }
      span { color: var(--app-text-muted); }
    }
    .sync-status--ok mat-icon { color: #fc6d26; }
  `,
})
export class GitlabSyncStatusComponent {
  @Input() status: 'connected' | 'disconnected' = 'connected'
  @Input() lastSyncAt: string | null = null
  @Input() projectCount = 0

  get label(): string {
    if (this.status === 'connected') return `${this.projectCount} proyectos sincronizados`
    return 'Sin cuenta GitLab conectada'
  }

  get hint(): string {
    return 'Conecta una cuenta GitLab o usa el modo demo'
  }

  get icon(): string {
    return this.status === 'connected' ? 'cloud_done' : 'cloud_off'
  }
}
