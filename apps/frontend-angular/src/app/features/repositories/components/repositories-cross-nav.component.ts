import { Component, input } from '@angular/core'
import { RouterLink, RouterLinkActive } from '@angular/router'
import { MatIconModule } from '@angular/material/icon'
import { NavIconComponent } from '../../../shared/components/nav-icon/nav-icon.component'
import type { NavLogoKey } from '../../../shared/theme/nav-logo.types'
import { REPOSITORIES_NAV_LINKS, type RepositoriesSectionId } from '../repositories-section.config'

@Component({
  selector: 'app-repositories-cross-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule, NavIconComponent],
  template: `
    <nav class="repo-cross-nav" aria-label="Secciones de repositorios">
      @for (link of links(); track link.route) {
        <a
          class="repo-cross-nav__link"
          [routerLink]="link.route"
          routerLinkActive="repo-cross-nav__link--active"
          [attr.aria-current]="activeId() === link.id ? 'page' : null"
        >
          @if (link.logo) {
            <app-nav-icon [logo]="link.logo" size="sm" />
          } @else if (link.icon) {
            <mat-icon>{{ link.icon }}</mat-icon>
          }
          {{ link.label }}
        </a>
      }
    </nav>
  `,
})
export class RepositoriesCrossNavComponent {
  readonly activeId = input<RepositoriesSectionId>('github')
  readonly links = input(REPOSITORIES_NAV_LINKS)
}
