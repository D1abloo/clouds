import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { NavIconComponent } from '../components/nav-icon/nav-icon.component'
import { StatusBadgeComponent } from '../components/status-badge/status-badge.component'
import type { NavLogoKey } from '../theme/nav-logo.types'

export type ObservabilityDetailDialogData = {
  title: string
  subtitle: string
  moduleId: string
  primaryLogo: NavLogoKey
  integrations: NavLogoKey[]
  kpis: { label: string; value: string; icon?: string }[]
  sections: { title: string; items: string[] }[]
  resource?: string
}

@Component({
  selector: 'app-observability-detail-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, NavIconComponent, StatusBadgeComponent],
  template: `
    <div class="obs-dlg">
      <header class="obs-dlg__head">
        <app-nav-icon [logo]="data.primaryLogo" size="lg" />
        <div>
          <span class="obs-dlg__eyebrow">{{ data.moduleId }} · Observabilidad</span>
          <h2 mat-dialog-title>{{ data.title }}</h2>
          <p class="obs-dlg__sub">{{ data.subtitle }}</p>
          @if (data.resource) { <p class="mono">{{ data.resource }}</p> }
        </div>
      </header>

      <div class="obs-dlg__integrations">
        @for (logo of data.integrations; track logo) {
          <span class="obs-dlg__logo-chip"><app-nav-icon [logo]="logo" size="sm" /></span>
        }
      </div>

      <mat-dialog-content>
        <dl class="obs-dlg__kpis">
          @for (k of data.kpis; track k.label) {
            <div>
              <dt>@if (k.icon) { <mat-icon>{{ k.icon }}</mat-icon> } {{ k.label }}</dt>
              <dd>{{ k.value }}</dd>
            </div>
          }
        </dl>
        @for (s of data.sections; track s.title) {
          <section class="obs-dlg__section">
            <h3>{{ s.title }}</h3>
            <ul>@for (item of s.items; track item) { <li>{{ item }}</li> }</ul>
          </section>
        }
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close type="button">Cerrar</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: `
    .obs-dlg { --obs-accent: #10b981; }
    .obs-dlg__head { display: flex; gap: 0.75rem; align-items: flex-start; padding-bottom: 0.65rem; border-bottom: 2px solid #10b98133; }
    h2[mat-dialog-title] { margin: 0; padding: 0; font-size: 1.05rem; font-weight: 800; }
    .obs-dlg__eyebrow { font-size: 0.62rem; font-weight: 700; text-transform: uppercase; color: #047857; }
    .obs-dlg__sub { margin: 0.2rem 0 0; font-size: 0.82rem; color: var(--app-text-muted); }
    .mono { font-family: ui-monospace, monospace; font-size: 0.72rem; color: var(--app-text-muted); margin: 0.15rem 0 0; }
    .obs-dlg__integrations { display: flex; gap: 0.35rem; padding: 0.5rem 0; flex-wrap: wrap; }
    .obs-dlg__logo-chip { padding: 0.15rem 0.35rem; border-radius: 6px; background: #fff; border: 1px solid #0000000d; }
    .obs-dlg__kpis { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.45rem; margin: 0.75rem 0;
      dt { display: flex; align-items: center; gap: 0.2rem; font-size: 0.62rem; text-transform: uppercase; color: var(--app-text-muted); mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; } }
      dd { margin: 0.1rem 0 0; font-weight: 700; font-size: 0.88rem; }
    }
    .obs-dlg__section { margin-bottom: 0.65rem; padding: 0.5rem 0.6rem; border-left: 3px solid var(--obs-accent); background: #10b98106;
      h3 { margin: 0 0 0.35rem; font-size: 0.72rem; text-transform: uppercase; color: var(--app-text-muted); }
      ul { margin: 0; padding-left: 1.1rem; font-size: 0.76rem; line-height: 1.45; }
    }
    @media (max-width: 640px) { .obs-dlg__kpis { grid-template-columns: 1fr 1fr; } }
  `,
})
export class ObservabilityDetailDialogComponent {
  readonly data = inject<ObservabilityDetailDialogData>(MAT_DIALOG_DATA)
}
