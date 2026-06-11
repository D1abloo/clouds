import { ChangeDetectionStrategy, Component } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { FINOPS_REPORTS } from './data/mock-reports'

@Component({
  selector: 'app-finops-reports-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="page-container finops-page">
      <header class="finops-hero">
        <h1>Informes FinOps</h1>
        <p>Reportes programados para finanzas, operaciones y dirección.</p>
      </header>
      <div class="finops-grid" style="grid-template-columns: 1fr;">
        @for (r of reports; track r.id) {
          <article class="finops-card report">
            <div class="report__row">
              <div>
                <h3>{{ r.name }}</h3>
                <p>{{ r.type }} · {{ r.schedule }} · Última ejecución: {{ formatDate(r.lastRun) }}</p>
              </div>
              <button mat-stroked-button type="button"><mat-icon>download</mat-icon> {{ r.format }}</button>
            </div>
          </article>
        }
      </div>
    </div>
  `,
  styles: [`
    @import './finops-theme.scss';
    .report__row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
    h3 { margin: 0 0 0.25rem; font-size: 0.95rem; }
    p { margin: 0; font-size: 0.75rem; color: var(--finops-muted); }
  `],
})
export class FinopsReportsPageComponent {
  readonly reports = FINOPS_REPORTS
  formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}
