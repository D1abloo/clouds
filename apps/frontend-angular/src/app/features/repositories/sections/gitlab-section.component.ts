import { Component, Input, output } from '@angular/core'
import { RouterLink } from '@angular/router'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTableModule } from '@angular/material/table'
import { MatTabsModule } from '@angular/material/tabs'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatSelectModule } from '@angular/material/select'
import { NavIconComponent } from '../../../shared/components/nav-icon/nav-icon.component'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import { GitlabAccountCardComponent } from '../components/gitlab-account-card.component'
import { GitlabSyncStatusComponent } from '../components/gitlab-sync-status.component'
import type { GitlabAccount, GitlabGroup, GitlabProject } from '../utils/gitlab.data'
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
} from '../utils/gitlab.data'
import { repoRoute } from '../repositories-section.config'
import { RepositoriesQuickLinksComponent } from '../components/repositories-quick-links.component'

@Component({
  selector: 'app-gitlab-section',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTabsModule,
    MatFormFieldModule,
    MatSelectModule,
    NavIconComponent,
    StatusBadgeComponent,
    GitlabAccountCardComponent,
    GitlabSyncStatusComponent,
    RepositoriesQuickLinksComponent,
  ],
  template: `
    <div class="repo-section repo-section--gitlab">
      <div class="repo-connect-bar">
        <div class="repo-connect-bar__main">
          @if (account) {
            <app-gitlab-account-card [account]="account" [demoMode]="demoMode" [projectCount]="projects.length" />
          }
        </div>
        <div class="repo-connect-bar__side">
          <app-gitlab-sync-status
            [status]="syncStatus"
            [lastSyncAt]="account?.lastSyncAt ?? null"
            [projectCount]="projects.length"
          />
          <div class="repo-connect-bar__actions">
            <button mat-flat-button class="gitlab-primary" type="button" (click)="addAccount.emit()">
              <mat-icon>person_add</mat-icon> Añadir cuenta
            </button>
            @if (!demoMode) {
              <button mat-stroked-button type="button" (click)="validate.emit()">
                <mat-icon>verified</mat-icon> Validar
              </button>
              <button mat-stroked-button type="button" (click)="sync.emit()">
                <mat-icon>sync</mat-icon> Sincronizar
              </button>
            } @else {
              <button mat-stroked-button type="button" (click)="connectDemo.emit()">
                <mat-icon>science</mat-icon> Demo
              </button>
              <button mat-stroked-button type="button" (click)="validate.emit()">
                <mat-icon>verified</mat-icon> Validar
              </button>
              <button mat-stroked-button type="button" (click)="sync.emit()">
                <mat-icon>sync</mat-icon> Sincronizar
              </button>
            }
          </div>
        </div>
      </div>

      <app-repositories-quick-links current="gitlab" title="Relacionado" />

      <p class="repo-tab-hint">
        {{ groups.length }} grupos · {{ openMrsCount }} MR abiertos · {{ runners.length }} runners ·
        {{ environments.length }} environments
      </p>

      <mat-tab-group class="soft-tabs" animationDuration="200ms">
        <mat-tab label="Proyectos">
          <div class="repo-data-block">
            <mat-form-field appearance="outline" class="repo-select-field">
              <mat-label>Proyecto activo</mat-label>
              <mat-select [formControl]="projectControl">
                @for (p of projects; track p.id) {
                  <mat-option [value]="p.id">{{ p.fullPath }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <div class="data-table-wrap">
              <table mat-table [dataSource]="projects" class="premium-table table-row-hover">
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>Proyecto</th>
                  <td mat-cell *matCellDef="let row">
                    <div class="project-cell">
                      <app-nav-icon logo="gitlab" size="sm" />
                      <strong>{{ row.name }}</strong>
                      <span class="prov-badge prov-badge--gitlab">GitLab</span>
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
                  <th mat-header-cell *matHeaderCellDef>Rama</th>
                  <td mat-cell *matCellDef="let row">{{ row.defaultBranch }}</td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef>Acciones</th>
                  <td mat-cell *matCellDef="let row">
                    <button mat-stroked-button type="button" (click)="openDetail.emit(row); $event.stopPropagation()">Detalle</button>
                    <button mat-stroked-button type="button" (click)="deploy.emit(row); $event.stopPropagation()">Desplegar</button>
                    <button mat-stroked-button type="button" (click)="openExternal.emit(row); $event.stopPropagation()">
                      <mat-icon>open_in_new</mat-icon> GitLab
                    </button>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="projectCols"></tr>
                <tr mat-row *matRowDef="let row; columns: projectCols" class="table-row-hover" (click)="openDetail.emit(row)"></tr>
              </table>
            </div>
          </div>
        </mat-tab>

        <mat-tab label="Grupos">
          <div class="repo-data-block">
            <div class="data-table-wrap">
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
          </div>
        </mat-tab>

        <mat-tab label="CI/CD">
          <div class="repo-data-block">
            <div class="repo-subblock">
              <h4><mat-icon>timeline</mat-icon> Pipelines</h4>
              <ul class="repo-inline-list">
                @for (p of pipelinesList; track p['id']) {
                  <li>
                    <strong>{{ p['projectPath'] }}</strong>
                    <span class="repo-muted">{{ p['ref'] }} · {{ p['stage'] }} · {{ p['duration'] }}</span>
                    <app-status-badge [value]="pipeBadge(p['status'])" />
                  </li>
                }
              </ul>
              <div class="repo-toolbar repo-toolbar--inline">
                <button mat-stroked-button type="button" (click)="viewPipelines.emit()">Ver pipelines</button>
                <a mat-button [routerLink]="routes.deployments">
                  <mat-icon>rocket_launch</mat-icon> Despliegues
                </a>
              </div>
            </div>
            <div class="repo-subblock">
              <h4><mat-icon>directions_run</mat-icon> Runners</h4>
              <ul class="repo-inline-list">
                @for (r of runners; track r['id']) {
                  <li>
                    <strong>{{ r['name'] }}</strong>
                    <span class="repo-muted">{{ r['tags'] }} · {{ r['jobs'] }} jobs</span>
                    <app-status-badge [value]="r['status'] === 'online' ? 'SUCCESS' : 'STOPPED'" />
                  </li>
                }
              </ul>
            </div>
          </div>
        </mat-tab>

        <mat-tab label="Merge Requests">
          <div class="repo-data-block">
            <ul class="repo-inline-list">
              @for (mr of mergeRequestsList; track mr['id']) {
                <li>
                  <strong>!{{ mr['iid'] }} {{ mr['title'] }}</strong>
                  <span class="repo-muted">{{ mr['projectPath'] }}</span>
                  <app-status-badge [value]="mrBadge(mr['state'])" />
                </li>
              }
            </ul>
            <div class="repo-toolbar repo-toolbar--inline">
              <button mat-stroked-button type="button" (click)="viewMrs.emit()">Ver merge requests</button>
              <a mat-button [routerLink]="routes.github">
                <mat-icon>code</mat-icon> GitHub (Pull Requests)
              </a>
            </div>
          </div>
        </mat-tab>

        <mat-tab label="Operaciones">
          <div class="repo-data-block">
            <div class="repo-subblock">
              <h4><mat-icon>bug_report</mat-icon> Issues</h4>
              <ul class="repo-inline-list">
                @for (issue of issues; track issue['id']) {
                  <li>
                    <strong>#{{ issue['iid'] }} {{ issue['title'] }}</strong>
                    <span class="repo-muted">{{ issue['projectPath'] }}</span>
                    <app-status-badge [value]="issue['state'] === 'opened' ? 'RUNNING' : 'SUCCESS'" />
                  </li>
                }
              </ul>
            </div>
            <div class="repo-subblock">
              <h4><mat-icon>tune</mat-icon> Variables CI/CD</h4>
              <div class="data-table-wrap">
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
                  <tr mat-header-row *matHeaderRowDef="varCols"></tr>
                  <tr mat-row *matRowDef="let row; columns: varCols"></tr>
                </table>
              </div>
            </div>
            <div class="repo-subblock">
              <h4><mat-icon>public</mat-icon> Environments & releases</h4>
              <ul class="repo-inline-list">
                @for (e of environments; track e['id']) {
                  <li>
                    <strong>{{ e['name'] }}</strong>
                    <span class="repo-muted">{{ e['projectPath'] }} · {{ e['tier'] }}</span>
                  </li>
                }
                @for (rel of releases; track rel['id']) {
                  <li>
                    <strong>{{ rel['tag'] }}</strong>
                    <span class="repo-muted">{{ rel['name'] }} — {{ rel['projectPath'] }}</span>
                  </li>
                }
              </ul>
            </div>
            <div class="repo-subblock">
              <h4><mat-icon>webhook</mat-icon> Webhooks GitLab</h4>
              <ul class="repo-inline-list">
                @for (wh of gitlabWebhooksList; track wh['id']) {
                  <li>
                    <strong>{{ wh['event'] }}</strong>
                    <span class="repo-muted">{{ wh['projectPath'] }}</span>
                    <app-status-badge [value]="wh['active'] ? 'SUCCESS' : 'STOPPED'" />
                  </li>
                }
              </ul>
              <div class="repo-toolbar repo-toolbar--inline">
                <button mat-stroked-button type="button" (click)="createWebhook.emit()">Crear webhook</button>
                <a mat-stroked-button [routerLink]="routes.webhooks">
                  <mat-icon>webhook</mat-icon> Gestionar webhooks
                </a>
              </div>
            </div>
            <div class="repo-subblock">
              <h4><mat-icon>rocket_launch</mat-icon> Despliegues recientes</h4>
              <ul class="repo-inline-list">
                @for (d of gitlabDeploymentsList; track d['id']) {
                  <li>
                    <strong>{{ d['projectPath'] }}</strong>
                    <span class="repo-muted">{{ d['targetName'] }} · {{ d['branch'] }}</span>
                    <app-status-badge [value]="d['status'] === 'success' ? 'SUCCESS' : 'RUNNING'" />
                  </li>
                }
              </ul>
              <a mat-stroked-button [routerLink]="routes.deployments">
                <mat-icon>open_in_new</mat-icon> Ver todos los despliegues
              </a>
            </div>
          </div>
        </mat-tab>

        <mat-tab label="Logs">
          <div class="repo-data-block">
            <pre class="repo-log-preview">[GitLab] Sync cloudops-platform OK
[GitLab] pipeline #1842 stage deploy success
[GitLab] runner shared-runner-01 online
[GitLab] environment production updated</pre>
            <button mat-stroked-button type="button" (click)="viewLogs.emit()">
              <mat-icon>terminal</mat-icon> Abrir panel de logs
            </button>
            <a mat-button [routerLink]="routes.deployments">Historial de despliegues</a>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: `
    .gitlab-primary { background: #fc6d26 !important; color: #fff !important; }
    .project-cell { display: flex; align-items: center; gap: 0.45rem; }
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
  readonly varCols = ['key', 'project', 'env']
  readonly routes = {
    webhooks: repoRoute('webhooks', 'gitlab'),
    commits: repoRoute('commits', 'gitlab'),
    branches: repoRoute('branches', 'gitlab'),
    deployments: repoRoute('deployments', 'gitlab'),
    github: repoRoute('github', 'github'),
  }

  get mergeRequestsList(): Record<string, unknown>[] {
    return this.demoMode ? this.mergeRequests : []
  }

  get pipelinesList(): Record<string, unknown>[] {
    return this.demoMode ? this.pipelines : []
  }

  get gitlabWebhooksList(): Record<string, unknown>[] {
    return this.demoMode ? this.gitlabWebhooks : []
  }

  get gitlabDeploymentsList(): Record<string, unknown>[] {
    return this.demoMode ? this.gitlabDeployments : []
  }

  get openMrsCount(): number {
    return this.mergeRequestsList.filter((m) => m['state'] === 'opened' || m['state'] === 'open').length
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
