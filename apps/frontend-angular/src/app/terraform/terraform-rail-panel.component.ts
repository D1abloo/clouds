import { Component, Input, output } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { TerraformFolderTreeComponent } from './terraform-folder-tree.component'
import { projectStatusLabel, type TerraformProject } from './terraform-projects'
import type { TerraformLaunchRecord } from './terraform-folders'
import type { TerraformWorkspaceItem } from '../core/stores/terraform-run.store'
import { BUILTIN_TEMPLATES } from './terraform-hcl-templates'

@Component({
  selector: 'app-terraform-rail-panel',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    TerraformFolderTreeComponent,
  ],
  template: `
    <aside class="rail" aria-label="Proyectos, carpetas y workspaces">
      <div class="rail__cmd">
        <button type="button" class="rail__cmd-btn" (click)="newProject.emit()" title="Nuevo proyecto">
          <mat-icon>create_new_folder</mat-icon>
          <span>Proyecto</span>
        </button>
        <button type="button" class="rail__cmd-btn" (click)="saveProject.emit()" title="Guardar proyecto">
          <mat-icon>save</mat-icon>
          <span>Guardar</span>
        </button>
        <button type="button" class="rail__cmd-btn" (click)="openAutomate.emit()" title="Automatizar">
          <mat-icon>schedule</mat-icon>
          <span>Auto</span>
        </button>
        <button type="button" class="rail__cmd-btn rail__cmd-btn--primary" (click)="openLaunch.emit()" title="Desplegar instancia">
          <mat-icon>rocket_launch</mat-icon>
          <span>Deploy</span>
        </button>
      </div>

      <section class="rail__projects">
        <header>
          <h3>Proyectos</h3>
          <span>{{ projects.length }}</span>
        </header>
        <ul class="rail__proj-list">
          @for (p of filteredProjects(); track p.id) {
            <li>
              <button
                type="button"
                class="rail__proj"
                [class.rail__proj--active]="activeProjectId === p.id"
                (click)="projectSelect.emit(p.id)"
              >
                <span class="rail__proj-dot" [attr.data-status]="p.status"></span>
                <span class="rail__proj-body">
                  <strong>{{ p.name }}</strong>
                  <span>{{ projectStatusLabel(p.status) }} · {{ p.providers.join(', ') }}</span>
                </span>
                <mat-icon class="rail__proj-chev">chevron_right</mat-icon>
              </button>
            </li>
          }
        </ul>
      </section>

      <mat-form-field appearance="fill" class="rail__search" subscriptSizing="dynamic">
        <mat-label>Buscar</mat-label>
        <mat-icon matPrefix>search</mat-icon>
        <input
          matInput
          [formControl]="search"
          placeholder="Proyecto, workspace, instancia…"
          aria-label="Filtrar organización"
        />
      </mat-form-field>

      <div class="rail__scroll">
        <div class="rail__org-head">
          <h4>Carpetas</h4>
          <span>{{ launchCount }} lanz.</span>
        </div>
        <app-terraform-folder-tree
          [workspaces]="workspaces"
          [launches]="launches"
          [activeWorkspaceId]="activeWorkspaceId"
          [searchTerm]="searchTerm"
          [expandedFolderIds]="expandedFolderIds"
          (toggleFolder)="toggleFolder.emit($event)"
          (workspaceSelect)="workspaceSelect.emit($event)"
          (launchSelect)="launchSelect.emit($event)"
        />

        <section class="rail__tpl">
          <h4>Plantillas</h4>
          @for (t of templates; track t.id) {
            <button type="button" class="rail__tpl-btn" (click)="loadTemplate.emit(t.hcl)">
              <mat-icon>code</mat-icon>
              <span>{{ t.label }}</span>
            </button>
          }
        </section>
      </div>
    </aside>
  `,
  styles: `
    :host { display: flex; flex-direction: column; height: 100%; min-height: 0; }
    .rail {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      overflow: hidden;
    }
    .rail__cmd {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.25rem;
      padding: 0.55rem 0.6rem 0;
      flex-shrink: 0;
    }
    .rail__cmd-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.1rem;
      padding: 0.4rem 0.2rem;
      border: none;
      border-radius: var(--app-radius-md);
      background: var(--app-elevated);
      font: inherit;
      font-size: 0.58rem;
      font-weight: 700;
      color: var(--app-text-muted);
      cursor: pointer;
    }
    .rail__cmd-btn mat-icon { font-size: 1.05rem; width: 1.05rem; height: 1.05rem; }
    .rail__cmd-btn--primary {
      background: color-mix(in srgb, #844fba 16%, var(--app-elevated));
      color: #844fba;
    }
    .rail__cmd-btn:hover { background: color-mix(in srgb, #844fba 10%, var(--app-elevated)); }
    .rail__projects {
      padding: 0.55rem 0.6rem 0;
      flex-shrink: 0;
    }
    .rail__projects header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.35rem;
    }
    .rail__projects h3 {
      margin: 0;
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--app-text-muted);
    }
    .rail__projects header span {
      font-size: 0.62rem;
      font-weight: 700;
      color: #844fba;
    }
    .rail__proj-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      max-height: 140px;
      overflow-y: auto;
    }
    .rail__proj {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      width: 100%;
      padding: 0.45rem 0.5rem;
      border: none;
      border-radius: var(--app-radius-md);
      background: transparent;
      font: inherit;
      text-align: left;
      color: inherit;
      cursor: pointer;
    }
    .rail__proj:hover, .rail__proj--active {
      background: color-mix(in srgb, #844fba 10%, var(--app-elevated));
    }
    .rail__proj-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
      background: #94a3b8;
    }
    .rail__proj-dot[data-status='healthy'] { background: #22c55e; }
    .rail__proj-dot[data-status='drift'] { background: #f59e0b; }
    .rail__proj-dot[data-status='syncing'] { background: #844fba; }
    .rail__proj-dot[data-status='failed'] { background: #ef4444; }
    .rail__proj-body { flex: 1; min-width: 0; }
    .rail__proj-body strong {
      display: block;
      font-size: 0.76rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .rail__proj-body span {
      display: block;
      font-size: 0.6rem;
      color: var(--app-text-muted);
    }
    .rail__proj-chev { font-size: 1rem; width: 1rem; height: 1rem; color: var(--app-text-muted); }
    .rail__search {
      width: 100%;
      padding: 0.35rem 0.6rem 0;
      flex-shrink: 0;
      box-sizing: border-box;
    }
    .rail__scroll {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-width: thin;
      padding: 0.35rem 0.6rem 0.65rem;
    }
    .rail__org-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.35rem;
    }
    .rail__org-head h4 {
      margin: 0;
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--app-text-muted);
    }
    .rail__org-head span { font-size: 0.62rem; color: var(--app-text-muted); }
    .rail__tpl { margin-top: 0.75rem; }
    .rail__tpl h4 {
      margin: 0 0 0.35rem;
      font-size: 0.68rem;
      text-transform: uppercase;
      color: var(--app-text-muted);
    }
    .rail__tpl-btn {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      width: 100%;
      padding: 0.4rem 0.45rem;
      margin-bottom: 0.2rem;
      border: none;
      border-radius: var(--app-radius-md);
      background: var(--app-elevated);
      font: inherit;
      font-size: 0.72rem;
      color: inherit;
      cursor: pointer;
      text-align: left;
    }
    .rail__tpl-btn mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: #844fba; }
  `,
})
export class TerraformRailPanelComponent {
  @Input() projects: TerraformProject[] = []
  @Input() activeProjectId: string | null = null
  @Input() workspaces: TerraformWorkspaceItem[] = []
  @Input() launches: TerraformLaunchRecord[] = []
  @Input() activeWorkspaceId: string | null = null
  @Input() searchTerm = ''
  @Input() expandedFolderIds = new Set<string>()
  @Input() launchCount = 0
  @Input({ required: true }) search!: FormControl<string>

  readonly newProject = output<void>()
  readonly saveProject = output<void>()
  readonly openAutomate = output<void>()
  readonly openLaunch = output<void>()
  readonly projectSelect = output<string>()
  readonly toggleFolder = output<string>()
  readonly workspaceSelect = output<string>()
  readonly launchSelect = output<TerraformLaunchRecord>()
  readonly loadTemplate = output<string>()

  readonly templates = BUILTIN_TEMPLATES
  readonly projectStatusLabel = projectStatusLabel

  filteredProjects = (): TerraformProject[] => {
    const q = this.searchTerm.trim().toLowerCase()
    if (!q) return this.projects
    return this.projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.folderId.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)),
    )
  }
}
