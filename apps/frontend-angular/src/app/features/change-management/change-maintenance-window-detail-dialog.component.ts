import { DatePipe } from '@angular/common'
import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { CHANGE_STATUS_LABELS, CHANGE_TYPE_LABELS } from './change-management.config'
import type { ChangeRequest, MaintenanceWindow } from './change-management.demo'
import { primaryChangeLogo } from './change-management-logo.util'
import { NavIconComponent } from '../../shared/components/nav-icon/nav-icon.component'

export interface MaintenanceWindowDetailDialogData {
  window: MaintenanceWindow
  linkedChanges: ChangeRequest[]
}

@Component({
  selector: 'app-change-maintenance-window-detail-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule, NavIconComponent],
  template: `
    <article class="mw-doc">
      <header class="mw-doc__head">
        <div>
          <p class="mw-doc__ref">{{ data.window.id }} · {{ mwStatusLabel(data.window.status) }}</p>
          <h2 mat-dialog-title>{{ data.window.title }}</h2>
          <p class="mw-doc__sub">{{ data.window.description }}</p>
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Cerrar">
          <mat-icon>close</mat-icon>
        </button>
      </header>

      <mat-dialog-content>
        <table class="mw-doc__meta">
          <tbody>
            <tr>
              <th>Entorno</th><td>{{ data.window.environment }}</td>
              <th>Responsable</th><td>{{ data.window.owner }}</td>
            </tr>
            <tr>
              <th>Contacto</th><td colspan="3">{{ data.window.ownerContact }}</td>
            </tr>
            <tr>
              <th>Inicio</th><td>{{ data.window.start | date: 'EEE dd MMM yyyy, HH:mm' }}</td>
              <th>Fin</th><td>{{ data.window.end | date: 'EEE dd MMM yyyy, HH:mm' }}</td>
            </tr>
            <tr>
              <th>Zona horaria</th><td>{{ data.window.timezone }}</td>
              <th>Recurrencia</th><td>{{ data.window.recurrence ?? '—' }}</td>
            </tr>
            <tr>
              <th>Cambios vinculados</th><td colspan="3">{{ data.linkedChanges.length }}</td>
            </tr>
          </tbody>
        </table>

        <section class="mw-doc__block">
          <h3>1. Resumen</h3>
          <p>{{ data.window.description }}</p>
        </section>

        <section class="mw-doc__block">
          <h3>2. Alcance</h3>
          <p>{{ data.window.scope }}</p>
        </section>

        <section class="mw-doc__block">
          <h3>3. Checks pre-ventana</h3>
          @if (data.window.preChecks.length) {
            <ol class="mw-doc__list">
              @for (item of data.window.preChecks; track item) {
                <li>{{ item }}</li>
              }
            </ol>
          } @else {
            <p class="mw-doc__muted">Sin checks pre-ventana definidos.</p>
          }
        </section>

        <section class="mw-doc__block">
          <h3>4. Checks post-ventana</h3>
          @if (data.window.postChecks.length) {
            <ol class="mw-doc__list">
              @for (item of data.window.postChecks; track item) {
                <li>{{ item }}</li>
              }
            </ol>
          } @else {
            <p class="mw-doc__muted">Sin checks post-ventana definidos.</p>
          }
        </section>

        <section class="mw-doc__block">
          <h3>5. Canales de notificación</h3>
          @if (data.window.notificationChannels.length) {
            <ul class="mw-doc__tags">
              @for (ch of data.window.notificationChannels; track ch) {
                <li>{{ ch }}</li>
              }
            </ul>
          } @else {
            <p class="mw-doc__muted">Sin canales configurados.</p>
          }
        </section>

        <section class="mw-doc__block">
          <h3>6. Política de rollback</h3>
          <p>{{ data.window.rollbackPolicy }}</p>
        </section>

        <section class="mw-doc__block">
          <h3>7. Reglas de blackout</h3>
          <p>{{ data.window.blackoutRules }}</p>
        </section>

        <section class="mw-doc__block mw-doc__block--last">
          <h3>8. Cambios vinculados</h3>
          @if (data.linkedChanges.length) {
            <table class="mw-doc__table">
              <thead>
                <tr><th></th><th>ID</th><th>Título</th><th>Tipo</th><th>Estado</th></tr>
              </thead>
              <tbody>
                @for (chg of data.linkedChanges; track chg.id) {
                  <tr>
                    <td class="mw-doc__logo">
                      @if (changeLogo(chg); as logo) {
                        <app-nav-icon [logo]="logo" size="sm" />
                      }
                    </td>
                    <td class="mono">{{ chg.id }}</td>
                    <td>{{ chg.title }}</td>
                    <td>{{ typeLabel(chg.type) }}</td>
                    <td>{{ statusLabel(chg.status) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <p class="mw-doc__muted">Ningún cambio vinculado a esta ventana.</p>
          }
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

    .mw-doc {
      --ink: #111827;
      --muted: #6b7280;
      --line: #d1d5db;
      min-width: 0;
      width: 100%;
      background: #fff;
      color: var(--ink);
    }
    .mw-doc__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
      padding-bottom: 0.85rem;
      border-bottom: 1px solid var(--ink);
    }
    .mw-doc__ref {
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
    .mw-doc__sub {
      margin: 0.25rem 0 0;
      font-size: 0.8rem;
      color: #374151;
      line-height: 1.45;
    }
    mat-dialog-content {
      padding-top: 0.75rem !important;
    }
    .mw-doc__meta {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.74rem;
      margin-bottom: 1rem;
    }
    .mw-doc__meta th,
    .mw-doc__meta td {
      padding: 0.35rem 0.5rem;
      border: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
    }
    .mw-doc__meta th {
      width: 11%;
      font-size: 0.6rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--muted);
      font-weight: 600;
      background: #fff;
    }
    .mw-doc__block {
      margin-bottom: 1.1rem;
      padding-bottom: 0.85rem;
      border-bottom: 1px solid var(--line);
    }
    .mw-doc__block--last { border-bottom: none; }
    .mw-doc__block h3 {
      margin: 0 0 0.55rem;
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--ink);
    }
    .mw-doc__block p {
      margin: 0;
      font-size: 0.8rem;
      line-height: 1.65;
      color: #374151;
      white-space: pre-wrap;
    }
    .mw-doc__muted { color: var(--muted) !important; font-size: 0.76rem !important; }
    .mw-doc__list {
      margin: 0;
      padding-left: 1.25rem;
      font-size: 0.78rem;
      line-height: 1.6;
      color: #374151;
    }
    .mw-doc__list li { margin-bottom: 0.3rem; }
    .mw-doc__tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .mw-doc__tags li {
      font-size: 0.68rem;
      font-weight: 600;
      padding: 0.2rem 0.5rem;
      border: 1px solid var(--line);
    }
    .mw-doc__table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.72rem;
    }
    .mw-doc__table th,
    .mw-doc__table td {
      padding: 0.38rem 0.5rem;
      border: 1px solid var(--line);
      text-align: left;
    }
    .mw-doc__table th {
      font-size: 0.58rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      font-weight: 700;
      border-color: var(--ink);
    }
    .mw-doc__logo {
      width: 1.75rem;
      text-align: center;
    }
    .mono {
      font-family: ui-monospace, 'JetBrains Mono', monospace;
      font-size: 0.65rem;
    }
    mat-dialog-actions {
      border-top: 1px solid var(--line);
      padding-top: 0.65rem;
    }
  `,
})
export class ChangeMaintenanceWindowDetailDialogComponent {
  readonly data = inject<MaintenanceWindowDetailDialogData>(MAT_DIALOG_DATA)

  typeLabel = (t: ChangeRequest['type']): string => CHANGE_TYPE_LABELS[t]
  statusLabel = (s: ChangeRequest['status']): string => CHANGE_STATUS_LABELS[s]

  mwStatusLabel = (s: MaintenanceWindow['status']): string => {
    const map = { scheduled: 'Programada', active: 'Activa', completed: 'Completada' }
    return map[s]
  }

  changeLogo = (chg: ChangeRequest) => primaryChangeLogo(chg)
}
