import { DatePipe } from '@angular/common'
import { Component, computed, inject, OnInit, signal } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatDialog, MatDialogModule } from '@angular/material/dialog'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import { ToastService } from '../../core/services/toast.service'
import {
  defaultServiceCatalogLaunches,
  defaultServiceCatalogTemplates,
  SERVICE_CATALOG_CATEGORY_LABELS,
  SERVICE_CATALOG_CLOUD_LABELS,
  SERVICE_CATALOG_ENVIRONMENT_LABELS,
  SERVICE_CATALOG_STATUS_LABELS,
  type ServiceCatalogCategory,
  type ServiceCatalogLaunch,
  type ServiceCatalogTemplate,
} from './service-catalog.types'
import { ServiceCatalogFormDialogComponent } from './service-catalog-form-dialog.component'
import { ServiceCatalogImportDialogComponent } from './service-catalog-import-dialog.component'
import { ServiceCatalogPublishDialogComponent } from './service-catalog-publish-dialog.component'
import {
  ServiceCatalogDetailDialogComponent,
  type ServiceCatalogDetailDialogResult,
} from './service-catalog-detail-dialog.component'
import { ServiceCatalogLaunchDialogComponent } from './service-catalog-launch-dialog.component'
import { TRIGGER_LABELS } from './service-catalog.util'
import { CATEGORY_TECH_LOGO } from './service-catalog.config'
import { ProConfigGateComponent } from '../../shared/components/pro-config-gate/pro-config-gate.component'
import { ApprovalsService } from '../approvals/approvals.service'

type CatalogView = 'catalog' | 'launches'

