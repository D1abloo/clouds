import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { ToastService } from '../../core/services/toast.service'
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component'
import { HealthResourceMetadataPanelComponent } from './health-resource-metadata-panel.component'
import {
  buildIncidentDetail,
  severityLabel,
  type InstanceHealthRecord,
} from './health-center.data'

export interface HealthIncidentDetailDialogData {
  record: InstanceHealthRecord
}

@Component({
  selector: 'app-health-incident-detail-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    BrandLogoComponent,
    HealthResourceMetadataPanelComponent,
  ],
  template: `
    <article class="inc-doc">
      <header class="inc-doc__head">
        <div class="inc-doc__identity">
          @if (record.logo) {
            <app-brand-logo [logo]="record.logo" size="lg" />
          }
          <div>
            <p class="inc-doc__ref">{{ incident().incidentId }} · {{ incident().stateLabel }}</p>
            <h2 mat-dialog-title>{{ record.name }}</h2>
            <p class="inc-doc__sub">{{ record.primaryIssue }}</p>
          </div>
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <mat-dialog-content>
        <table class="inc-doc__meta">
          <tbody>
            <tr>
              <th>Severidad</th><td>{{ severityLabel(record.severity) }}</td>
              <th>Duración</th><td>{{ record.duration }}</td>
            </tr>
            <tr>
              <th>Recurso</th><td>{{ record.resourceType }} · {{ record.provider }}</td>
              <th>Región</th><td>{{ record.region }}</td>
            </tr>
            <tr>
              <th>Asignado</th><td>{{ incident().assignee }}</td>
              <th>Equipo</th><td>{{ incident().oncallTeam }}</td>
            </tr>
            <tr>
              <th>Apertura</th><td>{{ incident().openedAt }}</td>
              <th>Escalado</th><td>{{ incident().escalationLevel }}</td>
            </tr>
            <tr>
              <th>Salud</th><td>{{ record.healthScore }}%</td>
              <th>Próxima revisión</th><td>{{ incident().nextReview }}</td>
            </tr>
          </tbody>
        </table>

        <section class="inc-doc__block">
          <h3>1. Resumen de la incidencia</h3>
          <p>{{ incident().impact }}</p>
          <p class="inc-doc__muted">{{ incident().businessImpact }}</p>
        </section>

        <section class="inc-doc__block">
          <h3>2. Servicios afectados</h3>
          <ul class="inc-doc__tags">
            @for (svc of incident().affectedServices; track svc) {
              <li>{{ svc }}</li>
            }
          </ul>
          <p class="inc-doc__note">{{ incident().sloImpact }}</p>
        </section>

        <section class="inc-doc__block">
          <h3>3. Causa raíz</h3>
          <p>
            <span class="inc-doc__badge">{{ incident().rootCauseConfidence }}</span>
            {{ incident().rootCause }}
          </p>
        </section>

        <section class="inc-doc__block">
          <h3>4. Plan de remediación</h3>
          <ol class="inc-doc__steps">
            @for (step of incident().remediation; track $index) {
              <li>{{ step }}</li>
            }
          </ol>
          <p class="inc-doc__runbook">
            Runbook sugerido:
            <a [routerLink]="incident().runbook.route" mat-dialog-close>{{ incident().runbook.name }}</a>
            <span class="mono">({{ incident().runbook.id }})</span>
          </p>
        </section>

        <section class="inc-doc__block">
          <h3>5. Timeline</h3>
          <ol class="inc-doc__timeline">
            @for (step of incident().timeline; track step.label + step.at) {
              <li [attr.data-status]="step.status">
                <div class="inc-doc__timeline-head">
                  <strong>{{ step.label }}</strong>
                  <time>{{ step.at }}</time>
                </div>
                @if (step.actor) { <span class="inc-doc__timeline-actor">{{ step.actor }}</span> }
                @if (step.note) { <p>{{ step.note }}</p> }
              </li>
            }
          </ol>
        </section>

        <section class="inc-doc__block">
          <h3>6. Alertas relacionadas</h3>
          <table class="inc-doc__alerts">
            <thead>
              <tr><th>ID</th><th>Alerta</th><th>Desde</th><th>Severidad</th></tr>
            </thead>
            <tbody>
              @for (a of incident().relatedAlerts; track a.id) {
                <tr>
                  <td class="mono">{{ a.id }}</td>
                  <td>{{ a.title }}</td>
                  <td>{{ a.since }}</td>
                  <td>{{ a.severity }}</td>
                </tr>
              }
            </tbody>
          </table>
        </section>

        <section class="inc-doc__block">
          <h3>7. Señales detectadas</h3>
          <ul class="inc-doc__findings">
            @for (sig of record.signals; track sig.id) {
              <li>
                <span>{{ sig.label }}</span>
                <strong>{{ sig.value }}</strong>
                <small>{{ sig.threshold }} · {{ sig.detail }}</small>
              </li>
            }
          </ul>
        </section>

        <section class="inc-doc__block inc-doc__block--resource">
          <button type="button" class="inc-doc__toggle" (click)="toggleResource()">
            <mat-icon>{{ showResource() ? 'expand_less' : 'expand_more' }}</mat-icon>
            Detalle del recurso y metadatos
          </button>
          @if (showResource()) {
            <app-health-resource-metadata-panel [record]="record" [compact]="true" />
          }
        </section>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-stroked-button type="button" (click)="handleCopyIncidentId()">
          <mat-icon>content_copy</mat-icon>
          Copiar {{ incident().incidentId }}
        </button>
        <a mat-stroked-button [routerLink]="incident().runbook.route" mat-dialog-close>
          <mat-icon>menu_book</mat-icon>
          Runbook
        </a>
        <a mat-stroked-button [routerLink]="record.route" mat-dialog-close>Abrir recurso</a>
        <button mat-stroked-button mat-dialog-close type="button">Cerrar</button>
      </mat-dialog-actions>
    </article>
  `,
  styles: `
    :host { display: block; }
    :host ::ng-deep .mat-mdc-dialog-title::before { display: none; }

    .inc-doc {
      --ink: #111827;
      --muted: #6b7280;
      --line: #d1d5db;
      min-width: min(820px, 96vw);
      background: #fff;
      color: var(--ink);
    }
    .inc-doc__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
      padding-bottom: 0.85rem;
      border-bottom: 1px solid var(--ink);
    }
    .inc-doc__identity {
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
      min-width: 0;
    }
    .inc-doc__ref {
      margin: 0 0 0.2rem;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--muted);
    }
    h2[mat-dialog-title] {
      margin: 0;
      padding: 0;
      font-size: 1.15rem;
      font-weight: 700;
      line-height: 1.3;
    }
    .inc-doc__sub {
      margin: 0.25rem 0 0;
      font-size: 0.8rem;
      color: #374151;
      line-height: 1.45;
    }
    mat-dialog-content {
      max-height: min(74vh, 720px);
      padding-top: 0.75rem !important;
    }
    .inc-doc__meta {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.74rem;
      margin-bottom: 1rem;
    }
    .inc-doc__meta th,
    .inc-doc__meta td {
      padding: 0.35rem 0.5rem;
      border: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
    }
    .inc-doc__meta th {
      width: 11%;
      font-size: 0.6rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--muted);
      font-weight: 600;
      background: #fff;
    }
    .inc-doc__block {
      margin-bottom: 1.1rem;
      padding-bottom: 0.85rem;
      border-bottom: 1px solid var(--line);
    }
    .inc-doc__block h3 {
      margin: 0 0 0.55rem;
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--ink);
    }
    .inc-doc__block p {
      margin: 0 0 0.5rem;
      font-size: 0.8rem;
      line-height: 1.65;
      color: #374151;
    }
    .inc-doc__muted { color: var(--muted) !important; font-size: 0.76rem !important; }
    .inc-doc__tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin: 0 0 0.5rem;
      padding: 0;
      list-style: none;
    }
    .inc-doc__tags li {
      font-size: 0.68rem;
      font-weight: 600;
      padding: 0.2rem 0.5rem;
      border: 1px solid var(--line);
    }
    .inc-doc__note {
      margin: 0;
      padding: 0.45rem 0.55rem;
      font-size: 0.74rem;
      border: 1px solid var(--ink);
      background: #fff;
    }
    .inc-doc__badge {
      display: inline-block;
      margin-right: 0.35rem;
      font-size: 0.58rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.1rem 0.35rem;
      border: 1px solid var(--line);
      color: var(--muted);
    }
    .inc-doc__steps {
      margin: 0 0 0.55rem;
      padding-left: 1.25rem;
      font-size: 0.78rem;
      line-height: 1.6;
      color: #374151;
    }
    .inc-doc__steps li { margin-bottom: 0.35rem; }
    .inc-doc__runbook {
      margin: 0;
      font-size: 0.74rem;
      color: var(--muted);
      a { color: var(--ink); font-weight: 600; }
    }
    .inc-doc__timeline {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }
    .inc-doc__timeline li {
      padding: 0.45rem 0.55rem;
      border: 1px solid var(--line);
      font-size: 0.76rem;
    }
    .inc-doc__timeline li[data-status='active'] {
      border-color: var(--ink);
      border-left-width: 3px;
    }
    .inc-doc__timeline-head {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
      strong { font-weight: 700; color: var(--ink); }
      time { font-size: 0.65rem; color: var(--muted); white-space: nowrap; }
    }
    .inc-doc__timeline-actor {
      display: block;
      font-size: 0.62rem;
      color: var(--muted);
      margin-top: 0.15rem;
    }
    .inc-doc__timeline p {
      margin: 0.25rem 0 0;
      font-size: 0.72rem;
      color: #374151;
    }
    .inc-doc__alerts {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.72rem;
    }
    .inc-doc__alerts th,
    .inc-doc__alerts td {
      padding: 0.38rem 0.5rem;
      border: 1px solid var(--line);
      text-align: left;
    }
    .inc-doc__alerts th {
      font-size: 0.58rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      font-weight: 700;
      border-color: var(--ink);
    }
    .inc-doc__findings {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .inc-doc__findings li {
      padding: 0.4rem 0.5rem;
      border: 1px solid var(--line);
      font-size: 0.72rem;
    }
    .inc-doc__findings span {
      display: block;
      font-size: 0.58rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--muted);
      font-weight: 700;
    }
    .inc-doc__findings strong { display: block; margin-top: 0.1rem; font-weight: 700; }
    .inc-doc__findings small {
      display: block;
      margin-top: 0.15rem;
      color: var(--muted);
      font-size: 0.65rem;
    }
    .inc-doc__toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      margin-bottom: 0.55rem;
      padding: 0;
      border: none;
      background: none;
      font-size: 0.74rem;
      font-weight: 700;
      color: var(--ink);
      cursor: pointer;
      font-family: inherit;
    }
    .inc-doc__block--resource { border-bottom: none; }
    .mono {
      font-family: ui-monospace, 'JetBrains Mono', monospace;
      font-size: 0.65rem;
    }
    mat-dialog-actions {
      border-top: 1px solid var(--line);
      padding-top: 0.65rem;
      gap: 0.4rem;
    }
    @media (max-width: 720px) {
      .inc-doc__meta { font-size: 0.68rem; }
      .inc-doc__meta th, .inc-doc__meta td { display: block; width: 100%; }
      .inc-doc__meta tr { display: block; margin-bottom: 0.35rem; }
    }
  `,
})
export class HealthIncidentDetailDialogComponent {
  readonly data = inject<HealthIncidentDetailDialogData>(MAT_DIALOG_DATA)
  private readonly toast = inject(ToastService)

  readonly record = this.data.record
  readonly severityLabel = severityLabel
  readonly showResource = signal(false)

  readonly incident = computed(() => this.record.incident ?? buildIncidentDetail(this.record))

  toggleResource = (): void => this.showResource.update((v) => !v)

  handleCopyIncidentId = (): void => {
    const id = this.incident().incidentId
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    void navigator.clipboard.writeText(id).then(() => {
      this.toast.success(`${id} copiado`)
    })
  }
}
