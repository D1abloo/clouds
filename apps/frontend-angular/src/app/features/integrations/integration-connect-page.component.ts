import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { IntegrationConnectionService } from '../../core/services/integration-connection.service'

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
  private readonly connections = inject(IntegrationConnectionService)

  ngOnInit(): void {
    const provider = this.route.snapshot.paramMap.get('provider') ?? ''
    const fallback = this.connections.fallbackRouteForAlias(provider)

    this.connections.openForProviderAlias(provider).subscribe(() => {
      void this.router.navigateByUrl(fallback)
    })
  }
}
