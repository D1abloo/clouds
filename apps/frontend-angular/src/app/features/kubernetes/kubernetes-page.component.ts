import { Component, inject, signal } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTabsModule } from '@angular/material/tabs'
import { DiscoveryService } from '../../core/services/discovery.service'
import { ToastService } from '../../core/services/toast.service'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'

@Component({
  selector: 'app-kubernetes-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    LoadingStateComponent,
  ],
  template: `
    <div class="page-container">
      <header class="page-header">
        <h1>Kubernetes</h1>
        <p>Cluster and system discovery on remote hosts</p>
      </header>

      <div class="table-card" style="padding: 1.25rem">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Host reference</mat-label>
          <input matInput [formControl]="hostRef" />
        </mat-form-field>

        <div class="actions">
          <button
            mat-flat-button
            color="primary"
            type="button"
            [disabled]="loading() || !hostRef.value"
            (click)="handleK8s()"
          >
            Discover Kubernetes
          </button>
          <button
            mat-stroked-button
            type="button"
            [disabled]="loading() || !hostRef.value"
            (click)="handleSystem()"
          >
            Discover system info
          </button>
        </div>

        @if (loading()) {
          <app-loading-state />
        } @else if (result()) {
          <pre class="result mono">{{ result() }}</pre>
        }
      </div>
    </div>
  `,
  styles: `
    .full-width { width: 100%; max-width: 480px; }
    .actions { display: flex; gap: 0.75rem; flex-wrap: wrap; margin: 1rem 0; }
    .result {
      padding: 1rem;
      background: var(--app-surface);
      border-radius: 8px;
      overflow: auto;
      max-height: 480px;
    }
  `,
})
export class KubernetesPageComponent {
  private readonly discovery = inject(DiscoveryService)
  private readonly toast = inject(ToastService)

  readonly hostRef = new FormControl('', { nonNullable: true })
  readonly loading = signal(false)
  readonly result = signal<string | null>(null)

  handleK8s = (): void => this.runDiscovery('k8s')
  handleSystem = (): void => this.runDiscovery('system')

  private runDiscovery = (mode: 'k8s' | 'system'): void => {
    const ref = this.hostRef.value.trim()
    if (!ref) return
    this.loading.set(true)
    this.result.set(null)
    const obs =
      mode === 'k8s'
        ? this.discovery.discoverKubernetes(ref)
        : this.discovery.discoverSystem(ref)
    obs.subscribe({
      next: (data) => {
        this.result.set(JSON.stringify(data, null, 2))
        this.loading.set(false)
        this.toast.success('Discovery completed')
      },
      error: () => {
        this.toast.error('Discovery failed')
        this.loading.set(false)
      },
    })
  }
}
