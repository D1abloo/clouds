import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { MatIconModule } from '@angular/material/icon'
import { AuthStore } from '../../core/stores/auth.store'
import { SidebarService } from './sidebar.service'
import type { OrgInfo } from './sidebar.service'

@Component({
  selector: 'app-org-switcher',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="relative">
      <button
        type="button"
        class="flex w-full items-center gap-2.5 rounded-lg border-0 bg-transparent px-3 py-2 text-left transition-colors hover:bg-[color:var(--sidebar-item-hover)]"
        (click)="toggleDropdown()"
        aria-haspopup="listbox"
        [attr.aria-expanded]="dropdownOpen()"
      >
        <span class="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-sidebar-primary to-[#5b52c4] text-[0.58rem] font-extrabold tracking-wide text-white">
          {{ authStore.currentOrg().initials }}
        </span>
        @if (!collapsed()) {
          <span class="min-w-0 flex-1 truncate text-[0.82rem] font-semibold text-[color:var(--sidebar-text)]">
            {{ authStore.currentOrg().name }}
          </span>
          <mat-icon class="!h-4 !w-4 text-[color:var(--sidebar-text-muted)]">unfold_more</mat-icon>
        }
      </button>

      @if (dropdownOpen() && !collapsed()) {
        <div
          class="absolute left-2 right-2 top-[calc(100%+4px)] z-[200] overflow-hidden rounded-[10px] border border-[color:var(--sidebar-border)] bg-[color:var(--sidebar-dropdown-bg)] p-1 shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
          role="listbox"
        >
          @for (o of authStore.availableOrgs; track o.id) {
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded-md border-0 bg-transparent px-2.5 py-2 text-left text-[0.82rem] font-medium text-[color:var(--sidebar-text-muted)] transition-colors hover:bg-[color:var(--sidebar-item-hover)] hover:text-[color:var(--sidebar-text)]"
              [class.text-[color:var(--sidebar-text)]]="o.id === authStore.currentOrg().id"
              (click)="selectOrg(o)"
            >
              <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-sidebar-primary to-[#5b52c4] text-[0.55rem] font-extrabold text-white">
                {{ o.initials }}
              </span>
              <span class="flex-1 truncate">{{ o.name }}</span>
              @if (o.id === authStore.currentOrg().id) {
                <mat-icon class="!h-4 !w-4 text-sidebar-primary">check</mat-icon>
              }
            </button>
          }
        </div>
        <div class="fixed inset-0 z-[199]" (click)="dropdownOpen.set(false)" aria-hidden="true"></div>
      }
    </div>
  `,
})
export class OrgSwitcherComponent {
  readonly authStore = inject(AuthStore)
  readonly sidebarSvc = inject(SidebarService)
  readonly collapsed = this.sidebarSvc.collapsed
  readonly dropdownOpen = signal(false)

  toggleDropdown = (): void => {
    if (!this.collapsed()) this.dropdownOpen.update((v) => !v)
  }

  selectOrg = (org: OrgInfo): void => {
    this.authStore.setOrg(org)
    this.dropdownOpen.set(false)
  }
}
