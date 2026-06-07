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
            [src]="account.avatarUrl ?? 'https://github.com/' + account.username + '.png'"
            alt=""
            width="48"
            height="48"
            class="account-card__avatar"
          />
          <div class="account-card__identity">
            <h3>{{ account.label }}</h3>
            <p class="account-card__user">&#64;{{ account.username }}</p>
            @if (account.organization && account.organization !== '—') {
              <p class="account-card__org">
                <mat-icon>corporate_fare</mat-icon> {{ account.organization }}
              </p>
            }
          </div>
          <app-status-badge [value]="statusBadge()" />
        </div>
        <dl class="account-card__grid">
          <div>
            <dt>Tipo</dt>
            <dd>{{ account.accountTypeLabel ?? 'Estándar' }}</dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>{{ account.statusLabel ?? 'Conectada' }}</dd>
          </div>
          <div>
            <dt>Última validación</dt>
            <dd>{{ account.lastValidatedAt ? (account.lastValidatedAt | date: 'short') : 'Pendiente' }}</dd>
          </div>
          <div>
            <dt>Última sincronización</dt>
            <dd>{{ account.lastSyncAt ? (account.lastSyncAt | date: 'short') : 'Sin sync' }}</dd>
          </div>
          <div>
            <dt>Scopes mínimos</dt>
            <dd><code>repo · workflow · admin:repo_hook</code></dd>
          </div>
          <div>
            <dt>Alta</dt>
            <dd>{{ account.createdAt ? (account.createdAt | date: 'shortDate') : '—' }}</dd>
          </div>
        </dl>
        @if (demoMode) {
          <p class="account-card__demo">
            <mat-icon>science</mat-icon>
            Modo demostración — PAT simulado · datos de cloudops-org
          </p>
        } @else {
          <p class="account-card__secure">
            <mat-icon>lock</mat-icon>
            Token almacenado cifrado · no visible tras el alta
          </p>
        }
      </div>
    }
  `,
  styles: `
    .account-card {
      padding: 1rem 0;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text-muted) 8%, transparent);
      margin-bottom: 0.25rem;
    }
    .account-card__head {
      display: flex;
      align-items: flex-start;
      gap: 0.85rem;
      margin-bottom: 0.85rem;
    }
    .account-card__identity {
      flex: 1;
      min-width: 0;
      h3 { margin: 0; font-size: 1.05rem; }
    }
    .account-card__avatar { border-radius: 50%; flex-shrink: 0; }
    .account-card__user { margin: 0.2rem 0 0; font-size: 0.85rem; color: var(--app-text-muted); }
    .account-card__org {
      display: flex; align-items: center; gap: 0.2rem;
      margin: 0.25rem 0 0; font-size: 0.76rem; color: var(--app-accent);
      mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; }
    }
    .account-card__grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.55rem 1rem;
      margin: 0;
      dt { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.03em; color: var(--app-text-muted); }
      dd {
        margin: 0.12rem 0 0; font-size: 0.84rem; font-weight: 500;
        code { font-size: 0.68rem; font-weight: 600; }
      }
    }
    .account-card__demo, .account-card__secure {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0.75rem 0 0;
      font-size: 0.76rem;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    }
    .account-card__demo { color: var(--app-primary, #1565c0); }
    .account-card__secure { color: var(--app-text-muted); }
    @media (max-width: 720px) {
      .account-card__grid { grid-template-columns: repeat(2, 1fr); }
    }
  `,
})
export class GithubAccountCardComponent {
  @Input() account: GithubAccount | null = null
  @Input() demoMode = false

  statusBadge = (): string => {
    const s = this.account?.status
    if (s === 'connected') return 'SUCCESS'
    if (s === 'pending') return 'PENDING'
    if (s === 'invalid') return 'ERROR'
    return 'STOPPED'
  }
}
