import { Component, Input, output } from '@angular/core'
import { DatePipe } from '@angular/common'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatCardModule } from '@angular/material/card'
import { MatTableModule } from '@angular/material/table'
import { MatTabsModule } from '@angular/material/tabs'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatSelectModule } from '@angular/material/select'
import { NavIconComponent } from '../../../shared/components/nav-icon/nav-icon.component'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import { GitlabAccountCardComponent } from '../components/gitlab-account-card.component'
import { GitlabSyncStatusComponent } from '../components/gitlab-sync-status.component'
import type { GitlabAccount, GitlabGroup, GitlabProject } from '../utils/gitlab-demo-catalog'
import {
  CLIENT_DEMO_GITLAB_CI_VARS,
  CLIENT_DEMO_GITLAB_DEPLOYMENTS,
  CLIENT_DEMO_GITLAB_ENVIRONMENTS,
  CLIENT_DEMO_GITLAB_ISSUES,
  CLIENT_DEMO_GITLAB_MRS,
  CLIENT_DEMO_GITLAB_PIPELINES,
  CLIENT_DEMO_GITLAB_RELEASES,
  CLIENT_DEMO_GITLAB_RUNNERS,
  CLIENT_DEMO_GITLAB_WEBHOOKS,
} from '../utils/gitlab-demo-catalog'

