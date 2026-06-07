import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { CHANGE_RISK_LABELS, CHANGE_TYPE_LABELS } from './change-management.config'
import type { ChangeTemplate } from './change-management.demo'
import { templateLogo, templateServiceLogos } from './change-management-logo.util'
import { NavIconComponent } from '../../shared/components/nav-icon/nav-icon.component'

export interface ChangeTemplateDetailDialogData {
  template: ChangeTemplate
}

@Component({
  selector: 'app-change-template-detail-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, NavIconComponent],
  template: `
    <article class="tpl-doc">
      <header class="tpl-doc__head">
        <div class="tpl-doc__identity">
          @if (logo(); as key) {
            <app-nav-icon [logo]="key" size="lg" />
          }
          <div>
            <p class="tpl-doc__ref">{{ data.template.id }} · {{ data.template.category }}</p>
            <h2 mat-dialog-title>{{ data.template.name }}</h2>
            <p class="tpl-doc__sub">{{ data.template.description }}</p>
          </div>
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <mat-dialog-content>
        <table class="tpl-doc__meta">
          <tbody>
            <tr>
              <th>Tipo</th><td>{{ typeLabel(data.template.type) }}</td>
              <th>Riesgo</th><td>{{ riskLabel(data.template.defaultRisk) }}</td>
            </tr>
            <tr>
              <th>Duración est.</th><td>{{ data.template.estimatedDuration }}</td>
              <th>Servicios</th>
              <td>
                <span class="tpl-doc__services">
                  @for (logo of serviceLogos(); track logo) {
                    <app-nav-icon [logo]="logo" size="sm" />
                  }
                  {{ data.template.services.join(', ') }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <section class="tpl-doc__block">
          <h3>1. Pasos del procedimiento</h3>
          <ol class="tpl-doc__steps">
            @for (step of data.template.steps; track step) {
              <li>{{ step }}</li>
            }
          </ol>
        </section>

        <section class="tpl-doc__block">
          <h3>2. Plantilla de alcance</h3>
          <p>{{ data.template.scopeTemplate }}</p>
        </section>

        <section class="tpl-doc__block">
          <h3>3. Plantilla de implementación</h3>
          <pre class="tpl-doc__pre">{{ data.template.implementationTemplate }}</pre>
        </section>

        <section class="tpl-doc__block">
          <h3>4. Plantilla de rollback</h3>
          <pre class="tpl-doc__pre">{{ data.template.rollbackTemplate }}</pre>
        </section>

        <section class="tpl-doc__block">
          <h3>5. Criterios de éxito</h3>
          <p>{{ data.template.successCriteriaTemplate }}</p>
        </section>

        <section class="tpl-doc__block tpl-doc__block--last">
          <h3>6. Aprobaciones requeridas</h3>
          <ul class="tpl-doc__tags">
            @for (role of data.template.requiredApprovals; track role) {
              <li>{{ role }}</li>
            }
          </ul>
        </section>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-stroked-button mat-dialog-close type="button">Cerrar</button>
      </mat-dialog-actions>
    </article>
  `,
  styles: `
    :host { display: block; }
    :host ::ng-deep .mat-mdc-dialog-title::before { display: none; }

    .tpl-doc {
      --ink: #111827;
      --muted: #6b7280;
      --line: #d1d5db;
      min-width: 0;
      width: 100%;
      background: #fff;
      color: var(--ink);
    }
    .tpl-doc__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
      padding-bottom: 0.85rem;
      border-bottom: 1px solid var(--ink);
    }
    .tpl-doc__identity {
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
      min-width: 0;
    }
    .tpl-doc__services {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.35rem;
    }
    .tpl-doc__ref {
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
      font-size: 1.1rem;
      font-weight: 700;
      line-height: 1.3;
    }
    .tpl-doc__sub {
      margin: 0.25rem 0 0;
      font-size: 0.8rem;
      color: #374151;
      line-height: 1.45;
    }
    mat-dialog-content {
      padding-top: 0.75rem !important;
    }
    .tpl-doc__meta {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.74rem;
      margin-bottom: 1rem;
    }
    .tpl-doc__meta th,
    .tpl-doc__meta td {
      padding: 0.35rem 0.5rem;
      border: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
    }
    .tpl-doc__meta th {
      width: 11%;
      font-size: 0.6rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--muted);
      font-weight: 600;
      background: #fff;
    }
    .tpl-doc__block {
      margin-bottom: 1.1rem;
      padding-bottom: 0.85rem;
      border-bottom: 1px solid var(--line);
    }
    .tpl-doc__block--last { border-bottom: none; }
    .tpl-doc__block h3 {
      margin: 0 0 0.55rem;
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--ink);
    }
    .tpl-doc__block p {
      margin: 0;
      font-size: 0.8rem;
      line-height: 1.65;
      color: #374151;
      white-space: pre-wrap;
    }
    .tpl-doc__steps {
      margin: 0;
      padding-left: 1.25rem;
      font-size: 0.78rem;
      line-height: 1.6;
      color: #374151;
    }
    .tpl-doc__steps li { margin-bottom: 0.35rem; }
    .tpl-doc__pre {
      margin: 0;
      padding: 0.55rem 0.65rem;
      border: 1px solid var(--line);
      font-family: ui-monospace, 'JetBrains Mono', monospace;
      font-size: 0.72rem;
      line-height: 1.55;
      color: #374151;
      white-space: pre-wrap;
      background: #fff;
    }
    .tpl-doc__tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .tpl-doc__tags li {
      font-size: 0.68rem;
      font-weight: 600;
      padding: 0.2rem 0.5rem;
      border: 1px solid var(--line);
    }
    mat-dialog-actions {
      border-top: 1px solid var(--line);
      padding-top: 0.65rem;
    }
  `,
})
export class ChangeTemplateDetailDialogComponent {
  readonly data = inject<ChangeTemplateDetailDialogData>(MAT_DIALOG_DATA)

  logo = (): ReturnType<typeof templateLogo> => templateLogo(this.data.template)
  serviceLogos = (): ReturnType<typeof templateServiceLogos> => templateServiceLogos(this.data.template)

  typeLabel = (t: ChangeTemplate['type']): string => CHANGE_TYPE_LABELS[t]
  riskLabel = (r: ChangeTemplate['defaultRisk']): string => CHANGE_RISK_LABELS[r]
}
