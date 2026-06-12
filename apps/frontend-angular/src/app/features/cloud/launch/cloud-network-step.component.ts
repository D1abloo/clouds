import { ChangeDetectionStrategy, Component, input } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'

@Component({
  selector: 'app-cloud-network-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <section class="net-step">
      <header>
        <div>
          <p>Red y acceso</p>
          <h3>{{ title() }}</h3>
          <span>{{ hint() }}</span>
        </div>
        <span class="net-step__status" [class.net-step__status--warn]="hasIssue()">
          <mat-icon>{{ hasIssue() ? 'warning' : 'lan' }}</mat-icon>
          {{ hasIssue() ? issueTitle() : 'ready' }}
        </span>
      </header>
      <ng-content />
    </section>
  `,
  styles: `
    .net-step { display: grid; gap: 0.8rem; }
    header { display: flex; justify-content: space-between; gap: 0.8rem; align-items: flex-start; }
    p { margin: 0 0 0.15rem; color: var(--text-soft); font-size: 0.72rem; font-weight: 800; text-transform: uppercase; }
    h3 { margin: 0; font-size: 1.05rem; }
    header span { display: block; margin-top: 0.25rem; color: var(--text-muted); font-size: 0.82rem; }
    .net-step__status {
      display: inline-flex; align-items: center; gap: 0.35rem; max-width: 280px; margin: 0;
      padding: 0.35rem 0.6rem; border-radius: 10px; background: color-mix(in srgb, var(--success) 12%, transparent);
      color: var(--success); font-size: 0.72rem; font-weight: 800;
    }
    .net-step__status--warn { background: var(--danger-soft); color: var(--danger); }
    .net-step__status mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    @media (max-width: 760px) { header { flex-direction: column; } }
  `,
})
export class CloudNetworkStepComponent {
  readonly title = input('Configuración de red')
  readonly hint = input('VPC, subnet, firewall/security group y acceso público.')
  readonly issueTitle = input('')
  readonly hasIssue = input(false)
}
