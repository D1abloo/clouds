import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core'
import { delay, finalize, of, timeout } from 'rxjs'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import type { PlatformModuleConfig } from '../../shared/platform/platform-module.models'
import { InfrastructureActionService } from './infrastructure-action.service'
import { InfrastructureWorkspaceComponent } from './infrastructure-workspace.component'
import { resolveModuleLogos } from './infrastructure-row-enrichment'
import { platformConfigToWorkspace } from './infrastructure-workspace.util'

@Component({
  selector: 'app-infrastructure-module-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InfrastructureWorkspaceComponent, ErrorStateComponent],
  template: `
    @if (error()) {
      <app-error-state [message]="error()!" (retry)="load()" />
    } @else {
      <app-infrastructure-workspace
        [config]="workspace()"
        [loading]="loading()"
        (actionClick)="handleAction($event)"
      />
    }
  `,
})
export class InfrastructureModulePageComponent implements OnInit {
  readonly config = input.required<PlatformModuleConfig>()

  private readonly infraActions = inject(InfrastructureActionService)

  readonly loading = signal(true)
  readonly error = signal<string | null>(null)

  readonly workspace = computed(() => platformConfigToWorkspace(this.config()))

  ngOnInit(): void {
    this.load()
  }

  load = (): void => {
    this.loading.set(true)
    this.error.set(null)
    of(true)
      .pipe(delay(420), timeout(8000), finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => this.error.set(null),
        error: () => this.error.set('No se pudo cargar el módulo de infraestructura'),
      })
  }

  handleAction = (label: string): void => {
    const cfg = this.config()
    this.infraActions.runModuleHeaderAction(label, {
      moduleId: cfg.id,
      ...resolveModuleLogos(cfg.id),
    }, () => this.load())
  }
}
