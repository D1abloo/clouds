import { Component } from '@angular/core'
import { RouterLink } from '@angular/router'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { ChartCardComponent } from '../../../shared/ui/chart-card.component'
import { MiniChartComponent } from '../../../shared/components/mini-chart/mini-chart.component'

@Component({
  selector: 'app-dashboard-insights-grid',
  standalone: true,
  imports: [RouterLink, MatIconModule, MatButtonModule, ChartCardComponent, MiniChartComponent],
  template: `
    <div class="insights-grid">
      <section class="insight-card insight-card--health">
        <header class="insight-card__head">
          <h3>Salud de la plataforma</h3>
          <a mat-button routerLink="/health-center">Ver detalle</a>
        </header>
        <div class="health-layout">
          <div class="health-donut">
            <app-mini-chart
              title=""
              kind="donut"
              [data]="healthDonut"
              centerLabel=""
              [animated]="true"
            />
            <div class="health-donut__label">
              <strong>86%</strong>
              <span>Salud general · Buena</span>
            </div>
          </div>
          <ul class="health-legend">
            @for (item of healthLegend; track item.label) {
              <li>
                <span [style.background]="item.color"></span>
                <div>
                  <em>{{ item.label }}</em>
                  <small>{{ item.detail }}</small>
                </div>
              </li>
            }
          </ul>
        </div>
      </section>

      <section class="insight-card">
        <header class="insight-card__head">
          <h3>Costos por nube</h3>
        </header>
        <app-chart-card
          size="compact"
          [flat]="true"
          title=""
          kind="line"
          accent="green"
          unit=""
          [data]="costTrend"
          [secondaryData]="costTrendGcp"
          [showShare]="false"
        />
        <div class="cloud-legend">
          @for (c of cloudLegend; track c.label) {
            <span><i [style.background]="c.color"></i>{{ c.label }}</span>
          }
        </div>
      </section>

      <section class="insight-card insight-card--topology">
        <header class="insight-card__head">
          <h3>Mapa de topología</h3>
          <a mat-button routerLink="/topology-map">Abrir mapa</a>
        </header>
        <div class="topology" aria-label="Diagrama de arquitectura">
          @for (node of topologyNodes; track node.id) {
            <div class="topology__node" [style.gridArea]="node.area">
              <mat-icon>{{ node.icon }}</mat-icon>
              <span>{{ node.label }}</span>
            </div>
          }
        </div>
      </section>

      <section class="insight-card">
        <header class="insight-card__head">
          <h3>Notificaciones recientes</h3>
          <a mat-button routerLink="/notifications/all">Ver todas</a>
        </header>
        <ul class="notif-feed">
          @for (n of notifications; track n.title) {
            <li [class]="'notif-feed__item notif-feed__item--' + n.tone">
              <mat-icon>{{ n.icon }}</mat-icon>
              <div>
                <strong>{{ n.title }}</strong>
                <small>{{ n.time }}</small>
              </div>
            </li>
          }
        </ul>
      </section>

      <section class="insight-card insight-card--wide">
        <header class="insight-card__head">
          <h3>Incidentes y alertas</h3>
          <a mat-button routerLink="/alerts/active">Ver alertas</a>
        </header>
        <table class="incidents-table">
          <thead>
            <tr>
              <th>Severidad</th>
              <th>Título</th>
              <th>Recurso</th>
              <th>Tiempo</th>
            </tr>
          </thead>
          <tbody>
            @for (row of incidents; track row.title) {
              <tr>
                <td><span class="sev" [class]="'sev--' + row.severity.toLowerCase()">{{ row.severity }}</span></td>
                <td>{{ row.title }}</td>
                <td>{{ row.resource }}</td>
                <td>{{ row.time }}</td>
              </tr>
            }
          </tbody>
        </table>
      </section>

      <section class="insight-card">
        <header class="insight-card__head">
          <h3>Actividad CI/CD</h3>
          <a mat-button routerLink="/jenkins">Jenkins</a>
        </header>
        <ol class="pipeline">
          @for (step of pipelineSteps; track step.label) {
            <li [class]="'pipeline__step pipeline__step--' + step.state">
              <span class="pipeline__dot">
                @if (step.state === 'done') { <mat-icon>check</mat-icon> }
                @else if (step.state === 'active') { <mat-icon>sync</mat-icon> }
                @else { <mat-icon>schedule</mat-icon> }
              </span>
              <div>
                <strong>{{ step.label }}</strong>
                <small>{{ step.hint }}</small>
              </div>
            </li>
          }
        </ol>
      </section>

      <section class="insight-card">
        <header class="insight-card__head">
          <h3>Rendimiento de instancias</h3>
        </header>
        @for (m of perfMetrics; track m.label) {
          <div class="perf-row">
            <div class="perf-row__head">
              <span>{{ m.label }}</span>
              <strong>{{ m.value }}%</strong>
            </div>
            <svg viewBox="0 0 200 24" class="perf-row__spark" preserveAspectRatio="none" aria-hidden="true">
              <polyline [attr.points]="spark(m.data)" fill="none" [attr.stroke]="m.color" stroke-width="2" />
            </svg>
          </div>
        }
      </section>

      <section class="insight-card">
        <header class="insight-card__head">
          <h3>Recomendaciones de optimización</h3>
        </header>
        <ul class="reco-list">
          @for (r of recommendations; track r.title) {
            <li>
              <div>
                <strong>{{ r.title }}</strong>
                <small>{{ r.detail }}</small>
              </div>
              <span class="reco-tag" [class]="'reco-tag--' + r.impact">{{ r.impactLabel }}</span>
            </li>
          }
        </ul>
      </section>
    </div>
  `,
  styles: `
    .insights-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.75rem;
    }
    .insight-card {
      padding: 0.85rem 0.95rem;
      border-radius: 14px;
      background: var(--app-card);
      border: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
      box-shadow: 0 1px 3px color-mix(in srgb, var(--app-text) 5%, transparent);
      min-width: 0;
    }
    .insight-card--wide { grid-column: span 2; }
    .insight-card--health { grid-column: span 1; }
    .insight-card--topology { grid-column: span 1; }
    .insight-card__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.65rem;
      h3 { margin: 0; font-size: 0.82rem; font-weight: 750; letter-spacing: -0.01em; }
      a { font-size: 0.65rem; min-height: 28px; }
    }
    .health-layout { display: flex; flex-direction: column; gap: 0.65rem; }
    .health-donut { position: relative; }
    .health-donut__label {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      strong { font-size: 1.1rem; font-weight: 800; }
      span { font-size: 0.62rem; color: var(--app-text-muted); }
    }
    .health-legend {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      li {
        display: flex;
        align-items: center;
        gap: 0.45rem;
        span:first-child { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        em { display: block; font-style: normal; font-size: 0.68rem; font-weight: 650; }
        small { font-size: 0.6rem; color: var(--app-text-muted); }
      }
    }
    .cloud-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem 0.75rem;
      margin-top: 0.35rem;
      font-size: 0.62rem;
      color: var(--app-text-muted);
      i { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 0.25rem; vertical-align: middle; }
    }
    .topology {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      grid-template-rows: repeat(4, auto);
      gap: 0.35rem;
      padding: 0.25rem 0;
    }
    .topology__node {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.15rem;
      padding: 0.4rem 0.25rem;
      border-radius: 10px;
      background: color-mix(in srgb, var(--app-surface) 50%, var(--app-card));
      border: 1px solid color-mix(in srgb, var(--app-text) 5%, transparent);
      font-size: 0.58rem;
      font-weight: 650;
      text-align: center;
      mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; color: var(--app-accent); opacity: 0.85; }
    }
    .notif-feed {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }
    .notif-feed__item {
      display: flex;
      gap: 0.5rem;
      align-items: flex-start;
      padding: 0.45rem 0.5rem;
      border-radius: 10px;
      background: color-mix(in srgb, var(--app-text) 2.5%, transparent);
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; margin-top: 0.1rem; }
      strong { display: block; font-size: 0.72rem; font-weight: 650; }
      small { font-size: 0.6rem; color: var(--app-text-muted); }
    }
    .notif-feed__item--warn mat-icon { color: #f59e0b; }
    .notif-feed__item--ok mat-icon { color: #10b981; }
    .notif-feed__item--info mat-icon { color: #3b82f6; }
    .incidents-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.68rem;
      th {
        text-align: left;
        font-size: 0.58rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--app-text-muted);
        padding: 0.35rem 0.45rem;
        border-bottom: 1px solid color-mix(in srgb, var(--app-text) 6%, transparent);
      }
      td { padding: 0.45rem; border-bottom: 1px solid color-mix(in srgb, var(--app-text) 4%, transparent); }
    }
    .sev {
      display: inline-block;
      font-size: 0.55rem;
      font-weight: 800;
      padding: 0.15rem 0.4rem;
      border-radius: 999px;
      text-transform: uppercase;
    }
    .sev--critical { background: color-mix(in srgb, #ef4444 14%, transparent); color: #ef4444; }
    .sev--warning { background: color-mix(in srgb, #f59e0b 14%, transparent); color: #d97706; }
    .sev--info { background: color-mix(in srgb, #3b82f6 14%, transparent); color: #3b82f6; }
    .pipeline {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
    }
    .pipeline__step {
      display: flex;
      gap: 0.55rem;
      align-items: flex-start;
      strong { display: block; font-size: 0.72rem; }
      small { font-size: 0.6rem; color: var(--app-text-muted); }
    }
    .pipeline__dot {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: color-mix(in srgb, var(--app-text) 6%, transparent);
      mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; }
    }
    .pipeline__step--done .pipeline__dot { background: color-mix(in srgb, #10b981 16%, transparent); mat-icon { color: #10b981; } }
    .pipeline__step--active .pipeline__dot { background: color-mix(in srgb, #3b82f6 16%, transparent); mat-icon { color: #3b82f6; } }
    .perf-row { margin-bottom: 0.65rem; &:last-child { margin-bottom: 0; } }
    .perf-row__head {
      display: flex;
      justify-content: space-between;
      font-size: 0.68rem;
      margin-bottom: 0.2rem;
      strong { font-variant-numeric: tabular-nums; }
    }
    .perf-row__spark { width: 100%; height: 24px; }
    .reco-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .reco-list li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.45rem 0;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text) 4%, transparent);
      strong { display: block; font-size: 0.72rem; }
      small { font-size: 0.6rem; color: var(--app-text-muted); }
    }
    .reco-tag {
      flex-shrink: 0;
      font-size: 0.55rem;
      font-weight: 800;
      padding: 0.15rem 0.4rem;
      border-radius: 999px;
      text-transform: uppercase;
    }
    .reco-tag--high { background: color-mix(in srgb, #10b981 14%, transparent); color: #059669; }
    .reco-tag--medium { background: color-mix(in srgb, #f59e0b 14%, transparent); color: #d97706; }
    .reco-tag--perf { background: color-mix(in srgb, #8b5cf6 14%, transparent); color: #7c3aed; }
    @media (max-width: 1280px) {
      .insights-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .insight-card--wide { grid-column: span 2; }
    }
    @media (max-width: 768px) {
      .insights-grid { grid-template-columns: 1fr; }
      .insight-card--wide { grid-column: span 1; }
    }
  `,
})
export class DashboardInsightsGridComponent {
  readonly healthDonut = [
    { label: 'Sanos', value: 78, color: '#10b981' },
    { label: 'Advertencias', value: 9, color: '#f59e0b' },
    { label: 'Críticos', value: 4, color: '#ef4444' },
    { label: 'Desconocidos', value: 0, color: '#94a3b8' },
  ]

