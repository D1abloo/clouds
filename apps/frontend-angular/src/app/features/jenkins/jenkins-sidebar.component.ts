import { Component, Input, output } from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component'
import type { JenkinsFolder, JenkinsInventory, JenkinsJob, JenkinsQueueItem } from './jenkins.models'

@Component({
  selector: 'app-jenkins-sidebar',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    StatusBadgeComponent,
  ],
  template: `
    <aside class="jenkins-sidebar">
      <section class="jenkins-sidebar__block">
        <h3 class="jenkins-sidebar__title">Controladores</h3>
        <div class="jenkins-servers">
          <button
            type="button"
            class="jenkins-server"
            [class.jenkins-server--active]="selectedServerId === 'all'"
            (click)="serverSelect.emit('all')"
          >
            <span class="jenkins-server__dot online"></span>
            <span class="jenkins-server__name">Todos los controladores</span>
          </button>
          @for (srv of inventory.servers; track srv.id) {
            <button
              type="button"
              class="jenkins-server"
              [class.jenkins-server--active]="selectedServerId === srv.id"
              (click)="serverSelect.emit(srv.id)"
            >
              <span class="jenkins-server__dot" [class.online]="srv.status === 'online'"></span>
              <span class="jenkins-server__name">{{ srv.name }}</span>
              <span class="jenkins-server__meta">{{ srv.busyExecutors }}/{{ srv.executors }} exec</span>
            </button>
          }
        </div>
      </section>

      <section class="jenkins-sidebar__block">
        <h3 class="jenkins-sidebar__title">
          Cola de builds
          <span class="jenkins-sidebar__badge">{{ inventory.queue.length }}</span>
        </h3>
        @if (inventory.queue.length === 0) {
          <p class="jenkins-sidebar__empty">Cola vacía</p>
        } @else {
          <ul class="jenkins-queue">
            @for (q of inventory.queue; track q.id) {
              <li class="jenkins-queue__item">
                <app-status-badge value="PENDING" />
                <div>
                  <strong>{{ q.jobName }} #{{ q.buildNum }}</strong>
                  <span>{{ q.why }}</span>
                  <small>{{ q.inQueueSince }}</small>
                </div>
              </li>
            }
          </ul>
        }
      </section>

      <section class="jenkins-sidebar__block jenkins-sidebar__block--grow">
        <div class="jenkins-sidebar__jobs-head">
          <h3 class="jenkins-sidebar__title">Jobs</h3>
          <button mat-stroked-button type="button" class="jenkins-new-job" (click)="createJob.emit()">
            <mat-icon>add</mat-icon>
            Crear job
          </button>
        </div>
        <mat-form-field appearance="outline" class="jenkins-sidebar__search">
          <mat-label>Buscar</mat-label>
          <input matInput [formControl]="searchControl" placeholder="Job o carpeta…" />
        </mat-form-field>

        @for (folder of folders(); track folder.path) {
          <div class="jenkins-folder">
            <button type="button" class="jenkins-folder__head" (click)="toggleFolder(folder.path)">
              <mat-icon>{{ isFolderOpen(folder.path) ? 'folder_open' : 'folder' }}</mat-icon>
              {{ folder.label }}
            </button>
            @if (isFolderOpen(folder.path)) {
              <ul class="jenkins-job-list">
                @for (job of jobsInFolder(folder.path); track job.name) {
                  <li>
                    <button
                      type="button"
                      class="jenkins-job"
                      [class.jenkins-job--active]="selectedJobName === job.name"
                      (click)="jobSelect.emit(job)"
                    >
                      <mat-icon class="jenkins-job__type">{{ jobTypeIcon(job.type) }}</mat-icon>
                      <span class="jenkins-job__info">
                        <span class="jenkins-job__name">{{ job.name }}</span>
                        <span class="jenkins-job__sub">#{{ job.buildNum }} · {{ job.lastRun }}</span>
                      </span>
                      <app-status-badge [value]="job.status" />
                    </button>
                  </li>
                }
              </ul>
            }
          </div>
        }
      </section>
    </aside>
  `,
  styles: `
    .jenkins-sidebar {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      height: 100%;
      min-height: 0;
    }
    .jenkins-sidebar__block {
      padding: 0.75rem;
      border-radius: var(--app-radius-md);
      background: var(--app-card);
      box-shadow: var(--app-shadow-xs);
    }
    .jenkins-sidebar__block--grow {
      flex: 1;
      min-height: 200px;
      overflow: auto;
    }
    .jenkins-sidebar__jobs-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }
    .jenkins-sidebar__jobs-head .jenkins-sidebar__title { margin: 0; }
    .jenkins-new-job {
      flex-shrink: 0;
      font-size: 0.72rem;
      line-height: 1;
      padding: 0 0.5rem;
      min-height: 32px;
    }
    .jenkins-new-job mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      margin-right: 0.15rem;
    }
    .jenkins-sidebar__title {
      margin: 0 0 0.5rem;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--app-text-muted);
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .jenkins-sidebar__badge {
      background: color-mix(in srgb, var(--jenkins-brand, #d33833) 15%, transparent);
      color: var(--jenkins-brand, #d33833);
      padding: 0.1rem 0.45rem;
      border-radius: 999px;
      font-size: 0.68rem;
    }
    .jenkins-sidebar__empty { margin: 0; font-size: 0.8rem; color: var(--app-text-muted); }
    .jenkins-sidebar__search { width: 100%; margin-bottom: 0.5rem; }
    .jenkins-servers { display: flex; flex-direction: column; gap: 0.35rem; }
    .jenkins-server {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.35rem 0.5rem;
      width: 100%;
      padding: 0.5rem 0.65rem;
      border: 1px solid transparent;
      border-radius: var(--app-radius-md);
      background: transparent;
      cursor: pointer;
      text-align: left;
      font: inherit;
      color: inherit;
    }
    .jenkins-server--active {
      border-color: color-mix(in srgb, var(--jenkins-brand, #d33833) 35%, transparent);
      background: color-mix(in srgb, var(--jenkins-brand, #d33833) 8%, var(--app-card));
    }
    .jenkins-server__dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #94a3b8;
    }
    .jenkins-server__dot.online { background: #22c55e; }
    .jenkins-server__name { flex: 1; font-size: 0.8rem; font-weight: 600; }
    .jenkins-server__meta { font-size: 0.68rem; color: var(--app-text-muted); width: 100%; padding-left: 1rem; }
    .jenkins-queue { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
    .jenkins-queue__item {
      display: flex;
      gap: 0.5rem;
      font-size: 0.78rem;
    }
    .jenkins-queue__item strong { display: block; font-size: 0.8rem; }
    .jenkins-queue__item span, .jenkins-queue__item small {
      display: block;
      color: var(--app-text-muted);
    }
    .jenkins-folder__head {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      width: 100%;
      padding: 0.35rem 0;
      border: none;
      background: none;
      font: inherit;
      font-weight: 600;
      font-size: 0.8rem;
      cursor: pointer;
      color: inherit;
    }
    .jenkins-job-list { list-style: none; margin: 0; padding: 0 0 0 0.5rem; }
    .jenkins-job {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.45rem 0.5rem;
      border: none;
      border-radius: var(--app-radius-md);
      background: transparent;
      cursor: pointer;
      text-align: left;
      font: inherit;
      color: inherit;
    }
    .jenkins-job--active {
      background: color-mix(in srgb, var(--jenkins-brand, #d33833) 10%, var(--app-elevated));
    }
    .jenkins-job__type { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; color: var(--jenkins-brand, #d33833); }
    .jenkins-job__info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .jenkins-job__name {
      font-size: 0.8rem;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .jenkins-job__sub { font-size: 0.68rem; color: var(--app-text-muted); }
  `,
})
export class JenkinsSidebarComponent {
  @Input({ required: true }) inventory!: JenkinsInventory
  @Input() selectedServerId = 'all'
  @Input() selectedJobName = ''
  @Input() filteredJobs: JenkinsJob[] = []