@Component({
  selector: 'app-service-catalog-page',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatIconModule, MatDialogModule, BrandLogoComponent, ProConfigGateComponent],
  template: `
    <app-pro-config-gate module="Catálogo de servicios">
    <div class="page-container sc-page animate-fade-in">
      <div class="sc-bar">
        <nav class="sc-tabs" role="tablist" aria-label="Vistas del catálogo">
          <button
            type="button"
            role="tab"
            class="sc-tabs__tab"
            [class.sc-tabs__tab--on]="view() === 'catalog'"
            [attr.aria-selected]="view() === 'catalog'"
            (click)="view.set('catalog')"
          >
            <mat-icon>apps</mat-icon>
            Catálogo
          </button>
          <button
            type="button"
            role="tab"
            class="sc-tabs__tab"
            [class.sc-tabs__tab--on]="view() === 'launches'"
            [attr.aria-selected]="view() === 'launches'"
            (click)="view.set('launches')"
          >
            <mat-icon>rocket_launch</mat-icon>
            Lanzamientos recientes
          </button>
        </nav>
        <div class="sc-bar__actions">
          <button type="button" class="sc-btn sc-btn--primary" (click)="openNew()">
            <mat-icon>add</mat-icon>
            Nueva plantilla
          </button>
          <button type="button" class="sc-btn" (click)="openImport()">
            <mat-icon>upload</mat-icon>
            Importar
          </button>
          <button type="button" class="sc-btn" (click)="openPublish()">
            <mat-icon>publish</mat-icon>
            Publicar
          </button>
        </div>
      </div>

      @if (view() === 'catalog') {
        <div class="sc-workspace">
          <div class="sc-grid">
            @for (tpl of templates(); track tpl.id) {
              <article class="sc-card" [attr.data-status]="tpl.status" [attr.data-cloud]="tpl.cloud">
                <div class="sc-card__surface">
                  <header class="sc-card__head">
                    <div class="sc-card__logo-wrap">
                      <app-brand-logo [logo]="tpl.cloud" size="lg" />
                      <span class="sc-card__tech-badge">
                        <app-brand-logo [logo]="tpl.techLogo" size="sm" />
                      </span>
                    </div>
                    <div class="sc-card__badges">
                      <span class="sc-card__version mono">{{ tpl.version }}</span>
                      <span class="sc-card__status" [attr.data-status]="tpl.status">
                        {{ statusLabel(tpl.status) }}
                      </span>
                    </div>
                  </header>

                  <span class="sc-card__category">
                    {{ categoryLabel(tpl.category) }} · {{ cloudLabel(tpl.cloud) }}
                    @if (tpl.environment) {
                      · {{ envLabel(tpl.environment) }}
                    }
                  </span>
                  <h3 class="sc-card__title">{{ tpl.name }}</h3>
                  <p class="sc-card__desc">{{ tpl.description }}</p>

                  @if (tpl.tags.length) {
                    <div class="sc-card__tags">
                      @for (tag of tpl.tags.slice(0, 4); track tag) {
                        <span class="sc-card__tag">{{ tag }}</span>
                      }
                    </div>
                  }

                  <dl class="sc-card__meta">
                    <div>
                      <dt>Lanzam. 30d</dt>
                      <dd>{{ tpl.launches30d }}</dd>
                    </div>
                    <div>
                      <dt>Éxito</dt>
                      <dd>{{ tpl.successRate ?? 100 }}%</dd>
                    </div>
                    <div>
                      <dt>Provisionado</dt>
                      <dd>{{ tpl.avgProvision }}</dd>
                    </div>
                    <div>
                      <dt>Coste</dt>
                      <dd>{{ tpl.estimatedCost || '—' }}</dd>
                    </div>
                  </dl>

                  @if (tpl.requiresApproval) {
                    <p class="sc-card__approval">
                      <mat-icon>verified_user</mat-icon>
                      Requiere aprobación
                    </p>
                  }

                  <footer class="sc-card__foot">
                    <button type="button" class="sc-btn sc-btn--sm" (click)="openEdit(tpl)">
                      <mat-icon>edit</mat-icon>
                      Editar
                    </button>
                    <button type="button" class="sc-btn sc-btn--sm" (click)="openTemplateDetail(tpl)">
                      <mat-icon>visibility</mat-icon>
                      Detalle
                    </button>
                    <button type="button" class="sc-btn sc-btn--sm sc-btn--primary" (click)="openLaunch(tpl)">
                      <mat-icon>rocket_launch</mat-icon>
                      Lanzar
                    </button>
                  </footer>
                </div>
              </article>
            }
          </div>
        </div>
      } @else {
        <div class="sc-launches-layout">
          <div class="sc-launches-list" role="list">
            @for (launch of launches(); track launch.id) {
              <button
                type="button"
                role="listitem"
                class="sc-launch-item"
                [class.sc-launch-item--on]="selectedLaunchId() === launch.id"
                [attr.data-status]="launch.status"
                (click)="selectedLaunchId.set(launch.id)"
              >
                <span class="sc-launch-item__status" aria-hidden="true">
                  <mat-icon>{{ launchStatusIcon(launch.status) }}</mat-icon>
                </span>
                <span class="sc-launch-item__logos">
                  <app-brand-logo [logo]="launch.cloud" size="sm" />
                  <app-brand-logo [logo]="categoryLogo(launch.category)" size="sm" />
                </span>
                <span class="sc-launch-item__body">
                  <span class="sc-launch-item__row">
                    <strong>{{ launch.templateName }}</strong>
                    <span class="sc-launch-item__pill" [attr.data-status]="launch.status">
                      {{ launchStatusLabel(launch.status) }}
                    </span>
                  </span>
                  <span class="sc-launch-item__meta">
                    {{ launch.user }} · {{ envLabel(launch.environment) }} · {{ launch.templateVersion || '—' }}
                  </span>
                  <span class="sc-launch-item__time">
                    {{ launch.launchedAt | date: 'dd MMM, HH:mm' }}
                    @if (launch.duration !== '—') {
                      · {{ launch.duration }}
                    }
                  </span>
                  @if (launch.status === 'running' && launch.progress) {
                    <span class="sc-launch-item__progress" [style.width.%]="launch.progress"></span>
                  }
                </span>
              </button>
            }
          </div>

          <aside class="sc-launch-panel" aria-label="Detalle del lanzamiento">
            @if (selectedLaunch(); as launch) {
              <header class="sc-launch-panel__head" [attr.data-status]="launch.status">
                <div class="sc-launch-panel__logos">
                  <app-brand-logo [logo]="launch.cloud" size="md" />
                  <app-brand-logo [logo]="categoryLogo(launch.category)" size="sm" />
                </div>
                <div>
                  <span class="sc-launch-panel__eyebrow">{{ launchStatusLabel(launch.status) }}</span>
                  <h3>{{ launch.templateName }}</h3>
                  <p class="mono">{{ launch.id }} · {{ launch.templateVersion || '—' }}</p>
                </div>
              </header>

              <dl class="sc-launch-panel__grid">
                <div><dt>Usuario</dt><dd>{{ launch.user }}</dd></div>
                <div><dt>Cloud</dt><dd>{{ cloudLabel(launch.cloud) }}</dd></div>
                <div><dt>Categoría</dt><dd>{{ categoryLabel(launch.category) }}</dd></div>
                <div><dt>Entorno</dt><dd>{{ envLabel(launch.environment) }}</dd></div>
                <div><dt>Disparador</dt><dd>{{ triggerLabel(launch.triggeredBy) }}</dd></div>
                <div><dt>Duración</dt><dd>{{ launch.duration }}</dd></div>
                <div><dt>Fecha</dt><dd>{{ launch.launchedAt | date: 'dd MMM yyyy, HH:mm' }}</dd></div>
                <div><dt>Recurso</dt><dd class="mono">{{ launch.resourceId || '—' }}</dd></div>
              </dl>

              @if (launch.errorMessage) {
                <p class="sc-launch-panel__error">
                  <mat-icon>error_outline</mat-icon>
                  {{ launch.errorMessage }}
                </p>
              }

              @if (launch.parameters) {
                <section class="sc-launch-panel__block">
                  <h4><mat-icon>tune</mat-icon> Parámetros</h4>
                  <pre class="mono">{{ launch.parameters }}</pre>
                </section>
              }

              @if (launch.output) {
                <section class="sc-launch-panel__block">
                  <h4><mat-icon>terminal</mat-icon> Salida</h4>
                  <pre class="sc-launch-panel__terminal mono">{{ launch.output }}</pre>
                </section>
              }

              @if (launch.status === 'running' && launch.progress) {
                <div class="sc-launch-panel__running">
                  <span>Progreso estimado</span>
                  <div class="sc-launch-panel__bar">
                    <span [style.width.%]="launch.progress"></span>
                  </div>
                  <strong>{{ launch.progress }}%</strong>
                </div>
              }
            } @else {
              <div class="sc-launch-panel__empty">
                <mat-icon>rocket_launch</mat-icon>
                <h3>Inspector de lanzamientos</h3>
                <p>Selecciona un lanzamiento de la lista para ver parámetros, salida y estado.</p>
              </div>
            }
          </aside>
        </div>
      }
    </div>
    </app-pro-config-gate>
  `,
  styles: `
    :host { display: block; flex: 1; min-height: 0; }
    .sc-page {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      flex: 1;
      min-height: 0;
      overflow: hidden;
      color: #0f172a;
      font-size: 0.8125rem;
      line-height: 1.45;
    }
    .sc-bar {
      flex-shrink: 0;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.55rem;
      padding: 0.35rem 0.15rem 0.15rem;
    }
    .sc-tabs {
      display: flex;
      gap: 0.2rem;
      padding: 0.2rem;
      border-radius: 10px;
      background: #f8fafc;
    }
    .sc-tabs__tab {
      display: inline-flex;
      align-items: center;
      gap: 0.32rem;
      padding: 0.38rem 0.65rem;
      border: none;
      border-radius: 8px;
      background: transparent;
      font: inherit;
      font-size: 0.72rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      transition: background 0.15s, color 0.15s, box-shadow 0.15s;
    }
    .sc-tabs__tab mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; }
    .sc-tabs__tab:hover { color: #334155; }
    .sc-tabs__tab--on {
      color: #0f172a;
      background: #fff;
      box-shadow: 0 1px 3px rgb(15 23 42 / 0.08);
    }
    .sc-bar__actions { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .sc-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.4rem 0.7rem;
      border: none;
      border-radius: 8px;
      background: #f1f5f9;
      font: inherit;
      font-size: 0.72rem;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
      transition: background 0.15s, transform 0.12s;
    }
    .sc-btn:hover { background: #e2e8f0; color: #0f172a; }
    .sc-btn:active { transform: scale(0.98); }
    .sc-btn mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; }
    .sc-btn--primary { background: #1e293b; color: #fff; }
    .sc-btn--primary:hover { background: #0f172a; color: #fff; }
    .sc-btn--sm { padding: 0.3rem 0.52rem; font-size: 0.68rem; border-radius: 7px; }
    .sc-workspace {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      scrollbar-width: thin;
      padding: 0.1rem 0.15rem 0.5rem;
    }
    .sc-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 0.85rem;
    }
    .sc-card {
      --sc-accent: #64748b;
      min-width: 0;
    }
    .sc-card[data-cloud='aws'] { --sc-accent: #ff9900; }
    .sc-card[data-cloud='gcp'] { --sc-accent: #4285f4; }
    .sc-card[data-cloud='azure'] { --sc-accent: #0078d4; }
    .sc-card__surface {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 0.38rem;
      height: 100%;
      padding: 0.85rem 0.9rem 0.75rem;
      border-radius: 12px;
      background: #fff;
      box-shadow: 0 1px 2px rgb(15 23 42 / 0.04), 0 4px 16px rgb(15 23 42 / 0.04);
      transition: box-shadow 0.2s, transform 0.2s;
      overflow: hidden;
    }
    .sc-card__surface::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: var(--sc-accent);
      opacity: 0.85;
    }
    .sc-card__surface:hover {
      box-shadow: 0 2px 6px rgb(15 23 42 / 0.06), 0 8px 24px rgb(15 23 42 / 0.07);
      transform: translateY(-1px);
    }
    .sc-card[data-status='draft'] .sc-card__surface { opacity: 0.92; }
    .sc-card[data-status='deprecated'] .sc-card__surface { opacity: 0.78; }
    .sc-card__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.45rem;
    }
    .sc-card__logo-wrap {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 3.25rem;
      height: 3.25rem;
      border-radius: 11px;
      background: linear-gradient(145deg, #f8fafc 0%, #f1f5f9 100%);
    }
    .sc-card__tech-badge {
      position: absolute;
      right: -0.3rem;
      bottom: -0.3rem;
      display: flex;
      padding: 0.18rem;
      border-radius: 7px;
      background: #fff;
      box-shadow: 0 2px 6px rgb(15 23 42 / 0.1);
    }
    .sc-card__badges {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.18rem;
    }
    .sc-card__version {
      font-size: 0.62rem;
      font-weight: 600;
      color: #64748b;
      padding: 0.08rem 0.35rem;
      border-radius: 999px;
      background: #f8fafc;
    }
    .sc-card__status {
      font-size: 0.56rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.1rem 0.38rem;
      border-radius: 999px;
      background: rgb(5 150 105 / 0.1);
      color: #059669;
    }
    .sc-card__status[data-status='draft'] {
      background: #f1f5f9;
      color: #64748b;
    }
    .sc-card__status[data-status='deprecated'] {
      background: rgb(185 28 28 / 0.08);
      color: #b91c1c;
    }
    .sc-card__category {
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #94a3b8;
    }
    .sc-card__title {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 700;
      letter-spacing: -0.015em;
      line-height: 1.32;
    }
    .sc-card__desc {
      margin: 0;
      font-size: 0.7rem;
      color: #64748b;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      flex: 1;
    }
    .sc-card__tags { display: flex; flex-wrap: wrap; gap: 0.28rem; }
    .sc-card__tag {
      padding: 0.1rem 0.38rem;
      border-radius: 999px;
      font-size: 0.58rem;
      font-weight: 600;
      background: #f1f5f9;
      color: #64748b;
    }
    .sc-card__meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.35rem 0.55rem;
      margin: 0.15rem 0 0;
      padding: 0.45rem 0.5rem;
      border-radius: 8px;
      background: #f8fafc;
    }
    .sc-card__meta dt {
      margin: 0;
      font-size: 0.54rem;
      font-weight: 650;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #94a3b8;
    }
    .sc-card__meta dd { margin: 0.06rem 0 0; font-size: 0.74rem; font-weight: 650; color: #1e293b; }
    .sc-card__approval {
      display: inline-flex;
      align-items: center;
      gap: 0.28rem;
      margin: 0;
      padding: 0.22rem 0.45rem;
      border-radius: 999px;
      font-size: 0.64rem;
      font-weight: 600;
      color: #475569;
      background: #f1f5f9;
      width: fit-content;
    }
    .sc-card__approval mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; }
    .sc-card__foot {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
      margin-top: 0.35rem;
      padding-top: 0.45rem;
      border-top: 1px solid #f1f5f9;
    }
    .sc-launches-layout {
      flex: 1;
      min-height: 0;
      display: grid;
      grid-template-columns: minmax(0, 360px) minmax(0, 1fr);
      gap: 0.85rem;
      overflow: hidden;
      padding: 0.1rem 0.15rem;
    }
    .sc-launches-list {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      min-height: 0;
      overflow-y: auto;
      scrollbar-width: thin;
      padding: 0.35rem;
      border-radius: 12px;
      background: #f8fafc;
    }
    .sc-launch-item {
      display: grid;
      grid-template-columns: auto auto 1fr;
      gap: 0.45rem;
      align-items: start;
      width: 100%;
      padding: 0.5rem 0.55rem;
      border: none;
      border-radius: 10px;
      background: transparent;
      text-align: left;
      font: inherit;
      cursor: pointer;
      transition: background 0.12s, box-shadow 0.12s;
    }
    .sc-launch-item:hover { background: #fff; }
    .sc-launch-item--on {
      background: #fff;
      box-shadow: 0 1px 4px rgb(15 23 42 / 0.06);
    }
    .sc-launch-item__status mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
    }
    .sc-launch-item[data-status='success'] .sc-launch-item__status mat-icon { color: #059669; }
    .sc-launch-item[data-status='running'] .sc-launch-item__status mat-icon { color: #2563eb; }
    .sc-launch-item[data-status='failed'] .sc-launch-item__status mat-icon { color: #dc2626; }
    .sc-launch-item__logos {
      display: flex;
      flex-direction: column;
      gap: 0.12rem;
    }
    .sc-launch-item__body {
      min-width: 0;
      position: relative;
      padding-bottom: 0.15rem;
    }
    .sc-launch-item__row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.3rem;
    }
    .sc-launch-item__row strong {
      font-size: 0.75rem;
      font-weight: 700;
      line-height: 1.3;
    }
    .sc-launch-item__pill {
      font-size: 0.55rem;
      font-weight: 700;
      text-transform: uppercase;
      color: #059669;
    }
    .sc-launch-item__pill[data-status='running'] { color: #2563eb; }
    .sc-launch-item__pill[data-status='failed'] { color: #dc2626; }
    .sc-launch-item__meta {
      display: block;
      margin-top: 0.1rem;
      font-size: 0.62rem;
      color: #64748b;
    }
    .sc-launch-item__time {
      display: block;
      margin-top: 0.06rem;
      font-size: 0.62rem;
      color: #94a3b8;
    }
    .sc-launch-item__progress {
      position: absolute;
      left: 0;
      bottom: 0;
      height: 2px;
      background: #2563eb;
      border-radius: 999px;
      transition: width 0.2s;
    }
    .sc-launch-panel {
      min-height: 0;
      overflow-y: auto;
      scrollbar-width: thin;
      padding: 0.65rem 0.75rem;
      border-radius: 12px;
      background: #fff;
      box-shadow: 0 1px 2px rgb(15 23 42 / 0.04), 0 4px 16px rgb(15 23 42 / 0.04);
    }
    .sc-launch-panel__head {
      display: flex;
      gap: 0.55rem;
      align-items: flex-start;
      margin-bottom: 0.55rem;
    }
    .sc-launch-panel__logos {
      display: flex;
      gap: 0.25rem;
    }
    .sc-launch-panel__eyebrow {
      display: block;
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #059669;
    }
    .sc-launch-panel__head[data-status='running'] .sc-launch-panel__eyebrow { color: #2563eb; }
    .sc-launch-panel__head[data-status='failed'] .sc-launch-panel__eyebrow { color: #dc2626; }
    .sc-launch-panel__head h3 {
      margin: 0.1rem 0 0;
      font-size: 0.875rem;
      font-weight: 700;
      line-height: 1.3;
    }
    .sc-launch-panel__head p {
      margin: 0.12rem 0 0;
      font-size: 0.65rem;
      color: #64748b;
    }
    .sc-launch-panel__grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.35rem;
      margin: 0 0 0.55rem;
    }
    .sc-launch-panel__grid dt {
      margin: 0;
      font-size: 0.55rem;
      font-weight: 650;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #94a3b8;
    }
    .sc-launch-panel__grid dd {
      margin: 0.06rem 0 0;
      font-size: 0.72rem;
      font-weight: 600;
    }
    .sc-launch-panel__error {
      display: flex;
      align-items: flex-start;
      gap: 0.3rem;
      margin: 0 0 0.5rem;
      padding: 0.4rem 0.45rem;
      border-radius: 6px;
      background: #fef2f2;
      font-size: 0.72rem;
      color: #b91c1c;
    }
    .sc-launch-panel__error mat-icon {
      font-size: 0.95rem;
      width: 0.95rem;
      height: 0.95rem;
      flex-shrink: 0;
    }
    .sc-launch-panel__block {
      margin-bottom: 0.5rem;
    }
    .sc-launch-panel__block h4 {
      display: flex;
      align-items: center;
      gap: 0.28rem;
      margin: 0 0 0.28rem;
      font-size: 0.62rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
    }
    .sc-launch-panel__block h4 mat-icon {
      font-size: 0.85rem;
      width: 0.85rem;
      height: 0.85rem;
    }
    .sc-launch-panel__block pre {
      margin: 0;
      padding: 0.4rem 0.45rem;
      border-radius: 6px;
      background: #f8fafc;
      font-size: 0.65rem;
      line-height: 1.45;
      white-space: pre-wrap;
    }
    .sc-launch-panel__terminal {
      background: #0f172a !important;
      color: #e2e8f0;
      max-height: 12rem;
      overflow: auto;
    }
    .sc-launch-panel__running {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.68rem;
      color: #64748b;
    }
    .sc-launch-panel__bar {
      flex: 1;
      height: 4px;
      background: #e2e8f0;
      border-radius: 999px;
      overflow: hidden;
      min-width: 80px;
    }
    .sc-launch-panel__bar span {
      display: block;
      height: 100%;
      background: #2563eb;
      border-radius: 999px;
    }
    .sc-launch-panel__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 12rem;
      text-align: center;
      color: #64748b;
      padding: 1rem;
    }
    .sc-launch-panel__empty mat-icon {
      font-size: 2rem;
      width: 2rem;
      height: 2rem;
      color: #cbd5e1;
      margin-bottom: 0.5rem;
    }
    .sc-launch-panel__empty h3 {
      margin: 0 0 0.25rem;
      font-size: 0.85rem;
      color: #334155;
    }
    .sc-launch-panel__empty p {
      margin: 0;
      font-size: 0.72rem;
      max-width: 16rem;
      line-height: 1.45;
    }
    .mono {
      font-family: var(--app-font-mono, ui-monospace, monospace);
    }
    @media (max-width: 900px) {
      .sc-grid { grid-template-columns: 1fr; }
      .sc-launches-layout { grid-template-columns: 1fr; }
      .sc-launch-panel { max-height: 50vh; }
    }
  `,
})
export class ServiceCatalogPageComponent implements OnInit {
  private readonly toast = inject(ToastService)
  private readonly dialog = inject(MatDialog)
  private readonly approvals = inject(ApprovalsService)