  readonly healthLegend = [
    { label: 'Servicios sanos', detail: '78 / 86%', color: '#10b981' },
    { label: 'Advertencias', detail: '9 / 10%', color: '#f59e0b' },
    { label: 'Críticos', detail: '4 / 4%', color: '#ef4444' },
    { label: 'Desconocidos', detail: '0 / 0%', color: '#94a3b8' },
  ]

  readonly costTrend = [
    { label: '8 May', value: 4200 },
    { label: '12 May', value: 4450 },
    { label: '16 May', value: 4600 },
    { label: '20 May', value: 4720 },
    { label: '23 May', value: 4820 },
  ]

  readonly costTrendGcp = [
    { label: '8 May', value: 1200 },
    { label: '12 May', value: 1280 },
    { label: '16 May', value: 1350 },
    { label: '20 May', value: 1420 },
    { label: '23 May', value: 1480 },
  ]

  readonly cloudLegend = [
    { label: 'AWS', color: '#ff9900' },
    { label: 'GCP', color: '#4285f4' },
    { label: 'Azure', color: '#0078d4' },
    { label: 'VPS', color: '#64748b' },
  ]

  readonly topologyNodes = [
    { id: 'users', label: 'Usuarios', icon: 'groups', area: '1 / 1 / 2 / 2' },
    { id: 'internet', label: 'Internet', icon: 'public', area: '1 / 2 / 2 / 3' },
    { id: 'dns', label: 'DNS', icon: 'dns', area: '1 / 3 / 2 / 4' },
    { id: 'lb', label: 'Load Balancer', icon: 'balance', area: '2 / 2 / 3 / 3' },
    { id: 'web', label: 'Web Tier', icon: 'language', area: '3 / 1 / 4 / 2' },
    { id: 'app', label: 'App Tier', icon: 'apps', area: '3 / 2 / 4 / 3' },
    { id: 'db', label: 'DB Primary', icon: 'storage', area: '3 / 3 / 4 / 4' },
    { id: 'cache', label: 'Cache', icon: 'memory', area: '4 / 2 / 5 / 3' },
  ]

