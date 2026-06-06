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
        <div class="demo-banner__content">
          <div class="demo-banner__icon"><mat-icon>science</mat-icon></div>
          <div class="demo-banner__text">
            <div class="demo-banner__title-row">
              <strong>Modo demo</strong>
              <span class="demo-banner__pill">Datos simulados</span>
            </div>
            <p>Estás explorando datos de demostración. Algunas métricas y recursos pueden diferir de tu entorno real.</p>
            @if (demo.status(); as s) {
              <div class="demo-banner__stats">
                <span><strong>{{ s.instances }}</strong> instancias</span>
                <span><strong>{{ s.vps }}</strong> VPS</span>
                <span><strong>{{ s.alerts }}</strong> alertas</span>
              </div>
            }
          </div>
        </div>
        <div class="demo-banner__actions">
          @if (demo.loading()) {
            <mat-spinner diameter="22" />
          } @else {
            <button mat-flat-button color="primary" type="button" (click)="demo.loadDemo()">
              <mat-icon>cloud_download</mat-icon>
              Cargar datos demo
            </button>
            <button mat-stroked-button type="button" (click)="demo.resetDemo()">
              <mat-icon>restart_alt</mat-icon>
              Reiniciar demo
            </button>
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
      padding: 1rem 1.25rem;
      margin-bottom: 1.35rem;
      border-radius: var(--app-radius-lg);
      background: linear-gradient(
        135deg,
        color-mix(in srgb, #6366f1 10%, var(--app-card)),
        color-mix(in srgb, #22d3ee 8%, var(--app-card)),
        color-mix(in srgb, #10b981 6%, var(--app-card))
      );
      box-shadow: var(--app-shadow-md);
    }
    .demo-banner__content {
      display: flex;
      align-items: flex-start;
      gap: 0.9rem;
      flex: 1;
      min-width: min(100%, 280px);
    }
    .demo-banner__icon {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, #3b82f6 14%, transparent);
      box-shadow: 0 4px 12px color-mix(in srgb, #3b82f6 18%, transparent);
      mat-icon { color: #3b82f6; font-size: 1.3rem; width: 1.3rem; height: 1.3rem; }
    }
    .demo-banner__title-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      strong { font-size: 0.95rem; font-weight: 700; }
    }
    .demo-banner__pill {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      background: color-mix(in srgb, #3b82f6 12%, transparent);
      color: #3b82f6;
    }
    p {
      margin: 0.3rem 0 0;
      font-size: 0.82rem;
      color: var(--app-text-muted);
      line-height: 1.45;
      max-width: 520px;
    }
    .demo-banner__stats {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem 1.25rem;
      margin-top: 0.55rem;
      span {
        font-size: 0.75rem;
        color: var(--app-text-muted);
        strong { color: var(--app-text); font-weight: 700; margin-right: 0.2rem; }
      }
    }
    .demo-banner__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
      button { display: inline-flex; align-items: center; gap: 0.35rem; }
    }
  `,
})
export class DemoBannerComponent implements OnInit {
  readonly demo = inject(DemoService)

  ngOnInit(): void {
    this.demo.refreshStatus()
  }
}