  ngOnInit(): void {
    this.mergeApprovedLaunches()
  }

  readonly view = signal<CatalogView>('catalog')
  readonly templates = signal<ServiceCatalogTemplate[]>(defaultServiceCatalogTemplates())
  readonly launches = signal<ServiceCatalogLaunch[]>(defaultServiceCatalogLaunches())
  readonly selectedLaunchId = signal<string | null>(defaultServiceCatalogLaunches()[0]?.id ?? null)

  selectedLaunch = computed(() => {
    const id = this.selectedLaunchId()
    return this.launches().find((l) => l.id === id) ?? null
  })

  categoryLabel = (c: ServiceCatalogCategory): string => SERVICE_CATALOG_CATEGORY_LABELS[c]
  cloudLabel = (c: ServiceCatalogTemplate['cloud']): string => SERVICE_CATALOG_CLOUD_LABELS[c]
  statusLabel = (s: ServiceCatalogTemplate['status']): string => SERVICE_CATALOG_STATUS_LABELS[s]
  envLabel = (e: ServiceCatalogTemplate['environment'] | undefined): string =>
    e ? SERVICE_CATALOG_ENVIRONMENT_LABELS[e] : '—'
  categoryLogo = (c: ServiceCatalogCategory) => CATEGORY_TECH_LOGO[c]
  triggerLabel = (t: string | undefined): string => (t ? TRIGGER_LABELS[t] ?? t : '—')
  launchStatusLabel = (s: ServiceCatalogLaunch['status']): string =>
    s === 'success' ? 'Éxito' : s === 'running' ? 'En curso' : 'Fallido'
  launchStatusIcon = (s: ServiceCatalogLaunch['status']): string =>
    s === 'success' ? 'check_circle' : s === 'running' ? 'sync' : 'error'