  readonly notifications = [
    { title: 'Alta utilización de CPU', time: 'Hace 5 min', icon: 'warning', tone: 'warn' },
    { title: 'Despliegue completado', time: 'Hace 18 min', icon: 'check_circle', tone: 'ok' },
    { title: 'Backup completado', time: 'Hace 1 h', icon: 'backup', tone: 'info' },
    { title: 'Certificado expira pronto', time: 'Hace 3 h', icon: 'lock_clock', tone: 'warn' },
  ]

  readonly incidents = [
    { severity: 'CRITICAL', title: 'CPU > 90%', resource: 'aws-prod-app-3', time: 'Hace 12 min' },
    { severity: 'WARNING', title: 'Uso de disco > 80%', resource: 'azure-db-5', time: 'Hace 34 min' },
    { severity: 'INFO', title: 'Certificado SSL renovado', resource: 'lb-prod-1', time: 'Hace 2 h' },
  ]

  readonly pipelineSteps = [
    { label: 'Build', hint: 'Completado', state: 'done' },
    { label: 'Tests', hint: 'Completado', state: 'done' },
    { label: 'Deploy a Staging', hint: 'En progreso', state: 'active' },
    { label: 'Deploy a Producción', hint: 'Pendiente', state: 'pending' },
  ]

  readonly perfMetrics = [
    { label: 'CPU', value: 47, color: '#8b5cf6', data: [32, 38, 42, 45, 47, 44, 47] },
    { label: 'RAM', value: 62, color: '#3b82f6', data: [55, 58, 60, 61, 62, 60, 62] },
    { label: 'Disco', value: 58, color: '#10b981', data: [50, 52, 54, 56, 58, 57, 58] },
  ]

  readonly recommendations = [
    { title: 'Reservas de instancias', detail: 'Ahorro estimado 18%', impact: 'high', impactLabel: 'Ahorro alto' },
    { title: 'Instancias sin uso', detail: '4 candidatas', impact: 'medium', impactLabel: 'Ahorro medio' },
    { title: 'Almacenamiento huérfano', detail: '320 GB', impact: 'medium', impactLabel: 'Ahorro medio' },
    { title: 'Balanceo de carga', detail: 'Optimizar tráfico', impact: 'perf', impactLabel: 'Rendimiento' },
  ]

  spark = (values: number[]): string => {
    const max = Math.max(...values)
    const min = Math.min(...values)
    const range = max - min || 1
    return values.map((v, i) => `${(i / (values.length - 1)) * 200},${22 - ((v - min) / range) * 18}`).join(' ')
  }
}