@Component({
  selector: 'app-gitlab-section',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTableModule,
    MatTabsModule,
    MatFormFieldModule,
    MatSelectModule,
    NavIconComponent,
    StatusBadgeComponent,
    GitlabAccountCardComponent,
    GitlabSyncStatusComponent,
  ],
  template: `
    <div class="gitlab-page">
      @if (account) {
        <app-gitlab-account-card [account]="account" [demoMode]="demoMode" [projectCount]="projects.length" />
      }

      <mat-card class="gitlab-hero">
        <div class="gitlab-hero__head">
          <app-nav-icon logo="gitlab" size="lg" />
          <div>
            <h3>Conexión GitLab</h3>
            <p>Personal Access Token · grupos · subgrupos · CI/CD · runners · environments</p>
          </div>
        </div>
        <app-gitlab-sync-status
          [status]="syncStatus"
          [lastSyncAt]="account?.lastSyncAt ?? null"
          [projectCount]="projects.length"
        />
        <div class="gitlab-hero__actions">
          <button mat-flat-button class="gitlab-primary" type="button" (click)="addAccount.emit()">
            <mat-icon>person_add</mat-icon> Añadir cuenta GitLab
          </button>
          <button mat-stroked-button type="button" (click)="connectDemo.emit()">
            <mat-icon>science</mat-icon> Conectar demo GitLab
          </button>
          <button mat-stroked-button type="button" (click)="validate.emit()">
            <mat-icon>verified</mat-icon> Validar GitLab
          </button>
          <button mat-stroked-button type="button" (click)="sync.emit()">
            <mat-icon>sync</mat-icon> Sincronizar proyectos
          </button>
        </div>
      </mat-card>

      <div class="gitlab-widgets">
        <mat-card class="widget-card">
          <h4><mat-icon>timeline</mat-icon> Pipelines CI/CD</h4>
          <ul>
            @for (p of pipelines; track p['id']) {
              <li>
                <strong>{{ p['projectPath'] }}</strong>
                <span class="muted">{{ p['ref'] }} · {{ p['stage'] }}</span>
                <app-status-badge [value]="pipeBadge(p['status'])" />
              </li>
            }
          </ul>
          <button mat-button type="button" (click)="viewPipelines.emit()">Ver pipelines</button>
        </mat-card>
        <mat-card class="widget-card">
          <h4><mat-icon>bug_report</mat-icon> Issues GitLab</h4>
          <ul>
            @for (i of issues; track i['id']) {
              <li>#{{ i['iid'] }} {{ i['title'] }} — {{ i['projectPath'] }}</li>
            }
          </ul>
        </mat-card>
        <mat-card class="widget-card">
          <h4><mat-icon>vpn_key</mat-icon> Token PAT</h4>
          <p class="muted">PAT demo · scopes: api, read_repository, write_repository</p>
          <app-status-badge value="SUCCESS" />
        </mat-card>
      </div>

      <div class="gitlab-widgets gitlab-widgets--compact">
        <mat-card class="widget"><mat-icon>groups</mat-icon><span>{{ groups.length }}</span><small>Grupos</small></mat-card>
        <mat-card class="widget"><mat-icon>call_merge</mat-icon><span>{{ openMrsCount }}</span><small>MR abiertos</small></mat-card>
        <mat-card class="widget"><mat-icon>directions_run</mat-icon><span>{{ runners.length }}</span><small>Runners</small></mat-card>
        <mat-card class="widget"><mat-icon>public</mat-icon><span>{{ environments.length }}</span><small>Environments</small></mat-card>
      </div>

      <mat-tab-group class="soft-tabs gitlab-tabs" animationDuration="200ms">
        <mat-tab label="Proyectos">
          <div class="tab-panel">
            <mat-form-field appearance="outline" class="project-select">
              <mat-label>Proyecto activo</mat-label>
              <mat-select [formControl]="projectControl">
                @for (p of projects; track p.id) {
                  <mat-option [value]="p.id">{{ p.fullPath }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <table mat-table [dataSource]="projects" class="premium-table">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Proyecto</th>
                <td mat-cell *matCellDef="let row">
                  <div class="project-cell">
                    <app-nav-icon logo="gitlab" size="sm" />
                    <strong>{{ row.name }}</strong>
                    <span class="tag">GitLab</span>
                  </div>
                </td>
              </ng-container>
              <ng-container matColumnDef="group">
                <th mat-header-cell *matHeaderCellDef>Grupo</th>
                <td mat-cell *matCellDef="let row">{{ row.group }}</td>
              </ng-container>
              <ng-container matColumnDef="visibility">
                <th mat-header-cell *matHeaderCellDef>Visibilidad</th>
                <td mat-cell *matCellDef="let row">{{ row.visibility }}</td>
              </ng-container>
              <ng-container matColumnDef="language">
                <th mat-header-cell *matHeaderCellDef>Lenguaje</th>
                <td mat-cell *matCellDef="let row">{{ row.language }}</td>
              </ng-container>
              <ng-container matColumnDef="branch">
                <th mat-header-cell *matHeaderCellDef>Rama por defecto</th>
                <td mat-cell *matCellDef="let row">{{ row.defaultBranch }}</td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Acciones</th>
                <td mat-cell *matCellDef="let row">
                  <button mat-stroked-button type="button" (click)="openDetail.emit(row); $event.stopPropagation()">Detalle</button>
                  <button mat-stroked-button type="button" (click)="deploy.emit(row); $event.stopPropagation()">Desplegar proyecto</button>
                  <button mat-button type="button" (click)="openExternal.emit(row); $event.stopPropagation()">Abrir en GitLab</button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="projectCols"></tr>
              <tr mat-row *matRowDef="let row; columns: projectCols" class="clickable" (click)="openDetail.emit(row)"></tr>
            </table>
          </div>
        </mat-tab>
        <mat-tab label="Grupos">
          <div class="tab-panel">
            <table mat-table [dataSource]="groups" class="premium-table">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Grupo</th>
                <td mat-cell *matCellDef="let row">{{ row.name }}</td>
              </ng-container>
              <ng-container matColumnDef="path">
                <th mat-header-cell *matHeaderCellDef>Ruta</th>
                <td mat-cell *matCellDef="let row">{{ row.path }}</td>
              </ng-container>
              <ng-container matColumnDef="projects">
                <th mat-header-cell *matHeaderCellDef>Proyectos</th>
                <td mat-cell *matCellDef="let row">{{ row.projects }}</td>
              </ng-container>
              <ng-container matColumnDef="subgroups">
                <th mat-header-cell *matHeaderCellDef>Subgrupos</th>
                <td mat-cell *matCellDef="let row">{{ row.subgroups }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="groupCols"></tr>
              <tr mat-row *matRowDef="let row; columns: groupCols"></tr>
            </table>
          </div>
        </mat-tab>
        <mat-tab label="Merge Requests">
          <div class="tab-panel">
            <ul class="mr-list">
              @for (mr of mergeRequests; track mr['id']) {
                <li>
                  <strong>!{{ mr['iid'] }} {{ mr['title'] }}</strong>
                  <span class="muted">{{ mr['projectPath'] }}</span>
                  <app-status-badge [value]="mrBadge(mr['state'])" />
                </li>
              }
            </ul>
            <button mat-stroked-button type="button" (click)="viewMrs.emit()">Ver merge requests</button>
          </div>
        </mat-tab>
        <mat-tab label="Issues">
          <div class="tab-panel">
            @for (issue of issues; track issue['id']) {
              <div class="pipe-row">
                <strong>#{{ issue['iid'] }} {{ issue['title'] }}</strong>
                <span class="muted">{{ issue['projectPath'] }} · {{ issue['labels'] }}</span>
                <app-status-badge [value]="issue['state'] === 'opened' ? 'RUNNING' : 'SUCCESS'" />
              </div>
            }
          </div>
        </mat-tab>
        <mat-tab label="Pipelines">
          <div class="tab-panel">
            @for (p of pipelines; track p['id']) {
              <div class="pipe-row">
                <strong>{{ p['projectPath'] }}</strong>
                <span>{{ p['ref'] }} · {{ p['stage'] }} · {{ p['duration'] }}</span>
                <app-status-badge [value]="pipeBadge(p['status'])" />
              </div>
            }
            <button mat-stroked-button type="button" (click)="viewPipelines.emit()">Ver pipelines</button>
          </div>
        </mat-tab>
        <mat-tab label="Runners">
          <div class="tab-panel">
            @for (r of runners; track r['id']) {
              <div class="pipe-row">
                <strong>{{ r['name'] }}</strong>
                <span>{{ r['tags'] }} · {{ r['jobs'] }} jobs</span>
                <app-status-badge [value]="r['status'] === 'online' ? 'SUCCESS' : 'STOPPED'" />
              </div>
            }
          </div>
        </mat-tab>
        <mat-tab label="Variables CI/CD">
          <div class="tab-panel">
            <table mat-table [dataSource]="ciVariables" class="premium-table">
              <ng-container matColumnDef="key">
                <th mat-header-cell *matHeaderCellDef>Variable</th>
                <td mat-cell *matCellDef="let row"><code>{{ row['key'] }}</code></td>
              </ng-container>
              <ng-container matColumnDef="project">
                <th mat-header-cell *matHeaderCellDef>Proyecto</th>
                <td mat-cell *matCellDef="let row">{{ row['projectPath'] }}</td>
              </ng-container>
              <ng-container matColumnDef="env">
                <th mat-header-cell *matHeaderCellDef>Entorno</th>
                <td mat-cell *matCellDef="let row">{{ row['environment'] }}</td>
              </ng-container>
              <ng-container matColumnDef="flags">
                <th mat-header-cell *matHeaderCellDef>Flags</th>
                <td mat-cell *matCellDef="let row">
                  @if (row['masked']) { <span class="flag">masked</span> }
                  @if (row['protected']) { <span class="flag">protected</span> }
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="varCols"></tr>
              <tr mat-row *matRowDef="let row; columns: varCols"></tr>
            </table>
          </div>
        </mat-tab>
        <mat-tab label="Environments">
          <div class="tab-panel">
            @for (e of environments; track e['id']) {
              <div class="pipe-row">
                <strong>{{ e['name'] }}</strong>
                <span class="muted">{{ e['projectPath'] }} · {{ e['tier'] }}</span>
              </div>
            }
          </div>
        </mat-tab>
        <mat-tab label="Releases">
          <div class="tab-panel">
            @for (rel of releases; track rel['id']) {
              <div class="pipe-row">
                <strong>{{ rel['tag'] }}</strong>
                <span>{{ rel['name'] }} — {{ rel['projectPath'] }}</span>
              </div>
            }
          </div>
        </mat-tab>
        <mat-tab label="Webhooks GitLab">
          <div class="tab-panel">
            @for (wh of gitlabWebhooks; track wh['id']) {
              <div class="pipe-row">
                <strong>{{ wh['event'] }}</strong>
                <span class="muted">{{ wh['projectPath'] }}</span>
                <app-status-badge [value]="wh['active'] ? 'SUCCESS' : 'STOPPED'" />
              </div>
            }
            <button mat-stroked-button type="button" (click)="createWebhook.emit()">Crear webhook GitLab</button>
          </div>
        </mat-tab>
        <mat-tab label="Despliegues GitLab">
          <div class="tab-panel">
            @for (d of gitlabDeployments; track d['id']) {
              <div class="pipe-row">
                <strong>{{ d['projectPath'] }}</strong>
                <span class="muted">{{ d['targetName'] }} · {{ d['branch'] }} · {{ d['targetType'] }}</span>
                <app-status-badge [value]="d['status'] === 'success' ? 'SUCCESS' : 'RUNNING'" />
              </div>
            }
          </div>
        </mat-tab>
        <mat-tab label="Logs GitLab">
          <div class="tab-panel">
            <pre class="log-preview">[GitLab] Sync cloudops-platform OK
[GitLab] pipeline #1842 stage deploy success
[GitLab] runner shared-runner-01 online
[GitLab] environment production updated</pre>
            <button mat-stroked-button type="button" (click)="viewLogs.emit()">Ver logs GitLab</button>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: `
    .gitlab-page { --gl-orange: #fc6d26; --gl-purple: #6b4fbb; }
    .gitlab-hero {
      padding: 1.25rem;
      margin-bottom: 1rem;
      border-left: 4px solid var(--gl-orange);
      background: linear-gradient(120deg, color-mix(in srgb, var(--gl-orange) 10%, var(--app-card)), color-mix(in srgb, var(--gl-purple) 6%, var(--app-card)));
    }
    .gitlab-hero__head { display: flex; gap: 1rem; align-items: flex-start; h3 { margin: 0; } p { margin: 0.35rem 0 0; font-size: 0.85rem; color: var(--app-text-muted); } }
    .gitlab-hero__actions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.85rem; }
    .gitlab-primary { background: var(--gl-orange) !important; color: #fff !important; }
    .gitlab-widgets {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .gitlab-widgets--compact {
      grid-template-columns: repeat(4, 1fr);
    }
    .widget-card {
      padding: 1rem;
      h4 { margin: 0 0 0.65rem; font-size: 0.9rem; display: flex; align-items: center; gap: 0.35rem; mat-icon { color: var(--gl-orange); } }
      ul { list-style: none; padding: 0; margin: 0 0 0.5rem; font-size: 0.8rem; }
      li { padding: 0.35rem 0; border-bottom: 1px solid var(--app-border-subtle); display: flex; flex-direction: column; gap: 0.15rem; }
    }
    .widget {
      padding: 0.85rem;
      text-align: center;
      mat-icon { color: var(--gl-orange); }
      span { display: block; font-size: 1.35rem; font-weight: 700; }
      small { color: var(--app-text-muted); font-size: 0.72rem; }
    }
    .project-select { width: min(100%, 420px); margin-bottom: 1rem; }
    .project-cell { display: flex; align-items: center; gap: 0.45rem; }
    .tab-panel { padding: 1rem 0; }
    .tag { margin-left: 0.15rem; font-size: 0.65rem; font-weight: 700; padding: 0.1rem 0.35rem; border-radius: 4px; background: color-mix(in srgb, var(--gl-orange) 18%, transparent); color: var(--gl-orange); }
    .mr-list { list-style: none; padding: 0; margin: 0 0 0.75rem; li { padding: 0.55rem 0; border-bottom: 1px solid var(--app-border-subtle); display: flex; flex-direction: column; gap: 0.2rem; } }
    .pipe-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; padding: 0.5rem 0; border-bottom: 1px solid var(--app-border-subtle); font-size: 0.85rem; }
    .clickable { cursor: pointer; }
    .muted { font-size: 0.78rem; color: var(--app-text-muted); }
    .flag { font-size: 0.68rem; margin-right: 0.35rem; padding: 0.1rem 0.35rem; border-radius: 4px; background: color-mix(in srgb, var(--gl-purple) 15%, transparent); }
    .log-preview {
      font-family: ui-monospace, monospace;
      font-size: 0.75rem;
      padding: 0.75rem;
      background: var(--app-elevated);
      border-radius: var(--app-radius-sm);
    }
    @media (max-width: 900px) {
      .gitlab-widgets--compact { grid-template-columns: repeat(2, 1fr); }
    }
  `,
})
export class GitlabSectionComponent {
  @Input() projects: GitlabProject[] = []
  @Input() groups: GitlabGroup[] = []
  @Input() account: GitlabAccount | null = null
  @Input() demoMode = true
  @Input() syncStatus: 'connected' | 'disconnected' = 'connected'
  @Input() projectControl = new FormControl<string>('', { nonNullable: true })

  readonly gitlabWebhooks = CLIENT_DEMO_GITLAB_WEBHOOKS
  readonly gitlabDeployments = CLIENT_DEMO_GITLAB_DEPLOYMENTS
  readonly pipelines = CLIENT_DEMO_GITLAB_PIPELINES
  readonly mergeRequests = CLIENT_DEMO_GITLAB_MRS
  readonly runners = CLIENT_DEMO_GITLAB_RUNNERS
  readonly environments = CLIENT_DEMO_GITLAB_ENVIRONMENTS
  readonly releases = CLIENT_DEMO_GITLAB_RELEASES
  readonly issues = CLIENT_DEMO_GITLAB_ISSUES
  readonly ciVariables = CLIENT_DEMO_GITLAB_CI_VARS

  readonly projectCols = ['name', 'group', 'visibility', 'language', 'branch', 'actions']
  readonly groupCols = ['name', 'path', 'projects', 'subgroups']
  readonly varCols = ['key', 'project', 'env', 'flags']

  get openMrsCount(): number {
    return this.mergeRequests.filter((m) => m['state'] === 'opened').length
  }

  readonly addAccount = output<void>()
  readonly connectDemo = output<void>()
  readonly validate = output<void>()
  readonly sync = output<void>()
  readonly openDetail = output<GitlabProject>()
  readonly deploy = output<GitlabProject>()
  readonly openExternal = output<GitlabProject>()
  readonly viewMrs = output<void>()
  readonly viewPipelines = output<void>()
  readonly createWebhook = output<void>()
  readonly viewLogs = output<void>()

  mrBadge = (s: unknown): string => (s === 'opened' ? 'RUNNING' : s === 'merged' ? 'SUCCESS' : 'STOPPED')
  pipeBadge = (s: unknown): string => {
    if (s === 'success') return 'SUCCESS'
    if (s === 'running') return 'RUNNING'
    return 'ERROR'
  }
}
