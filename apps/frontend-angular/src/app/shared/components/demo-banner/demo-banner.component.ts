import { Component, inject, OnInit } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { DemoService } from '../../../core/services/demo.service'

@Component({
  selector: 'app-demo-banner',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    @if (demo.demoMode) {
      <div class="demo-banner" role="status" aria-label="Demo mode active">
        <div class="demo-banner__content">
          <mat-icon>science</mat-icon>
          <div>
            <strong>Demo Mode</strong>
            <span>No real cloud resources — simulated data only</span>
            @if (demo.status(); as s) {
              <small>{{ s.instances }} instances · {{ s.vps }} VPS · {{ s.alerts }} alerts</small>
            }
          </div>
        </div>
        <div class="demo-banner__actions">
          @if (demo.loading()) {
            <mat-spinner diameter="22" />
          } @else {
            <button mat-stroked-button type="button" (click)="demo.loadDemo()">Cargar datos demo</button>
            <button mat-stroked-button type="button" color="warn" (click)="demo.resetDemo()">Reset demo</button>
          }
        </div>
      </div>
    }
  `,
  styles: `
    .demo-banner {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      border-radius: 8px;
      background: linear-gradient(90deg, rgba(59, 130, 246, 0.15), rgba(16, 185, 129, 0.12));
      border: 1px solid rgba(59, 130, 246, 0.35);
    }
    .demo-banner__content {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      mat-icon { color: #3b82f6; margin-top: 2px; }
      strong { display: block; font-size: 0.95rem; }
      span, small { display: block; color: var(--app-text-muted); font-size: 0.8rem; }
    }
    .demo-banner__actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
  `,
})
export class DemoBannerComponent implements OnInit {
  readonly demo = inject(DemoService)

  ngOnInit = (): void => this.demo.refreshStatus()
}
