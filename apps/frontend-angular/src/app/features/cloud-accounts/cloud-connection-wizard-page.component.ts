import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { CloudAccountWizardFacade } from './cloud-account-wizard.facade'
import { CloudConnectionWizardBodyComponent } from './cloud-connection-wizard-body.component'
import { resolveProviderAlias, type ConnectionProviderId } from './cloud-account-wizard.config'
import type { WizardInitOptions } from './cloud-account-wizard.facade'
import { IntegrationConnectionService } from '../../core/services/integration-connection.service'

@Component({
  selector: 'app-cloud-connection-wizard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CloudAccountWizardFacade],
  imports: [CloudConnectionWizardBodyComponent, MatButtonModule, MatIconModule, RouterLink],
  template: `
    <div class="wizard-page">
      <nav class="wizard-page__crumb" aria-label="Navegación">
        <a routerLink="/settings/integrations">
          <mat-icon>arrow_back</mat-icon> Integraciones
        </a>
      </nav>
      @if (ready) {
        <app-cloud-connection-wizard-body
          mode="page"
          [initOptions]="initOptions"
          (cancel)="handleCancel()"
          (completed)="handleCompleted($event)"
        />
      }
    </div>
  `,
  styles: `
    .wizard-page {
      padding: 1rem 1.25rem 2rem;
    }
    .wizard-page__crumb a {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      color: var(--app-text-muted);
      text-decoration: none;
      font-size: 0.85rem;
      margin-bottom: 1rem;
    }
    .wizard-page__crumb a:hover {
      color: var(--app-accent);
    }
  `,
})
export class CloudConnectionWizardPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly connections = inject(IntegrationConnectionService)

  readonly initOptions: WizardInitOptions
  readonly ready: boolean

  constructor() {
    const alias = this.route.snapshot.paramMap.get('provider') ?? ''
    const resolved = resolveProviderAlias(alias)

    if (alias === 'github' || alias === 'gitlab' || alias === 'vps' || alias === 'baremetal') {
      this.initOptions = {}
      this.ready = false
      return
    }

    const scope =
      resolved === 'KUBERNETES' || resolved === 'DOCKER'
        ? 'platform'
        : resolved && ['DIGITALOCEAN', 'HETZNER', 'LINODE', 'OVH'].includes(resolved)
          ? 'vps'
          : resolved && ['AWS', 'GCP', 'AZURE', 'CLOUDING'].includes(resolved)
            ? 'cloud'
            : 'all'

    this.initOptions = {
      suggestedProvider: resolved ?? undefined,
      scope,
      initialStep: resolved ? 'method' : 'provider',
    }
    this.ready = true
  }

  ngOnInit(): void {
    const alias = this.route.snapshot.paramMap.get('provider') ?? ''
    if (alias === 'github' || alias === 'gitlab') {
      void this.router.navigateByUrl(this.connections.fallbackRouteForAlias(alias))
      this.connections.openForProviderAlias(alias, { preferDialog: true }).subscribe()
      return
    }
    if (alias === 'vps' || alias === 'baremetal') {
      void this.router.navigateByUrl('/admin/infraestructura/vps/nuevo')
    }
  }

  handleCancel = (): void => {
    const alias = this.route.snapshot.paramMap.get('provider') ?? 'aws'
    void this.router.navigateByUrl(this.connections.fallbackRouteForAlias(alias))
  }

  handleCompleted = (res: { created: boolean; provider?: ConnectionProviderId }): void => {
    if (!res.created) return
    const alias = this.route.snapshot.paramMap.get('provider') ?? ''
    const dest = alias ? this.connections.fallbackRouteForAlias(alias) : '/settings/integrations'
    void this.router.navigateByUrl(dest)
  }
}
