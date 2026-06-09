import { Component, Input, output } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTabsModule } from '@angular/material/tabs'
import { MatTableModule } from '@angular/material/table'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import {
  GLOBAL_WEBHOOK_ERRORS,
  GLOBAL_WEBHOOK_PAYLOADS,
  GLOBAL_WEBHOOK_RETRIES,
} from '../utils/repositories-global.util'
import { RepositoriesQuickLinksComponent } from '../components/repositories-quick-links.component'

@Component({
  selector: 'app-webhooks-global-section',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTabsModule, MatTableModule, StatusBadgeComponent, RepositoriesQuickLinksComponent],
  template: `
    <div class="repo-section repo-section--webhooks">
      <app-repositories-quick-links current="webhooks" title="Relacionado" />

      <div class="repo-toolbar">
        <button mat-flat-button color="primary" type="button" (click)="create.emit()">
          <mat-icon>add</mat-icon> Crear webhook
        </button>
        <button mat-stroked-button type="button" (click)="test.emit()">
          <mat-icon>play_arrow</mat-icon> Probar webhook
        </button>
      </div>

      <p class="repo-tab-hint">
        {{ allWebhooks.length }} endpoints · {{ githubItems.length }} GitHub · {{ gitlabItems.length }} GitLab ·
        {{ errors.length }} errores en 24 h
      </p>

      <mat-tab-group class="soft-tabs" animationDuration="200ms">
        <mat-tab label="GitHub">
          <div class="repo-data-block">
            <div class="data-table-wrap">
              <table mat-table [dataSource]="githubItems" class="premium-table table-row-hover">
                <ng-container matColumnDef="repo">
                  <th mat-header-cell *matHeaderCellDef>Repositorio</th>
                  <td mat-cell *matCellDef="let row">{{ row.repoFullName }}</td>
                </ng-container>
                <ng-container matColumnDef="event">
                  <th mat-header-cell *matHeaderCellDef>Evento</th>
                  <td mat-cell *matCellDef="let row">{{ row.event }}</td>
                </ng-container>
                <ng-container matColumnDef="url">
                  <th mat-header-cell *matHeaderCellDef>URL</th>
                  <td mat-cell *matCellDef="let row" class="repo-mono">{{ row.url }}</td>
                </ng-container>
                <ng-container matColumnDef="active">
                  <th mat-header-cell *matHeaderCellDef>Estado</th>
                  <td mat-cell *matCellDef="let row">
                    <app-status-badge [value]="row.active ? 'SUCCESS' : 'STOPPED'" />
                  </td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef>Acciones</th>
                  <td mat-cell *matCellDef="let row">
                    <button mat-button type="button" (click)="viewPayload.emit(row)">Payload</button>
                    <button mat-button type="button" (click)="toggle.emit(row)">Toggle</button>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="ghCols"></tr>
                <tr mat-row *matRowDef="let row; columns: ghCols"></tr>
              </table>
            </div>
          </div>
        </mat-tab>

        <mat-tab label="GitLab">
          <div class="repo-data-block">
            <div class="data-table-wrap">
              <table mat-table [dataSource]="gitlabItems" class="premium-table table-row-hover">
                <ng-container matColumnDef="project">
                  <th mat-header-cell *matHeaderCellDef>Proyecto</th>
                  <td mat-cell *matCellDef="let row">{{ row.projectPath }}</td>
                </ng-container>
                <ng-container matColumnDef="event">
                  <th mat-header-cell *matHeaderCellDef>Evento</th>
                  <td mat-cell *matCellDef="let row">{{ row.event }}</td>
                </ng-container>
                <ng-container matColumnDef="url">
                  <th mat-header-cell *matHeaderCellDef>URL</th>
                  <td mat-cell *matCellDef="let row" class="repo-mono">{{ row.url }}</td>
                </ng-container>
                <ng-container matColumnDef="active">
                  <th mat-header-cell *matHeaderCellDef>Estado</th>
                  <td mat-cell *matCellDef="let row">
                    <app-status-badge [value]="row.active ? 'SUCCESS' : 'STOPPED'" />
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="glCols"></tr>
                <tr mat-row *matRowDef="let row; columns: glCols"></tr>
              </table>
            </div>
          </div>
        </mat-tab>

        <mat-tab label="Payloads">
          <div class="repo-data-block">
            <ul class="repo-inline-list">
              @for (p of payloads; track p['id']) {
                <li>
                  <strong>{{ p['event'] }}</strong>
                  <span class="prov-badge" [class]="p['provider'] === 'gitlab' ? 'prov-badge--gitlab' : 'prov-badge--github'">
                    {{ p['provider'] === 'gitlab' ? 'GitLab' : 'GitHub' }}
                  </span>
                  <app-status-badge [value]="p['status'] === 'delivered' ? 'SUCCESS' : 'RUNNING'" />
                  <span class="repo-muted">{{ p['size'] }} · {{ p['receivedAt'] }}</span>
                  <button mat-button type="button" (click)="viewPayload.emit(p)">Ver payload</button>
                </li>
              }
            </ul>
          </div>
        </mat-tab>

        <mat-tab label="Reintentos">
          <div class="repo-data-block">
            <ul class="repo-inline-list">
              @for (r of retries; track r['id']) {
                <li>
                  <span>Webhook {{ r['webhookId'] }} — intento {{ r['attempt'] }}</span>
                  <button mat-stroked-button type="button" (click)="retry.emit(r)">Reintentar</button>
                </li>
              }
            </ul>
          </div>
        </mat-tab>

        <mat-tab label="Errores">
          <div class="repo-data-block">
            <ul class="repo-inline-list">
              @for (e of errors; track e['id']) {
                <li>
                  <mat-icon color="warn">error</mat-icon>
                  <span>{{ e['message'] }} ({{ e['webhookId'] }})</span>
                </li>
              }
            </ul>
          </div>
        </mat-tab>

        <mat-tab label="Configuración">
          <div class="repo-data-block">
            <p class="repo-tab-hint">
              URL base: <code class="repo-mono">https://hooks.cloudops.local/</code> — firma HMAC, reintentos automáticos y registro de payloads (demo).
            </p>
            <button mat-stroked-button type="button" (click)="create.emit()">
              <mat-icon>add</mat-icon> Crear webhook
            </button>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
})
export class WebhooksGlobalSectionComponent {
  @Input() allWebhooks: Record<string, unknown>[] = []

  readonly payloads = GLOBAL_WEBHOOK_PAYLOADS
  readonly retries = GLOBAL_WEBHOOK_RETRIES
  readonly errors = GLOBAL_WEBHOOK_ERRORS
  readonly ghCols = ['repo', 'event', 'url', 'active', 'actions']
  readonly glCols = ['project', 'event', 'url', 'active']

  get githubItems(): Record<string, unknown>[] {
    return this.allWebhooks.filter((w) => w['provider'] === 'github' || !w['provider'])
  }

  get gitlabItems(): Record<string, unknown>[] {
    return this.allWebhooks.filter((w) => w['provider'] === 'gitlab')
  }

  readonly create = output<void>()
  readonly test = output<void>()
  readonly viewPayload = output<Record<string, unknown>>()
  readonly toggle = output<Record<string, unknown>>()
  readonly retry = output<Record<string, unknown>>()
}
