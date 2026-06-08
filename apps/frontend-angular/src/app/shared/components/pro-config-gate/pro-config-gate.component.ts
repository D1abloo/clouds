import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core'
import { ProModeService } from '../../../core/services/pro-mode.service'
import { ConnectionRequiredComponent } from '../connection-required/connection-required.component'

const MODULE_COPY: Record<string, { title: string; description: string; actionLabel: string; actionRoute: string }> = {
  AWS: { title: 'Sin cuentas conectadas', description: 'Añade una cuenta para comenzar.', actionLabel: 'Añadir cuenta AWS', actionRoute: '/cloud/aws/accounts' },
  GCP: { title: 'Sin cuentas conectadas', description: 'Añade una cuenta para comenzar.', actionLabel: 'Añadir cuenta GCP', actionRoute: '/cloud/gcp/accounts' },
  Azure: { title: 'Sin cuentas conectadas', description: 'Añade una cuenta para comenzar.', actionLabel: 'Añadir cuenta Azure', actionRoute: '/cloud/azure/accounts' },
  GitHub: { title: 'Sin cuentas conectadas', description: 'Añade una cuenta para comenzar.', actionLabel: 'Conectar GitHub', actionRoute: '/repositories/github' },
  GitLab: { title: 'Sin cuentas conectadas', description: 'Añade una cuenta para comenzar.', actionLabel: 'Conectar GitLab', actionRoute: '/repositories/gitlab' },
  Jenkins: { title: 'Sin cuentas conectadas', description: 'Añade una cuenta para comenzar.', actionLabel: 'Configurar Jenkins', actionRoute: '/jenkins/jobs' },
}

@Component({
  selector: 'app-pro-config-gate',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConnectionRequiredComponent],
  template: `
    @if (requiresConfig()) {
      <app-connection-required
        [title]="copy().title"
        [description]="copy().description"
        [actionLabel]="copy().actionLabel"
        [actionRoute]="copy().actionRoute"
      />
    } @else {
      <ng-content />
    }
  `,
})
export class ProConfigGateComponent {
  private readonly pro = inject(ProModeService)

  readonly module = input.required<string>()
  readonly liveData = input(false)

  readonly requiresConfig = computed(() => this.pro.proMode() && !this.liveData())

  readonly copy = computed(() => {
    const key = this.module()
    return (
      MODULE_COPY[key] ?? {
        title: 'Sin cuentas conectadas',
        description: 'Añade una cuenta para comenzar.',
        actionLabel: 'Añadir cuenta',
        actionRoute: '/admin/settings',
      }
    )
  })
}
