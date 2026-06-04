import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
  ElementRef,
  viewChild,
  computed,
  output,
} from '@angular/core'
import { Router } from '@angular/router'
import { FormsModule } from '@angular/forms'
import { MatIconModule } from '@angular/material/icon'

interface PaletteItem {
  label: string
  description: string
  icon: string
  action: () => void
}

@Component({
  selector: 'app-command-palette',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatIconModule],
  template: `
    <div class="palette-backdrop" (click)="close()"></div>
    <div class="palette-panel" role="dialog" aria-label="Command palette">
      <div class="palette-search">
        <mat-icon class="palette-search-icon">search</mat-icon>
        <input
          #searchInput
          class="palette-input"
          type="text"
          placeholder="Search pages, actions…"
          [(ngModel)]="query"
          (input)="onInput()"
          (keydown)="onKeydown($event)"
          autocomplete="off"
        />
        <span class="palette-esc" (click)="close()">ESC</span>
      </div>

      <div class="palette-results">
        @if (filtered().length === 0) {
          <div class="palette-empty">
            <mat-icon>search_off</mat-icon>
            <span>No results for "{{ query }}"</span>
          </div>
        }
        @for (item of filtered(); track item.label; let i = $index) {
          <button
            type="button"
            class="palette-item"
            [class.palette-item--selected]="i === selectedIndex()"
            (click)="execute(item)"
            (mouseenter)="selectedIndex.set(i)"
          >
            <mat-icon class="palette-item-icon">{{ item.icon }}</mat-icon>
            <div class="palette-item-text">
              <span class="palette-item-label">{{ item.label }}</span>
              <span class="palette-item-desc">{{ item.description }}</span>
            </div>
            <mat-icon class="palette-item-arrow">arrow_forward</mat-icon>
          </button>
        }
      </div>

      <div class="palette-footer">
        <span><kbd>↑↓</kbd> navigate</span>
        <span><kbd>↵</kbd> open</span>
        <span><kbd>ESC</kbd> close</span>
      </div>
    </div>
  `,
  styles: `
    .palette-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 1000;
    }

    .palette-panel {
      position: fixed;
      top: 15vh;
      left: 50%;
      transform: translateX(-50%);
      width: min(600px, 90vw);
      background: var(--sidebar-dropdown-bg);
      border: 0.5px solid var(--sidebar-border);
      border-radius: 14px;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
      z-index: 1001;
      overflow: hidden;
      animation: paletteIn 0.15s ease;
    }

    @keyframes paletteIn {
      from { opacity: 0; transform: translateX(-50%) translateY(-12px) scale(0.97); }
      to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
    }

    .palette-search {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      padding: 0.85rem 1rem;
      border-bottom: 0.5px solid var(--sidebar-border);
    }

    .palette-search-icon {
      color: var(--sidebar-text-muted);
      font-size: 1.2rem;
      width: 1.2rem;
      height: 1.2rem;
      flex-shrink: 0;
    }

    .palette-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      font-size: 0.95rem;
      color: var(--sidebar-text);
      font-family: inherit;

      &::placeholder { color: var(--sidebar-text-faint); }
    }

    .palette-esc {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 0.15rem 0.45rem;
      border-radius: 5px;
      background: var(--sidebar-item-hover);
      color: var(--sidebar-text-muted);
      cursor: pointer;
    }

    .palette-results {
      max-height: 380px;
      overflow-y: auto;
      padding: 0.4rem;
    }

    .palette-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 2.5rem 1rem;
      color: var(--sidebar-text-faint);
      font-size: 0.875rem;

      mat-icon { font-size: 2rem; width: 2rem; height: 2rem; }
    }

    .palette-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
      padding: 0.65rem 0.75rem;
      border: none;
      border-radius: 8px;
      background: transparent;
      cursor: pointer;
      color: var(--sidebar-text-muted);
      text-align: left;
      transition: background 0.12s;

      &.palette-item--selected, &:hover {
        background: var(--sidebar-item-hover);
        color: var(--sidebar-text);

        .palette-item-icon { color: var(--sidebar-primary); }
        .palette-item-arrow { opacity: 1; }
      }
    }

    .palette-item-icon {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
      flex-shrink: 0;
      color: var(--sidebar-text-muted);
      transition: color 0.12s;
    }

    .palette-item-text {
      flex: 1;
      min-width: 0;
    }

    .palette-item-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--sidebar-text);
    }

    .palette-item-desc {
      display: block;
      font-size: 0.72rem;
      color: var(--sidebar-text-muted);
    }

    .palette-item-arrow {
      font-size: 0.9rem;
      width: 0.9rem;
      height: 0.9rem;
      opacity: 0;
      transition: opacity 0.12s;
      color: var(--sidebar-text-muted);
    }

    .palette-footer {
      display: flex;
      gap: 1.25rem;
      padding: 0.6rem 1rem;
      border-top: none;
      box-shadow: 0 -1px 0 color-mix(in srgb, var(--app-text-muted) 8%, transparent);
      font-size: 0.68rem;
      color: var(--sidebar-text-faint);

      kbd {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.1rem 0.3rem;
        border-radius: 4px;
        background: var(--sidebar-item-hover);
        font-size: 0.65rem;
        font-family: inherit;
        margin-right: 0.25rem;
      }
    }
  `,
})
export class CommandPaletteComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router)
  readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput')

  query = ''
  readonly selectedIndex = signal(0)

  private readonly allItems: PaletteItem[] = [
    { label: 'Dashboard', description: 'Overview of all resources', icon: 'dashboard', action: () => this.router.navigate(['/dashboard']) },
    { label: 'Command Center', description: 'Operational queue and quick actions', icon: 'bolt', action: () => this.router.navigate(['/command-center']) },
    { label: 'Resource Explorer', description: 'Search resources globally', icon: 'travel_explore', action: () => this.router.navigate(['/resource-explorer']) },
    { label: 'Health Center', description: 'Global health and SLA', icon: 'favorite', action: () => this.router.navigate(['/health-center']) },
    { label: 'AWS', description: 'Amazon Web Services overview', icon: 'cloud', action: () => this.router.navigate(['/cloud/aws/overview']) },
    { label: 'GCP', description: 'Google Cloud Platform overview', icon: 'cloud', action: () => this.router.navigate(['/cloud/gcp/overview']) },
    { label: 'Azure', description: 'Microsoft Azure overview', icon: 'cloud', action: () => this.router.navigate(['/cloud/azure/overview']) },
    { label: 'Instances', description: 'All cloud instances', icon: 'dns', action: () => this.router.navigate(['/instances/all-instances']) },
    { label: 'VPS / Bare Metal', description: 'External VPS and servers', icon: 'computer', action: () => this.router.navigate(['/vps/overview']) },
    { label: 'Docker', description: 'Container management', icon: 'view_in_ar', action: () => this.router.navigate(['/docker/containers']) },
    { label: 'Kubernetes', description: 'Cluster management', icon: 'hub', action: () => this.router.navigate(['/kubernetes/pods']) },
    { label: 'Jenkins', description: 'CI/CD automation', icon: 'build_circle', action: () => this.router.navigate(['/jenkins/jobs']) },
    { label: 'Terraform', description: 'Infrastructure as code', icon: 'layers', action: () => this.router.navigate(['/terraform/workspaces']) },
    { label: 'Billing', description: 'Cloud cost management', icon: 'receipt_long', action: () => this.router.navigate(['/billing/overview']) },
    { label: 'Cost Optimizer', description: 'Savings recommendations', icon: 'savings', action: () => this.router.navigate(['/cost-optimizer']) },
    { label: 'Alerts', description: 'Active alerts and rules', icon: 'notifications_active', action: () => this.router.navigate(['/alerts/active']) },
    { label: 'Logs', description: 'Centralized logs', icon: 'article', action: () => this.router.navigate(['/logs']) },
    { label: 'Security Center', description: 'Findings and posture', icon: 'security', action: () => this.router.navigate(['/security-center']) },
    { label: 'Notifications', description: 'Recent notifications', icon: 'notifications', action: () => this.router.navigate(['/notifications/all']) },
    { label: 'Audit Log', description: 'Action history', icon: 'manage_search', action: () => this.router.navigate(['/audit/activity-logs']) },
    { label: 'Runbooks', description: 'Operational runbooks', icon: 'menu_book', action: () => this.router.navigate(['/runbooks']) },
    { label: 'AI Assistant', description: 'CloudOps Copilot demo', icon: 'smart_toy', action: () => this.router.navigate(['/ai-assistant']) },
    { label: 'Settings', description: 'Application settings', icon: 'tune', action: () => this.router.navigate(['/settings/general']) },
    { label: 'Demo Mode', description: 'Load and reset demo data', icon: 'science', action: () => this.router.navigate(['/admin/demo-mode']) },
  ]

  readonly filtered = computed(() => {
    const q = this.query.toLowerCase().trim()
    if (!q) return this.allItems
    return this.allItems.filter(
      (i) => i.label.toLowerCase().includes(q) || i.description.toLowerCase().includes(q),
    )
  })

  readonly closeRequest = output<void>()

  ngOnInit(): void {
    setTimeout(() => this.searchInput()?.nativeElement.focus(), 50)
  }

  ngOnDestroy(): void {}

  onInput(): void {
    this.selectedIndex.set(0)
  }

  onKeydown(e: KeyboardEvent): void {
    const len = this.filtered().length
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      this.selectedIndex.update((i) => (i + 1) % len)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      this.selectedIndex.update((i) => (i - 1 + len) % len)
    } else if (e.key === 'Enter') {
      const item = this.filtered()[this.selectedIndex()]
      if (item) this.execute(item)
    } else if (e.key === 'Escape') {
      this.close()
    }
  }

  execute(item: PaletteItem): void {
    item.action()
    this.close()
  }

  close(): void {
    this.closeRequest.emit()
  }
}
