import { Component, Input, output } from '@angular/core'
import { DatePipe } from '@angular/common'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatCardModule } from '@angular/material/card'
import { MatTableModule } from '@angular/material/table'
import { MatTabsModule } from '@angular/material/tabs'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import type { GitlabAccount, GitlabGroup, GitlabProject } from '../utils/gitlab-demo-catalog'
import {
  CLIENT_DEMO_GITLAB_ENVIRONMENTS,
  CLIENT_DEMO_GITLAB_MRS,
  CLIENT_DEMO_GITLAB_PIPELINES,
  CLIENT_DEMO_GITLAB_RELEASES,
  CLIENT_DEMO_GITLAB_RUNNERS,
} from '../utils/gitlab-demo-catalog'

@Component({
  selector: 'app-gitlab-section',
  standalone: true,
  imports: [
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTableModule,
    MatTabsModule,
    StatusBadgeComponent,
  ],
  template: `
    <div class="gitlab-page">
      <mat-card class="gitlab-hero">
        <div class="gitlab-hero__head">
          <span class="gitlab-mark" aria-hidden="true">GitLab</span>
          <div>
            <h3>Cuentas GitLab</h3>
            <p>Proyectos, grupos, pipelines, runners y environments</p>
            @if (account) {
              <p class="account-line"><strong>{{ account.label }}</strong> — {{ account.username }} ({{ account.statusLabel }})</p>
            }
          </div>
        </div>
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
        <mat-card class="widget"><mat-icon>groups</mat-icon><span>{{ groups.length }}</span><small>Grupos</small></mat-card>
        <mat-card class="widget"><mat-icon>timeline</mat-icon><span>{{ pipelines.length }}</span><small>Pipelines</small></mat-card>
        <mat-card class="widget"><mat-icon>directions_run</mat-icon><span>{{ runners.length }}</span><small>Runners</small></mat-card>
        <mat-card class="widget"><mat-icon>public</mat-icon><span>{{ environments.length }}</span><small>Environments</small></mat-card>
      </div>

      <mat-tab-group class="soft-tabs gitlab-tabs" animationDuration="200ms">
        <mat-tab label="Proyectos">
          <div class="tab-panel">
            <table mat-table [dataSource]="projects" class="premium-table">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Proyecto</th>
                <td mat-cell *matCellDef="let row">
                  <strong>{{ row.name }}</strong>
                  <span class="tag">GitLab</span>
                </td>
              </ng-container>
              <ng-container matColumnDef="group">
                <th mat-header-cell *matHeaderCellDef>Grupo</th>
                <td mat-cell *matCellDef="let row">{{ row.group }}</td>
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
                  <button mat-stroked-button type="button" (click)="openDetail.emit(row)">Detalle</button>
                  <button mat-stroked-button type="button" (click)="deploy.emit(row)">Desplegar proyecto</button>
                  <button mat-button type="button" (click)="openExternal.emit(row)">Abrir en GitLab</button>
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
        <mat-tab label="Pipelines">
          <div class="tab-panel">
            @for (p of pipelines; track p['id']) {
              <div class="pipe-row">
                <strong>{{ p['projectPath'] }}</strong>
                <span>{{ p['ref'] }} · {{ p['stage'] }}</span>
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
                <span>{{ r['tags'] }}</span>
                <app-status-badge [value]="r['status'] === 'online' ? 'SUCCESS' : 'STOPPED'" />
              </div>
            }
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
    .gitlab-mark {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 3rem;
      height: 3rem;
      padding: 0 0.5rem;
      border-radius: 8px;
      font-weight: 800;
      font-size: 0.75rem;
      letter-spacing: 0.02em;
      color: #fff;
      background: linear-gradient(135deg, #fc6d26, #6b4fbb);
    }
    .gitlab-hero__head { display: flex; gap: 1rem; align-items: flex-start; h3 { margin: 0; } p { margin: 0.35rem 0 0; font-size: 0.85rem; color: var(--app-text-muted); } }
    .account-line { margin-top: 0.5rem !important; color: var(--app-text) !important; }
    .gitlab-hero__actions { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.85rem; }
    .gitlab-primary { background: var(--gl-orange) !important; color: #fff !important; }
    .gitlab-widgets {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.65rem;
      margin-bottom: 1rem;
    }
    .widget {
      padding: 0.85rem;
      text-align: center;
      mat-icon { color: var(--gl-orange); }
      span { display: block; font-size: 1.35rem; font-weight: 700; }
      small { color: var(--app-text-muted); font-size: 0.72rem; }
    }
    .tab-panel { padding: 1rem 0; }
    .tag { margin-left: 0.4rem; font-size: 0.65rem; font-weight: 700; padding: 0.1rem 0.35rem; border-radius: 4px; background: color-mix(in srgb, var(--gl-orange) 18%, transparent); color: var(--gl-orange); }
    .mr-list { list-style: none; padding: 0; margin: 0 0 0.75rem; li { padding: 0.55rem 0; border-bottom: 1px solid var(--app-border-subtle); display: flex; flex-direction: column; gap: 0.2rem; } }
    .pipe-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; padding: 0.5rem 0; border-bottom: 1px solid var(--app-border-subtle); font-size: 0.85rem; }
    .clickable { cursor: pointer; }
    .muted { font-size: 0.78rem; color: var(--app-text-muted); }
  `,
})
export class GitlabSectionComponent {
  @Input() projects: GitlabProject[] = []
  @Input() groups: GitlabGroup[] = []
  @Input() account: GitlabAccount | null = null

  readonly pipelines = CLIENT_DEMO_GITLAB_PIPELINES
  readonly mergeRequests = CLIENT_DEMO_GITLAB_MRS
  readonly runners = CLIENT_DEMO_GITLAB_RUNNERS
  readonly environments = CLIENT_DEMO_GITLAB_ENVIRONMENTS
  readonly releases = CLIENT_DEMO_GITLAB_RELEASES

  readonly projectCols = ['name', 'group', 'language', 'branch', 'actions']
  readonly groupCols = ['name', 'path', 'projects', 'subgroups']

  readonly addAccount = output<void>()
  readonly connectDemo = output<void>()
  readonly validate = output<void>()
  readonly sync = output<void>()
  readonly openDetail = output<GitlabProject>()
  readonly deploy = output<GitlabProject>()
  readonly openExternal = output<GitlabProject>()
  readonly viewMrs = output<void>()
  readonly viewPipelines = output<void>()

  mrBadge = (s: unknown): string => (s === 'opened' ? 'RUNNING' : s === 'merged' ? 'SUCCESS' : 'STOPPED')
  pipeBadge = (s: unknown): string => {
    if (s === 'success') return 'SUCCESS'
    if (s === 'running') return 'RUNNING'
    return 'ERROR'
  }
}
