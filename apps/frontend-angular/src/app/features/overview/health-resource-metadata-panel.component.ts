import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'
import { ToastService } from '../../core/services/toast.service'
import {
  buildHealthMetadataJson,
  healthIncidentSection,
  healthMetadataGroups,
  healthResourceSections,
  severityLabel,
  type InstanceHealthRecord,
} from './health-center.data'

type DetailTab = 'resource' | 'incident' | 'metadata'

@Component({
  selector: 'app-health-resource-metadata-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="res-meta" [class]="'res-meta--' + record().severity" [class.res-meta--compact]="compact()">
      <header class="res-meta__shell-head">
        <div class="res-meta__shell-title">
          <mat-icon>inventory_2</mat-icon>
          <div>
            <span class="res-meta__eyebrow">Resource details and metadata</span>
            <p>Inspector del recurso · salud operativa · export JSON</p>
          </div>
        </div>
        <div class="res-meta__shell-chips">
          <span class="res-meta__chip res-meta__chip--env">{{ record().environment }}</span>
          <span class="res-meta__chip res-meta__chip--status">{{ statusLabel(record().status) }}</span>
          @if (record().alertsActive) {
            <span class="res-meta__chip res-meta__chip--alert">
              <mat-icon>notifications_active</mat-icon>
              {{ record().alertsActive }} alerta{{ record().alertsActive === 1 ? '' : 's' }}
            </span>
          }
        </div>
      </header>

      <div class="res-meta__metrics" role="list" aria-label="Métricas de salud">
        @for (m of metricItems(); track m.label) {
          <article class="res-meta__metric" [class]="'res-meta__metric--' + m.tone" role="listitem">
            <mat-icon>{{ m.icon }}</mat-icon>
            <div class="res-meta__metric-copy">
              <span>{{ m.label }}</span>
              <strong [class]="m.scoreClass">{{ m.value }}</strong>
            </div>
            @if (m.usage !== undefined) {
              <div class="res-meta__bar" aria-hidden="true">
                <i [style.width.%]="m.usage" [class]="meterTone(m.usage)"></i>
              </div>
            }
          </article>
        }
      </div>

      <nav class="res-meta__tabs" role="tablist" aria-label="Resource details and metadata">
        @for (tab of tabItems(); track tab.id) {
          <button
            type="button"
            role="tab"
            class="res-meta__tab"
            [class.res-meta__tab--active]="activeTab() === tab.id"
            [attr.aria-selected]="activeTab() === tab.id"
            (click)="setTab(tab.id)"
          >
            <mat-icon>{{ tab.icon }}</mat-icon>
            {{ tab.label }}
            @if (tab.badge) {
              <em class="res-meta__tab-badge">{{ tab.badge }}</em>
            }
          </button>
        }
      </nav>

      <div class="res-meta__panel">
        @switch (activeTab()) {
          @case ('resource') {
            <div class="res-meta__sections" role="tabpanel">
              @for (section of resourceSections(); track section.id) {
                <article class="res-meta__section">
                  <header class="res-meta__section-head">
                    <span class="res-meta__section-icon"><mat-icon>{{ section.icon }}</mat-icon></span>
                    <div>
                      <h6>{{ section.title }}</h6>
                      <span>{{ section.fields.length }} campos</span>
                    </div>
                  </header>
                  <dl class="res-meta__dl">
                    @for (field of section.fields; track field.label) {
                      <div class="res-meta__row" [class.res-meta__row--mono]="field.mono">
                        <dt>{{ field.label }}</dt>
                        <dd>
                          <span [title]="field.value">{{ field.value }}</span>
                          @if (field.copyable) {
                            <button
                              mat-icon-button
                              type="button"
                              class="res-meta__copy"
                              aria-label="Copiar Resource ID"
                              matTooltip="Copiar"
                              (click)="handleCopy(field.value)"
                            >
                              <mat-icon>content_copy</mat-icon>
                            </button>
                          }
                        </dd>
                      </div>
                    }
                  </dl>
                </article>
              }
            </div>
          }
          @case ('incident') {
            <div class="res-meta__incident" role="tabpanel">
              <div class="res-meta__alert" [class]="'res-meta__alert--' + record().severity">
                <div class="res-meta__alert-icon">
                  <mat-icon>{{ incidentIcon(record().severity) }}</mat-icon>
                </div>
                <div class="res-meta__alert-body">
                  <span>Severidad · {{ severityLabel(record().severity) }}</span>
                  <strong>{{ record().primaryIssue }}</strong>
                  <p>{{ record().recommendation }}</p>
                </div>
                <aside class="res-meta__alert-aside">
                  <em>{{ record().duration }}</em>
                  <small>{{ record().alertsActive }} alertas activas</small>
                </aside>
              </div>

              <div class="res-meta__incident-grid">
                <article class="res-meta__section res-meta__section--wide">
                  <header class="res-meta__section-head">
                    <span class="res-meta__section-icon"><mat-icon>{{ incidentSection().icon }}</mat-icon></span>
                    <div>
                      <h6>{{ incidentSection().title }}</h6>
                      <span>Resumen operativo</span>
                    </div>
                  </header>
                  <dl class="res-meta__dl res-meta__dl--grid">
                    @for (field of incidentSection().fields; track field.label) {
                      <div class="res-meta__row">
                        <dt>{{ field.label }}</dt>
                        <dd><span [title]="field.value">{{ field.value }}</span></dd>
                      </div>
                    }
                  </dl>
                </article>

                @if (record().signals.length) {
                  <div class="res-meta__findings">
                    <header>
                      <h6><mat-icon>plagiarism</mat-icon> Findings</h6>
                      <span>{{ record().signals.length }} señales</span>
                    </header>
                    <ul>
                      @for (f of record().signals; track f.id) {
                        <li [class]="'res-meta__finding--' + f.severity">
                          <div class="res-meta__finding-top">
                            <span class="res-meta__finding-label">{{ f.label }}</span>
                            <strong>{{ f.value }}</strong>
                          </div>
                          <small>{{ f.threshold }} · {{ f.detail }}</small>
                        </li>
                      }
                    </ul>
                  </div>
                }
              </div>
            </div>
          }
          @case ('metadata') {
            <div class="res-meta__metadata" role="tabpanel">
              <div class="res-meta__meta-grid">
                @for (group of metadataGroups(); track group.id) {
                  <article class="res-meta__meta-card">
                    <header>
                      <mat-icon>{{ group.icon }}</mat-icon>
                      <div>
                        <h6>{{ group.title }}</h6>
                        <span>{{ group.entries.length }} keys</span>
                      </div>
                    </header>
                    <dl>
                      @for (entry of group.entries; track entry.key) {
                        <div [class.res-meta__row--mono]="entry.mono">
                          <dt>{{ entry.key }}</dt>
                          <dd [title]="entry.value">{{ entry.value }}</dd>
                        </div>
                      }
                    </dl>
                  </article>
                }
              </div>

              <div class="res-meta__json">
                <header class="res-meta__json-head">
                  <div>
                    <h6><mat-icon>data_object</mat-icon> Raw metadata</h6>
                    <p>JSON exportable · resource, health, incident, links</p>
                  </div>
                  <button mat-stroked-button type="button" (click)="handleCopy(metadataJson())">
                    <mat-icon>content_copy</mat-icon>
                    Copiar JSON
                  </button>
                </header>
                <pre class="res-meta__json-body mono">{{ metadataJson() }}</pre>
              </div>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: `
    .res-meta {
      display: flex;
      flex-direction: column;
      gap: 0.7rem;
      padding: 0.75rem;
      border-radius: 14px;
      background:
        linear-gradient(135deg, color-mix(in srgb, var(--app-accent) 4%, var(--app-card)), var(--app-card));
      border: 1px solid color-mix(in srgb, var(--app-text) 7%, transparent);
      box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 35%, transparent);
    }
    .res-meta--warning {
      border-color: color-mix(in srgb, #f59e0b 28%, transparent);
      background:
        linear-gradient(135deg, color-mix(in srgb, #f59e0b 5%, var(--app-card)), var(--app-card));
    }
    .res-meta--critical {
      border-color: color-mix(in srgb, #ef4444 28%, transparent);
      background:
        linear-gradient(135deg, color-mix(in srgb, #ef4444 5%, var(--app-card)), var(--app-card));
    }
    .res-meta--down {
      border-color: color-mix(in srgb, #64748b 28%, transparent);
    }
    .res-meta--compact { padding: 0.65rem; gap: 0.55rem; }

    .res-meta__shell-head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.55rem 0.85rem;
      padding-bottom: 0.55rem;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
    }
    .res-meta__shell-title {
      display: flex;
      align-items: flex-start;
      gap: 0.55rem;
      min-width: 0;
    }
    .res-meta__shell-title > mat-icon {
      width: 34px;
      height: 34px;
      font-size: 20px;
      padding: 7px;
      border-radius: 10px;
      background: color-mix(in srgb, var(--app-accent) 12%, transparent);
      color: var(--app-accent);
      flex-shrink: 0;
    }
    .res-meta__eyebrow {
      display: block;
      font-size: 0.62rem;
      font-weight: 850;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      color: var(--app-accent);
      line-height: 1.2;
    }
    .res-meta__shell-title p {
      margin: 0.12rem 0 0;
      font-size: 0.64rem;
      color: var(--app-text-muted);
      font-weight: 600;
    }
    .res-meta__shell-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
      align-items: center;
    }
    .res-meta__chip {
      font-size: 0.58rem;
      font-weight: 800;
      padding: 0.16rem 0.45rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-text) 5%, var(--app-card));
      display: inline-flex;
      align-items: center;
      gap: 0.18rem;
      mat-icon { font-size: 13px; width: 13px; height: 13px; }
    }
    .res-meta__chip--env {
      background: color-mix(in srgb, #3b82f6 10%, transparent);
      color: #2563eb;
    }
    .res-meta__chip--status {
      background: color-mix(in srgb, #10b981 10%, transparent);
      color: #059669;
    }
    .res-meta__chip--alert {
      background: color-mix(in srgb, #ef4444 10%, transparent);
      color: #dc2626;
    }

    .res-meta__metrics {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0;
      border-radius: 11px;
      overflow: hidden;
      background: color-mix(in srgb, var(--app-surface) 28%, var(--app-card));
      border: 1px solid color-mix(in srgb, var(--app-text) 5%, transparent);
    }
    .res-meta__metric {
      position: relative;
      padding: 0.5rem 0.55rem 0.45rem 0.65rem;
      display: grid;
      grid-template-columns: auto 1fr;
      grid-template-rows: auto auto;
      gap: 0.12rem 0.4rem;
      align-items: center;
    }
    .res-meta__metric:not(:last-child) {
      border-right: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
    }
    .res-meta__metric mat-icon {
      grid-row: span 2;
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: var(--app-text-muted);
    }
    .res-meta__metric-copy span {
      display: block;
      font-size: 0.54rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--app-text-muted);
    }
    .res-meta__metric-copy strong {
      font-size: 0.88rem;
      font-weight: 850;
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.02em;
    }
    .res-meta__metric--score {
      background: color-mix(in srgb, var(--app-accent) 6%, transparent);
    }
    .res-meta__bar {
      grid-column: 2;
      height: 5px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-text) 8%, transparent);
      overflow: hidden;
    }
    .res-meta__bar i { display: block; height: 100%; border-radius: inherit; }
    .res-meta__bar i.meter--ok { background: linear-gradient(90deg, #059669, #10b981); }
    .res-meta__bar i.meter--warn { background: linear-gradient(90deg, #d97706, #f59e0b); }
    .res-meta__bar i.meter--crit { background: linear-gradient(90deg, #dc2626, #ef4444); }

    .score--ok { color: #059669; }
    .score--warn { color: #b45309; }
    .score--crit { color: #dc2626; }
    .score--down { color: #475569; }

    .res-meta__tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 0.15rem;
      padding: 0.18rem;
      border-radius: 11px;
      background: color-mix(in srgb, var(--app-surface) 35%, var(--app-card));
      border: 1px solid color-mix(in srgb, var(--app-text) 5%, transparent);
    }
    .res-meta__tab {
      display: inline-flex;
      align-items: center;
      gap: 0.28rem;
      padding: 0.38rem 0.7rem;
      border: none;
      border-radius: 8px;
      background: transparent;
      font-size: 0.67rem;
      font-weight: 780;
      color: var(--app-text-muted);
      cursor: pointer;
      font-family: inherit;
      transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
    }
    .res-meta__tab mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .res-meta__tab-badge {
      font-style: normal;
      font-size: 0.52rem;
      font-weight: 850;
      padding: 0.06rem 0.32rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--app-text) 8%, transparent);
      color: inherit;
    }
    .res-meta__tab--active {
      background: var(--app-card);
      color: var(--app-accent);
      box-shadow: 0 1px 5px color-mix(in srgb, var(--app-text) 10%, transparent);
    }
    .res-meta__tab--active .res-meta__tab-badge {
      background: color-mix(in srgb, var(--app-accent) 14%, transparent);
    }

    .res-meta__panel {
      padding: 0.15rem 0 0;
    }

    .res-meta__sections {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.6rem;
    }
    .res-meta__section {
      border-radius: 12px;
      border: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
      background: color-mix(in srgb, var(--app-elevated) 55%, var(--app-card));
      overflow: hidden;
    }
    .res-meta__section--wide { grid-column: 1 / -1; }
    .res-meta__section-head {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.5rem 0.6rem;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text) 5%, transparent);
      background: color-mix(in srgb, var(--app-surface) 32%, transparent);
    }
    .res-meta__section-icon {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--app-accent) 10%, transparent);
      mat-icon { font-size: 15px; width: 15px; height: 15px; color: var(--app-accent); }
    }
    .res-meta__section-head h6 {
      margin: 0;
      font-size: 0.7rem;
      font-weight: 850;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      line-height: 1.2;
    }
    .res-meta__section-head span {
      display: block;
      font-size: 0.56rem;
      color: var(--app-text-muted);
      font-weight: 650;
      margin-top: 0.05rem;
    }

    .res-meta__dl { margin: 0; padding: 0.35rem 0.55rem 0.55rem; }
    .res-meta__dl--grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0 0.75rem;
    }
    .res-meta__row {
      display: grid;
      grid-template-columns: minmax(88px, 110px) 1fr;
      gap: 0.35rem 0.65rem;
      padding: 0.32rem 0.35rem;
      border-radius: 7px;
      transition: background 0.12s ease;
    }
    .res-meta__row:hover {
      background: color-mix(in srgb, var(--app-text) 3%, transparent);
    }
    .res-meta__row dt {
      margin: 0;
      font-size: 0.62rem;
      font-weight: 700;
      color: var(--app-text-muted);
    }
    .res-meta__row dd {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.15rem;
      min-width: 0;
    }
    .res-meta__row dd span {
      font-size: 0.74rem;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .res-meta__row--mono dd span {
      font-family: ui-monospace, 'JetBrains Mono', monospace;
      font-size: 0.68rem;
    }
    .res-meta__copy {
      width: 24px !important;
      height: 24px !important;
      padding: 0 !important;
      flex-shrink: 0;
    }
    .res-meta__copy mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .res-meta__incident { display: flex; flex-direction: column; gap: 0.6rem; }
    .res-meta__alert {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 0.55rem 0.75rem;
      padding: 0.7rem 0.8rem;
      border-radius: 12px;
      border: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
      background: color-mix(in srgb, var(--app-surface) 45%, var(--app-card));
    }
    .res-meta__alert-icon {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--app-text) 5%, transparent);
      mat-icon { font-size: 1.2rem; width: 1.2rem; height: 1.2rem; }
    }
    .res-meta__alert-body span {
      display: block;
      font-size: 0.58rem;
      font-weight: 850;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--app-text-muted);
    }
    .res-meta__alert-body strong {
      display: block;
      margin-top: 0.18rem;
      font-size: 0.84rem;
      font-weight: 780;
      line-height: 1.35;
    }
    .res-meta__alert-body p {
      margin: 0.35rem 0 0;
      font-size: 0.68rem;
      color: var(--app-text-muted);
      line-height: 1.45;
    }
    .res-meta__alert-aside {
      text-align: right;
      align-self: start;
    }
    .res-meta__alert-aside em {
      display: block;
      font-style: normal;
      font-size: 0.64rem;
      font-weight: 850;
      color: var(--app-text);
    }
    .res-meta__alert-aside small {
      display: block;
      margin-top: 0.15rem;
      font-size: 0.56rem;
      color: var(--app-text-muted);
      font-weight: 650;
    }
    .res-meta__alert--warning {
      border-left: 3px solid #f59e0b;
      .res-meta__alert-icon { background: color-mix(in srgb, #f59e0b 12%, transparent); mat-icon { color: #f59e0b; } }
    }
    .res-meta__alert--critical {
      border-left: 3px solid #ef4444;
      .res-meta__alert-icon { background: color-mix(in srgb, #ef4444 12%, transparent); mat-icon { color: #ef4444; } }
    }
    .res-meta__alert--down {
      border-left: 3px solid #64748b;
      .res-meta__alert-icon { background: color-mix(in srgb, #64748b 12%, transparent); mat-icon { color: #64748b; } }
    }

    .res-meta__incident-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
      gap: 0.6rem;
      align-items: start;
    }

    .res-meta__findings header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.35rem;
      margin-bottom: 0.4rem;
    }
    .res-meta__findings h6 {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      margin: 0;
      font-size: 0.68rem;
      font-weight: 850;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--app-text-muted);
    }
    .res-meta__findings header > span {
      font-size: 0.56rem;
      font-weight: 750;
      color: var(--app-text-muted);
    }
    .res-meta__findings ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .res-meta__findings li {
      padding: 0.45rem 0.55rem;
      border-radius: 9px;
      background: color-mix(in srgb, var(--app-surface) 38%, var(--app-card));
      border: 1px solid color-mix(in srgb, var(--app-text) 5%, transparent);
      border-left: 3px solid #94a3b8;
    }
    .res-meta__finding--warning { border-left-color: #f59e0b; }
    .res-meta__finding--critical, .res-meta__finding--down { border-left-color: #ef4444; }
    .res-meta__finding-top {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 0.35rem;
    }
    .res-meta__finding-label {
      font-size: 0.58rem;
      font-weight: 800;
      text-transform: uppercase;
      color: var(--app-text-muted);
    }
    .res-meta__findings strong { font-size: 0.74rem; font-weight: 850; }
    .res-meta__findings small {
      display: block;
      font-size: 0.58rem;
      color: var(--app-text-muted);
      margin-top: 0.18rem;
      line-height: 1.35;
    }

    .res-meta__meta-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.55rem;
    }
    .res-meta__meta-card {
      border-radius: 12px;
      border: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
      background: color-mix(in srgb, var(--app-elevated) 50%, var(--app-card));
      overflow: hidden;
    }
    .res-meta__meta-card header {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.45rem 0.55rem;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text) 5%, transparent);
      background: color-mix(in srgb, var(--app-surface) 28%, transparent);
    }
    .res-meta__meta-card header mat-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
      color: var(--app-accent);
    }
    .res-meta__meta-card h6 {
      margin: 0;
      font-size: 0.66rem;
      font-weight: 850;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      line-height: 1.2;
    }
    .res-meta__meta-card header span {
      display: block;
      font-size: 0.54rem;
      color: var(--app-text-muted);
      font-weight: 650;
    }
    .res-meta__meta-card dl { margin: 0; padding: 0.35rem 0.55rem 0.5rem; }
    .res-meta__meta-card dl > div {
      display: grid;
      grid-template-columns: minmax(72px, 96px) 1fr;
      gap: 0.25rem 0.5rem;
      padding: 0.22rem 0.28rem;
      border-radius: 6px;
      font-size: 0.68rem;
    }
    .res-meta__meta-card dl > div:hover {
      background: color-mix(in srgb, var(--app-text) 3%, transparent);
    }
    .res-meta__meta-card dt { color: var(--app-text-muted); font-weight: 700; }
    .res-meta__meta-card dd {
      margin: 0;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .res-meta__json {
      margin-top: 0.35rem;
      border-radius: 12px;
      border: 1px solid color-mix(in srgb, var(--app-text) 8%, transparent);
      overflow: hidden;
      background: #0f172a;
    }
    .res-meta__json-head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.55rem 0.7rem;
      background: #020617;
      border-bottom: 1px solid rgb(255 255 255 / 8%);
    }
    .res-meta__json-head h6 {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      margin: 0;
      font-size: 0.68rem;
      font-weight: 850;
      color: #e2e8f0;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .res-meta__json-head p { margin: 0.12rem 0 0; font-size: 0.58rem; color: #94a3b8; }
    .res-meta__json-head button {
      font-size: 0.65rem;
      color: #e2e8f0;
      border-color: rgb(255 255 255 / 15%) !important;
    }
    .res-meta__json-body {
      margin: 0;
      padding: 0.8rem 0.9rem;
      max-height: 220px;
      overflow: auto;
      font-size: 0.68rem;
      line-height: 1.55;
      color: #cbd5e1;
    }
    .mono { font-family: ui-monospace, 'JetBrains Mono', monospace; }

    @media (max-width: 960px) {
      .res-meta__metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .res-meta__metric:nth-child(2) { border-right: none; }
      .res-meta__metric:nth-child(1), .res-meta__metric:nth-child(3) {
        border-bottom: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
      }
      .res-meta__sections, .res-meta__meta-grid, .res-meta__incident-grid { grid-template-columns: 1fr; }
      .res-meta__dl--grid { grid-template-columns: 1fr; }
    }
  `,
})
export class HealthResourceMetadataPanelComponent {
  private readonly toast = inject(ToastService)

  readonly record = input.required<InstanceHealthRecord>()
  readonly compact = input(false)

  readonly activeTab = signal<DetailTab>('incident')

  readonly severityLabel = severityLabel

  readonly metricItems = computed(() => {
    const r = this.record()
    return [
      {
        label: 'CPU',
        icon: 'speed',
        value: `${r.cpuPercent}%`,
        usage: r.cpuPercent,
        tone: 'usage',
        scoreClass: '',
      },
      {
        label: 'RAM',
        icon: 'memory',
        value: `${r.ramPercent}%`,
        usage: r.ramPercent,
        tone: 'usage',
        scoreClass: '',
      },
      {
        label: 'Disco',
        icon: 'storage',
        value: `${r.diskPercent}%`,
        usage: r.diskPercent,
        tone: 'usage',
        scoreClass: '',
      },
      {
        label: 'Salud',
        icon: 'favorite',
        value: `${r.healthScore}%`,
        usage: undefined,
        tone: 'score',
        scoreClass: this.scoreTone(r.healthScore),
      },
    ]
  })

  readonly tabItems = computed(() => {
    const signals = this.record().signals.length
    return [
      { id: 'resource' as DetailTab, label: 'Resource details', icon: 'dns', badge: null },
      {
        id: 'incident' as DetailTab,
        label: 'Incident',
        icon: 'report',
        badge: signals ? String(signals) : null,
      },
      { id: 'metadata' as DetailTab, label: 'Metadata', icon: 'data_object', badge: 'JSON' },
    ]
  })

  resourceSections = (): ReturnType<typeof healthResourceSections> =>
    healthResourceSections(this.record())

  incidentSection = (): ReturnType<typeof healthIncidentSection> =>
    healthIncidentSection(this.record())

  metadataGroups = (): ReturnType<typeof healthMetadataGroups> =>
    healthMetadataGroups(this.record())

  metadataJson = (): string => buildHealthMetadataJson(this.record())

  setTab = (tab: DetailTab): void => this.activeTab.set(tab)

  statusLabel = (status: string): string => {
    const map: Record<string, string> = {
      running: 'En ejecución',
      stopped: 'Detenida',
      pending: 'Pendiente',
      error: 'Error',
    }
    return map[status] ?? status
  }

  meterTone = (usage: number): string => {
    if (usage >= 88) return 'meter--crit'
    if (usage >= 72) return 'meter--warn'
    return 'meter--ok'
  }

  scoreTone = (score: number): string => {
    if (score >= 85) return 'score--ok'
    if (score >= 65) return 'score--warn'
    if (score >= 40) return 'score--crit'
    return 'score--down'
  }

  incidentIcon = (severity: string): string => {
    if (severity === 'critical') return 'error'
    if (severity === 'down') return 'cloud_off'
    return 'warning'
  }

  handleCopy = (text: string): void => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    void navigator.clipboard.writeText(text).then(() => {
      this.toast.success('Copiado al portapapeles')
    })
  }
}
