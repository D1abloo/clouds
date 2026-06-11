import { Component, computed, input } from '@angular/core'
import { RouterLink } from '@angular/router'
import { MatIconModule } from '@angular/material/icon'
import { NavIconComponent } from '../../../shared/components/nav-icon/nav-icon.component'
import {
  repoQuickLinks,
  type RepositoriesSectionId,
} from '../repositories-section.config'

@Component({
  selector: 'app-repositories-quick-links',
  standalone: true,
  imports: [RouterLink, MatIconModule, NavIconComponent],
  template: `
    <div class="repo-quick-links" role="navigation" [attr.aria-label]="ariaLabel()">
      <span class="repo-quick-links__title">{{ title() }}</span>
      @for (link of links(); track link.route) {
        <a class="repo-quick-links__chip" [routerLink]="link.route">
          @if (link.logo) {
            <app-nav-icon [logo]="link.logo" size="sm" />
          } @else if (link.icon) {
            <mat-icon>{{ link.icon }}</mat-icon>
          }
          {{ link.label }}
        </a>
      }
    </div>
  `,
})
export class RepositoriesQuickLinksComponent {
  readonly current = input.required<RepositoriesSectionId>()
  readonly provider = input<'github' | 'gitlab'>('github')
  readonly title = input('Ir a')
  readonly ariaLabel = input('Accesos rápidos a secciones relacionadas')

  readonly links = computed(() => repoQuickLinks(this.current(), this.provider()))
}
