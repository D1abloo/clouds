import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core'
import { RouterLink, RouterLinkActive } from '@angular/router'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'
import { NavIconComponent } from '../../shared/components/nav-icon/nav-icon.component'
import type { NavLogoKey } from '../../shared/theme/nav-logo.types'
import { SidebarService } from './sidebar.service'
import { panelReveal } from '../../shared/animations/ui-motion.animations'

@Component({
  selector: 'app-sidebar-nav-leaf',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, MatIconModule, MatTooltipModule, NavIconComponent],
  animations: [panelReveal],
  template: `
    <a
      class="nav-leaf"
      @panelReveal
      #link="routerLinkActive"
      [routerLink]="route()"
      routerLinkActive="nav-leaf--active"
      [routerLinkActiveOptions]="activeOptions()"
      [matTooltip]="leafTooltip()"
      [matTooltipDisabled]="!leafTooltip()"
      matTooltipPosition="right"
    >
      @if (icon() || logo()) {
        <span class="nav-leaf__icon-wrap" [class.nav-leaf__icon-wrap--active]="link.isActive">
          <app-nav-icon [icon]="icon()" [logo]="logo()" size="sm" [active]="link.isActive" />
        </span>
      }
      @if (!collapsed()) {
        <span class="nav-leaf__text">
          <span class="nav-leaf__label">{{ label() }}</span>
          @if (hint()) {
            <span class="nav-leaf__hint">{{ hint() }}</span>
          }
        </span>
        @if (badge() && badge()! > 0) {
          <span class="nav-leaf__badge">{{ badge()! > 99 ? '99+' : badge() }}</span>
        }
        <button
          type="button"
          class="nav-leaf__star"
          [class.nav-leaf__star--on]="isFavorite()"
          (click)="handleFavorite($event)"
          [attr.aria-label]="isFavorite() ? 'Quitar de acceso rápido' : 'Añadir a acceso rápido'"
        >
          <mat-icon>{{ isFavorite() ? 'star' : 'star_border' }}</mat-icon>
        </button>
      }
    </a>
  `,
  styles: `
    .nav-leaf {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.42rem 0.5rem 0.42rem 0.85rem;
      margin: 1px 0.35rem;
      border-radius: 10px;
      text-decoration: none;
      font-size: 0.76rem;
      font-weight: 600;
      color: var(--sidebar-text);
      border: none;
      transition: background 0.2s, color 0.2s, transform 0.18s;
    }
    .nav-leaf:hover {
      background: var(--sidebar-item-hover);
      color: var(--sidebar-text);
      transform: translateX(4px);
    }
    .nav-leaf--active {
      background: var(--sidebar-item-active);
      color: var(--sidebar-text);
      font-weight: 700;
    }
    .nav-leaf__icon-wrap {
      width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      opacity: 0.92;
      border-radius: 10px;
      transition: transform 0.2s ease, box-shadow 0.25s ease;
    }
    .nav-leaf:hover .nav-leaf__icon-wrap {
      transform: scale(1.08);
      box-shadow: 0 0 12px color-mix(in srgb, var(--sidebar-primary) 30%, transparent);
    }
    .nav-leaf__icon-wrap--active {
      box-shadow: 0 0 14px color-mix(in srgb, #22d3ee 45%, transparent);
      animation: leafIconPulse 2.4s ease-in-out infinite;
    }
    @keyframes leafIconPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    .nav-leaf__text {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.12rem;
    }
    .nav-leaf__label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .nav-leaf__hint {
      font-size: 0.62rem;
      font-weight: 500;
      line-height: 1.35;
      color: var(--sidebar-text-faint);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .nav-leaf__badge {
      padding: 0.1rem 0.4rem;
      border-radius: 999px;
      font-size: 0.58rem;
      font-weight: 800;
      background: linear-gradient(135deg, #ef4444, #f97316);
      color: #fff;
      border: none;
    }
    .nav-leaf__star {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: var(--sidebar-text-faint);
      cursor: pointer;
      padding: 0;
      mat-icon { font-size: 0.85rem; width: 0.85rem; height: 0.85rem; }
    }
    .nav-leaf__star--on { color: #fbbf24; }
    .nav-leaf__star:hover { background: color-mix(in srgb, #fbbf24 15%, transparent); }
  `,
})
export class SidebarNavLeafComponent {
  private readonly sidebar = inject(SidebarService)

  readonly label = input.required<string>()
  readonly hint = input<string | undefined>()
  readonly route = input.required<string>()
  readonly icon = input<string | undefined>()
  readonly logo = input<NavLogoKey | undefined>()
  readonly collapsed = input(false)
  readonly badge = input<number | null>(null)
  readonly exactActive = input(false)

  activeOptions = () => ({
    paths: this.exactActive() ? ('exact' as const) : ('subset' as const),
    queryParams: 'ignored' as const,
    fragment: 'ignored' as const,
    matrixParams: 'ignored' as const,
  })

  readonly leafTooltip = computed(() =>
    this.collapsed() ? this.label() : (this.hint() ?? ''),
  )

  isFavorite = (): boolean => this.sidebar.isFavorite(this.route())

  handleFavorite = (e: Event): void => {
    e.preventDefault()
    e.stopPropagation()
    this.sidebar.toggleFavorite(this.route(), {
      label: this.label(),
      icon: this.icon(),
    })
  }
}
