import { Component, inject } from '@angular/core'
import { Router, NavigationEnd, ActivatedRoute, RouterLink } from '@angular/router'
import { filter, map } from 'rxjs/operators'
import { toSignal } from '@angular/core/rxjs-interop'
import { MatIconModule } from '@angular/material/icon'

export interface BreadcrumbItem {
  label: string
  url?: string
}

@Component({
  selector: 'app-breadcrumbs',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  template: `
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      @for (item of crumbs(); track item.label; let last = $last) {
        @if (!last && item.url) {
          <a [routerLink]="item.url">{{ item.label }}</a>
          <mat-icon class="sep">chevron_right</mat-icon>
        } @else {
          <span class="current" [attr.aria-current]="last ? 'page' : null">{{
            item.label
          }}</span>
          @if (!last) {
            <mat-icon class="sep">chevron_right</mat-icon>
          }
        }
      }
    </nav>
  `,
  styles: `
    .breadcrumbs {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.25rem;
      font-size: 0.875rem;
      color: var(--app-text-muted);
    }
    a {
      color: inherit;
      text-decoration: none;
      &:hover { text-decoration: underline; }
    }
    .current { color: inherit; font-weight: 500; }
    .sep {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      opacity: 0.6;
    }
  `,
})
export class BreadcrumbsComponent {
  private readonly router = inject(Router)
  private readonly route = inject(ActivatedRoute)

  readonly crumbs = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.buildCrumbs()),
    ),
    { initialValue: [{ label: 'Home', url: '/dashboard' }] as BreadcrumbItem[] },
  )

  private buildCrumbs = (): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [{ label: 'Home', url: '/dashboard' }]
    let current = this.route.root
    let url = ''

    while (current.firstChild) {
      current = current.firstChild
      const snapshot = current.snapshot
      const segment = snapshot.url.map((s) => s.path).join('/')
      if (segment) {
        url += `/${segment}`
        const label =
          (snapshot.data['breadcrumb'] as string) ??
          this.formatLabel(segment)
        items.push({ label, url: snapshot.data['breadcrumbLeaf'] ? undefined : url })
      }
    }

    if (items.length > 1) {
      items[items.length - 1] = { ...items[items.length - 1], url: undefined }
    }

    return items
  }

  private formatLabel = (segment: string): string =>
    segment
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
}