  openNew = (): void => {
    const ref = this.dialog.open(ServiceCatalogFormDialogComponent, {
      panelClass: 'sc-form-dialog-panel',
      width: '960px',
      maxWidth: '98vw',
      maxHeight: '94vh',
      data: { mode: 'create' },
    })
    ref.afterClosed().subscribe((tpl) => {
      if (!tpl) return
      this.templates.update((list) => [tpl, ...list])
      this.toast.success(
        tpl.status === 'published'
          ? `Plantilla «${tpl.name}» creada y publicada`
          : `Plantilla «${tpl.name}» guardada como borrador`,
      )
    })
  }

  openEdit = (tpl: ServiceCatalogTemplate): void => {
    const ref = this.dialog.open(ServiceCatalogFormDialogComponent, {
      panelClass: 'sc-form-dialog-panel',
      width: '960px',
      maxWidth: '98vw',
      maxHeight: '94vh',
      data: { mode: 'edit', template: tpl },
    })
    ref.afterClosed().subscribe((updated) => {
      if (!updated) return
      this.templates.update((list) => list.map((t) => (t.id === updated.id ? updated : t)))
      this.toast.success(`Plantilla «${updated.name}» actualizada`)
    })
  }

  openImport = (): void => {
    const ref = this.dialog.open(ServiceCatalogImportDialogComponent, {
      width: '520px',
      maxHeight: '90vh',
    })
    ref.afterClosed().subscribe((tpl) => {
      if (!tpl) return
      this.templates.update((list) => [tpl, ...list])
      this.toast.success(`Plantilla «${tpl.name}» importada como borrador`)
    })
  }

