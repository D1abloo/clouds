import { Component, Input, output, signal, computed } from '@angular/core'
import { RouterLink } from '@angular/router'
import { DatePipe } from '@angular/common'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTabsModule } from '@angular/material/tabs'
import { MatMenuModule } from '@angular/material/menu'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import { RepositoriesQuickLinksComponent } from '../components/repositories-quick-links.component'
import { repoRoute } from '../repositories-section.config'
import { buildPrPreview } from '../utils/pr-dialog.util'

@Component({
  selector: 'app-pull-requests-github-section',
  standalone: true,
  imports: [RouterLink, DatePipe, MatButtonModule, MatIconModule, MatTabsModule, MatMenuModule, StatusBadgeComponent, RepositoriesQuickLinksComponent],
  template: `
    <div class="repo-section repo-section--pull-requests">
      <app-repositories-quick-links current="pull-requests" title="Relacionado" />

      <div class="repo-toolbar">
        <button mat-flat-button color="primary" type="button" (click)="openGithub.emit(firstOpenPr())">
          <mat-icon>open_in_new</mat-icon> Abrir en GitHub
        </button>
        <button mat-stroked-button type="button" (click)="deployPreview.emit(firstOpenPr())">
          <mat-icon>rocket_launch</mat-icon> Desplegar preview
        </button>
        <a mat-button [routerLink]="routes.commits"><mat-icon>history_edu</mat-icon> Commits</a>
        <a mat-button [routerLink]="routes.deployments"><mat-icon>rocket_launch</mat-icon> Despliegues</a>
      </div>

      <mat-tab-group class="soft-tabs" animationDuration="200ms" (selectedIndexChange)="tabIndex.set($event)">
        <mat-tab label="Abiertos" />
        <mat-tab label="En revisión" />
        <mat-tab label="Drafts" />
        <mat-tab label="Fusionados" />
        <mat-tab label="Con conflictos" />
        <mat-tab label="Checks fallidos" />
      </mat-tab-group>

      <p class="repo-tab-hint">{{ tabHint() }} · {{ visiblePrs().length }} PRs · solo GitHub (GitLab → Merge Requests)</p>

      <div class="pr-summary">
        <div><strong>{{ summary().open }}</strong><span>Abiertos</span></div>
        <div><strong>{{ summary().inReview }}</strong><span>En revisión</span></div>
        <div><strong>{{ summary().drafts }}</strong><span>Borradores</span></div>
        <div><strong>{{ summary().failed }}</strong><span>Checks fallidos</span></div>
        <div><strong>{{ summary().conflicts }}</strong><span>Con conflictos</span></div>
      </div>

      <div class="pr-list">
        @for (pr of visiblePrs(); track pr['id']) {
          <article class="pr-row" [class.pr-row--conflict]="pr['conflicts']" [class.pr-row--draft]="pr['draft']">
            <div class="pr-row__top">
              <div>
                <span class="pr-num">#{{ pr['number'] }}</span>
                <h4>{{ pr['title'] }}</h4>
              </div>
              <app-status-badge [value]="stateBadge(pr['state'])" />
            </div>
            <p class="repo"><mat-icon>folder</mat-icon> {{ pr['repoFullName'] }}</p>
            @if (pr['description']) {
              <p class="desc">{{ pr['description'] }}</p>
            }
            <p class="meta">
              <mat-icon>person</mat-icon> {{ pr['author'] }}
              <mat-icon>account_tree</mat-icon> {{ pr['head'] }} → {{ pr['base'] }}
              @if (pr['updatedAt']) {
                <mat-icon>schedule</mat-icon> {{ dateStr(pr['updatedAt']) | date: 'short' }}
              }
            </p>
            <div class="diff-stats">
              <span class="add">+{{ pr['additions'] ?? 0 }}</span>
              <span class="del">−{{ pr['deletions'] ?? 0 }}</span>
              <span>{{ pr['commits'] ?? '—' }} commits</span>
            </div>
            @if (labelList(pr).length) {
              <div class="labels">@for (l of labelList(pr); track l) { <span class="label">{{ l }}</span> }</div>
            }
            <div class="checks">
              <span><mat-icon>rate_review</mat-icon> {{ reviewersLabel(pr) }}</span>
              <app-status-badge [value]="checksBadge(pr['checks'])" />
              @if (pr['conflicts']) { <span class="conflict"><mat-icon>warning</mat-icon> Conflictos</span> }
              @if (pr['draft']) { <span class="draft"><mat-icon>edit_note</mat-icon> Draft</span> }
            </div>

            <div class="pr-row__panels">
              <article class="pr-panel pr-panel--ci">
                <h5><mat-icon>rule</mat-icon> Checks CI</h5>
                <p>lint · unit-tests · build · e2e</p>
                <app-status-badge [value]="checksBadge(pr['checks'])" />
              </article>
              <article class="pr-panel pr-panel--preview">
                <h5><mat-icon>rocket_launch</mat-icon> Preview</h5>
                @if (previewUrl(pr) === '—') {
                  <p class="muted">No disponible (draft)</p>
                } @else {
                  <p class="mono">{{ previewUrl(pr) }}</p>
                  <small>TTL 72 h</small>
                }
              </article>
              <article class="pr-panel pr-panel--actions">
                <h5><mat-icon>bolt</mat-icon> Actions</h5>
                <p>CI — build-and-test</p>
                <small>Trigger: pull_request</small>
              </article>
            </div>

            <div class="pr-row__actions">
              <button mat-stroked-button type="button" (click)="viewPr.emit(pr)">
                <mat-icon>visibility</mat-icon> Ver PR
              </button>
              <button mat-button type="button" (click)="viewCommits.emit(pr)"><mat-icon>history</mat-icon> Commits</button>
              <button mat-button type="button" (click)="viewChecks.emit(pr)"><mat-icon>rule</mat-icon> Checks</button>
              <button mat-button type="button" (click)="viewGithubActions.emit(pr)"><mat-icon>bolt</mat-icon> Actions</button>
              <button mat-button type="button" (click)="deployPreview.emit(pr)"><mat-icon>rocket_launch</mat-icon> Preview</button>
              <button mat-button type="button" (click)="requestReview.emit(pr)"><mat-icon>person_add</mat-icon> Revisión</button>
              @if (!pr['draft'] && pr['state'] === 'open' && !pr['conflicts']) {
                <button mat-flat-button color="primary" type="button" (click)="mergePr.emit(pr)"><mat-icon>merge</mat-icon> Fusionar</button>
              }
              <button mat-icon-button type="button" [matMenuTriggerFor]="prMenu" aria-label="Más" (click)="selected.set(pr)">
                <mat-icon>more_vert</mat-icon>
              </button>
            </div>
          </article>
        } @empty {
          <div class="repo-empty"><mat-icon>merge</mat-icon><p>No hay Pull Requests en esta pestaña</p></div>
        }
      </div>

      <mat-menu #prMenu="matMenu">
        <button mat-menu-item type="button" (click)="openGithub.emit(selected()!)"><mat-icon>open_in_new</mat-icon> Abrir en GitHub</button>
        <button mat-menu-item type="button" (click)="viewGithubActions.emit(selected()!)"><mat-icon>bolt</mat-icon> Ver GitHub Actions</button>
      </mat-menu>
    </div>
  `,
  styles: `
    .pr-summary {
      display: flex; flex-wrap: wrap; gap: 1rem 1.5rem; padding: 0.65rem 0 0.85rem;
      font-size: 0.74rem; border-bottom: 1px solid color-mix(in srgb, var(--app-text-muted) 8%, transparent);
      strong { display: block; font-size: 1.1rem; font-weight: 800; }
      span { color: var(--app-text-muted); font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.04em; }
    }
    .pr-row__panels {
      display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.5rem; margin: 0.5rem 0 0.35rem;
    }
    .pr-panel {
      padding: 0.5rem 0.55rem; font-size: 0.72rem; border-left: 3px solid #24292f;
      background: color-mix(in srgb, #24292f 4%, transparent);
      h5 { display: flex; align-items: center; gap: 0.25rem; margin: 0 0 0.25rem; font-size: 0.65rem; text-transform: uppercase; color: var(--app-text-muted); mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; } }
      p { margin: 0 0 0.2rem; line-height: 1.35; }
      .mono { font-family: ui-monospace, monospace; font-size: 0.65rem; word-break: break-all; color: #0969da; }
      small { color: var(--app-text-muted); font-size: 0.62rem; }
      .muted { color: var(--app-text-muted); margin: 0; }
    }
    .pr-panel--preview { border-left-color: #0969da; background: color-mix(in srgb, #0969da 4%, transparent); }
    .pr-panel--actions { border-left-color: #f59e0b; background: color-mix(in srgb, #f59e0b 4%, transparent); }
    .pr-row {
      padding: 0.85rem 0;
      border-bottom: 1px solid color-mix(in srgb, var(--app-text-muted) 8%, transparent);
    }
    .pr-row--conflict { border-left: 2px solid #ef4444; padding-left: 0.65rem; }
    .pr-row--draft { opacity: 0.92; }
    .pr-row__top { display: flex; justify-content: space-between; gap: 0.5rem; align-items: flex-start; }
    .pr-num { font-size: 0.72rem; font-weight: 800; color: var(--app-accent); margin-right: 0.35rem; }
    .pr-row h4 { margin: 0.15rem 0 0; font-size: 0.95rem; display: inline; }
    .repo { display: flex; align-items: center; gap: 0.25rem; font-size: 0.78rem; color: var(--app-accent); margin: 0.35rem 0; mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; } }
    .desc { font-size: 0.82rem; color: var(--app-text-muted); margin: 0.25rem 0; line-height: 1.4; }
    .meta {
      display: flex; flex-wrap: wrap; gap: 0.65rem; align-items: center;
      font-size: 0.78rem; color: var(--app-text-muted); margin: 0.25rem 0;
      mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; }
    }
    .diff-stats { display: flex; gap: 0.75rem; font-size: 0.78rem; margin: 0.35rem 0; }
    .add { color: #22c55e; font-weight: 700; }
    .del { color: #ef4444; font-weight: 700; }
    .labels { display: flex; flex-wrap: wrap; gap: 0.35rem; margin: 0.35rem 0; }
    .label { font-size: 0.65rem; padding: 0.1rem 0.4rem; border-radius: 999px; background: #24292f14; font-weight: 600; }
    .checks {
      font-size: 0.8rem; color: var(--app-text-muted); margin: 0.35rem 0;
      display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;
      mat-icon { font-size: 0.95rem; width: 0.95rem; height: 0.95rem; vertical-align: middle; }
    }
    .conflict { color: #ef4444; font-weight: 600; display: inline-flex; align-items: center; gap: 0.2rem; }
    .draft { color: var(--status-warning); font-weight: 600; display: inline-flex; align-items: center; gap: 0.2rem; }
    .pr-row__actions { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.65rem; align-items: center; }
    .pr-list { display: flex; flex-direction: column; gap: 0; padding: 0 0 1rem; }
    @media (max-width: 768px) { .pr-row__panels { grid-template-columns: 1fr; } }
  `,
})
export class PullRequestsGithubSectionComponent {
  @Input() pullRequests: Record<string, unknown>[] = []

