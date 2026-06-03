import { Component, inject, signal } from '@angular/core'
import { finalize } from 'rxjs'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { DiscoveryService } from '../../core/services/discovery.service'
import { ToastService } from '../../core/services/toast.service'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'

@Component({
  selector: 'app-docker-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
  ],
  template: `
    <div class="page-container">
      <header class="page-header">
        <h1>Docker</h1>
        <p>Discover containers on VPS hosts</p>
      </header>

      <div class="table-card" style="padding: 1.25rem">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Host reference (VPS ID)</mat-label>
          <input matInput [formControl]="hostRef" placeholder="vps-uuid" />
        </mat-form-field>
        <button
          mat-flat-button
          color="primary"
          type="button"
          [disabled]="discovering() || !hostRef.value"
          (click)="handleDiscover()"
        >
          <mat-icon>search</mat-icon>
          Discover containers
        </button>

        @if (discovering()) {
          <app-loading-state message="Running Docker discovery..." />
        } @else if (discoverError()) {
          <app-error-state [message]="discoverError()!" (retry)="handleDiscover()" />
        } @else if (result()) {
          <pre class="result mono">{{ result() }}</pre>
        } @else {
          <app-empty-state
            icon="view_in_ar"
            title="No discovery results"
            description="Enter a VPS host reference (e.g. demo-vps-001) and run discovery."
          />
        }
      </div>
    </div>
  `,
  styles: `
    .full-width { width: 100%; max-width: 480px; }
    .result {
      margin-top: 1rem;
      padding: 1rem;
      background: var(--app-surface);
      border-radius: 8px;
      overflow: auto;
      max-height: 400px;
    }
  `,
})
export class DockerPageComponent {
  private readonly discovery = inject(DiscoveryService)
  private readonly toast = inject(ToastService)

  readonly hostRef = new FormControl('', { nonNullable: true })
  readonly discovering = signal(false)
  readonly discoverError = signal<string | null>(null)
  readonly result = signal<string | null>(null)

  handleDiscover = (): void => {
    const ref = this.hostRef.value.trim()
    if (!ref) return
    this.discovering.set(true)
    this.discoverError.set(null)
    this.result.set(null)
    this.discovery
      .discoverDocker(ref)
      .pipe(finalize(() => this.discovering.set(false)))
      .subscribe({
        next: (data) => {
          this.result.set(JSON.stringify(data, null, 2))
          this.toast.success('Docker discovery completed')
        },
        error: () => {
          this.discoverError.set('Docker discovery failed. Use a valid VPS id (e.g. demo-vps-001).')
          this.toast.error('Docker discovery failed')
        },
      })
  }
}
