import { CommonModule } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  inject,
} from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatTooltipModule } from '@angular/material/tooltip'
import { MatMenuModule } from '@angular/material/menu'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import { InfrastructureActionService } from './infrastructure-action.service'
import type { InfraOperation, InfraResourceRow, InfraTabConfig, InfraWorkspaceConfig } from './infrastructure-workspace.types'
import { infraWorkspaceAnimations } from './infrastructure-workspace.animations'

@Component({
  selector: 'app-infrastructure-workspace',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    MatMenuModule,
    BrandLogoComponent,
  ],
  animations: infraWorkspaceAnimations,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'infra-page-host' },
  template: `
    <div class="infra-page" @pageZone>
      <header class="infra-hero" @heroZone>
        <div class="infra-hero__brand">
          <div class="infra-hero__icon" aria-hidden="true">
            @if (config().logos?.length) {
              <div class="infra-hero__logo-stack">
                @for (lg of config().logos; track lg; let i = $index) {
                  <app-brand-logo [logo]="lg" [size]="i === 0 ? 'lg' : 'md'" />
                }
              </div>
            } @else {
              @if (config().logo) {
                <app-brand-logo [logo]="config().logo!" size="xl" />
              } @else {
                <mat-icon>{{ config().icon }}</mat-icon>
              }
            }
          </div>
          <div>
            <div class="infra-hero__title-row">
              <h1>{{ config().title }}</h1>
              @if (config().lastSync) {
                <span class="infra-live">
                  <i aria-hidden="true"></i>
                  Sync {{ config().lastSync }}
                </span>
              }
            </div>
            <p>{{ config().description }}</p>
            @if (config().contextChips?.length) {
              <div class="infra-meta-chips">
                @for (chip of config().contextChips; track chip.label) {
                  <span class="infra-meta-chip" [class]="'infra-meta-chip--' + (chip.tone ?? 'default')">
                    @if (chip.icon) {
                      <mat-icon>{{ chip.icon }}</mat-icon>
                    }
                    {{ chip.label }}
                  </span>
                }
              </div>
            }
          </div>
        </div>
        <div class="infra-hero__actions">
          @for (action of config().headerActions; track action.label) {
            <button
              mat-stroked-button
              type="button"
              [class.infra-btn--primary]="action.primary"
              [attr.aria-label]="action.label"
              (click)="handleActionClick(action.label)"
            >
              <mat-icon>{{ action.icon }}</mat-icon>
              {{ action.label }}
            </button>
          }
        </div>
      </header>

      @if (loading()) {
        <div class="infra-loading" @loadingZone role="status" aria-live="polite">
          <span class="infra-loading__track"><i></i></span>
          <span>Sincronizando recursos…</span>
        </div>
      }

      <nav class="infra-section-nav" @navZone aria-label="Vistas del módulo">
        @for (tab of config().tabs; track tab.id; let i = $index) {
          <button
            type="button"
            class="infra-section-nav__item"
            [class.infra-section-nav__item--active]="selectedTabIndex() === i"
            [attr.aria-current]="selectedTabIndex() === i ? 'page' : null"
            (click)="handleTabChange(i)"
          >
            <mat-icon>{{ tabIcon(tab.id) }}</mat-icon>
            {{ tab.label }}
            <em>{{ tab.rows.length }}</em>
          </button>
        }
      </nav>

      @if (activeTab(); as tab) {
        <section class="infra-panel" @panelZone>
          <header class="infra-panel__head">
            <div>
              <h2>
                <mat-icon>{{ tabIcon(tab.id) }}</mat-icon>
                {{ tab.label }}
              </h2>
              <p>{{ filteredRows(tab).length }} recursos · búsqueda y filtros en tiempo real</p>
            </div>
            @if (config().quickActions?.length) {
              <div class="infra-quick-row">
                @for (qa of config().quickActions; track qa.label) {
                  <button
                    mat-stroked-button
                    type="button"
                    class="infra-quick-btn"
                    [attr.aria-label]="qa.label"
                    (click)="handleActionClick(qa.label)"
                  >
                    <mat-icon>{{ qa.icon }}</mat-icon>
                    {{ qa.label }}
                  </button>
                }
              </div>
            }
          </header>

          <div class="infra-filters">
            <mat-form-field appearance="fill" subscriptSizing="dynamic" class="infra-search">
              <mat-label>Buscar</mat-label>
              <mat-icon matPrefix>search</mat-icon>
              <input
                matInput
                [value]="searchQuery()"
                (input)="handleSearchInput($event)"
                [placeholder]="tab.searchPlaceholder ?? 'Filtrar recursos…'"
                aria-label="Buscar recursos"
              />
            </mat-form-field>

            @if (tab.filters?.length) {
              @for (filter of tab.filters; track filter.key) {
                <div class="infra-filter-block" role="group" [attr.aria-label]="filter.label">
                  <span class="infra-filter-block__label">{{ filter.label }}</span>
                  <div class="infra-filter-block__pills">
                    @for (option of filter.options; track option) {
                      <button
                        type="button"
                        class="infra-pill"
                        [class.infra-pill--active]="isFilterActive(filter.key, option)"
                        (click)="handleToggleFilter(filter.key, option)"
                        [attr.aria-pressed]="isFilterActive(filter.key, option)"
                      >
                        {{ option }}
                      </button>
                    }
                  </div>
                </div>
              }
            }
          </div>

          <div class="infra-panel__body" [@tabSwap]="selectedTabIndex()">
            @if (filteredRows(tab).length === 0) {
              <div class="infra-empty">
                <mat-icon>inventory_2</mat-icon>
                <p>{{ tab.emptyMessage ?? 'No hay recursos que coincidan con los filtros.' }}</p>
              </div>
            } @else {
              <div class="infra-resource-grid" @resourceStagger>
                @for (row of filteredRows(tab); track row.id) {
                  <article
                    class="infra-card"
                    @resourceCard
                    [class.infra-card--open]="isExpanded(row.id)"
                    tabindex="0"
                    role="button"
                    [attr.aria-expanded]="isExpanded(row.id)"
                    (click)="handleToggleExpand(row.id)"
                    (keydown.enter)="handleToggleExpand(row.id)"
                    (keydown.space)="handleToggleExpandSpace($event, row.id)"
                  >
                      <header class="infra-card__head">
                        <div class="infra-card__identity">
                          @if (row.providerLogo) {
                            <app-brand-logo [logo]="row.providerLogo" size="sm" />
                          }
                          <div>
                            <strong>{{ row.title }}</strong>
                            @if (row.subtitle) {
                              <span [class.mono]="row.subtitle.includes('.') || row.subtitle.includes('/')">
                                {{ row.subtitle }}
                              </span>
                            }
                          </div>
                        </div>
                      <span class="infra-badge" [class]="statusToneClass(row.status)">
                        {{ row.status }}
                      </span>
                    </header>

                    <dl class="infra-card__fields">
                      @for (field of row.fields; track field.label) {
                        <div>
                          <dt>{{ field.label }}</dt>
                          <dd [class.mono]="field.mono">{{ field.value }}</dd>
                        </div>
                      }
                    </dl>

                    @if (row.metrics?.length) {
                      <div class="infra-card__metrics">
                        @for (metric of row.metrics; track metric.label) {
                          <div class="infra-metric">
                            <div class="infra-metric__label">
                              <span>{{ metric.label }}</span>
                              <strong [class]="meterTextClass(metric.value)">{{ metric.value }}%</strong>
                            </div>
                            <div class="infra-bar" aria-hidden="true">
                              <i [style.width.%]="metric.value" [class]="barToneClass(metric.value)"></i>
                            </div>
                          </div>
                        }
                      </div>
                    }

                    @if (row.tags?.length) {
                      <div class="infra-card__tags">
                        @for (tag of row.tags; track tag) {
                          <span>{{ tag }}</span>
                        }
                      </div>
                    }

                    @if (row.detail) {
                      <div
                        class="infra-card__detail"
                        [@detailZone]="isExpanded(row.id) ? 'expanded' : 'collapsed'"
                      >
                        <mat-icon>info</mat-icon>
                        <p>{{ row.detail }}</p>
                      </div>
                    }

                    <footer class="infra-card__foot">
                      <span>
                        @if (row.sync) {
                          <em>{{ row.sync }}</em>
                        }
                        {{ isExpanded(row.id) ? '· Detalle expandido' : '· Clic para expandir' }}
                      </span>
                      <div class="infra-card__actions" (click)="$event.stopPropagation()">
                        <button
                          mat-icon-button
                          type="button"
                          matTooltip="Ver detalle completo"
                          aria-label="Ver detalle completo"
                          (click)="handleOpenDetail(row, tab)"
                        >
                          <mat-icon>visibility</mat-icon>
                        </button>
                        <button
                          mat-icon-button
                          type="button"
                          matTooltip="Ver logs"
                          aria-label="Ver logs"
                          (click)="handleOpenLogs(row, tab)"
                        >
                          <mat-icon>terminal</mat-icon>
                        </button>
                        <button
                          mat-icon-button
                          type="button"
                          matTooltip="Operaciones"
                          aria-label="Operaciones"
                          [matMenuTriggerFor]="resourceMenu"
                          (click)="menuRow.set(row)"
                        >
                          <mat-icon>more_vert</mat-icon>
                        </button>
                      </div>
                    </footer>
                  </article>
                }
              </div>
            }
          </div>
        </section>
      }

      <mat-menu #resourceMenu="matMenu">
        @for (op of menuRow()?.operations ?? []; track op.id) {
          <button
            mat-menu-item
            type="button"
            [disabled]="op.disabled"
            [matTooltip]="op.disabledReason ?? ''"
            [matTooltipDisabled]="!op.disabled"
            (click)="handleRunOperation(op)"
          >
            <mat-icon>{{ op.icon }}</mat-icon>
            <span>{{ op.label }}</span>
          </button>
        }
      </mat-menu>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        flex: 1;
        min-height: 0;
        overflow-x: hidden;
        overflow-y: auto;
        overscroll-behavior: contain;
      }

      .infra-page {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding: 0 0 1.5rem;
      }

      .infra-hero {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.85rem 1rem;
        border-radius: 14px;
        background: linear-gradient(
          135deg,
          color-mix(in srgb, var(--infra-accent, #ff9900) 9%, var(--app-card)),
          var(--app-card)
        );
        border: 1px solid color-mix(in srgb, var(--infra-accent, #ff9900) 24%, transparent);
      }

      .infra-hero__brand {
        display: flex;
        gap: 0.75rem;
        align-items: flex-start;
        flex: 1;
        min-width: 240px;
      }

      .infra-hero__icon {
        min-width: 44px;
        min-height: 44px;
        border-radius: 11px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        background: color-mix(in srgb, var(--infra-accent, #ff9900) 16%, var(--app-surface));
        border: 1px solid color-mix(in srgb, var(--infra-accent, #ff9900) 30%, transparent);
        padding: 0.35rem;
      }

      .infra-hero__logo-stack {
        display: flex;
        align-items: center;
        gap: 0.2rem;
      }

      .infra-hero__icon mat-icon {
        color: var(--infra-accent-deep, #c2410c);
      }

      .infra-hero__title-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.5rem;
      }

      .infra-hero h1 {
        margin: 0;
        font-size: 1.22rem;
        font-weight: 850;
        letter-spacing: -0.02em;
      }

      .infra-hero p {
        margin: 0.2rem 0 0;
        font-size: 0.72rem;
        line-height: 1.45;
        color: var(--app-text-muted);
        font-weight: 600;
        max-width: 52rem;
      }

      .infra-live {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        font-size: 0.62rem;
        font-weight: 800;
        color: #059669;
      }

      .infra-live i {
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: #10b981;
        animation: infra-live-pulse 1.8s ease-in-out infinite;
      }

      .infra-meta-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.3rem;
        margin-top: 0.55rem;
      }

      .infra-meta-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.2rem;
        padding: 0.15rem 0.45rem;
        border-radius: 6px;
        font-size: 0.58rem;
        font-weight: 750;
        background: color-mix(in srgb, var(--app-text) 4%, transparent);
        color: var(--app-text-muted);
      }

      .infra-meta-chip mat-icon {
        font-size: 12px;
        width: 12px;
        height: 12px;
      }

      .infra-meta-chip--ok {
        background: color-mix(in srgb, #10b981 12%, transparent);
        color: #059669;
      }

      .infra-meta-chip--warn {
        background: color-mix(in srgb, #f59e0b 12%, transparent);
        color: #b45309;
      }

      .infra-meta-chip--crit {
        background: color-mix(in srgb, #ef4444 12%, transparent);
        color: #dc2626;
      }

      .infra-hero__actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
      }

      .infra-btn--primary {
        background: color-mix(in srgb, var(--infra-accent, #ff9900) 14%, var(--app-card)) !important;
        border-color: color-mix(in srgb, var(--infra-accent, #ff9900) 40%, transparent) !important;
        color: var(--infra-accent-deep, #c2410c) !important;
        font-weight: 750 !important;
      }

      .infra-loading {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        padding: 0.5rem 0.75rem;
        border-radius: 10px;
        background: color-mix(in srgb, var(--infra-accent, #ff9900) 8%, var(--app-card));
        border: 1px solid color-mix(in srgb, var(--infra-accent, #ff9900) 20%, transparent);
        font-size: 0.72rem;
        font-weight: 650;
        color: var(--infra-accent-deep, #c2410c);
      }

      .infra-loading__track {
        width: 100px;
        height: 4px;
        border-radius: 999px;
        background: color-mix(in srgb, var(--app-text) 8%, transparent);
        overflow: hidden;
      }

      .infra-loading__track i {
        display: block;
        height: 100%;
        width: 40%;
        border-radius: inherit;
        background: linear-gradient(90deg, transparent, var(--infra-accent, #ff9900), transparent);
        animation: infra-load-slide 1s ease-in-out infinite;
      }

      .infra-section-nav {
        display: flex;
        flex-wrap: wrap;
        gap: 0.28rem;
        padding: 0.2rem;
        border-radius: 11px;
        background: color-mix(in srgb, var(--app-surface) 32%, var(--app-card));
        border: 1px solid color-mix(in srgb, var(--app-text) 5%, transparent);
      }

      .infra-section-nav__item {
        display: inline-flex;
        align-items: center;
        gap: 0.28rem;
        padding: 0.38rem 0.68rem;
        border: none;
        border-radius: 8px;
        background: transparent;
        font: inherit;
        font-size: 0.68rem;
        font-weight: 780;
        color: var(--app-text-muted);
        cursor: pointer;
        transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
      }

      .infra-section-nav__item mat-icon {
        font-size: 15px;
        width: 15px;
        height: 15px;
      }

      .infra-section-nav__item em {
        font-style: normal;
        font-size: 0.58rem;
        font-weight: 800;
        padding: 0.05rem 0.35rem;
        border-radius: 999px;
        background: color-mix(in srgb, var(--app-text) 6%, transparent);
      }

      .infra-section-nav__item:hover {
        transform: translateY(-1px);
        color: var(--app-text);
      }

      .infra-section-nav__item--active {
        background: var(--app-card);
        color: var(--infra-accent-deep, #c2410c);
        box-shadow: 0 1px 4px color-mix(in srgb, var(--app-text) 8%, transparent);
      }

      .infra-section-nav__item--active em {
        background: color-mix(in srgb, var(--infra-accent, #ff9900) 18%, transparent);
        color: var(--infra-accent-deep, #c2410c);
      }

      .infra-panel {
        border-radius: 12px;
        background: var(--app-card);
        border: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
        padding: 0.75rem 0.85rem;
      }

      .infra-panel__head {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.5rem;
        margin-bottom: 0.6rem;
      }

      .infra-panel__head h2 {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        margin: 0;
        font-size: 0.84rem;
        font-weight: 800;
      }

      .infra-panel__head h2 mat-icon {
        font-size: 17px;
        width: 17px;
        height: 17px;
        color: var(--infra-accent, #ff9900);
      }

      .infra-panel__head p {
        margin: 0.12rem 0 0;
        font-size: 0.64rem;
        color: var(--app-text-muted);
        font-weight: 600;
      }

      .infra-quick-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
      }

      .infra-quick-btn {
        font-size: 0.66rem !important;
        font-weight: 700 !important;
      }

      .infra-quick-btn mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        margin-right: 0.2rem;
      }

      .infra-filters {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        gap: 0.5rem 0.65rem;
        margin-bottom: 0.65rem;
        padding-bottom: 0.65rem;
        border-bottom: 1px solid color-mix(in srgb, var(--app-text) 5%, transparent);
      }

      .infra-search {
        min-width: 180px;
        flex: 1;
        max-width: 320px;
        margin: 0;
      }

      .infra-filter-block__label {
        display: block;
        font-size: 0.56rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--app-text-muted);
        margin-bottom: 0.28rem;
      }

      .infra-filter-block__pills {
        display: flex;
        flex-wrap: wrap;
        gap: 0.28rem;
      }

      .infra-pill {
        border: 1px solid color-mix(in srgb, var(--app-text) 10%, transparent);
        background: color-mix(in srgb, var(--app-surface) 40%, var(--app-card));
        color: var(--app-text-muted);
        border-radius: 999px;
        padding: 0.22rem 0.55rem;
        font-size: 0.64rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.18s ease;
      }

      .infra-pill:hover {
        border-color: color-mix(in srgb, var(--infra-accent, #ff9900) 35%, transparent);
        color: var(--infra-accent-deep, #c2410c);
      }

      .infra-pill--active {
        background: color-mix(in srgb, var(--infra-accent, #ff9900) 14%, var(--app-card));
        border-color: color-mix(in srgb, var(--infra-accent, #ff9900) 40%, transparent);
        color: var(--infra-accent-deep, #c2410c);
      }

      .infra-panel__body {
        min-height: 120px;
      }

      .infra-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.45rem;
        padding: 2.5rem 1rem;
        color: var(--app-text-muted);
        border: 1px dashed color-mix(in srgb, var(--app-text) 12%, transparent);
        border-radius: 10px;
      }

      .infra-empty mat-icon {
        opacity: 0.45;
      }

      .infra-resource-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 0.6rem;
      }

      .infra-card {
        border-radius: 11px;
        border: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
        background: color-mix(in srgb, var(--app-surface) 18%, var(--app-card));
        padding: 0.65rem 0.7rem;
        cursor: pointer;
        outline: none;
        transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
      }

      .infra-card:hover,
      .infra-card:focus-visible {
        border-color: color-mix(in srgb, var(--infra-accent, #ff9900) 28%, transparent);
        box-shadow: 0 4px 16px color-mix(in srgb, var(--app-text) 8%, transparent);
        transform: translateY(-1px);
      }

      .infra-card--open {
        border-color: color-mix(in srgb, var(--infra-accent, #ff9900) 35%, transparent);
        background: color-mix(in srgb, var(--infra-accent, #ff9900) 4%, var(--app-card));
      }

      .infra-card__head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 0.4rem;
        margin-bottom: 0.45rem;
      }

      .infra-card__identity {
        display: flex;
        align-items: flex-start;
        gap: 0.35rem;
      }

      .infra-card__identity strong {
        display: block;
        font-size: 0.8rem;
        font-weight: 800;
        line-height: 1.3;
      }

      .infra-card__identity span {
        display: block;
        margin-top: 0.1rem;
        font-size: 0.62rem;
        color: var(--app-text-muted);
        font-weight: 600;
      }

      .infra-badge {
        flex-shrink: 0;
        font-size: 0.58rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        padding: 0.12rem 0.4rem;
        border-radius: 6px;
        background: color-mix(in srgb, var(--app-text) 5%, transparent);
        color: var(--app-text-muted);
      }

      .infra-badge.infra-tone--ok {
        background: color-mix(in srgb, #10b981 14%, transparent);
        color: #059669;
      }

      .infra-badge.infra-tone--warn {
        background: color-mix(in srgb, #f59e0b 14%, transparent);
        color: #b45309;
      }

      .infra-badge.infra-tone--crit {
        background: color-mix(in srgb, #ef4444 14%, transparent);
        color: #dc2626;
      }

      .infra-card__fields {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.28rem 0.5rem;
        margin: 0 0 0.45rem;
      }

      .infra-card__fields dt {
        font-size: 0.54rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--app-text-muted);
      }

      .infra-card__fields dd {
        margin: 0.05rem 0 0;
        font-size: 0.68rem;
        font-weight: 650;
        line-height: 1.35;
        word-break: break-word;
      }

      .infra-card__metrics {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        margin-bottom: 0.45rem;
      }

      .infra-metric__label {
        display: flex;
        justify-content: space-between;
        font-size: 0.58rem;
        font-weight: 700;
        color: var(--app-text-muted);
        margin-bottom: 0.15rem;
      }

      .infra-metric__label strong {
        font-size: 0.64rem;
      }

      .infra-bar {
        height: 5px;
        border-radius: 999px;
        background: color-mix(in srgb, var(--app-text) 8%, transparent);
        overflow: hidden;
      }

      .infra-bar i {
        display: block;
        height: 100%;
        border-radius: inherit;
        transition: width 0.55s cubic-bezier(0.22, 1, 0.36, 1);
        background: linear-gradient(90deg, var(--infra-accent, #ff9900), #ffb84d);
      }

      .infra-bar .bar--ok {
        background: #10b981;
      }

      .infra-bar .bar--warn {
        background: #f59e0b;
      }

      .infra-bar .bar--crit {
        background: #ef4444;
      }

      .meter--ok {
        color: #059669;
      }

      .meter--warn {
        color: #b45309;
      }

      .meter--crit {
        color: #dc2626;
      }

      .infra-card__tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.2rem;
        margin-bottom: 0.4rem;
      }

      .infra-card__tags span {
        font-size: 0.55rem;
        font-weight: 700;
        padding: 0.08rem 0.32rem;
        border-radius: 5px;
        background: color-mix(in srgb, var(--infra-accent, #ff9900) 10%, transparent);
        color: var(--infra-accent-deep, #c2410c);
      }

      .infra-card__detail {
        display: flex;
        gap: 0.4rem;
        padding: 0.5rem 0.55rem;
        margin-bottom: 0.4rem;
        border-radius: 8px;
        background: color-mix(in srgb, var(--infra-accent, #ff9900) 7%, var(--app-card));
        border: 1px solid color-mix(in srgb, var(--infra-accent, #ff9900) 16%, transparent);
      }

      .infra-card__detail mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: var(--infra-accent, #ff9900);
        flex-shrink: 0;
      }

      .infra-card__detail p {
        margin: 0;
        font-size: 0.66rem;
        line-height: 1.45;
        color: var(--app-text);
        font-weight: 550;
      }

      .infra-card__foot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.35rem;
        padding-top: 0.35rem;
        border-top: 1px solid color-mix(in srgb, var(--app-text) 5%, transparent);
        font-size: 0.58rem;
        color: var(--app-text-muted);
        font-weight: 650;
      }

      .infra-card__foot em {
        font-style: normal;
        color: #059669;
        font-weight: 750;
      }

      .infra-card__actions {
        display: flex;
        gap: 0.1rem;
      }

      .mono {
        font-family: ui-monospace, 'JetBrains Mono', monospace;
        font-size: 0.62rem !important;
      }

      @keyframes infra-live-pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.35;
        }
      }

      @keyframes infra-load-slide {
        0% {
          transform: translateX(-120%);
        }
        100% {
          transform: translateX(320%);
        }
      }

      @media (max-width: 720px) {
        .infra-resource-grid {
          grid-template-columns: 1fr;
        }

        .infra-hero__actions {
          width: 100%;
        }

        .infra-hero__actions button {
          flex: 1;
        }
      }
    `,
  ],
})
export class InfrastructureWorkspaceComponent {
  private readonly infraActions = inject(InfrastructureActionService)

