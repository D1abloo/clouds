import { DatePipe } from '@angular/common'
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { CloudLaunchActivityService } from '../../core/services/cloud-launch-activity.service'

@Component({
  selector: 'app-launch-logs-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, MatButtonModule, MatIconModule],
  template: `
    <section class="launch-logs-panel">
      <header class="launch-logs-panel__head">
        <div>
          <h2><mat-icon>rocket_launch</mat-icon> Logs AI Infra Studio</h2>
          <p>{{ rows().length }} eventos de lanzamiento, prueba y eliminación</p>
        </div>
        <a mat-stroked-button routerLink="/automation/ai-infra-studio">
          <mat-icon>open_in_new</mat-icon>
          AI Infra Studio
        </a>
      </header>

      @if (rows().length) {
        <div class="launch-logs-panel__table-wrap">
          <table class="launch-logs-panel__table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Proveedor</th>
                <th>Acción</th>
                <th>Estado</th>
                <th>Recurso</th>
                <th>Mensaje</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track row.id) {
                <tr>
                  <td>{{ row.timestamp | date:'short' }}</td>
                  <td>{{ row.provider }}</td>
                  <td>{{ row.action }}</td>
                  <td><span [class]="'launch-logs-panel__badge launch-logs-panel__badge--' + row.status">{{ row.status }}</span></td>
                  <td>{{ row.resourceName ?? row.resourceId ?? '—' }}</td>
                  <td>{{ row.message }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <p class="launch-logs-panel__empty">Sin eventos de lanzamiento registrados todavía.</p>
      }
    </section>
  `,
  styles: `
    .launch-logs-panel {
      border: 1px solid var(--app-border-subtle);
      border-radius: 12px;
      background: var(--app-card);
      margin-bottom: 1rem;
      overflow: hidden;
    }
    .launch-logs-panel__head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.9rem 1rem;
      border-bottom: 1px solid var(--app-border-subtle);
      h2 {
        display: flex;
        align-items: center;
        gap: 0.45rem;
        margin: 0;
        font-size: 1rem;
      }
      p {
        margin: 0.25rem 0 0;
        color: var(--app-text-muted);
        font-size: 0.78rem;
      }
      mat-icon {
        font-size: 1.1rem;
        width: 1.1rem;
        height: 1.1rem;
      }
    }
    .launch-logs-panel__table-wrap {
      overflow-x: auto;
    }
    .launch-logs-panel__table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.82rem;
      th,
      td {
        padding: 0.65rem 0.85rem;
        text-align: left;
        border-bottom: 1px solid var(--app-border-subtle);
      }
      th {
        color: var(--app-text-muted);
        font-size: 0.68rem;
        font-weight: 700;
        text-transform: uppercase;
      }
    }
    .launch-logs-panel__badge {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 0.12rem 0.45rem;
      background: color-mix(in srgb, var(--app-text-muted) 12%, transparent);
      color: var(--app-text-muted);
      font-size: 0.7rem;
      font-weight: 700;
    }
    .launch-logs-panel__badge--success {
      background: color-mix(in srgb, var(--status-running) 16%, transparent);
      color: var(--status-running);
    }
    .launch-logs-panel__badge--error {
      background: color-mix(in srgb, var(--status-error) 16%, transparent);
      color: var(--status-error);
    }
    .launch-logs-panel__badge--terminated {
      background: color-mix(in srgb, var(--status-warning) 16%, transparent);
      color: var(--status-warning);
    }
    .launch-logs-panel__empty {
      margin: 0;
      padding: 1rem;
      color: var(--app-text-muted);
      font-size: 0.84rem;
    }
  `,
})
export class LaunchLogsPanelComponent {
  private readonly activity = inject(CloudLaunchActivityService)
  readonly rows = computed(() => this.activity.events())
}