  openPublish = (): void => {
    const drafts = this.templates().filter((t) => t.status === 'draft')
    const ref = this.dialog.open(ServiceCatalogPublishDialogComponent, {
      panelClass: 'sc-publish-dialog-panel',
      width: '720px',
      maxWidth: '98vw',
      maxHeight: '88vh',
      data: { drafts },
    })
    ref.afterClosed().subscribe((ids) => {
      if (!ids?.length) return
      const idSet = new Set(ids)
      this.templates.update((list) =>
        list.map((t) =>
          idSet.has(t.id)
            ? { ...t, status: 'published' as const, updatedAt: new Date().toISOString() }
            : t,
        ),
      )
      this.toast.success(`${ids.length} plantilla(s) publicada(s)`)
    })
  }

  openTemplateDetail = (tpl: ServiceCatalogTemplate): void => {
    const ref = this.dialog.open(ServiceCatalogDetailDialogComponent, {
      panelClass: 'sc-detail-dialog-panel',
      width: '920px',
      maxWidth: '98vw',
      maxHeight: '92vh',
      data: { template: tpl },
    })
    ref.afterClosed().subscribe((result: ServiceCatalogDetailDialogResult | undefined) => {
      if (!result?.action) return
      if (result.action === 'edit') this.openEdit(result.template)
      if (result.action === 'launch') this.openLaunch(result.template)
    })
  }