  readonly searchControl = new FormControl('', { nonNullable: true })
  readonly serverSelect = output<string>()
  readonly jobSelect = output<JenkinsJob>()
  readonly searchChange = output<string>()
  readonly createJob = output<void>()

  private folderExpanded = new Set(['/cloudops/apps', '/cloudops/infra', '/cloudops/security', '/cloudops/ops'])
  private folderTick = 0

  constructor() {
    this.searchControl.valueChanges.subscribe((v) => this.searchChange.emit(v))
  }

  isFolderOpen = (path: string): boolean => {
    void this.folderTick
    return this.folderExpanded.has(path)
  }

  toggleFolder = (path: string): void => {
    if (this.folderExpanded.has(path)) this.folderExpanded.delete(path)
    else this.folderExpanded.add(path)
    this.folderTick++
  }

  folders = (): JenkinsFolder[] => this.inventory.folders

  jobsInFolder = (path: string): JenkinsJob[] =>
    this.filteredJobs.filter((j) => j.folder === path)

  jobTypeIcon = (type: JenkinsJob['type']): string => {
    if (type === 'pipeline') return 'account_tree'
    if (type === 'multibranch') return 'alt_route'
    return 'build'
  }
}

// Fix: I used signal without importing - rewrite sidebar without signal, use Set only
