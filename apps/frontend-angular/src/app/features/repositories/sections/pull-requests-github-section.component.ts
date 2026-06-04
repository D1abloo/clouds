import { Component, Input, output, signal, computed } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTabsModule } from '@angular/material/tabs'
import { MatCardModule } from '@angular/material/card'
import { NavIconComponent } from '../../../shared/components/nav-icon/nav-icon.component'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'

@Component({
  selector: 'app-pull-requests-github-section',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTabsModule, MatCardModule, NavIconComponent, StatusBadgeComponent],
  template: `
    <div class="prs-page">
      <mat-card class="prs-hero">
        <app-nav-icon logo="github" size="md" />
        <div>
          <strong>Pull Requests de GitHub</strong>
          <p>Revisiones, checks de CI y previews de despliegue — no confundir con Merge Requests de GitLab.</p>
        </div>
      </mat-card>

      <mat-tab-group class="soft-tabs" animationDuration="200ms" (selectedIndexChange)="tabIndex.set($event)">
        <mat-tab label="Abiertos" />
        <mat-tab label="En revisión" />
        <mat-tab label="Drafts" />
        <mat-tab label="Fusionados" />
        <mat-tab label="Con conflictos" />
        <mat-tab label="Checks fallidos" />
      </mat-tab-group>

      <div class="pr-list">
        @for (pr of visiblePrs(); track pr['id']) {
          <mat-card class="pr-card">
            <div class="pr-card__top">
              <h4>#{{ pr['number'] }} {{ pr['title'] }}</h4>
              <app-status-badge [value]="stateBadge(pr['state'])" />
            </div>
            <p class="repo">{{ pr['repoFullName'] }}</p>
            <p class="meta">{{ pr['author'] }} · {{ pr['head'] }} → {{ pr['base'] }}</p>
            <div class="checks">
              <span>Revisores: {{ reviewersLabel(pr) }}</span>
              <app-status-badge [value]="checksBadge(pr['checks'])" />
              @if (pr['conflicts']) { <span class="conflict">Conflictos</span> }
              @if (pr['draft']) { <span class="draft">Draft</span> }
            </div>
            <div class="pr-card__actions">
              <button mat-stroked-button type="button" (click)="viewPr.emit(pr)">Ver Pull Request</button>
              <button mat-button type="button" (click)="viewCommits.emit(pr)">Ver commits</button>
              <button mat-button type="button" (click)="viewChecks.emit(pr)">Ver checks</button>
              <button mat-button type="button" (click)="deployPreview.emit(pr)">Desplegar preview</button>
              <button mat-button type="button" (click)="openGithub.emit(pr)">Abrir en GitHub</button>
            </div>
          </mat-card>
        } @empty {
          <p class="empty">No hay Pull Requests en esta pestaña</p>
        }
      </div>
    </div>
  `,
  styles: `
    .prs-page { border-top: 3px solid #24292f; }
    .prs-hero {
      display: flex;
      gap: 0.85rem;
      padding: 1rem;
      margin-bottom: 1rem;
      align-items: flex-start;
      p { margin: 0.25rem 0 0; font-size: 0.82rem; color: var(--app-text-muted); }
    }
    .pr-list { display: flex; flex-direction: column; gap: 0.65rem; padding: 0.75rem 0; }
    .pr-card { padding: 1rem !important; }
    .pr-card__top { display: flex; justify-content: space-between; gap: 0.5rem; h4 { margin: 0; font-size: 0.95rem; } }
    .repo { font-size: 0.78rem; color: var(--app-accent); margin: 0.25rem 0; }
    .meta, .checks { font-size: 0.8rem; color: var(--app-text-muted); margin: 0.2rem 0; display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    .conflict { color: var(--status-error, #dc2626); font-weight: 600; }
    .draft { color: var(--status-warning); font-weight: 600; }
    .pr-card__actions { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.65rem; }
    .empty { color: var(--app-text-muted); padding: 1rem; }
  `,
})
export class PullRequestsGithubSectionComponent {
  @Input() pullRequests: Record<string, unknown>[] = []

  readonly tabIndex = signal(0)

  readonly viewPr = output<Record<string, unknown>>()
  readonly viewCommits = output<Record<string, unknown>>()
  readonly viewChecks = output<Record<string, unknown>>()
  readonly deployPreview = output<Record<string, unknown>>()
  readonly openGithub = output<Record<string, unknown>>()

  visiblePrs = computed(() => {
    const prs = this.pullRequests
    const i = this.tabIndex()
    if (i === 0) return prs.filter((p) => p['state'] === 'open' && !p['draft'])
    if (i === 1) return prs.filter((p) => p['state'] === 'open' && (p['reviewers'] as string[])?.length)
    if (i === 2) return prs.filter((p) => p['draft'])
    if (i === 3) return prs.filter((p) => p['state'] === 'merged')
    if (i === 4) return prs.filter((p) => p['conflicts'])
    if (i === 5) return prs.filter((p) => p['checks'] === 'failed')
    return prs
  })

  stateBadge = (s: unknown): string => {
    if (s === 'open') return 'RUNNING'
    if (s === 'merged') return 'SUCCESS'
    return 'STOPPED'
  }

  checksBadge = (c: unknown): string => {
    if (c === 'success') return 'SUCCESS'
    if (c === 'pending') return 'RUNNING'
    return 'ERROR'
  }

  reviewersLabel = (pr: Record<string, unknown>): string => {
    const r = pr['reviewers'] as string[] | undefined
    return r?.length ? r.join(', ') : '—'
  }
}
