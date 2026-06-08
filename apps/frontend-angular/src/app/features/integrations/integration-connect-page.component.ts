import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { providerConnectRoute } from '../repositories/integrations/repository-connection-wizard.config'

@Component({
  selector: 'app-integration-connect-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoadingStateComponent],
  template: `
    <div class="page-container" role="status" aria-live="polite">
      <app-loading-state label="Abriendo asistente de conexión…" />
    </div>
  `,
  styles: `
    .page-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 240px;
    }
  `,
})
export class IntegrationConnectPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)

  ngOnInit(): void {
    const provider = (this.route.snapshot.paramMap.get('provider') ?? '').toLowerCase()
    if (provider === 'github' || provider === 'gitlab') {
      void this.router.navigateByUrl(providerConnectRoute(provider))
      return
    }
    void this.router.navigateByUrl('/settings/integrations')
  }
}