  readonly config = input.required<InfraWorkspaceConfig>()
  readonly loading = input(false)
  readonly tabIndex = input(0)
  readonly actionClick = output<string>()

  readonly selectedTabIndex = signal(0)
  readonly searchQuery = signal('')
  readonly activeFilters = signal<Record<string, string>>({})
  readonly expandedIds = signal<Set<string>>(new Set())
  readonly menuRow = signal<InfraResourceRow | null>(null)

  readonly activeTab = computed(() => {
    const tabs = this.config().tabs
    const idx = this.selectedTabIndex()
    return tabs[idx] ?? tabs[0] ?? null
  })

  private readonly tabIcons: Record<string, string> = {
    containers: 'view_in_ar',
    contenedores: 'view_in_ar',
    hosts: 'dns',
    imágenes: 'layers',
    images: 'layers',
    networks: 'hub',
    redes: 'hub',
    volumes: 'storage',
    volúmenes: 'storage',
    logs: 'article',
    pods: 'widgets',
    clusters: 'hub',
    nodes: 'memory',
    nodos: 'memory',
    namespaces: 'folder',
    deployments: 'deployed_code',
    services: 'lan',
    events: 'notifications',
    eventos: 'notifications',
    servers: 'dns',
    servidores: 'dns',
    ssh: 'vpn_key',
    servicios: 'settings',
    docker: 'view_in_ar',
    kubernetes: 'hub',
    ports: 'lan',
    puertos: 'lan',
    metrics: 'monitoring',
    métricas: 'monitoring',
    audit: 'history',
    auditoría: 'history',
    'vpc-vnet': 'account_tree',
    subredes: 'device_hub',
    'firewalls-y-sg': 'security',
    balanceadores: 'balance',
    'ips-y-dns': 'language',
    'object-storage': 'cloud_queue',
    snapshots: 'photo_camera',
    'uso-y-alertas': 'warning',
    programación: 'schedule',
    restauraciones: 'restore',
    alertas: 'error',
    recomendaciones: 'auto_graph',
    tráfico: 'swap_vert',
    escenarios: 'science',
    reservas: 'savings',
  }

