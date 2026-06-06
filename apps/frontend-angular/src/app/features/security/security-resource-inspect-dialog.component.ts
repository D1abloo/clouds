import { Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import { buildResourceInspect, type SecurityRisk } from './security-center.demo'

export interface SecurityResourceInspectData {
  finding: SecurityRisk
}

@Component({
  selector: 'app-security-resource-inspect-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, StatusBadgeComponent],
  template: `
    <article class="sec-res">
      <header class="sec-res__head">
        <mat-icon>dns</mat-icon>
        <div>
          <span class="sec-res__label">Inspección de recurso</span>
          <h2>{{ resource.name }}</h2>
          <p>{{ resource.type }} · {{ resource.provider }} · {{ resource.region }}</p>
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar"><mat-icon>close</mat-icon></button>
      </header>
      <mat-dialog-content class="sec-res__body">
        <dl class="sec-res__grid">
          <div><dt>Estado</dt><dd><app-status-badge [value]="resource.status" /></dd></div>
          <div><dt>Propietario</dt><dd>{{ resource.owner }}</dd></div>
        </dl>
        <section class="sec-res__section">
          <h3>Etiquetas</h3>
          <div class="sec-res__tags">
            @for (tag of resource.tags; track tag) { <span>{{ tag }}</span> }
          </div>
        </section>
        <section class="sec-res__section">
          <h3>Recursos relacionados</h3>
          <ul>
            @for (rel of resource.relatedResources; track rel) { <li class="mono">{{ rel }}</li> }
          </ul>
        </section>
        <section class="sec-res__section">
          <h3>Configuración relevante</h3>
          <pre>{{ resource.config }}</pre>
        </section>
        <section class="sec-res__section sec-res__section--warn">
          <h3>Riesgos asociados</h3>
          <ul>
            @for (risk of resource.risks; track risk) { <li>{{ risk }}</li> }
          </ul>
        </section>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-stroked-button type="button" mat-dialog-close>Cerrar</button>
      </mat-dialog-actions>
    </article>
  `,
  styles: `
    .sec-res { min-width: min(520px, 94vw); color: #0f172a; }
    .sec-res__head { display: flex; gap: 0.5rem; align-items: flex-start; padding-bottom: 0.55rem; border-bottom: 1px solid #e2e8f0; }
    .sec-res__head > mat-icon:first-child { color: #ec4899; }
    .sec-res__label { font-size: 0.58rem; font-weight: 750; text-transform: uppercase; color: #94a3b8; }
    .sec-res__head h2 { margin: 0.1rem 0 0; font-size: 0.95rem; font-weight: 700; }
    .sec-res__head p { margin: 0.1rem 0 0; font-size: 0.68rem; color: #64748b; }
    .sec-res__head button { margin-left: auto; }
    .sec-res__grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.45rem; margin: 0 0 0.65rem; }
    .sec-res__grid dt { font-size: 0.58rem; font-weight: 650; text-transform: uppercase; color: #94a3b8; }
    .sec-res__grid dd { margin: 0.08rem 0 0; font-size: 0.75rem; }
    .sec-res__section { margin-bottom: 0.65rem; }
    .sec-res__section h3 { margin: 0 0 0.35rem; font-size: 0.65rem; font-weight: 700; color: #64748b; text-transform: uppercase; }
    .sec-res__section pre { margin: 0; padding: 0.55rem; border-radius: 8px; background: #f8fafc; font-size: 0.65rem; overflow-x: auto; }
    .sec-res__section ul { margin: 0; padding-left: 1rem; font-size: 0.72rem; }
    .sec-res__section--warn { padding: 0.55rem; border-radius: 8px; background: #fef2f2; border: 1px solid #fecaca; }
    .sec-res__tags { display: flex; flex-wrap: wrap; gap: 0.25rem; }
    .sec-res__tags span { padding: 0.12rem 0.4rem; border-radius: 999px; background: #f1f5f9; font-size: 0.6rem; font-weight: 600; color: #64748b; }
    .mono { font-family: ui-monospace, monospace; font-size: 0.68rem; }
  `,
})
export class SecurityResourceInspectDialogComponent {
  readonly data = inject<SecurityResourceInspectData>(MAT_DIALOG_DATA)
  readonly resource = buildResourceInspect(this.data.finding)
}
