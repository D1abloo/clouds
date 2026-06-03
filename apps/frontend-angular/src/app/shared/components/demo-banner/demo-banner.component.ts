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
    @if (demo.demoMode()) {
      <div class="demo-banner animate-fade-in" role="status" aria-label="Demo mode active">
        <div class="demo-banner__left">
          <div class="demo-banner__icon"><mat-icon>science</mat-icon></div>
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
            <button mat-stroked-button type="button" (click)="demo.loadDemo()">Load demo data</button>
            <button mat-stroked-button type="button" (click)="demo.resetDemo()">Reset demo</button>
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
      gap: 0.75rem;
      padding: 0.65rem 1rem;
      margin-bottom: 1.25rem;
      border-radius: var(--app-radius-md);
      background: linear-gradient(135deg, color-mix(in srgb, #3b82f6 10%, var(--app-card)), color-mix(in srgb, #10b981 8%, var(--app-card)));
      box-shadow: var(--app-shadow-xs);
    }
    .demo-banner__left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .demo-banner__icon {
      width: 36px; height: 36px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      background: color-mix(in srgb, #3b82f6 15%, transparent);
      mat-icon { color: #3b82f6; font-size: 1.25rem; }
    }
    strong { display: block; font-size: 0.88rem; }
    span, small { display: block; color: var(--app-text-muted); font-size: 0.76rem; }
    .demo-banner__actions { display: flex; gap: 0.5rem; align-items: center; }
  `,
})
export class DemoBannerComponent implements OnInit {
  readonly demo = inject(DemoService)

  ngOnInit(): void {
    this.demo.refreshStatus()
  }
}
