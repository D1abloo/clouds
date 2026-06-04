import { Component, Input, output } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { BrandLogoComponent } from '../shared/components/brand-logo/brand-logo.component'
import type { TerraformPageSummary } from './terraform.demo'

export interface TerraformProviderChip {
  provider: string
  connected: boolean
  count: number
}

@Component({
  selector: 'app-terraform-overview',
  standalone: true,
  imports: [MatIconModule, MatProgressBarModule, BrandLogoComponent],
  template: `
    <section class="tf-ops" aria-label="Centro de operaciones Terraform">
      <header class="tf-ops__head">
        <div class="tf-ops__brand">
          <app-brand-logo logo="terraform" size="md" />
          <div>
            <h2>Centro de operaciones IaC</h2>
            <p class="tf-ops__meta">
              Workspaces aislados · plan → revisión → apply
              @if (demoMode) {
                <span class="tf-ops__demo">Demo</span>
              }
            </p>
          </div>
        </div>
        <div class="tf-ops__kpis">
          @for (k of kpis; track k.id) {
            <div class="kpi" [class]="'kpi--' + k.tone">
              <mat-icon>{{ k.icon }}</mat-icon>
              <span class="kpi__val">{{ k.value }}</span>
              <span class="kpi__lbl">{{ k.label }}</span>
            </div>
          }
        </div>
      </header>

      <div class="tf-ops__providers" aria-label="Estado de proveedores">
        @for (p of providers; track p.provider) {
          <div class="prov" [class.prov--ok]="p.connected" [class.prov--off]="!p.connected">
            <span class="prov__dot" aria-hidden="true"></span>
            <span class="prov__name">{{ p.provider }}</span>
            @if (p.connected) {
              <span class="prov__meta">{{ p.count }} cuenta{{ p.count === 1 ? '' : 's' }}</span>
            } @else {
              <span class="prov__meta prov__meta--warn">Sin conectar</span>
            }
          </div>
        }
      </div>

      @if (summary.plans > 0) {
        <div class="tf-ops__banner" role="status">
          <mat-icon>pending_actions</mat-icon>
          <span
            ><strong>{{ summary.plans }}</strong> plan{{ summary.plans === 1 ? '' : 'es' }} pendiente{{ summary.plans === 1 ? '' : 's' }} de revisión o apply</span
          >
          <button type="button" class="tf-ops__banner-btn" (click)="reviewPlans.emit()">Revisar</button>
        </div>
      }
    </section>
  `,
  styles: `
    .tf-ops {
      --tf: #844fba;
      --tf-soft: color-mix(in srgb, #844fba 12%, transparent);
      padding: 1rem 1.15rem;
      border-radius: var(--app-radius-lg);
      background: var(--app-card);
      border: none;
      outline: none;
      box-shadow: none;
      filter: none;
      margin-bottom: 1rem;
    }
    .tf-ops__head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 0.85rem;
    }
    .tf-ops__brand {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
    }
    .tf-ops__brand h2 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 700;
    }
    .tf-ops__meta {
      margin: 0.2rem 0 0;
      font-size: 0.78rem;
      color: var(--app-text-muted);
    }
    .tf-ops__demo {
      margin-left: 0.35rem;
      padding: 0.08rem 0.4rem;
      border-radius: 4px;
      font-size: 0.62rem;
      font-weight: 700;
      text-transform: uppercase;
      background: var(--tf-soft);
      color: var(--tf);
    }
    .tf-ops__kpis {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
    }
    .kpi {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.1rem;
      min-width: 72px;
      padding: 0.45rem 0.55rem;
      border-radius: var(--app-radius-md);
      background: var(--app-elevated);
    }
    .kpi mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: var(--app-text-muted);
    }
    .kpi__val {
      font-size: 1.05rem;
      font-weight: 700;
      line-height: 1.1;
    }
    .kpi__lbl {
      font-size: 0.62rem;
      color: var(--app-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .kpi--active mat-icon,
    .kpi--active .kpi__val {
      color: var(--tf);
    }
    .kpi--warn mat-icon,
    .kpi--warn .kpi__val {
      color: #b45309;
    }
    .tf-ops__providers {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .prov {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.65rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 600;
      background: var(--app-elevated);
      color: var(--app-text-muted);
    }
    .prov__dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #94a3b8;
    }
    .prov--ok .prov__dot {
      background: #22c55e;
    }
    .prov--off .prov__dot {
      background: #f87171;
    }
    .prov__meta {
      font-size: 0.65rem;
      font-weight: 500;
      color: var(--app-text-muted);
    }
    .prov__meta--warn {
      color: #b45309;
    }
    .tf-ops__banner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.85rem;
      padding: 0.55rem 0.75rem;
      border-radius: var(--app-radius-md);
      background: color-mix(in srgb, #f59e0b 10%, var(--app-elevated));
      font-size: 0.78rem;
    }
    .tf-ops__banner mat-icon {
      color: #d97706;
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
    }
    .tf-ops__banner-btn {
      margin-left: auto;
      border: none;
      background: transparent;
      font: inherit;
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--tf);
      cursor: pointer;
      text-decoration: underline;
    }
  `,
})
export class TerraformOverviewComponent {
  @Input({ required: true }) summary!: TerraformPageSummary
  @Input() demoMode = true
  @Input() providers: TerraformProviderChip[] = []

  readonly reviewPlans = output<void>()

  get kpis(): { id: string; label: string; value: string; icon: string; tone: string }[] {
    const s = this.summary
    return [
      { id: 'ws', label: 'Workspaces', value: String(s.workspaces), icon: 'folder', tone: 'default' },
      { id: 'runs', label: 'Runs', value: String(s.runs), icon: 'play_circle', tone: 'default' },
      { id: 'plans', label: 'Planes', value: String(s.plans), icon: 'description', tone: s.plans > 0 ? 'active' : 'default' },
      { id: 'applies', label: 'Applies', value: String(s.applies), icon: 'check_circle', tone: 'default' },
      { id: 'errors', label: 'Errores', value: String(s.errors), icon: 'error', tone: s.errors > 0 ? 'warn' : 'default' },
    ]
  }
}
