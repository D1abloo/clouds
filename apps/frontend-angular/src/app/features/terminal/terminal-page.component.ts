import { Component, inject, OnInit, signal, DestroyRef } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ActivatedRoute } from '@angular/router'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatSelectModule } from '@angular/material/select'
import { MatButtonModule } from '@angular/material/button'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { TerminalPlaceholderComponent } from '../../shared/components/terminal-placeholder/terminal-placeholder.component'
import { VpsService } from '../../core/services/vps.service'
import { VpsHost } from '../../core/models/api.models'
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component'
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component'
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component'
import { createPageLoader } from '../../core/utils/page-load.util'

@Component({
  selector: 'app-terminal-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    TerminalPlaceholderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="page-container">
      <header class="page-header">
        <h1>Terminal</h1>
        <p>Secure shell sessions to VPS hosts</p>
      </header>

      @if (page.loading()) {
        <app-loading-state message="Loading hosts..." />
      } @else if (page.error()) {
        <app-error-state [message]="page.error()!" (retry)="loadHosts()" />
      } @else if (hosts().length === 0) {
        <app-empty-state
          title="No VPS hosts"
          description="Add a VPS host or run npm run seed:demo to load demo data."
        />
      } @else {
        <div class="terminal-controls">
          <mat-form-field appearance="outline">
            <mat-label>Select VPS host</mat-label>
            <mat-select [formControl]="hostControl">
              @for (host of hosts(); track host.id) {
                <mat-option [value]="host.id">{{ host.name }} ({{ host.host }})</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <button mat-flat-button color="primary" type="button" disabled>
            Connect (WebSocket)
          </button>
        </div>
        <app-terminal-placeholder [hostRef]="selectedHostRef()" />
      }
    </div>
  `,
  styles: `
    .terminal-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: center;
      margin-bottom: 1rem;
    }
    mat-form-field { min-width: 280px; }
  `,
})
export class TerminalPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly vps = inject(VpsService)
  private readonly destroyRef = inject(DestroyRef)

  readonly hostControl = new FormControl('', { nonNullable: true })
  readonly page = createPageLoader(true)
  readonly hosts = signal<VpsHost[]>([])

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadHosts())
  }

  loadHosts = (): void => {
    const routeId = this.route.snapshot.paramMap.get('vpsId')
    this.page.run(this.vps.list(), {
      onSuccess: (data) => {
        this.hosts.set(data)
        const initial = routeId ?? data[0]?.id ?? ''
        this.hostControl.setValue(initial)
      },
      errorMessage: 'Failed to load VPS hosts for terminal',
    })
  }

  selectedHostRef = (): string => {
    const id = this.hostControl.value
    const host = this.hosts().find((h) => h.id === id)
    return host?.host ?? id
  }
}
