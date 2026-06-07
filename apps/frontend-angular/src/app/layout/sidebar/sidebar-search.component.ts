import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { MatIconModule } from '@angular/material/icon'
import { SidebarService } from './sidebar.service'

@Component({
  selector: 'app-sidebar-search',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatIconModule],
  template: `
    @if (!collapsed()) {
      <div class="sidebar-search">
        <mat-icon>search</mat-icon>
        <input
          type="search"
          placeholder="Search pages…"
          [ngModel]="sidebar.searchQuery()"
          (ngModelChange)="sidebar.setSearch($event)"
          aria-label="Search sidebar"
        />
        @if (sidebar.searchQuery()) {
          <button type="button" class="sidebar-search__clear" (click)="sidebar.setSearch('')" aria-label="Clear">
            <mat-icon>close</mat-icon>
          </button>
        }
      </div>
    }
  `,
  styles: `
    .sidebar-search {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0.35rem 0.5rem 0.5rem;
      padding: 0.4rem 0.55rem;
      border-radius: 12px;
      background: color-mix(in srgb, var(--sidebar-primary) 8%, transparent);
      box-shadow: none;
      border: none;
      mat-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
        color: var(--sidebar-text-faint);
      }
      input {
        flex: 1;
        border: none;
        background: transparent;
        outline: none;
        font-size: 0.78rem;
        color: var(--sidebar-text);
        &::placeholder { color: var(--sidebar-text-faint); }
      }
    }
    .sidebar-search__clear {
      display: flex;
      border: none;
      background: transparent;
      color: var(--sidebar-text-muted);
      cursor: pointer;
      padding: 0;
      mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; }
    }
  `,
})
export class SidebarSearchComponent {
  readonly sidebar = inject(SidebarService)
  readonly collapsed = input(false)
}
