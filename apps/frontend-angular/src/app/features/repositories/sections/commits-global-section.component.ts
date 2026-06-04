import { Component, Input, output, signal, computed } from '@angular/core'
import { DatePipe, SlicePipe } from '@angular/common'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTabsModule } from '@angular/material/tabs'
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component'
import type { GlobalCommitRow } from '../utils/repositories-global-demo.util'

const COMMIT_TAB_FILTERS = [
  (c: GlobalCommitRow) => true,
  (c: GlobalCommitRow) => c.provider === 'github',
  (c: GlobalCommitRow) => c.provider === 'gitlab',
  (c: GlobalCommitRow) => c.ciStatus === 'failed',
  (c: GlobalCommitRow) => c.deployStatus === 'deployed',
  (c: GlobalCommitRow) => c.deployStatus === 'pending',
] as const

@Component({
  selector: 'app-commits-global-section',
  standalone: true,
  imports: [DatePipe, SlicePipe, MatButtonModule, MatIconModule, MatTabsModule, StatusBadgeComponent],
  template: `
    <div class="commits-page">
      <mat-tab-group class="soft-tabs" animationDuration="200ms" (selectedIndexChange)="tabIndex.set($event)">
        <mat-tab label="Recientes" />
        <mat-tab label="GitHub" />
        <mat-tab label="GitLab" />
        <mat-tab label="Con error CI" />
        <mat-tab label="Desplegados" />
        <mat-tab label="Pendientes" />
      </mat-tab-group>

      <div class="timeline">
        @for (c of visibleRows(); track c.id) {
          <article class="commit-card">
            <div class="commit-card__head">
              <code>{{ c.sha | slice:0:10 }}</code>
              <span class="prov" [class]="'prov--' + c.provider">{{ c.provider === 'github' ? 'GitHub' : 'GitLab' }}</span>
              <app-status-badge [value]="ciBadge(c.ciStatus)" />
            </div>
            <h4>{{ c.message }}</h4>
            <p class="meta">
              {{ c.author }} · {{ c.repoOrProject }} · rama <strong>{{ c.branch }}</strong> ·
              {{ c.date | date: 'short' }}
            </p>
            <p class="diff">+{{ c.additions }} / −{{ c.deletions }} · {{ c.filesChanged }} archivos</p>
            @if (c.relatedReview) {
              <p class="review">Relacionado: {{ c.relatedReview }}</p>
            }
            <div class="commit-card__actions">
              <button mat-button type="button" (click)="viewDetail.emit(c)">Ver detalle commit</button>
              <button mat-button type="button" (click)="copySha.emit(c)">Copiar SHA</button>
              <button mat-button type="button" (click)="deploy.emit(c)">Desplegar commit</button>
              <button mat-button type="button" (click)="openSource.emit(c)">Abrir origen</button>
            </div>
          </article>
        }
      </div>
    </div>
  `,
  styles: `
    .commits-page { border-top: 3px solid #8b5cf6; }
    .timeline { display: flex; flex-direction: column; gap: 0.65rem; padding: 1rem 0; }
    .commit-card {
      padding: 1rem 1.1rem;
      border-radius: var(--app-radius-sm);
      background: var(--app-elevated);
      border-left: 3px solid #8b5cf6;
    }
    .commit-card__head { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; code { font-size: 0.78rem; } }
    .commit-card h4 { margin: 0 0 0.35rem; font-size: 0.95rem; }
    .meta, .diff, .review { margin: 0.2rem 0; font-size: 0.8rem; color: var(--app-text-muted); }
    .commit-card__actions { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.5rem; }
    .prov { font-size: 0.65rem; font-weight: 700; padding: 0.1rem 0.35rem; border-radius: 4px; }
    .prov--github { background: #24292f18; }
    .prov--gitlab { background: #fc6d2618; color: #c2410c; }
  `,
})
export class CommitsGlobalSectionComponent {
  @Input() commits: GlobalCommitRow[] = []

  readonly tabIndex = signal(0)

  readonly viewDetail = output<GlobalCommitRow>()
  readonly copySha = output<GlobalCommitRow>()
  readonly deploy = output<GlobalCommitRow>()
  readonly openSource = output<GlobalCommitRow>()

  visibleRows = computed(() => {
    const fn = COMMIT_TAB_FILTERS[this.tabIndex()] ?? COMMIT_TAB_FILTERS[0]
    return this.commits.filter(fn)
  })

  ciBadge = (s: string): string => (s === 'success' ? 'SUCCESS' : 'ERROR')
}
