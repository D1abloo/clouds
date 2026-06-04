import { Component, Input } from '@angular/core'
import { DatePipe } from '@angular/common'
import { MatIconModule } from '@angular/material/icon'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import type { GithubAccount } from '../../../core/services/github.service'

@Component({
  selector: 'app-github-account-card',
  standalone: true,
  imports: [DatePipe, MatIconModule, StatusBadgeComponent],
  template: `
    @if (account) {
      <div class="account-card">
        <div class="account-card__head">
          <img
            [src]="account.avatarUrl ?? 'https://github.com/cloudops-demo.png'"
            alt=""
            width="48"
            height="48"
            class="account-card__avatar"
          />
          <div>
            <h3>{{ account.label }}</h3>
            <p class="account-card__user">&#64;{{ account.username }}</p>
          </div>
          <app-status-badge [value]="statusBadge()" />
        </div>
        <dl class="account-card__grid">
          <div>
            <dt>Organización</dt>
            <dd>{{ account.organization ?? 'cloudops-lab' }}</dd>
          </div>
          <div>
            <dt>Tipo</dt>
            <dd>{{ account.accountTypeLabel ?? 'Demo' }}</dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>{{ account.statusLabel ?? 'Conectada' }}</dd>
          </div>
          <div>
            <dt>Última sincronización</dt>
            <dd>{{ account.lastSyncAt ? (account.lastSyncAt | date: 'short') : 'Ahora' }}</dd>
          </div>
        </dl>
        @if (demoMode) {
          <p class="account-card__demo">
            <mat-icon>science</mat-icon>
            Modo demostración — sin credenciales reales de GitHub
          </p>
        }
      </div>
    }
  `,
  styles: `
    .account-card {
      padding: 1rem 1.15rem;
      border-radius: var(--app-radius-lg);
      background: color-mix(in srgb, var(--app-primary, #1565c0) 4%, var(--app-card));
      border: 1px solid color-mix(in srgb, var(--app-primary, #1565c0) 18%, transparent);
      margin-bottom: 1rem;
    }
    .account-card__head {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      margin-bottom: 1rem;
      h3 { margin: 0; font-size: 1.05rem; }
    }
    .account-card__avatar { border-radius: 50%; }
    .account-card__user { margin: 0.2rem 0 0; font-size: 0.85rem; color: var(--app-text-muted); }
    .account-card__grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.65rem 1rem;
      margin: 0;
      dt { font-size: 0.7rem; text-transform: uppercase; color: var(--app-text-muted); }
      dd { margin: 0.15rem 0 0; font-size: 0.88rem; font-weight: 500; }
    }
    .account-card__demo {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0.85rem 0 0;
      font-size: 0.78rem;
      color: var(--app-primary, #1565c0);
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    }
  `,
})
export class GithubAccountCardComponent {
  @Input() account: GithubAccount | null = null
  @Input() demoMode = false

  statusBadge = (): string => {
    const s = this.account?.status
    if (s === 'connected') return 'SUCCESS'
    if (s === 'pending') return 'RUNNING'
    if (s === 'invalid') return 'ERROR'
    return 'STOPPED'
  }
}
