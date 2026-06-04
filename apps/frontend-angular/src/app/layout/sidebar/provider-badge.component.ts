import { ChangeDetectionStrategy, Component, input, inject } from '@angular/core'
import { Router } from '@angular/router'
import { MatTooltipModule } from '@angular/material/tooltip'

export type CloudProviderKey = 'AWS' | 'GCP' | 'AZURE'
export type ProviderStatus = 'ok' | 'warn' | 'error'

const PROVIDER_META: Record<
  CloudProviderKey,
  { label: string; short: string; color: string; route: string }
> = {
  AWS: { label: 'Amazon Web Services', short: 'AWS', color: '#FF9900', route: '/cloud/aws' },
  GCP: { label: 'Google Cloud', short: 'GCP', color: '#4285F4', route: '/cloud/gcp' },
  AZURE: { label: 'Microsoft Azure', short: 'Azure', color: '#0078D4', route: '/cloud/azure' },
}

@Component({
  selector: 'app-provider-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTooltipModule],
  template: `
    <button
      type="button"
      class="group flex w-full items-center gap-2.5 rounded-lg border-0 px-3 py-2 text-left text-sm font-medium text-[color:var(--sidebar-text-muted)] transition-colors hover:bg-[color:var(--sidebar-item-hover)] hover:text-[color:var(--sidebar-text)]"
      [class.justify-center]="collapsed()"
      [class.bg-[color:var(--sidebar-item-active)]]="isActive"
      [class.text-[color:var(--sidebar-primary)]]="isActive"
      [matTooltip]="collapsed() ? meta.label : ''"
      matTooltipPosition="right"
      (click)="navigate()"
    >
      <span class="relative flex h-4 w-4 shrink-0 items-center justify-center" [attr.aria-label]="meta.short">
        @switch (provider()) {
          @case ('AWS') {
            <svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
              <path fill="#FF9900" d="M6.5 17.2c4.8 3.6 11.8 3.1 16.1-1.2-.4.7-.9 1.3-1.5 1.9-3.3 3.3-8.6 3.2-11.8.1-1.1-.9-2-2-2.8-3.2.6.7 1.3 1.4 2 2.4z"/>
              <path fill="#252F3E" d="M12.2 6.8c-2.8.1-5.3 1.2-7.1 3.1 1.5-1.8 3.6-3 6-3.3 2.4-.3 4.8.2 6.8 1.4-1.2-.8-2.6-1.2-4.1-1.2h-1.6z"/>
            </svg>
          }
          @case ('GCP') {
            <svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
              <path fill="#EA4335" d="M12 10.2 17.4 7V4.2L12 7.4 6.6 4.2V7z"/>
              <path fill="#4285F4" d="M6.6 7 12 10.2v4.6L6.6 11.6V7z"/>
              <path fill="#34A853" d="M12 14.8 17.4 18v-2.8L12 12V14.8z"/>
              <path fill="#FBBC04" d="M17.4 18 12 14.8 6.6 18l5.4 3.2L17.4 18z"/>
            </svg>
          }
          @case ('AZURE') {
            <svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
              <path fill="#0078D4" d="M3 18.5 11.2 3.5h4.1L21 18.5h-4.2l-1.4-3.2H8.6L7.2 18.5H3z"/>
            </svg>
          }
        }
      </span>

      @if (!collapsed()) {
        <span class="min-w-0 flex-1 truncate">{{ meta.short }}</span>
        <span class="text-xs font-semibold text-[color:var(--sidebar-text-muted)]">{{ instances() }}</span>
        <span class="h-1.5 w-1.5 shrink-0 rounded-full" [class]="statusClass"></span>
      } @else {
        <span class="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full" [class]="statusClass"></span>
      }
    </button>
  `,
  styles: `
    :host { display: block; position: relative; margin-bottom: 1px; }
  `,
})
export class ProviderBadgeComponent {
  private readonly router = inject(Router)

  readonly provider = input.required<CloudProviderKey>()
  readonly instances = input<number>(0)
  readonly status = input<ProviderStatus>('ok')
  readonly collapsed = input<boolean>(false)

  get meta() {
    return PROVIDER_META[this.provider()]
  }

  get isActive(): boolean {
    return this.router.url.startsWith(this.meta.route) || this.router.url.includes(`/accounts/${this.provider().toLowerCase()}`)
  }

  get statusClass(): string {
    const map: Record<ProviderStatus, string> = {
      ok: 'bg-status-ok',
      warn: 'bg-status-warn',
      error: 'bg-status-error',
    }
    return map[this.status()]
  }

  navigate(): void {
    this.router.navigate([this.meta.route])
  }
}
