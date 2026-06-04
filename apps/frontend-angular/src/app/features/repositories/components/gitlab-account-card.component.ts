import { Component, Input } from '@angular/core'
import { DatePipe } from '@angular/common'
import { MatIconModule } from '@angular/material/icon'
import { BrandLogoComponent } from '../../../shared/components/brand-logo/brand-logo.component'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import type { GitlabAccount } from '../utils/gitlab-demo-catalog'

@Component({
  selector: 'app-gitlab-account-card',
  standalone: true,
  imports: [DatePipe, MatIconModule, BrandLogoComponent, StatusBadgeComponent],
  template: `
    @if (account) {
      <div class="account-card">
        <div class="account-card__head">
          <div class="account-card__logo">
            <app-brand-logo logo="gitlab" size="lg" />
          </div>
          <div>
            <h3>{{ account.label }}</h3>
            <p class="account-card__user">&#64;{{ account.username }}</p>
          </div>
          <app-status-badge [value]="statusBadge()" />
        </div>
        <dl class="account-card__grid">
          <div>
            <dt>Instancia</dt>
            <dd>gitlab.cloudops.local (demo)</dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>{{ account.statusLabel }}</dd>
          </div>
          <div>
            <dt>Proyectos</dt>
            <dd>{{ projectCount }}</dd>
          </div>
          <div>
            <dt>Última sincronización</dt>
            <dd>{{ account.lastSyncAt ? (account.lastSyncAt | date: 'short') : 'Ahora' }}</dd>
          </div>
        </dl>
        @if (demoMode) {
          <p class="account-card__demo">
            <mat-icon>science</mat-icon>
            Modo demostración — sin credenciales reales de GitLab
          </p>
        }
      </div>
    }
  `,
  styles: `
    .account-card {
      padding: 1rem 1.15rem;
      margin-bottom: 1rem;
      border-radius: var(--app-radius-lg);
      background: linear-gradient(135deg, color-mix(in srgb, #fc6d26 8%, var(--app-card)), var(--app-card));
      border: 1px solid color-mix(in srgb, #fc6d26 25%, transparent);
    }
    .account-card__head { display: flex; gap: 0.85rem; align-items: flex-start; }
    .account-card__logo {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      padding: 6px;
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 2px 8px color-mix(in srgb, #fc6d26 25%, transparent);
      flex-shrink: 0;
    }
    .account-card__logo ::ng-deep .brand-logo { width: 2rem; height: 2rem; }
    h3 { margin: 0; font-size: 1rem; }
    .account-card__user { margin: 0.2rem 0 0; font-size: 0.85rem; color: var(--app-text-muted); }
    .account-card__grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem 1rem;
      margin: 0.85rem 0 0;
      dt { font-size: 0.68rem; color: var(--app-text-muted); text-transform: uppercase; }
      dd { margin: 0.15rem 0 0; font-size: 0.85rem; }
    }
    .account-card__demo {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0.75rem 0 0;
      font-size: 0.78rem;
      color: #c2410c;
    }
  `,
})
export class GitlabAccountCardComponent {
  @Input() account: GitlabAccount | null = null
  @Input() demoMode = true
  @Input() projectCount = 0

  statusBadge = (): string => (this.account?.status === 'connected' ? 'SUCCESS' : 'STOPPED')
}