  constructor() {
    effect(() => {
      this.selectedTabIndex.set(this.tabIndex())
    })
  }

  tabIcon(tabId: string): string {
    return this.tabIcons[tabId] ?? 'inventory_2'
  }

  handleActionClick(label: string): void {
    this.actionClick.emit(label)
  }

  actionContext = () => ({
    moduleId: this.config().id,
    logo: this.config().logo,
    logos: this.config().logos,
    tabId: this.activeTab()?.id ?? 'default',
  })

  handleOpenDetail(row: InfraResourceRow, tab: InfraTabConfig): void {
    this.infraActions.openResourceDetail({
      row,
      moduleId: this.config().id,
      tabId: tab.id,
      tabLabel: tab.label,
      logo: this.config().logo,
      logos: this.config().logos,
      initialTab: 0,
    })
  }

  handleOpenLogs(row: InfraResourceRow, tab: InfraTabConfig): void {
    this.infraActions.openResourceDetail({
      row,
      moduleId: this.config().id,
      tabId: tab.id,
      tabLabel: tab.label,
      logo: this.config().logo,
      logos: this.config().logos,
      initialTab: 1,
    })
  }

  handleRunOperation(op: InfraOperation): void {
    const row = this.menuRow()
    if (!row) return
    this.infraActions.runRowOperation(op, row, this.actionContext())
  }

