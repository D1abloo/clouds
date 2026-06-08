import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { bindSectionTabs } from '../../core/routing/section-tab.util'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { DockerService } from '../../core/services/docker.service'
import { DiscoveryService } from '../../core/services/discovery.service'
import { RealtimeService } from '../../core/services/realtime.service'
import { ToastService } from '../../core/services/toast.service'
import { createPageLoader } from '../../core/utils/page-load.util'
import { ProModeService } from '../../core/services/pro-mode.service'
import { allowsDemoDataFrom } from '../../core/utils/demo-runtime.util'
import { mergeDockerPageData } from '../infrastructure/infrastructure.demo'
import { InfrastructureActionService } from '../infrastructure/infrastructure-action.service'
import { InfrastructureWorkspaceComponent } from '../infrastructure/infrastructure-workspace.component'
import { buildDockerWorkspace } from '../infrastructure/infrastructure-workspace.builders'

@Component({
  selector: 'app-docker-page',
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
export class DockerPageComponent implements OnInit {
  private readonly pro = inject(ProModeService)
  private readonly docker = inject(DockerService)
  private readonly discovery = inject(DiscoveryService)
  private readonly realtime = inject(RealtimeService)
  private readonly infraActions = inject(InfrastructureActionService)
  private readonly toast = inject(ToastService)
  private readonly route = inject(ActivatedRoute)
  private readonly destroyRef = inject(DestroyRef)

  readonly page = createPageLoader(true)
  readonly tabIndex = signal(0)
  readonly data = signal<Record<string, unknown> | null>(null)

  readonly workspace = computed(() => buildDockerWorkspace(this.data() ?? {}))

  private readonly actionCtx = { moduleId: 'docker', logo: 'docker' as const }

  ngOnInit(): void {
    bindSectionTabs(this.route, this.destroyRef, this.tabIndex, 'docker')
    this.realtime.connect()
    this.realtime.on('discovery.updated', () => this.load())
    this.load()
  }

  load = (): void => {
    this.page.run(this.docker.pageData(), {
      onSuccess: (d) => this.data.set(mergeDockerPageData(d, allowsDemoDataFrom(this.pro))),
      errorMessage: 'Error al cargar datos Docker',
    })
  }

  handleHeader = (label: string): void => {
    if (label === 'Actualizar inventario') {
      this.infraActions.runModuleHeaderAction(label, this.actionCtx, () => this.runDiscovery())
      return
    }
    if (label === 'Iniciar contenedor') {
      this.infraActions.runModuleHeaderAction(label, this.actionCtx, () => this.runStartDemo())
      return
    }
    this.infraActions.runModuleHeaderAction(label, this.actionCtx, () => this.load())
  }

  private runDiscovery = (): void => {
    this.discovery.discoverDocker('vps-prod-docker-01').subscribe({
      next: () => {
        this.toast.success('Discovery Docker completado')
        this.load()
      },
      error: () => this.load(),
    })
  }

  private runStartDemo = (): void => {
    this.discovery.discoverDocker('vps-prod-docker-01').subscribe({
      next: () => this.load(),
      error: () => this.load(),
    })
  }
}
