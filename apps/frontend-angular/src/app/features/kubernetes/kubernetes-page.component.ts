import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { bindSectionTabs } from '../../core/routing/section-tab.util'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { KubernetesService } from '../../core/services/kubernetes.service'
import { DiscoveryService } from '../../core/services/discovery.service'
import { RealtimeService } from '../../core/services/realtime.service'
import { ToastService } from '../../core/services/toast.service'
import { createPageLoader } from '../../core/utils/page-load.util'
import { mergeKubernetesPageData } from '../infrastructure/infrastructure.demo'
import { InfrastructureActionService } from '../infrastructure/infrastructure-action.service'
import { InfrastructureWorkspaceComponent } from '../infrastructure/infrastructure-workspace.component'
import { buildKubernetesWorkspace } from '../infrastructure/infrastructure-workspace.builders'

@Component({
  selector: 'app-kubernetes-page',
  standalone: true,
  imports: [InfrastructureWorkspaceComponent, ErrorStateComponent],
  template: `
    @if (page.error()) {
      <app-error-state [message]="page.error()!" (retry)="load()" />
    } @else {
      <app-infrastructure-workspace
        [config]="workspace()"
        [loading]="page.loading()"
        [tabIndex]="tabIndex()"
        (actionClick)="handleHeader($event)"
      />
    }
  `,
})
export class KubernetesPageComponent implements OnInit {
  private readonly kubernetes = inject(KubernetesService)
  private readonly discovery = inject(DiscoveryService)
  private readonly realtime = inject(RealtimeService)
  private readonly infraActions = inject(InfrastructureActionService)
  private readonly toast = inject(ToastService)
  private readonly route = inject(ActivatedRoute)
  private readonly destroyRef = inject(DestroyRef)

  readonly page = createPageLoader(true)
  readonly tabIndex = signal(0)
  readonly data = signal<Record<string, unknown> | null>(null)

  readonly workspace = computed(() => buildKubernetesWorkspace(this.data() ?? {}))

  private readonly actionCtx = { moduleId: 'kubernetes', logo: 'kubernetes' as const }

  ngOnInit(): void {
    bindSectionTabs(this.route, this.destroyRef, this.tabIndex, 'kubernetes')
    this.realtime.connect()
    this.realtime.on('discovery.updated', () => this.load())
    this.load()
  }

  load = (): void => {
    this.page.run(this.kubernetes.pageData(), {
      onSuccess: (d) => this.data.set(mergeKubernetesPageData(d)),
      errorMessage: 'Error al cargar datos Kubernetes',
    })
  }

  handleHeader = (label: string): void => {
    if (label === 'Actualizar clusters') {
      this.infraActions.runModuleHeaderAction(label, this.actionCtx, () => this.runDiscovery())
      return
    }
    if (label === 'Aplicar manifiesto') {
      this.infraActions.runModuleHeaderAction(label, this.actionCtx, () => this.load())
      return
    }
    this.infraActions.runModuleHeaderAction(label, this.actionCtx, () => this.load())
  }

  private runDiscovery = (): void => {
    this.discovery.discoverKubernetes('vps-prod-k8s-master-01').subscribe({
      next: () => {
        this.toast.success('Discovery Kubernetes completado')
        this.load()
      },
      error: () => this.load(),
    })
  }
}
