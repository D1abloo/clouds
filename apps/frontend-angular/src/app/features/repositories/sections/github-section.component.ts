import { Component, Input, output } from '@angular/core'
import { RouterLink } from '@angular/router'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTableModule } from '@angular/material/table'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatSelectModule } from '@angular/material/select'
import { MatTabsModule } from '@angular/material/tabs'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import { GithubAccountCardComponent } from '../components/github-account-card.component'
import { GithubSyncStatusComponent } from '../components/github-sync-status.component'
import type { GithubAccount, GithubConnection, GithubRepo } from '../../../core/services/github.service'
import {
  CLIENT_DEMO_GITHUB_ISSUES,
} from '../utils/github.data'
import { repoRoute } from '../repositories-section.config'
import { RepositoriesQuickLinksComponent } from '../components/repositories-quick-links.component'

@Component({
  selector: 'app-github-section',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTabsModule,
    StatusBadgeComponent,
    GithubAccountCardComponent,
    GithubSyncStatusComponent,
    RepositoriesQuickLinksComponent,
  ],
  template: `
    <div class="repo-section repo-section--github">
      <div class="repo-connect-bar">
        <div class="repo-connect-bar__main">
          @if (account) {
            <app-github-account-card [account]="account" [demoMode]="demoMode" />
          } @else {
            <div class="repo-connect-empty">
              <mat-icon>link_off</mat-icon>
              <div>
                <strong>Sin cuenta GitHub conectada</strong>
                <p>Añade una cuenta con PAT, scopes y webhooks para sincronizar repos, Actions y despliegues.</p>
              </div>
              <button mat-flat-button color="primary" type="button" (click)="addAccount.emit()">
                <mat-icon>person_add</mat-icon> Añadir cuenta
              </button>
            </div>
          }
        </div>
        <div class="repo-connect-bar__side">
          <app-github-sync-status
            [status]="syncStatus"
            [lastSyncAt]="connection?.lastSyncAt ?? account?.lastSyncAt ?? null"
            [repoCount]="connection?.repoCount ?? repos.length"
          />
          <div class="repo-connect-bar__actions">
            <button mat-flat-button color="primary" type="button" (click)="addAccount.emit()">
              <mat-icon>person_add</mat-icon> Añadir cuenta
            </button>
            @if (demoMode) {
            <button mat-stroked-button type="button" (click)="connectDemo.emit()">
              <mat-icon>science</mat-icon> Demo
            </button>
            }
            <button mat-stroked-button type="button" (click)="validate.emit()">
              <mat-icon>verified</mat-icon> Validar
            </button>
            <button mat-stroked-button type="button" (click)="sync.emit()">
              <mat-icon>sync</mat-icon> Sincronizar
            </button>
          </div>
        </div>
      </div>

      <app-repositories-quick-links current="github" title="Relacionado" />

      <mat-tab-group class="soft-tabs" animationDuration="200ms">
        <mat-tab label="Repositorios">
          <div class="repo-data-block">
            <p class="repo-tab-hint">
              Inventario sincronizado en vivo · {{ repos.length }} repos · datos desde tu cuenta GitHub conectada
            </p>
            <mat-form-field appearance="outline" class="repo-select-field">
              <mat-label>Repositorio activo</mat-label>
              <mat-select [formControl]="repoControl">
                @for (r of repos; track r.id) {
                  <mat-option [value]="r.id">{{ r.fullName }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <div class="data-table-wrap">
              <table mat-table [dataSource]="repos" class="premium-table table-row-hover">
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>Repositorio</th>
                  <td mat-cell *matCellDef="let row">
                    <strong>{{ row.name }}</strong>
                    <span class="prov-badge prov-badge--github">GitHub</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="language">
                  <th mat-header-cell *matHeaderCellDef>Lenguaje</th>
                  <td mat-cell *matCellDef="let row">{{ row.language }}</td>
                </ng-container>
                <ng-container matColumnDef="stars">
                  <th mat-header-cell *matHeaderCellDef>Stars</th>
                  <td mat-cell *matCellDef="let row">{{ row.stars }}</td>
                </ng-container>
                <ng-container matColumnDef="branch">
                  <th mat-header-cell *matHeaderCellDef>Rama principal</th>
                  <td mat-cell *matCellDef="let row">{{ row.defaultBranch }}</td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef>Acciones</th>
                  <td mat-cell *matCellDef="let row">
                    <button mat-stroked-button type="button" (click)="openDetail.emit(row); $event.stopPropagation()">Detalle</button>
                    <button mat-stroked-button type="button" (click)="deploy.emit(row); $event.stopPropagation()">Desplegar</button>
                    <button mat-button type="button" (click)="openExternal.emit(row); $event.stopPropagation()">Abrir</button>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="cols"></tr>
                <tr mat-row *matRowDef="let row; columns: cols" class="table-row-hover" (click)="openDetail.emit(row)"></tr>
              </table>
            </div>
            <div class="repo-toolbar repo-toolbar--inline">
              <a mat-button [routerLink]="routes.commits"><mat-icon>history_edu</mat-icon> Commits</a>
              <a mat-button [routerLink]="routes.branches"><mat-icon>account_tree</mat-icon> Ramas</a>
              <a mat-button [routerLink]="routes.webhooks"><mat-icon>webhook</mat-icon> Webhooks</a>
            </div>
          </div>
        </mat-tab>

        <mat-tab label="GitHub Actions">
          <div class="repo-data-block">
            <p class="repo-tab-hint">GitHub Actions en tiempo real · {{ workflowRuns.length }} ejecuciones recientes</p>
            <ul class="repo-inline-list">
              @for (w of workflowRuns; track w['id']) {
                <li>
                  <strong>{{ w['workflow'] }}</strong>
                  <span class="repo-muted">{{ w['repoFullName'] }}</span>
                  <app-status-badge [value]="actionBadge(w['status'])" />
                </li>
              }
            </ul>
            <div class="repo-toolbar repo-toolbar--inline">
              <button mat-stroked-button type="button" (click)="viewActions.emit()">
                <mat-icon>bolt</mat-icon> Detalle Actions
              </button>
              <a mat-stroked-button [routerLink]="routes.deployments">
                <mat-icon>rocket_launch</mat-icon> Despliegues
              </a>
              <a mat-button [routerLink]="routes.pullRequests">
                <mat-icon>merge</mat-icon> Pull Requests
              </a>
              <a mat-button [routerLink]="routes.webhooks">
                <mat-icon>webhook</mat-icon> Webhooks
              </a>
            </div>
          </div>
        </mat-tab>

        <mat-tab label="Issues">
          <div class="repo-data-block">
            <ul class="repo-inline-list">
              @for (i of issues; track i['id']) {
                <li>
                  <strong>#{{ i['number'] }}</strong>
                  <span>{{ i['title'] }}</span>
                  <span class="repo-muted">{{ i['repoFullName'] }}</span>
                </li>
              }
            </ul>
            <div class="repo-toolbar repo-toolbar--inline">
              <a mat-stroked-button [routerLink]="routes.pullRequests">
                <mat-icon>merge</mat-icon> Ver Pull Requests
              </a>
            </div>
          </div>
        </mat-tab>

        <mat-tab label="Logs">
          <div class="repo-data-block">
            <pre class="repo-log-preview">{{ syncLogs || '[GitHub] Sin actividad reciente — sincroniza tu cuenta' }}</pre>
            @if (deployments.length) {
              <p class="repo-tab-hint">{{ deployments.length }} despliegues registrados en tu workspace</p>
            }
            <div class="repo-toolbar repo-toolbar--inline">
              <button mat-stroked-button type="button" (click)="viewLogs.emit()">
                <mat-icon>terminal</mat-icon> Panel de logs
              </button>
              <a mat-button [routerLink]="routes.deployments">
                <mat-icon>history</mat-icon> Historial de despliegues
              </a>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
})
export class GithubSectionComponent {
  @Input() repos: GithubRepo[] = []
  @Input() account: GithubAccount | null = null
  @Input() connection: GithubConnection | null = null
  @Input() demoMode = true
  @Input() syncStatus: 'connected' | 'pending' | 'invalid' | 'disconnected' = 'connected'
  @Input() repoControl = new FormControl<string>('', { nonNullable: true })
  @Input() workflowRuns: Record<string, unknown>[] = []
  @Input() deployments: Record<string, unknown>[] = []
  @Input() syncLogs = ''

  readonly issues = CLIENT_DEMO_GITHUB_ISSUES
  readonly cols = ['name', 'language', 'stars', 'branch', 'actions']
  readonly routes = {
    webhooks: repoRoute('webhooks'),
    pullRequests: repoRoute('pull-requests'),
    commits: repoRoute('commits'),
    branches: repoRoute('branches'),
    deployments: repoRoute('deployments'),
    gitlab: repoRoute('gitlab'),
  }

  readonly addAccount = output<void>()
  readonly connectDemo = output<void>()
  readonly validate = output<void>()
  readonly sync = output<void>()
  readonly viewActions = output<void>()
  readonly createWebhook = output<void>()
  readonly viewLogs = output<void>()
  readonly openDetail = output<GithubRepo>()
  readonly deploy = output<GithubRepo>()
  readonly openExternal = output<GithubRepo>()

  actionBadge = (s: unknown): string => {
    if (s === 'success') return 'SUCCESS'
    if (s === 'running') return 'RUNNING'
    return 'ERROR'
  }
}
