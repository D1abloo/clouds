import { Component, Input, output } from '@angular/core'
import { DatePipe } from '@angular/common'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTabsModule } from '@angular/material/tabs'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import type { GithubRepo } from '../../../core/services/github.service'

@Component({
  selector: 'app-repository-detail-drawer',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatIconModule, MatTabsModule, StatusBadgeComponent],
  template: `
    @if (open && repo) {
      <div class="drawer-backdrop animate-fade-in" (click)="close.emit()" role="presentation"></div>
      <aside class="repo-drawer animate-slide-in" role="dialog" aria-label="Detalle del repositorio">
        <header class="repo-drawer__head">
          <div>
            <h2>{{ repo.fullName }}</h2>
            <p>{{ repo.description || 'Sin descripción' }}</p>
          </div>
          <button mat-icon-button type="button" aria-label="Cerrar" (click)="close.emit()">
            <mat-icon>close</mat-icon>
          </button>
        </header>
        <mat-tab-group class="soft-tabs drawer-tabs" animationDuration="200ms">
          <mat-tab label="Resumen">
            <div class="drawer-panel">
              <dl class="detail-grid">
                <div><dt>Rama por defecto</dt><dd>{{ repo.defaultBranch }}</dd></div>
                <div><dt>Lenguaje</dt><dd>{{ repo.language }}</dd></div>
                <div><dt>Estrellas</dt><dd>{{ repo.stars }}</dd></div>
                <div><dt>Visibilidad</dt><dd>{{ repo.visibility }}</dd></div>
                <div><dt>Actualizado</dt><dd>{{ repo.updatedAt | date: 'medium' }}</dd></div>
              </dl>
              <div class="drawer-actions">
                <button mat-stroked-button type="button" (click)="sync.emit(repo.id)">
                  <mat-icon>sync</mat-icon> Sincronizar
                </button>
                <button mat-flat-button color="primary" type="button" (click)="deploy.emit(repo)">
                  <mat-icon>rocket_launch</mat-icon> Desplegar
                </button>
              </div>
            </div>
          </mat-tab>
          <mat-tab label="Ramas">
            <div class="drawer-panel">
              @if (branches.length) {
                <ul class="mini-list">
                  @for (b of branches; track b['name']) {
                    <li>
                      <strong>{{ b['name'] }}</strong>
                      — {{ b['lastCommitMessage'] }}
                      @if (b['protected']) { <app-status-badge value="RUNNING" /> }
                    </li>
                  }
                </ul>
              } @else {
                <p class="muted">Sincroniza el repositorio para ver ramas</p>
              }
            </div>
          </mat-tab>
          <mat-tab label="Commits">
            <div class="drawer-panel">
              @for (c of commits.slice(0, 8); track c['sha']) {
                <div class="commit-line">
                  <code>{{ c['sha'] }}</code> {{ c['message'] }}
                  <span class="muted">{{ c['author'] }} · {{ commitDate(c) | date: 'short' }}</span>
                </div>
              }
            </div>
          </mat-tab>
        </mat-tab-group>
      </aside>
    }
  `,
  styles: `
    .repo-drawer {
      position: fixed;
      top: 0;
      right: 0;
      z-index: 1200;
      width: min(440px, 100vw);
      height: 100vh;
      background: var(--app-card);
      box-shadow: var(--app-shadow-lg);
      display: flex;
      flex-direction: column;
    }
    .repo-drawer__head {
      display: flex;
      justify-content: space-between;
      padding: 1.25rem 1.35rem 0.5rem;
      h2 { margin: 0; font-size: 1.1rem; }
      p { margin: 0.35rem 0 0; font-size: 0.85rem; color: var(--app-text-muted); }
    }
    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem 1rem;
      dt { font-size: 0.72rem; color: var(--app-text-muted); text-transform: uppercase; }
      dd { margin: 0.2rem 0 0; font-size: 0.9rem; }
    }
    .drawer-actions { display: flex; gap: 0.5rem; margin-top: 1rem; flex-wrap: wrap; }
    .mini-list { list-style: none; padding: 0; margin: 0; font-size: 0.85rem; }
    .mini-list li { padding: 0.45rem 0; border-bottom: 1px solid var(--app-border-subtle); }
    .commit-line { font-size: 0.82rem; padding: 0.5rem 0; border-bottom: 1px solid var(--app-border-subtle); }
    .commit-line code { font-size: 0.72rem; margin-right: 0.35rem; }
    .muted { color: var(--app-text-muted); font-size: 0.85rem; }
  `,
})
export class RepositoryDetailDrawerComponent {
  @Input() open = false
  @Input() repo: GithubRepo | null = null
  @Input() branches: Record<string, unknown>[] = []
  @Input() commits: Record<string, unknown>[] = []

  readonly close = output<void>()
  readonly sync = output<string>()
  readonly deploy = output<GithubRepo>()

  commitDate = (c: Record<string, unknown>): string => String(c['date'] ?? '')
}