  openLaunch = (tpl: ServiceCatalogTemplate): void => {
    if (tpl.status === 'draft') {
      this.toast.warning('Publica la plantilla antes de lanzarla')
      return
    }
    if (tpl.status === 'deprecated') {
      this.toast.warning('Esta plantilla está obsoleta')
      return
    }
    const ref = this.dialog.open(ServiceCatalogLaunchDialogComponent, {
      panelClass: 'sc-launch-dialog-panel',
      width: '960px',
      maxWidth: '98vw',
      maxHeight: '92vh',
      data: { template: tpl },
    })
    ref.afterClosed().subscribe((result) => {
      if (!result) return
      if (result.approvalSubmitted) {
        this.toast.info(
          `Enviado a Aprobaciones — un revisor debe autorizar: ${result.approvedSubject ?? tpl.name}`,
        )
        return
      }
      if (!result.launch) return
      const launch = result.launch
      if (launch.status === 'success') {
        this.toast.success(`Plantilla «${tpl.name}» provisionada correctamente`)
        this.templates.update((list) =>
          list.map((t) => (t.id === tpl.id ? { ...t, launches30d: t.launches30d + 1 } : t)),
        )
      } else if (launch.status === 'failed') {
        this.toast.error(launch.errorMessage ?? 'Error en el lanzamiento')
      } else {
        this.toast.info(`Lanzamiento «${tpl.name}» en curso`)
      }
      this.launches.update((list) => [launch, ...list])
      this.selectedLaunchId.set(launch.id)
      this.view.set('launches')
    })
  }

  private mergeApprovedLaunches = (): void => {
    const batch = this.approvals.drainApprovedLaunches()
    if (!batch.length) return
    this.launches.update((list) => [...batch, ...list])
    const first = batch[0]
    if (first) {
      this.selectedLaunchId.set(first.id)
      this.view.set('launches')
      this.toast.success(`Lanzamiento aprobado y ejecutado: ${first.templateName}`)
      const tplId = first.templateId
      this.templates.update((list) =>
        list.map((t) => (t.id === tplId ? { ...t, launches30d: t.launches30d + 1 } : t)),
      )
    }
  }
}
