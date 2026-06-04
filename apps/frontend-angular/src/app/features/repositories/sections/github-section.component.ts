import { Component, Input, output } from '@angular/core'
import { DatePipe } from '@angular/common'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatCardModule } from '@angular/material/card'
import { MatTableModule } from '@angular/material/table'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatSelectModule } from '@angular/material/select'
import { MatTabsModule } from '@angular/material/tabs'
import { NavIconComponent } from '../../../shared/components/nav-icon/nav-icon.component'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import { GithubAccountCardComponent } from '../components/github-account-card.component'
import { GithubSyncStatusComponent } from '../components/github-sync-status.component'
import type { GithubAccount, GithubConnection, GithubRepo } from '../../../core/services/github.service'
import {
  CLIENT_DEMO_GITHUB_ACTIONS,
  CLIENT_DEMO_GITHUB_ISSUES,
  CLIENT_DEMO_GITHUB_PRS,
  CLIENT_DEMO_DEPLOYMENTS,
  CLIENT_DEMO_WEBHOOKS,
} from '../utils/github-demo-catalog'

@Component({
  selector: 'app-github-section',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTableModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTabsModule,
    NavIconComponent,
    StatusBadgeComponent,
    GithubAccountCardComponent,
    GithubSyncStatusComponent,
  ],
  template: `
    <div class="github-page">
      @if (account) {
        <app-github-account-card [account]="account" [demoMode]="demoMode" />
      }

      <mat-card class="github-hero">
        <div class="github-hero__head">
          <app-nav-icon logo="github" size="lg" />
          <div>
            <h3>Cuentas GitHub</h3>
            <p>OAuth / Personal Access Token · GitHub Apps · sincronización de repositorios</p>
          </div>
        </div>
        <app-github-sync-status
          [status]="syncStatus"
          [lastSyncAt]="connection?.lastSyncAt ?? account?.lastSyncAt ?? null"
          [repoCount]="connection?.repoCount ?? repos.length"
        />
        <div class="github-hero__actions">
          <button mat-flat-button color="primary" type="button" (click)="addAccount.emit()">
            <mat-icon>person_add</mat-icon> Añadir cuenta GitHub
          </button>
          <button mat-stroked-button type="button" (click)="connectDemo.emit()">
            <mat-icon>science</mat-icon> Conectar demo GitHub
          </button>
          <button mat-stroked-button type="button" (click)="validate.emit()">
            <mat-icon>verified</mat-icon> Validar GitHub
          </button>
          <button mat-stroked-button type="button" (click)="sync.emit()">
            <mat-icon>sync</mat-icon> Sincronizar repositorios
          </button>
        </div>
      </mat-card>

      <div class="github-widgets">
        <mat-card class="widget-card">
          <h4><mat-icon>bolt</mat-icon> GitHub Actions</h4>
          <ul>
            @for (w of actions; track w['id']) {
              <li>
                <strong>{{ w['workflow'] }}</strong>
                <span class="muted">{{ w['repoFullName'] }}</span>
                <app-status-badge [value]="actionBadge(w['status'])" />
              </li>
            }
          </ul>
          <button mat-button type="button" (click)="viewActions.emit()">Ver GitHub Actions</button>
        </mat-card>
        <mat-card class="widget-card">
          <h4><mat-icon>bug_report</mat-icon> Issues</h4>
          <ul>
            @for (i of issues; track i['id']) {
              <li>#{{ i['number'] }} {{ i['title'] }} — {{ i['repoFullName'] }}</li>
            }
          </ul>
        </mat-card>
        <mat-card class="widget-card">
          <h4><mat-icon>vpn_key</mat-icon> Token / OAuth</h4>
          <p class="muted">PAT demo · scopes: repo, workflow, admin:repo_hook</p>
          <app-status-badge value="SUCCESS" />
        </mat-card>
      </div>

      <mat-tab-group class="soft-tabs github-tabs" animationDuration="200ms">
        <mat-tab label="Repositorios">
          <div class="tab-panel">
            <mat-form-field appearance="outline" class="repo-select">
              <mat-label>Repositorio activo</mat-label>
              <mat-select [formControl]="repoControl">
                @for (r of repos; track r.id) {
                  <mat-option [value]="r.id">{{ r.fullName }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <table mat-table [dataSource]="repos" class="premium-table">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Repositorio</th>
                <td mat-cell *matCellDef="let row">
                  <strong>{{ row.name }}</strong>
                  <span class="tag">GitHub</span>
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
                  <button mat-stroked-button type="button" (click)="openDetail.emit(row)">Detalle</button>
                  <button mat-stroked-button type="button" (click)="deploy.emit(row)">Desplegar</button>
                  <button mat-button type="button" (click)="openExternal.emit(row)">Abrir en GitHub</button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="cols"></tr>
              <tr mat-row *matRowDef="let row; columns: cols" class="clickable" (click)="openDetail.emit(row)"></tr>
            </table>
          </div>
        </mat-tab>
        <mat-tab label="Pull Requests">
          <div class="tab-panel">
            @for (pr of pullRequests; track pr['id']) {
              <div class="list-row">
                <strong>#{{ pr['number'] }} {{ pr['title'] }}</strong>
                <span class="muted">{{ pr['repoFullName'] }}</span>
                <app-status-badge [value]="pr['state'] === 'open' ? 'RUNNING' : 'SUCCESS'" />
              </div>
            }
          </div>
        </mat-tab>
        <mat-tab label="Webhooks GitHub">
          <div class="tab-panel">
            @for (wh of githubWebhooks; track wh['id']) {
              <div class="list-row">
                <strong>{{ wh['event'] }}</strong>
                <span class="muted">{{ wh['repoFullName'] }}</span>
              </div>
            }
            <button mat-stroked-button type="button" (click)="createWebhook.emit()">Crear webhook GitHub</button>
          </div>
        </mat-tab>
        <mat-tab label="Despliegues GitHub">
          <div class="tab-panel">
            @for (d of githubDeployments; track d['id']) {
              <div class="list-row">
                <strong>{{ d['repoFullName'] }}</strong>
                <span class="muted">{{ d['targetName'] }} · {{ d['branch'] }}</span>
                <app-status-badge [value]="d['status'] === 'success' ? 'SUCCESS' : 'RUNNING'" />
              </div>
            }
          </div>
        </mat-tab>
        <mat-tab label="Logs GitHub">
          <div class="tab-panel">
            <pre class="log-preview">[GitHub] Sync cloudops-lab OK
[GitHub] workflow build-and-test #128 success
[GitHub] webhook push delivered</pre>
            <button mat-stroked-button type="button" (click)="viewLogs.emit()">Ver logs GitHub</button>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: `
    .github-page { --section-accent: #24292f; }
    .github-hero {
      padding: 1.25rem;
      margin-bottom: 1rem;
      border-left: 4px solid var(--section-accent);
      background: linear-gradient(135deg, color-mix(in srgb, var(--section-accent) 6%, var(--app-card)), var(--app-card));
    }
    .github-hero__head { display: flex; gap: 1rem; margin-bottom: 0.75rem; h3 { margin: 0; } p { margin: 0.35rem 0 0; font-size: 0.85rem; color: var(--app-text-muted); } }
    .github-hero__actions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.85rem; }
    .github-widgets {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .widget-card {
      padding: 1rem;
      h4 { margin: 0 0 0.65rem; font-size: 0.9rem; display: flex; align-items: center; gap: 0.35rem; }
      ul { list-style: none; padding: 0; margin: 0 0 0.5rem; font-size: 0.8rem; }
      li { padding: 0.35rem 0; border-bottom: 1px solid var(--app-border-subtle); display: flex; flex-direction: column; gap: 0.15rem; }
    }
    .table-card { padding: 1.15rem; margin-bottom: 1rem; h3 { margin: 0 0 0.5rem; } }
    .hint { font-size: 0.82rem; color: var(--app-text-muted); margin: 0 0 1rem; }
    .repo-select { width: min(100%, 400px); margin-bottom: 1rem; }
    .tag {
      margin-left: 0.4rem;
      font-size: 0.65rem;
      font-weight: 700;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
      background: color-mix(in srgb, var(--section-accent) 15%, transparent);
    }
    .clickable { cursor: pointer; }
    .muted { font-size: 0.75rem; color: var(--app-text-muted); }
    .tab-panel { padding: 1rem 0; }
    .list-row {
      padding: 0.55rem 0;
      border-bottom: 1px solid var(--app-border-subtle);
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      align-items: center;
      font-size: 0.85rem;
    }
    .log-preview {
      font-family: ui-monospace, monospace;
      font-size: 0.75rem;
      padding: 0.75rem;
      background: var(--app-elevated);
      border-radius: var(--app-radius-sm);
    }
  `,
})
export class GithubSectionComponent {
  @Input() repos: GithubRepo[] = []
  @Input() account: GithubAccount | null = null
  @Input() connection: GithubConnection | null = null
  @Input() demoMode = true
  @Input() syncStatus: 'connected' | 'pending' | 'invalid' | 'disconnected' = 'connected'
  @Input() repoControl = new FormControl<string>('', { nonNullable: true })

  readonly actions = CLIENT_DEMO_GITHUB_ACTIONS
  readonly issues = CLIENT_DEMO_GITHUB_ISSUES
  readonly pullRequests = CLIENT_DEMO_GITHUB_PRS
  readonly githubWebhooks = CLIENT_DEMO_WEBHOOKS
  readonly githubDeployments = CLIENT_DEMO_DEPLOYMENTS
  readonly cols = ['name', 'language', 'stars', 'branch', 'actions']

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
