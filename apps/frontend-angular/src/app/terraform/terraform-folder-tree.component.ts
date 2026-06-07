import { DatePipe } from '@angular/common'
import { Component, input, output, computed } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { StatusBadgeComponent } from '../shared/components/status-badge/status-badge.component'
import {
  TERRAFORM_FOLDERS,
  buildFolderTree,
  type TerraformFolder,
  type TerraformLaunchRecord,
} from './terraform-folders'
import type { TerraformWorkspaceItem } from '../core/stores/terraform-run.store'

@Component({
  selector: 'app-terraform-folder-tree',
  standalone: true,
  imports: [DatePipe, MatIconModule, StatusBadgeComponent],
  template: `
    <div class="tf-tree" role="tree" aria-label="Carpetas organizativas">
      @for (node of tree(); track node.folder.id) {
        <div class="tf-tree__folder" role="treeitem" [attr.aria-expanded]="node.expanded">
          <button
            type="button"
            class="tf-tree__folder-btn"
            (click)="handleToggleFolder(node.folder.id, $event)"
            [attr.aria-expanded]="node.expanded"
          >
            <mat-icon class="tf-tree__chevron">{{ node.expanded ? 'expand_more' : 'chevron_right' }}</mat-icon>
            <mat-icon class="tf-tree__folder-icon">{{ node.folder.icon }}</mat-icon>
            <span class="tf-tree__folder-label">{{ node.folder.label }}</span>
            <span class="tf-tree__folder-count">{{ node.workspaces.length + node.launches.length }}</span>
          </button>
          @if (node.expanded) {
            <p class="tf-tree__hint">{{ node.folder.hint }}</p>
            <ul class="tf-tree__children">
              @for (ws of node.workspaces; track ws.id) {
                <li>
                  <button
                    type="button"
                    class="tf-tree__ws"
                    [class.tf-tree__ws--active]="activeWorkspaceId() === ws.id"
                    (click)="workspaceSelect.emit(ws.id)"
                    [attr.aria-pressed]="activeWorkspaceId() === ws.id"
                  >
                    <mat-icon>folder_open</mat-icon>
                    <span class="tf-tree__ws-body">
                      <span class="tf-tree__ws-name">{{ ws.name }}</span>
                      <span class="tf-tree__ws-meta">{{ ws.provider }} · workspace</span>
                    </span>
                    <span class="tf-tree__dot" [class]="'tf-tree__dot--' + ws.status"></span>
                  </button>
                </li>
              }
              @for (launch of node.launches; track launch.id) {
                <li>
                  <button type="button" class="tf-tree__launch" (click)="launchSelect.emit(launch)">
                    <mat-icon>rocket_launch</mat-icon>
                    <span class="tf-tree__launch-body">
                      <span class="tf-tree__launch-name">{{ launch.instanceName }}</span>
                      <span class="tf-tree__launch-meta">
                        {{ launch.name }} · {{ launch.createdAt | date: 'dd MMM, HH:mm' }}
                      </span>
                    </span>
                    <app-status-badge [value]="launch.status" />
                  </button>
                </li>
              }
              @if (node.workspaces.length === 0 && node.launches.length === 0) {
                <li class="tf-tree__empty">Sin workspaces ni lanzamientos</li>
              }
            </ul>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .tf-tree {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .tf-tree__folder-btn {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      width: 100%;
      padding: 0.5rem 0.45rem;
      border: none;
      border-radius: var(--app-radius-md);
      background: var(--app-elevated);
      font: inherit;
      color: inherit;
      cursor: pointer;
      text-align: left;
    }
    .tf-tree__chevron {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
      color: var(--app-text-muted);
      flex-shrink: 0;
    }
    .tf-tree__folder-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: #844fba;
      flex-shrink: 0;
    }
    .tf-tree__folder-label {
      flex: 1;
      font-size: 0.78rem;
      font-weight: 700;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .tf-tree__folder-count {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 0.1rem 0.4rem;
      border-radius: 999px;
      background: color-mix(in srgb, #844fba 12%, transparent);
      color: #844fba;
      flex-shrink: 0;
    }
    .tf-tree__hint {
      margin: 0.2rem 0 0.35rem 1.65rem;
      font-size: 0.65rem;
      color: var(--app-text-muted);
      line-height: 1.35;
    }
    .tf-tree__children {
      list-style: none;
      margin: 0.25rem 0 0.5rem;
      padding: 0 0 0 0.35rem;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .tf-tree__ws,
    .tf-tree__launch {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      width: 100%;
      padding: 0.45rem 0.5rem 0.45rem 1.25rem;
      border: none;
      border-radius: var(--app-radius-md);
      background: transparent;
      font: inherit;
      color: inherit;
      cursor: pointer;
      text-align: left;
    }
    .tf-tree__ws mat-icon,
    .tf-tree__launch mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      flex-shrink: 0;
      color: var(--app-text-muted);
    }
    .tf-tree__launch mat-icon {
      color: #844fba;
    }
    .tf-tree__ws:hover,
    .tf-tree__launch:hover {
      background: var(--app-elevated);
    }
    .tf-tree__ws--active {
      background: color-mix(in srgb, #844fba 12%, transparent);
    }
    .tf-tree__ws-body,
    .tf-tree__launch-body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.06rem;
    }
    .tf-tree__ws-name,
    .tf-tree__launch-name {
      font-size: 0.76rem;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .tf-tree__ws-meta,
    .tf-tree__launch-meta {
      font-size: 0.64rem;
      color: var(--app-text-muted);
    }
    .tf-tree__dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
      background: #94a3b8;
    }
    .tf-tree__dot--planned { background: #a78bfa; }
    .tf-tree__dot--applied { background: #22c55e; }
    .tf-tree__dot--error { background: #ef4444; }
    .tf-tree__dot--applying { background: #f59e0b; }
    .tf-tree__empty {
      padding: 0.35rem 0.5rem 0.35rem 1.25rem;
      font-size: 0.68rem;
      color: var(--app-text-muted);
    }
  `,
})
export class TerraformFolderTreeComponent {
  readonly workspaces = input<TerraformWorkspaceItem[]>([])
  readonly launches = input<TerraformLaunchRecord[]>([])
  readonly activeWorkspaceId = input<string | null>(null)
  readonly searchTerm = input('')
  readonly expandedFolderIds = input<ReadonlySet<string>>(new Set<string>())

  readonly toggleFolder = output<string>()
  readonly workspaceSelect = output<string>()
  readonly launchSelect = output<TerraformLaunchRecord>()

  readonly tree = computed(() =>
    buildFolderTree(
      TERRAFORM_FOLDERS,
      this.workspaces(),
      this.launches(),
      this.expandedFolderIds(),
      this.searchTerm(),
    ),
  )

  handleToggleFolder = (folderId: string, event: Event): void => {
    event.preventDefault()
    event.stopPropagation()
    this.toggleFolder.emit(folderId)
  }
}
