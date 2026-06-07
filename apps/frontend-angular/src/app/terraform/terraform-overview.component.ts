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
              Proyectos guardados · despliegue · automatización
              @if (activeProjectName) {
                <span class="tf-ops__active">· {{ activeProjectName }}</span>
              }
              @if (demoMode) {
                <span class="tf-ops__demo">Demo</span>
              }
            </p>
          </div>
        </div>
      </header>

      <div class="tf-ops__actions" aria-label="Acciones rápidas">
        <button type="button" class="tf-ops__action" (click)="newProject.emit()">
          <mat-icon>create_new_folder</mat-icon>
          Nuevo proyecto
        </button>
        <button type="button" class="tf-ops__action" (click)="saveProject.emit()">
          <mat-icon>save</mat-icon>
          Guardar
        </button>
        <button type="button" class="tf-ops__action" (click)="openAutomate.emit()">
          <mat-icon>schedule</mat-icon>
          Automatizar
        </button>
        <button type="button" class="tf-ops__action" (click)="openLaunches.emit()">
          <mat-icon>rocket_launch</mat-icon>
          Lanzamientos
        </button>
        <button type="button" class="tf-ops__action tf-ops__action--primary" (click)="openDeploy.emit()">
          <mat-icon>code</mat-icon>
          Desplegar
        </button>
      </div>

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
    :host {
      display: block;
      width: 100%;
      min-width: 0;
    }

    .tf-ops {
      --tf: #844fba;
      --tf-soft: color-mix(in srgb, #844fba 12%, transparent);
      width: 100%;
      box-sizing: border-box;
      padding: clamp(0.35rem, 1vw, 0.5rem) 0 clamp(0.45rem, 1.2vw, 0.6rem);
      border-radius: 0;
      background: transparent;
      border: none;
      outline: none;
      box-shadow: none;
      filter: none;
      margin: 0;
    }
    .tf-ops__head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 0.5rem;
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
    .tf-ops__active {
      font-weight: 600;
      color: var(--tf);
    }
    .tf-ops__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      margin-bottom: 0.75rem;
    }
    .tf-ops__action {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.4rem 0.7rem;
      border: none;
      border-radius: var(--app-radius-md);
      background: var(--app-elevated);
      font: inherit;
      font-size: 0.72rem;
      font-weight: 600;
      color: inherit;
      cursor: pointer;
    }
    .tf-ops__action mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: var(--app-text-muted); }
    .tf-ops__action--primary {
      background: color-mix(in srgb, #844fba 14%, var(--app-elevated));
      color: #844fba;
    }
    .tf-ops__action--primary mat-icon { color: #844fba; }
    .tf-ops__action:hover { background: color-mix(in srgb, #844fba 10%, var(--app-elevated)); }
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
  @Input() projectsCount = 0
  @Input() automationsCount = 0
  @Input() activeProjectName = ''

  readonly reviewPlans = output<void>()
  readonly newProject = output<void>()
  readonly saveProject = output<void>()
  readonly openAutomate = output<void>()
  readonly openDeploy = output<void>()
  readonly openLaunches = output<void>()

}