  readonly routes = {
    commits: repoRoute('commits'),
    deployments: repoRoute('deployments'),
    webhooks: repoRoute('webhooks'),
    github: repoRoute('github'),
  }

  readonly tabIndex = signal(0)
  readonly selected = signal<Record<string, unknown> | null>(null)

  readonly viewPr = output<Record<string, unknown>>()
  readonly viewCommits = output<Record<string, unknown>>()
  readonly viewChecks = output<Record<string, unknown>>()
  readonly viewGithubActions = output<Record<string, unknown>>()
  readonly deployPreview = output<Record<string, unknown>>()
  readonly openGithub = output<Record<string, unknown>>()
  readonly requestReview = output<Record<string, unknown>>()
  readonly mergePr = output<Record<string, unknown>>()

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

  tabHint = computed(() => {
    const hints = [
      'PRs abiertos listos para revisión (excluye borradores)',
      'PRs con al menos un revisor asignado',
      'Borradores — aún no publicados para merge',
      'PRs fusionados recientemente',
      'Requieren resolver conflictos antes de merge',
      'Checks de CI o GitHub Actions fallidos',
    ]
    return hints[this.tabIndex()] ?? hints[0]
  })

  firstOpenPr = (): Record<string, unknown> =>
    this.pullRequests.find((p) => p['state'] === 'open') ?? this.pullRequests[0] ?? {}

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
    return r?.length ? r.join(', ') : 'Sin revisores'
  }

  labelList = (pr: Record<string, unknown>): string[] => (pr['labels'] as string[]) ?? []

  previewUrl = (pr: Record<string, unknown>): string => buildPrPreview(pr).url

  summary = computed(() => {
    const prs = this.pullRequests
    return {
      open: prs.filter((p) => p['state'] === 'open' && !p['draft']).length,
      inReview: prs.filter((p) => p['state'] === 'open' && (p['reviewers'] as string[])?.length).length,
      drafts: prs.filter((p) => p['draft']).length,
      failed: prs.filter((p) => p['checks'] === 'failed').length,
      conflicts: prs.filter((p) => p['conflicts']).length,
    }
  })

  dateStr = (v: unknown): string => String(v ?? '')
}
