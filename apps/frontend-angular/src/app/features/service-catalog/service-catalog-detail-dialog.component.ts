import { DatePipe } from '@angular/common'
import { Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import { CLOUD_FULL_LABELS } from './service-catalog.config'
import {
  SERVICE_CATALOG_CATEGORY_LABELS,
  SERVICE_CATALOG_CLOUD_LABELS,
  SERVICE_CATALOG_ENVIRONMENT_LABELS,
  SERVICE_CATALOG_STATUS_LABELS,
  type ServiceCatalogTemplate,
} from './service-catalog.demo'

export type ServiceCatalogDetailAction = 'edit' | 'launch' | null

export interface ServiceCatalogDetailDialogData {
  template: ServiceCatalogTemplate
}

export interface ServiceCatalogDetailDialogResult {
  action: ServiceCatalogDetailAction
  template: ServiceCatalogTemplate
}

@Component({
  selector: 'app-service-catalog-detail-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule, BrandLogoComponent],
  template: `
    <div class="sc-detail" [attr.data-cloud]="tpl.cloud" [attr.data-status]="tpl.status">
      <header class="sc-detail__head">
        <div class="sc-detail__head-main">
          <div class="sc-detail__head-row">
            <span class="sc-detail__eyebrow">Detalle de plantilla</span>
            <span class="sc-detail__status" [attr.data-status]="tpl.status">{{ statusLabel(tpl.status) }}</span>
          </div>
          <h2 mat-dialog-title>{{ tpl.name }}</h2>
          <div class="sc-detail__meta">
            <span class="sc-detail__meta-chip">
              <app-brand-logo [logo]="tpl.cloud" size="sm" />
              {{ cloudLabel(tpl.cloud) }}
            </span>
            <span class="sc-detail__meta-chip">
              <app-brand-logo [logo]="tpl.techLogo" size="sm" />
              {{ categoryLabel(tpl.category) }}
            </span>
            <span class="sc-detail__meta-chip">{{ envLabel(tpl.environment) }}</span>
            <span class="sc-detail__meta-chip mono">{{ tpl.version }}</span>
            <span class="sc-detail__meta-id mono">{{ tpl.id }}</span>
          </div>
        </div>
      </header>

      <mat-dialog-content class="sc-detail__layout">
        <aside class="sc-detail__identity">
          <div class="sc-detail__identity-card">
            <div class="sc-detail__hero">
              <app-brand-logo [logo]="tpl.cloud" size="xl" />
              <span class="sc-detail__hero-tech">
                <app-brand-logo [logo]="tpl.techLogo" size="lg" />
              </span>
            </div>
            <p class="sc-detail__provider">{{ cloudFullLabel(tpl.cloud) }}</p>

            <div class="sc-detail__identity-block">
              <h3>Clasificación</h3>
              <div class="sc-detail__badges">
                <span class="sc-detail__badge sc-detail__badge--cat">{{ categoryLabel(tpl.category) }}</span>
                <span class="sc-detail__badge sc-detail__badge--env">{{ envLabel(tpl.environment) }}</span>
              </div>
            </div>

            @if (tpl.tags.length) {
              <div class="sc-detail__identity-block">
                <h3>Etiquetas</h3>
                <div class="sc-detail__tags">
                  @for (tag of tpl.tags; track tag) {
                    <span class="sc-detail__tag">{{ tag }}</span>
                  }
                </div>
              </div>
            }

            <div class="sc-detail__identity-block">
              <h3>Gobierno</h3>
              <ul class="sc-detail__gov">
                <li>
                  <mat-icon>groups</mat-icon>
                  <span>Propietario</span>
                  <strong>{{ tpl.owner }}</strong>
                </li>
                <li>
                  <mat-icon>mail</mat-icon>
                  <span>Contacto</span>
                  <strong>{{ tpl.contactEmail || '—' }}</strong>
                </li>
                <li>
                  <mat-icon>{{ tpl.requiresApproval ? 'verified_user' : 'lock_open' }}</mat-icon>
                  <span>Aprobación</span>
                  <strong>{{ tpl.requiresApproval ? 'Requerida' : 'No requerida' }}</strong>
                </li>
              </ul>
            </div>

            @if (tpl.documentationUrl || tpl.contactEmail) {
              <div class="sc-detail__identity-links">
                @if (tpl.documentationUrl) {
                  <a [href]="tpl.documentationUrl" target="_blank" rel="noopener">
                    <mat-icon>menu_book</mat-icon>
                    Documentación
                  </a>
                }
                @if (tpl.contactEmail) {
                  <a [href]="'mailto:' + tpl.contactEmail">
                    <mat-icon>mail</mat-icon>
                    Contactar equipo
                  </a>
                }
              </div>
            }
          </div>
        </aside>

        <div class="sc-detail__main">
          <div class="sc-detail__kpis">
            <div class="sc-detail__kpi">
              <mat-icon>rocket_launch</mat-icon>
              <div>
                <span>Lanzamientos 30d</span>
                <strong>{{ tpl.launches30d }}</strong>
              </div>
            </div>
            <div class="sc-detail__kpi" [attr.data-level]="successLevel(tpl.successRate)">
              <mat-icon>verified</mat-icon>
              <div>
                <span>Tasa de éxito</span>
                <strong>{{ tpl.successRate ?? 100 }}%</strong>
              </div>
            </div>
            <div class="sc-detail__kpi">
              <mat-icon>schedule</mat-icon>
              <div>
                <span>Provisionado</span>
                <strong>{{ tpl.avgProvision }}</strong>
              </div>
            </div>
            <div class="sc-detail__kpi">
              <mat-icon>payments</mat-icon>
              <div>
                <span>Coste estimado</span>
                <strong>{{ tpl.estimatedCost || '—' }}</strong>
              </div>
            </div>
          </div>

          <section class="sc-detail__section">
            <h3><mat-icon>info</mat-icon> Descripción</h3>
            <p class="sc-detail__desc">{{ tpl.description }}</p>
          </section>

          @if (tpl.provisionSteps?.length || tpl.resourcesCreated?.length) {
            <section class="sc-detail__section">
              <h3><mat-icon>settings</mat-icon> Aprovisionamiento</h3>
              <div class="sc-detail__provision">
                @if (tpl.provisionSteps?.length) {
                  <div class="sc-detail__timeline">
                    <h4>Pasos</h4>
                    <ol>
                      @for (step of tpl.provisionSteps!; track step; let i = $index; let last = $last) {
                        <li [class.sc-detail__timeline-item--last]="last">
                          <span class="sc-detail__timeline-dot">{{ i + 1 }}</span>
                          <span class="sc-detail__timeline-text">{{ step }}</span>
                        </li>
                      }
                    </ol>
                  </div>
                }
                @if (tpl.resourcesCreated?.length) {
                  <div class="sc-detail__resources">
                    <h4>Recursos creados</h4>
                    <ul>
                      @for (r of tpl.resourcesCreated!; track r) {
                        <li>
                          <mat-icon>inventory_2</mat-icon>
                          {{ r }}
                        </li>
                      }
                    </ul>
                  </div>
                }
              </div>
            </section>
          }

          @if (tpl.parameters) {
            <section class="sc-detail__section">
              <h3><mat-icon>tune</mat-icon> Parámetros por defecto</h3>
              <div class="sc-detail__terminal">
                <div class="sc-detail__terminal-bar">
                  <span></span><span></span><span></span>
                  <span class="sc-detail__terminal-title mono">config.env</span>
                </div>
                <pre class="sc-detail__code mono">{{ tpl.parameters }}</pre>
              </div>
            </section>
          }

          <footer class="sc-detail__foot">
            <span>
              <mat-icon>update</mat-icon>
              Actualizado {{ tpl.updatedAt | date: 'dd MMM yyyy' }}
            </span>
            @if (tpl.requiresApproval) {
              <span class="sc-detail__foot-badge">
                <mat-icon>verified_user</mat-icon>
                Requiere aprobación para lanzar
              </span>
            }
          </footer>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions class="sc-detail__actions">
        <button mat-button type="button" mat-dialog-close>Cerrar</button>
        <div class="sc-detail__actions-right">
          <button mat-stroked-button type="button" (click)="closeWith('edit')">
            <mat-icon>edit</mat-icon>
            Editar
          </button>
          <button mat-flat-button color="primary" type="button" (click)="closeWith('launch')">
            <mat-icon>rocket_launch</mat-icon>
            Lanzar
          </button>
        </div>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      font-size: 0.8125rem;
      color: #0f172a;
    }
    .sc-detail {
      --sc-accent: #64748b;
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      height: 100%;
    }
    .sc-detail[data-cloud='aws'] { --sc-accent: #ff9900; }
    .sc-detail[data-cloud='gcp'] { --sc-accent: #4285f4; }
    .sc-detail[data-cloud='azure'] { --sc-accent: #0078d4; }

    .sc-detail__head {
      flex-shrink: 0;
      padding: 0.9rem 1.15rem 0.75rem;
      background: linear-gradient(180deg, #f8fafc 0%, #fff 100%);
      border-bottom: 1px solid #f1f5f9;
      position: relative;
    }
    .sc-detail__head::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 2px;
      background: linear-gradient(90deg, var(--sc-accent), transparent 65%);
      opacity: 0.5;
    }
    .sc-detail__head-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.15rem;
    }
    .sc-detail__eyebrow {
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #94a3b8;
    }
    .sc-detail__head h2 {
      margin: 0 0 0.45rem;
      font-size: 1.1rem;
      font-weight: 700;
      line-height: 1.3;
      letter-spacing: -0.02em;
    }
    .sc-detail__status {
      font-size: 0.56rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.2rem 0.48rem;
      border-radius: 999px;
      background: rgb(5 150 105 / 0.1);
      color: #059669;
    }
    .sc-detail__status[data-status='draft'] { background: #f1f5f9; color: #64748b; }
    .sc-detail__status[data-status='deprecated'] { background: rgb(185 28 28 / 0.08); color: #b91c1c; }
    .sc-detail__meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.3rem;
    }
    .sc-detail__meta-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.14rem 0.42rem;
      border-radius: 999px;
      font-size: 0.62rem;
      font-weight: 650;
      background: #f1f5f9;
      color: #475569;
    }
    .sc-detail__meta-id {
      font-size: 0.6rem;
      color: #94a3b8;
      padding: 0;
      background: none;
    }

    .sc-detail__layout {
      display: grid !important;
      grid-template-columns: 248px minmax(0, 1fr);
      flex: 1;
      min-height: 0;
      padding: 0 !important;
      overflow: hidden;
    }

    .sc-detail__identity {
      padding: 0.75rem 0.8rem;
      background: #fafbfc;
      border-right: 1px solid #f1f5f9;
      overflow-y: auto;
      scrollbar-width: thin;
    }
    .sc-detail__identity-card {
      position: relative;
      padding: 0.75rem 0.65rem;
      border-radius: 12px;
      background: #fff;
      box-shadow: 0 1px 4px rgb(15 23 42 / 0.05);
      overflow: hidden;
    }
    .sc-detail__identity-card::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: var(--sc-accent);
    }
    .sc-detail__hero {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 0.4rem;
      width: 5rem;
      height: 5rem;
      border-radius: 14px;
      background: linear-gradient(145deg, #f8fafc, #f1f5f9);
    }
    .sc-detail__hero-tech {
      position: absolute;
      right: -0.3rem;
      bottom: -0.3rem;
      display: flex;
      padding: 0.22rem;
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 2px 8px rgb(15 23 42 / 0.1);
    }
    .sc-detail__provider {
      margin: 0 0 0.65rem;
      font-size: 0.64rem;
      font-weight: 600;
      text-align: center;
      color: #64748b;
      line-height: 1.35;
    }
    .sc-detail__identity-block {
      margin-bottom: 0.6rem;
      padding-bottom: 0.55rem;
      border-bottom: 1px solid #f1f5f9;
    }
    .sc-detail__identity-block:last-of-type { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .sc-detail__identity-block h3 {
      margin: 0 0 0.35rem;
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
    }
    .sc-detail__badges { display: flex; flex-wrap: wrap; gap: 0.25rem; }
    .sc-detail__badge {
      padding: 0.14rem 0.42rem;
      border-radius: 999px;
      font-size: 0.62rem;
      font-weight: 650;
    }
    .sc-detail__badge--cat { background: #e2e8f0; color: #334155; }
    .sc-detail__badge--env { background: #f1f5f9; color: #334155; }
    .sc-detail__tags { display: flex; flex-wrap: wrap; gap: 0.22rem; }
    .sc-detail__tag {
      padding: 0.1rem 0.38rem;
      border-radius: 999px;
      font-size: 0.6rem;
      font-weight: 600;
      background: #f1f5f9;
      color: #64748b;
    }
    .sc-detail__gov {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .sc-detail__gov li {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.25rem 0.4rem;
      padding: 0.28rem 0;
      font-size: 0.68rem;
      border-bottom: 1px solid #f8fafc;
    }
    .sc-detail__gov li:last-child { border-bottom: none; }
    .sc-detail__gov mat-icon {
      grid-row: span 2;
      font-size: 0.9rem;
      width: 0.9rem;
      height: 0.9rem;
      color: var(--sc-accent);
      margin-top: 0.05rem;
    }
    .sc-detail__gov span { color: #94a3b8; font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.03em; }
    .sc-detail__gov strong { color: #334155; font-weight: 600; word-break: break-word; }
    .sc-detail__identity-links {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      margin-top: 0.65rem;
    }
    .sc-detail__identity-links a {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.3rem;
      padding: 0.4rem 0.5rem;
      border-radius: 8px;
      font-size: 0.68rem;
      font-weight: 600;
      color: #334155;
      text-decoration: none;
      background: #f8fafc;
      transition: background 0.12s;
    }
    .sc-detail__identity-links a:hover { background: #f1f5f9; }
    .sc-detail__identity-links mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; color: var(--sc-accent); }

    .sc-detail__main {
      padding: 0.75rem 1rem 0.65rem;
      overflow-y: auto;
      scrollbar-width: thin;
      background: #fff;
      min-height: 0;
    }
    .sc-detail__kpis {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.4rem;
      margin-bottom: 0.75rem;
    }
    .sc-detail__kpi {
      display: flex;
      align-items: flex-start;
      gap: 0.38rem;
      padding: 0.5rem 0.55rem;
      border-radius: 10px;
      background: #f8fafc;
      box-shadow: inset 0 0 0 1px #eef2f6;
    }
    .sc-detail__kpi > mat-icon {
      flex-shrink: 0;
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: var(--sc-accent);
    }
    .sc-detail__kpi span {
      display: block;
      font-size: 0.54rem;
      font-weight: 650;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #94a3b8;
    }
    .sc-detail__kpi strong {
      display: block;
      margin-top: 0.06rem;
      font-size: 0.82rem;
      font-weight: 700;
      color: #0f172a;
    }
    .sc-detail__kpi[data-level='high'] strong { color: #059669; }
    .sc-detail__kpi[data-level='mid'] strong { color: #d97706; }
    .sc-detail__kpi[data-level='low'] strong { color: #dc2626; }

    .sc-detail__section { margin-bottom: 0.75rem; }
    .sc-detail__section h3 {
      display: flex;
      align-items: center;
      gap: 0.32rem;
      margin: 0 0 0.4rem;
      font-size: 0.72rem;
      font-weight: 700;
      color: #1e293b;
    }
    .sc-detail__section h3 mat-icon {
      font-size: 0.95rem;
      width: 0.95rem;
      height: 0.95rem;
      color: var(--sc-accent);
    }
    .sc-detail__desc {
      margin: 0;
      font-size: 0.76rem;
      color: #475569;
      line-height: 1.6;
    }

    .sc-detail__provision {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.65rem;
    }
    .sc-detail__timeline h4,
    .sc-detail__resources h4 {
      margin: 0 0 0.35rem;
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #94a3b8;
    }
    .sc-detail__timeline ol {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .sc-detail__timeline li {
      display: flex;
      gap: 0.45rem;
      padding: 0 0 0.55rem 0.15rem;
      position: relative;
    }
    .sc-detail__timeline li:not(.sc-detail__timeline-item--last)::before {
      content: '';
      position: absolute;
      left: 0.72rem;
      top: 1.35rem;
      bottom: 0;
      width: 2px;
      background: #e2e8f0;
    }
    .sc-detail__timeline-dot {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.35rem;
      height: 1.35rem;
      border-radius: 999px;
      font-size: 0.58rem;
      font-weight: 700;
      background: var(--sc-accent);
      color: #fff;
      z-index: 1;
    }
    .sc-detail__timeline-text {
      padding-top: 0.15rem;
      font-size: 0.72rem;
      color: #334155;
      line-height: 1.45;
    }
    .sc-detail__resources ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.28rem;
    }
    .sc-detail__resources li {
      display: flex;
      align-items: center;
      gap: 0.32rem;
      padding: 0.35rem 0.45rem;
      border-radius: 8px;
      font-size: 0.72rem;
      font-weight: 600;
      color: #334155;
      background: #f8fafc;
    }
    .sc-detail__resources mat-icon {
      font-size: 0.85rem;
      width: 0.85rem;
      height: 0.85rem;
      color: #059669;
    }

    .sc-detail__terminal {
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgb(15 23 42 / 0.12);
    }
    .sc-detail__terminal-bar {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.4rem 0.55rem;
      background: #1e293b;
    }
    .sc-detail__terminal-bar span:first-child,
    .sc-detail__terminal-bar span:nth-child(2),
    .sc-detail__terminal-bar span:nth-child(3) {
      width: 0.55rem;
      height: 0.55rem;
      border-radius: 999px;
      background: #475569;
    }
    .sc-detail__terminal-bar span:first-child { background: #ef4444; }
    .sc-detail__terminal-bar span:nth-child(2) { background: #eab308; }
    .sc-detail__terminal-bar span:nth-child(3) { background: #22c55e; }
    .sc-detail__terminal-title {
      margin-left: auto;
      font-size: 0.58rem;
      color: #94a3b8;
    }
    .sc-detail__code {
      margin: 0;
      padding: 0.6rem 0.7rem;
      background: #0f172a;
      color: #e2e8f0;
      font-size: 0.68rem;
      line-height: 1.55;
      white-space: pre-wrap;
    }

    .sc-detail__foot {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      padding-top: 0.55rem;
      margin-top: 0.25rem;
      border-top: 1px solid #f1f5f9;
      font-size: 0.65rem;
      color: #94a3b8;
    }
    .sc-detail__foot > span:first-child {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }
    .sc-detail__foot mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; }
    .sc-detail__foot-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.15rem 0.4rem;
      border-radius: 999px;
      background: #f1f5f9;
      color: #64748b;
      font-weight: 600;
    }

    .sc-detail__actions {
      display: flex !important;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      padding: 0.7rem 1.15rem !important;
      flex-shrink: 0;
      border-top: 1px solid #e2e8f0;
      background: #fff;
    }
    .sc-detail__actions-right {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-left: auto;
    }
    .mono { font-family: var(--app-font-mono, ui-monospace, monospace); }

    @media (max-width: 760px) {
      .sc-detail__layout { grid-template-columns: 1fr; }
      .sc-detail__identity { border-right: none; border-bottom: 1px solid #f1f5f9; max-height: 14rem; }
      .sc-detail__kpis { grid-template-columns: 1fr 1fr; }
      .sc-detail__provision { grid-template-columns: 1fr; }
    }
  `,
})
export class ServiceCatalogDetailDialogComponent {
  readonly data = inject<ServiceCatalogDetailDialogData>(MAT_DIALOG_DATA)
  private readonly dialogRef = inject(
    MatDialogRef<ServiceCatalogDetailDialogComponent, ServiceCatalogDetailDialogResult>,
  )

  readonly tpl = this.data.template

  categoryLabel = (c: ServiceCatalogTemplate['category']): string => SERVICE_CATALOG_CATEGORY_LABELS[c]
  cloudLabel = (c: ServiceCatalogTemplate['cloud']): string => SERVICE_CATALOG_CLOUD_LABELS[c]
  cloudFullLabel = (c: ServiceCatalogTemplate['cloud']): string => CLOUD_FULL_LABELS[c]
  statusLabel = (s: ServiceCatalogTemplate['status']): string => SERVICE_CATALOG_STATUS_LABELS[s]
  envLabel = (e: ServiceCatalogTemplate['environment']): string =>
    e ? SERVICE_CATALOG_ENVIRONMENT_LABELS[e] : '—'

  successLevel = (rate: number | undefined): string => {
    const r = rate ?? 100
    if (r >= 95) return 'high'
    if (r >= 85) return 'mid'
    return 'low'
  }

  closeWith = (action: ServiceCatalogDetailAction): void => {
    this.dialogRef.close({ action, template: this.tpl })
  }
}
