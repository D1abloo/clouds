import { DatePipe } from '@angular/common'
import { Component, Input, output } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { StatusBadgeComponent } from '../shared/components/status-badge/status-badge.component'
import { BrandLogoComponent } from '../shared/components/brand-logo/brand-logo.component'
import type { NavLogoKey } from '../shared/theme/nav-logo.types'
import type { TerraformLaunchDetail } from './terraform-launches.data'

@Component({
  selector: 'app-terraform-launch-studio',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatIconModule, StatusBadgeComponent, BrandLogoComponent],
  template: `
    <div class="launch-studio">
      <header class="launch-studio__head">
        <div>
          <h2>Lanzamientos</h2>
          <p>Demos de pipelines Terraform — progreso, plan, planteamiento y logs.</p>
        </div>
        <button mat-flat-button color="primary" type="button" (click)="openLaunch.emit()">
          <mat-icon>rocket_launch</mat-icon>
          Nuevo lanzamiento
        </button>
      </header>

      <div class="launch-studio__layout">
        <aside class="launch-studio__list" aria-label="Lista de lanzamientos">
          @for (launch of launches; track launch.id) {
            <button
              type="button"
              class="launch-card"
              [class.launch-card--on]="selectedLaunchId === launch.id"
              (click)="launchSelect.emit(launch.id)"
            >
              <div class="launch-card__top">
                <app-brand-logo [logo]="providerLogo(launch.provider)" size="sm" />
                <div class="launch-card__title">
                  <strong>{{ launch.instanceName }}</strong>
                  <span>{{ launch.name }}</span>
                </div>
                <span class="launch-card__pct">{{ launch.progressPercent }}%</span>
              </div>
              <div class="launch-card__meta">
                <app-status-badge [value]="launch.status" />
                <span>{{ launch.workspaceName }}</span>
                <span>{{ launch.createdAt | date: 'dd MMM, HH:mm' }}</span>
              </div>
              <div class="launch-card__bar" role="presentation">
                <span [style.width.%]="launch.progressPercent"></span>
              </div>
            </button>
          }
        </aside>

        @if (selectedLaunch; as L) {
          <article class="launch-studio__detail">
            <header class="launch-detail__hero">
              <div class="launch-detail__brands">
                <app-brand-logo [logo]="providerLogo(L.provider)" size="lg" />
                <mat-icon>arrow_forward</mat-icon>
                <app-brand-logo logo="terraform" size="lg" />
              </div>
              <div class="launch-detail__hero-copy">
                <span class="launch-detail__eyebrow">{{ L.name }}</span>
                <h3>{{ L.instanceName }}</h3>
                <p>{{ L.summary }}</p>
              </div>
              <div class="launch-detail__hero-pct">
                <span class="launch-detail__pct-val">{{ L.progressPercent }}%</span>
                <span>completado</span>
                <app-status-badge [value]="L.status" />
              </div>
            </header>

            <div class="launch-detail__facts">
              <div><span>Región</span><strong class="mono">{{ L.region }}</strong></div>
              <div><span>Tipo</span><strong class="mono">{{ L.instanceType }}</strong></div>
              <div><span>Coste est.</span><strong>{{ L.monthlyCostUsd }} USD/mes</strong></div>
              <div><span>Duración</span><strong>{{ L.durationLabel }}</strong></div>
              <div><span>Workspace</span><strong class="mono">{{ L.workspaceName }}</strong></div>
              <div><span>Carpeta</span><strong class="mono">{{ L.folderPath }}</strong></div>
              <div><span>Disparado por</span><strong>{{ L.triggeredBy }}</strong></div>
              <div><span>Plan</span><strong>{{ L.planSummary }}</strong></div>
            </div>

            <div class="launch-detail__plan-stats">
              <span class="launch-detail__stat launch-detail__stat--add">+{{ L.planStats.add }} crear</span>
              <span class="launch-detail__stat launch-detail__stat--mod">~{{ L.planStats.change }} cambiar</span>
              <span class="launch-detail__stat launch-detail__stat--del">−{{ L.planStats.destroy }} destruir</span>
            </div>

            <section class="launch-detail__section">
              <h4><mat-icon>architecture</mat-icon> Planteamiento</h4>
              <ul>
                @for (line of L.approach; track line) {
                  <li>{{ line }}</li>
                }
              </ul>
            </section>

            <section class="launch-detail__section">
              <h4><mat-icon>linear_scale</mat-icon> Pipeline ({{ L.progressPercent }}% global)</h4>
              <div
                class="launch-detail__overall"
                role="progressbar"
                [attr.aria-valuenow]="L.progressPercent"
                aria-valuemin="0"
                aria-valuemax="100"
              >
                <span [style.width.%]="L.progressPercent"></span>
              </div>
              <ol class="launch-detail__phases">
                @for (ph of L.phases; track ph.id) {
                  <li class="launch-detail__phase" [attr.data-status]="ph.status">
                    <mat-icon>{{ phaseIcon(ph.status) }}</mat-icon>
                    <div>
                      <strong>{{ ph.label }}</strong>
                      <span>{{ ph.weight }}% del total · fase {{ ph.percent }}%</span>
                      @if (ph.detail) {
                        <span class="launch-detail__phase-detail">{{ ph.detail }}</span>
                      }
                    </div>
                  </li>
                }
              </ol>
            </section>

            <section class="launch-detail__section launch-detail__section--logs">
              <h4><mat-icon>terminal</mat-icon> Registro</h4>
              <pre class="launch-detail__logs mono">{{ launchLogsText(L) }}</pre>
            </section>
          </article>
        } @else {
          <div class="launch-studio__empty">
            <mat-icon>rocket_launch</mat-icon>
            <p>Selecciona un lanzamiento de la lista o crea uno nuevo.</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      width: 100%;
    }
    .launch-studio {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      overflow: hidden;
      gap: 0.65rem;
    }
    .launch-studio__head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      flex-shrink: 0;
      padding: 0 0.1rem;
    }
    .launch-studio__head h2 {
      margin: 0 0 0.2rem;
      font-size: 1.05rem;
      font-weight: 700;
    }
    .launch-studio__head p {
      margin: 0;
      font-size: 0.78rem;
      color: var(--app-text-muted);
    }
    .launch-studio__layout {
      display: grid;
      grid-template-columns: minmax(280px, 320px) minmax(0, 1fr);
      gap: 0.75rem;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
    @media (max-width: 900px) {
      .launch-studio__layout {
        grid-template-columns: 1fr;
        overflow-y: auto;
      }
    }
    .launch-studio__list {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding-right: 0.2rem;
      scrollbar-width: thin;
    }
    .launch-card {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      padding: 0.6rem 0.65rem;
      border: none;
      border-radius: var(--app-radius-md);
      background: var(--app-elevated);
      font: inherit;
      color: inherit;
      text-align: left;
      cursor: pointer;
      width: 100%;
      transition: background 0.15s ease;
    }
    .launch-card:hover,
    .launch-card--on {
      background: color-mix(in srgb, #844fba 12%, var(--app-elevated));
    }
    .launch-card__top {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }
    .launch-card__title {
      flex: 1;
      min-width: 0;
    }
    .launch-card__title strong {
      display: block;
      font-size: 0.8rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .launch-card__title span {
      display: block;
      font-size: 0.65rem;
      color: var(--app-text-muted);
    }
    .launch-card__pct {
      font-size: 0.95rem;
      font-weight: 800;
      color: #844fba;
      flex-shrink: 0;
    }
    .launch-card__meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.62rem;
      color: var(--app-text-muted);
    }
    .launch-card__bar {
      height: 4px;
      border-radius: 999px;
      background: var(--app-surface);
      overflow: hidden;
    }
    .launch-card__bar span {
      display: block;
      height: 100%;
      background: linear-gradient(90deg, #6b3fa0, #844fba);
      border-radius: 999px;
    }
    .launch-studio__detail,
    .launch-studio__empty {
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-width: thin;
    }
    .launch-studio__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      color: var(--app-text-muted);
      padding: 2rem;
    }
    .launch-studio__empty mat-icon {
      font-size: 2.5rem;
      width: 2.5rem;
      height: 2.5rem;
      color: #844fba;
      opacity: 0.5;
    }
    .launch-detail__hero {
      display: flex;
      flex-wrap: wrap;
      gap: 0.85rem;
      padding: 0.85rem 1rem;
      border-radius: var(--app-radius-md);
      background: var(--app-elevated);
      margin-bottom: 0.65rem;
    }
    .launch-detail__brands {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .launch-detail__brands mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: var(--app-text-muted);
    }
    .launch-detail__hero-copy {
      flex: 1;
      min-width: 200px;
    }
    .launch-detail__eyebrow {
      display: block;
      font-size: 0.62rem;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--app-text-muted);
      margin-bottom: 0.15rem;
    }
    .launch-detail__hero-copy h3 {
      margin: 0 0 0.25rem;
      font-size: 1.15rem;
    }
    .launch-detail__hero-copy p {
      margin: 0;
      font-size: 0.78rem;
      color: var(--app-text-muted);
      line-height: 1.45;
    }
    .launch-detail__hero-pct {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.25rem;
    }
    .launch-detail__pct-val {
      font-size: 2rem;
      font-weight: 800;
      color: #844fba;
      line-height: 1;
    }
    .launch-detail__hero-pct > span:not(.launch-detail__pct-val) {
      font-size: 0.62rem;
      color: var(--app-text-muted);
      text-transform: uppercase;
    }
    .launch-detail__facts {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 0.45rem;
      margin-bottom: 0.65rem;
    }
    .launch-detail__facts div {
      padding: 0.45rem 0.55rem;
      border-radius: var(--app-radius-md);
      background: var(--app-elevated);
      font-size: 0.68rem;
    }
    .launch-detail__facts span {
      display: block;
      color: var(--app-text-muted);
      text-transform: uppercase;
      font-size: 0.58rem;
      font-weight: 600;
      margin-bottom: 0.12rem;
    }
    .launch-detail__facts strong {
      display: block;
      font-size: 0.74rem;
      word-break: break-word;
    }
    .launch-detail__plan-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      margin-bottom: 0.65rem;
    }
    .launch-detail__stat {
      padding: 0.3rem 0.55rem;
      border-radius: 6px;
      font-size: 0.72rem;
      font-weight: 700;
      background: var(--app-elevated);
    }
    .launch-detail__stat--add { color: #15803d; }
    .launch-detail__stat--mod { color: #b45309; }
    .launch-detail__stat--del { color: #b91c1c; }
    .launch-detail__section {
      margin-bottom: 0.75rem;
    }
    .launch-detail__section h4 {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0 0 0.45rem;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--app-text-muted);
    }
    .launch-detail__section h4 mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: #844fba;
    }
    .launch-detail__section ul {
      margin: 0;
      padding-left: 1.1rem;
      font-size: 0.78rem;
      line-height: 1.5;
      color: var(--app-text-muted);
    }
    .launch-detail__overall {
      height: 8px;
      border-radius: 999px;
      background: var(--app-elevated);
      overflow: hidden;
      margin-bottom: 0.55rem;
    }
    .launch-detail__overall span {
      display: block;
      height: 100%;
      background: linear-gradient(90deg, #6b3fa0, #844fba);
      border-radius: 999px;
    }
    .launch-detail__phases {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .launch-detail__phase {
      display: flex;
      gap: 0.45rem;
      padding: 0.45rem 0.55rem;
      border-radius: var(--app-radius-md);
      background: var(--app-elevated);
      font-size: 0.72rem;
    }
    .launch-detail__phase mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      flex-shrink: 0;
      color: var(--app-text-muted);
    }
    .launch-detail__phase[data-status='active'] {
      background: color-mix(in srgb, #844fba 12%, var(--app-elevated));
    }
    .launch-detail__phase[data-status='active'] mat-icon { color: #844fba; }
    .launch-detail__phase[data-status='done'] mat-icon { color: #22c55e; }
    .launch-detail__phase[data-status='error'] mat-icon { color: #ef4444; }
    .launch-detail__phase strong { display: block; }
    .launch-detail__phase span { display: block; color: var(--app-text-muted); font-size: 0.65rem; }
    .launch-detail__phase-detail {
      color: #844fba !important;
      font-weight: 600;
    }
    .launch-detail__logs {
      margin: 0;
      padding: 0.65rem 0.75rem;
      border-radius: var(--app-radius-md);
      background: #0d1117;
      color: #c9d1d9;
      font-size: 11px;
      line-height: 1.55;
      max-height: min(420px, 42vh);
      overflow: auto;
    }
    .mono {
      font-family: var(--app-font-mono, ui-monospace, monospace);
    }
  `,
})
export class TerraformLaunchStudioComponent {
  @Input() launches: TerraformLaunchDetail[] = []
  @Input() selectedLaunchId: string | null = null
  @Input() selectedLaunch: TerraformLaunchDetail | null = null

  readonly launchSelect = output<string>()
  readonly openLaunch = output<void>()

  providerLogo = (p: string): NavLogoKey => {
    if (p === 'GCP') return 'gcp'
    if (p === 'AZURE') return 'azure'
    return 'aws'
  }

  launchLogsText = (launch: TerraformLaunchDetail): string => launch.logs.join('\n')

  phaseIcon = (status: string): string => {
    if (status === 'done') return 'check_circle'
    if (status === 'active') return 'sync'
    if (status === 'error') return 'error'
    return 'radio_button_unchecked'
  }
}