  handleTabChange(index: number): void {
    this.selectedTabIndex.set(index)
    this.searchQuery.set('')
    this.activeFilters.set({})
    this.expandedIds.set(new Set())
  }

  handleSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement
    this.searchQuery.set(target.value)
  }

  handleToggleFilter(key: string, option: string): void {
    const current = { ...this.activeFilters() }
    if (current[key] === option) {
      delete current[key]
    } else {
      current[key] = option
    }
    this.activeFilters.set(current)
  }

  isFilterActive(key: string, option: string): boolean {
    return this.activeFilters()[key] === option
  }

  filteredRows(tab: InfraTabConfig): InfraResourceRow[] {
    const query = this.searchQuery().trim().toLowerCase()
    const filters = this.activeFilters()

    return tab.rows.filter((row) => {
      if (query) {
        const haystack = [
          row.title,
          row.subtitle ?? '',
          row.status,
          row.detail ?? '',
          ...(row.tags ?? []),
          ...row.fields.map((f) => `${f.label} ${f.value}`),
        ]
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(query)) return false
      }

      for (const [key, value] of Object.entries(filters)) {
        const field = row.fields.find((f) => f.label.toLowerCase() === key.toLowerCase())
        if (field && field.value !== value) return false
        if (!field && row.status !== value && !(row.tags ?? []).includes(value)) return false
      }

      return true
    })
  }

  handleToggleExpand(id: string): void {
    const next = new Set(this.expandedIds())
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    this.expandedIds.set(next)
  }

  handleToggleExpandSpace(event: Event, id: string): void {
    event.preventDefault()
    this.handleToggleExpand(id)
  }

  isExpanded(id: string): boolean {
    return this.expandedIds().has(id)
  }

  statusToneClass(status: string): string {
    const s = status.toLowerCase()
    if (
      s.includes('running') ||
      s.includes('activ') ||
      s.includes('ok') ||
      s.includes('healthy') ||
      s.includes('online') ||
      s.includes('complet') ||
      s.includes('success') ||
      s.includes('stream')
    ) {
      return 'infra-tone--ok'
    }
    if (
      s.includes('warn') ||
      s.includes('pend') ||
      s.includes('degrad') ||
      s.includes('sync') ||
      s.includes('partial')
    ) {
      return 'infra-tone--warn'
    }
    if (
      s.includes('stop') ||
      s.includes('error') ||
      s.includes('fail') ||
      s.includes('crit') ||
      s.includes('offline') ||
      s.includes('down')
    ) {
      return 'infra-tone--crit'
    }
    return ''
  }

  barToneClass(value: number): string {
    if (value >= 85) return 'bar--crit'
    if (value >= 70) return 'bar--warn'
    return 'bar--ok'
  }

  meterTextClass(value: number): string {
    if (value >= 85) return 'meter--crit'
    if (value >= 70) return 'meter--warn'
    return 'meter--ok'
  }
}
